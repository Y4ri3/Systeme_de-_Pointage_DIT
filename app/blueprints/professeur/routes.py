import json
import queue
import time
from datetime import datetime

from flask import Response, jsonify, request, stream_with_context
from flask_jwt_extended import get_jwt, get_jwt_identity
from sqlalchemy.exc import IntegrityError

from app import db
from app.blueprints.professeur import professeur_bp
from app.models.cours import Cours
from app.models.notification import Notification
from app.models.pointage import Pointage
from app.models.salle import Salle
from app.models.suivi_absences import SuiviAbsences
from app.models.utilisateur import Utilisateur
from app.services import attendance_events
from app.services.qr_service import generer_qr_cours
from app.utils import utcnow
from app.utils.decorators import role_required
from app.utils.helpers import (
    detect_schedule_conflicts,
    get_or_404,
    get_pagination_params,
    paginate_query,
    serialize_cours,
    serialize_notification,
    serialize_pointage,
)

# Intervalle entre deux commentaires keep-alive SSE (garde la connexion ouverte a
# travers les proxys/reverse-proxies qui coupent les connexions inactives).
_STREAM_HEARTBEAT_SECONDS = 15
# Duree max d'un flux SSE avant fermeture forcee : le navigateur (EventSource)
# reconnecte automatiquement, ce qui evite de garder un worker occupe indefiniment.
_STREAM_MAX_DURATION_SECONDS = 30 * 60


def _get_accessible_course_or_403(cours_id):
    cours = get_or_404(Cours, cours_id, "Cours introuvable.")
    role = get_jwt().get("role")
    user_id = int(get_jwt_identity())

    if role == "professeur" and cours.professeur_id != user_id:
        return None, (
            jsonify(
                {
                    "error": "forbidden",
                    "message": "Vous ne pouvez consulter que vos propres cours.",
                    "details": {},
                }
            ),
            403,
        )

    return cours, None


def _attendance_status_for_student(cours, etudiant, now):
    pointage = (
        Pointage.query.filter_by(
            cours_id=cours.id,
            etudiant_id=etudiant.id,
        )
        .order_by(Pointage.timestamp_pointage.desc())
        .first()
    )

    if pointage is not None:
        return pointage.statut, pointage

    fin_cours = datetime.combine(cours.date, cours.heure_fin)
    if fin_cours < now:
        return "absent", None

    return "non_pointer", None


def _get_or_create_suivi_absence(etudiant_id, matiere_id):
    suivi = SuiviAbsences.query.filter_by(
        etudiant_id=etudiant_id,
        matiere_id=matiere_id,
    ).first()
    if suivi is None:
        suivi = SuiviAbsences(
            etudiant_id=etudiant_id,
            matiere_id=matiere_id,
            nombre_absences=0,
            nb_absences_justifiees=0,
            seuil_atteint=False,
        )
        db.session.add(suivi)
    return suivi


def _apply_absence_tracking_delta(cours, etudiant_id, previous_status, new_status):
    tracked_statuses = {"absent", "absence_justifiee"}
    if previous_status not in tracked_statuses and new_status not in tracked_statuses:
        return

    suivi = _get_or_create_suivi_absence(etudiant_id, cours.matiere_id)

    if previous_status == "absent" and suivi.nombre_absences > 0:
        suivi.nombre_absences -= 1
    elif previous_status == "absence_justifiee" and suivi.nb_absences_justifiees > 0:
        suivi.nb_absences_justifiees -= 1

    if new_status == "absent":
        suivi.nombre_absences += 1
    elif new_status == "absence_justifiee":
        suivi.nb_absences_justifiees += 1

    suivi.verifier_seuil()


def _payload_value(data, *keys):
    for key in keys:
        value = data.get(key)
        if value is not None:
            return value
    return None


def _course_attendance_payload(cours, now):
    etudiants = []
    resume = {
        "present": 0,
        "retard": 0,
        "invalide": 0,
        "absent": 0,
        "non_pointer": 0,
    }

    for etudiant in cours.promotion.etudiants:
        statut, pointage = _attendance_status_for_student(cours, etudiant, now)
        resume[statut] = resume.get(statut, 0) + 1
        etudiants.append(
            {
                "id": etudiant.id,
                "nom": etudiant.nom,
                "prenom": etudiant.prenom,
                "email": etudiant.email,
                "statut_presence": statut,
                "pointage": (
                    {
                        "id": pointage.id,
                        "timestamp_pointage": pointage.timestamp_pointage.isoformat(),
                        "statut": pointage.statut,
                    }
                    if pointage
                    else None
                ),
            }
        )

    return {
        "course": serialize_cours(cours),
        "attendance_summary": resume,
        "students": etudiants,
        "count": len(etudiants),
    }


@professeur_bp.route("/courses", methods=["GET"])
@role_required("professeur", "responsable")
def list_courses():
    query = Cours.query
    role = get_jwt().get("role")

    if role == "professeur":
        query = query.filter_by(professeur_id=int(get_jwt_identity()))

    statut = request.args.get("statut")
    if statut:
        query = query.filter_by(statut=statut)

    date_cours = request.args.get("date")
    if date_cours:
        try:
            parsed_date = datetime.strptime(date_cours, "%Y-%m-%d").date()
        except ValueError:
            return (
                jsonify(
                    {
                        "error": "bad_request",
                        "message": "Le paramètre date doit être au format YYYY-MM-DD.",
                        "details": {},
                    }
                ),
                400,
            )
        query = query.filter_by(date=parsed_date)

    page, per_page = get_pagination_params(request)
    payload = paginate_query(
        query.order_by(Cours.date.asc(), Cours.heure_debut.asc()),
        serialize_cours,
        page,
        per_page,
    )
    return (
        jsonify(
            {
                "courses": payload["items"],
                "count": payload["count"],
                "total": payload["total"],
                "pagination": payload["pagination"],
            }
        ),
        200,
    )


@professeur_bp.route("/courses/<int:cours_id>", methods=["GET"])
@role_required("professeur", "responsable")
def get_course(cours_id):
    cours, error_response = _get_accessible_course_or_403(cours_id)
    if error_response is not None:
        return error_response

    pointages = Pointage.query.filter_by(cours_id=cours.id).all()
    return (
        jsonify(
            {
                "course": serialize_cours(cours),
                "attendance_summary": {
                    "presents": sum(1 for item in pointages if item.statut == "present"),
                    "retards": sum(1 for item in pointages if item.statut == "retard"),
                    "invalides": sum(1 for item in pointages if item.statut == "invalide"),
                    "total_pointages": len(pointages),
                },
            }
        ),
        200,
    )


@professeur_bp.route("/courses/<int:cours_id>/qr", methods=["GET"])
@role_required("professeur", "responsable")
def get_qr_cours(cours_id):
    cours, error_response = _get_accessible_course_or_403(cours_id)
    if error_response is not None:
        return error_response

    resultat = generer_qr_cours(cours_id)
    return jsonify(resultat), 200


@professeur_bp.route("/courses/<int:cours_id>/attendance", methods=["GET"])
@role_required("professeur", "responsable")
def course_attendance(cours_id):
    cours, error_response = _get_accessible_course_or_403(cours_id)
    if error_response is not None:
        return error_response

    return jsonify(_course_attendance_payload(cours, utcnow())), 200


@professeur_bp.route("/courses/<int:cours_id>/attendance/stream", methods=["GET"])
@role_required("professeur", "responsable")
def stream_course_attendance(cours_id):
    """Flux SSE : pousse la feuille de presence a jour des qu'un pointage est enregistre
    ou regularise sur ce cours, en remplacement du polling front (return2.md section 5).

    Payload identique a GET .../attendance a chaque evenement, pour que le front
    reutilise le meme rendu que l'appel REST polle actuellement.
    """
    cours, error_response = _get_accessible_course_or_403(cours_id)
    if error_response is not None:
        return error_response

    cours_id_verrouille = cours.id

    def event_stream():
        abonnement = attendance_events.subscribe(cours_id_verrouille)
        try:
            yield _sse_message(_snapshot_attendance_payload(cours_id_verrouille))

            date_limite = time.monotonic() + _STREAM_MAX_DURATION_SECONDS
            while time.monotonic() < date_limite:
                try:
                    abonnement.get(timeout=_STREAM_HEARTBEAT_SECONDS)
                except queue.Empty:
                    yield ": keep-alive\n\n"
                    continue
                yield _sse_message(_snapshot_attendance_payload(cours_id_verrouille))
        finally:
            attendance_events.unsubscribe(cours_id_verrouille, abonnement)

    response = Response(stream_with_context(event_stream()), mimetype="text/event-stream")
    response.headers["Cache-Control"] = "no-cache"
    response.headers["X-Accel-Buffering"] = "no"
    return response


def _snapshot_attendance_payload(cours_id_value):
    cours = db.session.get(Cours, cours_id_value)
    if cours is None:
        return {"error": "cours_introuvable"}
    return _course_attendance_payload(cours, utcnow())


def _sse_message(data):
    return f"data: {json.dumps(data)}\n\n"


@professeur_bp.route("/courses/<int:cours_id>/cancel", methods=["POST"])
@role_required("professeur", "responsable")
def cancel_course(cours_id):
    cours, error_response = _get_accessible_course_or_403(cours_id)
    if error_response is not None:
        return error_response

    data = request.get_json(silent=True) or {}
    motif = (data.get("motif") or "").strip()
    if not motif:
        return (
            jsonify(
                {
                    "error": "bad_request",
                    "message": "Le motif d annulation est requis.",
                    "details": {},
                }
            ),
            400,
        )

    cours.annuler(motif)
    notifications = [
        Notification(
            destinataire_id=etudiant.id,
            cours_id=cours.id,
            type="cours_annule",
            message=(
                f"Le cours de {cours.matiere.nom} du {cours.date.isoformat()} "
                f"a ete annule. Motif: {motif}"
            ),
        )
        for etudiant in cours.promotion.etudiants
    ]
    if notifications:
        db.session.add_all(notifications)
    db.session.commit()

    return (
        jsonify(
            {
                "message": "Cours annule avec succes.",
                "course": serialize_cours(cours),
                "notifications_sent": len(notifications),
            }
        ),
        200,
    )


@professeur_bp.route("/courses/<int:cours_id>/reschedule", methods=["POST"])
@role_required("professeur", "responsable")
def reschedule_course(cours_id):
    cours, error_response = _get_accessible_course_or_403(cours_id)
    if error_response is not None:
        return error_response

    data = request.get_json(silent=True) or {}
    nouvelle_date = _payload_value(data, "date", "new_date")
    nouvelle_heure_debut = _payload_value(data, "heure_debut", "new_start_time")
    nouvelle_heure_fin = _payload_value(data, "heure_fin", "new_end_time")
    motif = _payload_value(data, "motif", "reason")
    salle_id = _payload_value(data, "salle_id", "room_id")

    if not nouvelle_date or not nouvelle_heure_debut or not nouvelle_heure_fin:
        return (
            jsonify(
                {
                    "error": "bad_request",
                    "message": (
                        "Les champs date/new_date, heure_debut/new_start_time et "
                        "heure_fin/new_end_time sont requis."
                    ),
                    "details": {
                        "accepted_fields": {
                            "date": ["date", "new_date"],
                            "heure_debut": ["heure_debut", "new_start_time"],
                            "heure_fin": ["heure_fin", "new_end_time"],
                            "motif": ["motif", "reason"],
                            "salle_id": ["salle_id", "room_id"],
                        }
                    },
                }
            ),
            400,
        )

    try:
        date_report = datetime.strptime(nouvelle_date, "%Y-%m-%d").date()
        heure_debut = datetime.strptime(nouvelle_heure_debut, "%H:%M:%S").time()
        heure_fin = datetime.strptime(nouvelle_heure_fin, "%H:%M:%S").time()
    except ValueError:
        return (
            jsonify(
                {
                    "error": "bad_request",
                    "message": "Les formats attendus sont date=YYYY-MM-DD et heure=HH:MM:SS.",
                    "details": {},
                }
            ),
            400,
        )

    if heure_fin <= heure_debut:
        return (
            jsonify(
                {
                    "error": "bad_request",
                    "message": "L'heure de fin doit etre posterieure a l'heure de debut.",
                    "details": {},
                }
            ),
            400,
        )

    if salle_id is not None:
        salle = db.session.get(Salle, salle_id)
        if salle is None:
            return (
                jsonify(
                    {
                        "error": "bad_request",
                        "message": "La salle fournie est invalide.",
                        "details": {},
                    }
                ),
                400,
            )
        cours.salle_id = salle.id

    conflicts = detect_schedule_conflicts(
        date_report,
        heure_debut,
        heure_fin,
        cours.professeur_id,
        cours.salle_id,
        cours.promotion_id,
        exclude_cours_id=cours.id,
    )
    if conflicts:
        return (
            jsonify(
                {
                    "error": "conflit_horaire",
                    "message": "Ce créneau chevauche un ou plusieurs cours existants.",
                    "details": {"conflicts": conflicts},
                }
            ),
            409,
        )

    cours.reporter(date_report, heure_debut)
    cours.heure_fin = heure_fin
    cours.motif_changement = motif
    db.session.commit()

    return (
        jsonify(
            {
                "message": "Cours reporte avec succes.",
                "course": serialize_cours(cours),
                "normalized_payload": {
                    "date": date_report.isoformat(),
                    "heure_debut": heure_debut.isoformat(),
                    "heure_fin": heure_fin.isoformat(),
                    "motif": motif,
                    "salle_id": cours.salle_id,
                },
            }
        ),
        200,
    )


@professeur_bp.route("/courses/<int:cours_id>/attendance/regularize", methods=["POST"])
@role_required("professeur", "responsable")
def regularize_attendance(cours_id):
    cours, error_response = _get_accessible_course_or_403(cours_id)
    if error_response is not None:
        return error_response

    data = request.get_json(silent=True) or {}
    etudiant_id = _payload_value(data, "etudiant_id", "student_id")
    statut = _payload_value(data, "statut", "status")
    justificatif = _payload_value(data, "justificatif", "reason")
    pointage_time = _payload_value(data, "pointage_time", "attendance_time")

    statuts_autorises = {"present", "retard", "absent", "absence_justifiee"}
    if not etudiant_id or statut not in statuts_autorises:
        return (
            jsonify(
                {
                    "error": "bad_request",
                    "message": "etudiant_id/student_id et un statut valide sont requis.",
                    "details": {
                        "allowed_statuses": sorted(statuts_autorises),
                        "accepted_fields": {
                            "etudiant_id": ["etudiant_id", "student_id"],
                            "statut": ["statut", "status"],
                            "justificatif": ["justificatif", "reason"],
                            "pointage_time": ["pointage_time", "attendance_time"],
                        },
                    },
                }
            ),
            400,
        )

    etudiant = db.session.get(Utilisateur, etudiant_id)
    if etudiant is None or etudiant.role != "etudiant" or etudiant.promotion_id != cours.promotion_id:
        return (
            jsonify(
                {
                    "error": "bad_request",
                    "message": "L'etudiant fourni n'appartient pas a la promotion du cours.",
                    "details": {},
                }
            ),
            400,
        )

    pointage = (
        Pointage.query.filter_by(
            cours_id=cours.id,
            etudiant_id=etudiant.id,
        )
        .filter(Pointage.statut.in_(list(statuts_autorises)))
        .order_by(Pointage.timestamp_pointage.desc())
        .first()
    )

    previous_status = pointage.statut if pointage else None
    if pointage is None:
        pointage = Pointage(
            cours_id=cours.id,
            etudiant_id=etudiant.id,
        )
        db.session.add(pointage)

    pointage_timestamp = utcnow()
    if pointage_time:
        try:
            pointage_timestamp = datetime.fromisoformat(pointage_time)
        except ValueError:
            return (
                jsonify(
                    {
                        "error": "bad_request",
                        "message": "pointage_time doit etre au format ISO 8601.",
                        "details": {},
                    }
                ),
                400,
            )

    pointage.timestamp_pointage = pointage_timestamp
    pointage.statut = statut
    pointage.methode = "force_admin"
    pointage.accorde_par = int(get_jwt_identity())
    pointage.justificatif = justificatif

    _apply_absence_tracking_delta(cours, etudiant.id, previous_status, statut)

    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return (
            jsonify(
                {
                    "error": "conflict",
                    "message": "Un pointage incompatible existe deja pour cet etudiant et ce cours.",
                    "details": {},
                }
            ),
            409,
        )

    attendance_events.publish(cours.id)

    return (
        jsonify(
            {
                "message": "Pointage regularise avec succes.",
                "attendance": serialize_pointage(pointage),
                "attendance_summary": _course_attendance_payload(cours, utcnow())["attendance_summary"],
            }
        ),
        200,
    )


@professeur_bp.route("/notifications", methods=["GET"])
@role_required("professeur", "responsable")
def list_notifications():
    notifications = Notification.query.filter_by(destinataire_id=int(get_jwt_identity())).order_by(
        Notification.created_at.desc()
    )

    page, per_page = get_pagination_params(request)
    payload = paginate_query(notifications, serialize_notification, page, per_page)
    return (
        jsonify(
            {
                "notifications": payload["items"],
                "count": payload["count"],
                "total": payload["total"],
                "pagination": payload["pagination"],
                "non_lues": Notification.query.filter_by(
                    destinataire_id=int(get_jwt_identity()),
                    lu=False,
                ).count(),
            }
        ),
        200,
    )


@professeur_bp.route("/notifications/<int:notification_id>/read", methods=["PATCH"])
@role_required("professeur", "responsable")
def mark_notification_as_read(notification_id):
    notification = Notification.query.filter_by(
        id=notification_id,
        destinataire_id=int(get_jwt_identity()),
    ).first()
    if notification is None:
        return (
            jsonify(
                {
                    "error": "not_found",
                    "message": "Notification introuvable.",
                    "details": {},
                }
            ),
            404,
        )

    notification.marquer_lu()
    db.session.commit()

    return (
        jsonify(
            {
                "message": "Notification marquee comme lue.",
                "notification": serialize_notification(notification),
            }
        ),
        200,
    )
