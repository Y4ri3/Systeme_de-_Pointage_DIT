import os
import tempfile
from datetime import datetime, timedelta

from flask import current_app
from sqlalchemy.exc import IntegrityError

from app import db
from app.models.cours import Cours
from app.models.pointage import Pointage
from app.models.utilisateur import Utilisateur
from app.services import attendance_events, face_service, qr_service
from app.utils import utcnow


class PointageError(Exception):
    def __init__(self, code, message, status_code=400):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code


def _charger_cours_et_etudiant(cours_id, etudiant_id):
    cours = db.session.get(Cours, cours_id)
    if cours is None:
        raise PointageError("cours_introuvable", "Cours introuvable.", 404)

    etudiant = db.session.get(Utilisateur, etudiant_id)
    if etudiant is None:
        raise PointageError("etudiant_introuvable", "Etudiant introuvable.", 404)

    return cours, etudiant


def _verifier_gardes_metier(etudiant, cours):
    if etudiant.role != "etudiant":
        raise PointageError("utilisateur_non_etudiant", "Le profil fourni n est pas un etudiant.", 400)
    if etudiant.statut != "actif":
        raise PointageError("compte_inactif", "Le compte etudiant est inactif.", 403)
    if etudiant.promotion_id != cours.promotion_id:
        raise PointageError(
            "cours_non_autorise",
            "Cet etudiant n appartient pas a la promotion de ce cours.",
            403,
        )
    if cours.statut == "annule":
        raise PointageError("cours_annule", "Ce cours est annule et ne peut pas etre pointe.", 400)


def _calculer_statut(cours, timestamp):
    debut = datetime.combine(cours.date, cours.heure_debut)
    fin = datetime.combine(cours.date, cours.heure_fin)
    limite_present = debut + timedelta(minutes=cours.tolerance_retard_minutes)

    if timestamp <= limite_present:
        return "present"
    if timestamp <= fin:
        return "retard"
    raise PointageError("hors_delai", "Le délai de pointage pour ce cours est dépassé.", 400)


def _inserer_pointage_et_publier(
    cours_id, etudiant_id, timestamp, statut, methode, gps_lat, gps_lng, justificatif
):
    deja_pointe = (
        Pointage.query.filter_by(etudiant_id=etudiant_id, cours_id=cours_id)
        .filter(Pointage.statut.in_(["present", "retard"]))
        .first()
    )
    if deja_pointe is not None:
        raise PointageError("pointage_deja_enregistre", "Un pointage existe déjà pour ce cours.", 409)

    pointage = Pointage(
        cours_id=cours_id,
        etudiant_id=etudiant_id,
        timestamp_pointage=timestamp,
        statut=statut,
        methode=methode,
        latitude=gps_lat,
        longitude=gps_lng,
        justificatif=justificatif,
    )
    db.session.add(pointage)
    try:
        db.session.commit()
    except IntegrityError:
        # Filet de sécurité contre une race condition : deux requêtes concurrentes peuvent
        # toutes deux passer le contrôle applicatif ci-dessus avant que l'une des deux ne
        # commit. La contrainte unique partielle en base (cf. Pointage.__table_args__) tranche.
        db.session.rollback()
        raise PointageError("pointage_deja_enregistre", "Un pointage existe déjà pour ce cours.", 409)

    attendance_events.publish(cours_id)
    return pointage


def enregistrer_pointage(etudiant_id, cours_id, selfie_bytes, selfie_filename, gps_lat, gps_lng, timestamp):
    cours, etudiant = _charger_cours_et_etudiant(cours_id, etudiant_id)
    _verifier_gardes_metier(etudiant, cours)

    if not selfie_bytes:
        raise PointageError("selfie_requis", "Un selfie est requis pour le pointage facial.", 400)
    if not etudiant.photo:
        raise PointageError(
            "photo_reference_absente",
            "Aucune photo de reference n est enregistree pour cet etudiant.",
            400,
        )

    reference_path = face_service.reference_photo_path(etudiant.photo)
    if not os.path.exists(reference_path):
        raise PointageError(
            "photo_reference_introuvable",
            "La photo de reference de l etudiant est introuvable.",
            500,
        )

    verification = _verifier_visage(selfie_bytes, selfie_filename, reference_path)
    if not verification["is_real_face"]:
        return _enregistrer_invalide(
            etudiant_id,
            cours_id,
            "visage_non_vivant",
            gps_lat=gps_lat,
            gps_lng=gps_lng,
            justificatif=_build_face_justificatif(verification),
        )

    if not verification["match"]:
        return _enregistrer_invalide(
            etudiant_id,
            cours_id,
            "visage_non_reconnu",
            gps_lat=gps_lat,
            gps_lng=gps_lng,
            justificatif=_build_face_justificatif(verification),
        )

    statut = _calculer_statut(cours, timestamp)
    pointage = _inserer_pointage_et_publier(
        cours_id=cours_id,
        etudiant_id=etudiant_id,
        timestamp=timestamp,
        statut=statut,
        methode="face_recognition",
        gps_lat=gps_lat,
        gps_lng=gps_lng,
        justificatif=_build_face_justificatif(verification),
    )

    return {
        "success": True,
        "statut": statut,
        "pointage_id": pointage.id,
        "face_verification": _public_face_verification(verification),
    }


def enregistrer_pointage_par_qr(etudiant_id, token, gps_lat, gps_lng, timestamp):
    """Pointage alternatif au visage : l'étudiant scanne, depuis son propre compte, le QR
    affiché en salle pour le cours en cours. Le token embarque le cours_id et expire en
    QR_TOKEN_MAX_AGE_SECONDS (voir qr_service.py) — pas de vérification faciale ici, la
    preuve d'identité vient du JWT étudiant, la preuve de présence de la fraîcheur du QR.
    """
    cours_id = qr_service.resoudre_qr_token(token)
    if cours_id is None:
        raise PointageError("qr_invalide_ou_expire", "Le QR code est invalide ou a expiré.", 400)

    cours, etudiant = _charger_cours_et_etudiant(cours_id, etudiant_id)
    _verifier_gardes_metier(etudiant, cours)

    statut = _calculer_statut(cours, timestamp)
    pointage = _inserer_pointage_et_publier(
        cours_id=cours_id,
        etudiant_id=etudiant_id,
        timestamp=timestamp,
        statut=statut,
        methode="qr",
        gps_lat=gps_lat,
        gps_lng=gps_lng,
        justificatif=None,
    )

    return {
        "success": True,
        "statut": statut,
        "pointage_id": pointage.id,
    }


def identifier_etudiant_pour_borne(selfie_bytes, selfie_filename, timestamp=None):
    if not selfie_bytes:
        raise PointageError("selfie_requis", "Un selfie est requis pour identifier l etudiant.", 400)

    scan_time = timestamp or utcnow()
    temp_path = _write_temp_selfie(selfie_bytes, selfie_filename)

    try:
        liveness_info = _analyser_liveness_selfie(temp_path)
        liveness_probability = liveness_info.get("liveness_probability") or 0
        liveness_ok = (
            liveness_info.get("is_real_face")
            and liveness_probability >= current_app.config["ARSA_FACE_LIVENESS_THRESHOLD"]
        )
        if not liveness_ok:
            raise PointageError(
                "visage_non_vivant",
                "Le selfie ne correspond pas a un visage vivant valide.",
                400,
            )

        best_match = None
        for etudiant in _candidate_students_for_identification():
            reference_path = _reference_path_or_none(etudiant)
            if reference_path is None:
                continue

            match_info = _comparer_selfie_reference(temp_path, reference_path)
            verification = _build_face_verification(match_info, liveness_info)
            if not verification["match"]:
                continue

            score = verification.get("similarity_score")
            normalized_score = score if score is not None else 0
            if best_match is None or normalized_score > best_match["score"]:
                best_match = {
                    "student": etudiant,
                    "verification": verification,
                    "score": normalized_score,
                }

        if best_match is None:
            raise PointageError(
                "visage_non_reconnu",
                "Aucun etudiant correspondant n a ete reconnu.",
                404,
            )

        etudiant = best_match["student"]
        from app.utils.helpers import serialize_utilisateur

        return {
            "success": True,
            "student": serialize_utilisateur(etudiant),
            "attendance_context": _build_attendance_context(etudiant, scan_time),
            "face_verification": _public_face_verification(best_match["verification"]),
        }
    finally:
        _remove_file_if_exists(temp_path)


def _verifier_visage(selfie_bytes, selfie_filename, reference_path):
    temp_path = _write_temp_selfie(selfie_bytes, selfie_filename)
    try:
        match_info = _comparer_selfie_reference(temp_path, reference_path)
        liveness_info = _analyser_liveness_selfie(temp_path)
        return _build_face_verification(match_info, liveness_info)
    finally:
        _remove_file_if_exists(temp_path)


def _candidate_students_for_identification():
    return (
        Utilisateur.query.filter(
            Utilisateur.role == "etudiant",
            Utilisateur.statut == "actif",
            Utilisateur.photo.isnot(None),
            Utilisateur.promotion_id.isnot(None),
        )
        .order_by(Utilisateur.id.asc())
        .all()
    )


def _build_attendance_context(etudiant, timestamp):
    from app.utils.helpers import serialize_cours

    courses = (
        Cours.query.filter_by(
            promotion_id=etudiant.promotion_id,
            date=timestamp.date(),
        )
        .order_by(Cours.heure_debut.asc())
        .all()
    )

    active_course = None
    next_course = None
    for course in courses:
        if course.statut == "annule":
            continue

        start_at = datetime.combine(course.date, course.heure_debut)
        end_at = datetime.combine(course.date, course.heure_fin)
        if start_at <= timestamp <= end_at and active_course is None:
            active_course = course
        elif start_at > timestamp and next_course is None:
            next_course = course

    # Un etudiant deja pointe (present/retard) sur le cours actif ne doit pas pouvoir
    # re-declencher un pointage depuis la borne : le front s'appuie sur can_checkin_now
    # pour desactiver le bouton et eviter un double scan inutile.
    already_checked_in = False
    if active_course is not None:
        already_checked_in = (
            Pointage.query.filter_by(
                cours_id=active_course.id,
                etudiant_id=etudiant.id,
            )
            .filter(Pointage.statut.in_(["present", "retard"]))
            .first()
            is not None
        )

    return {
        "scan_timestamp": timestamp.isoformat(),
        "can_checkin_now": active_course is not None and not already_checked_in,
        "already_checked_in": already_checked_in,
        "active_course": serialize_cours(active_course, etudiant_id=etudiant.id) if active_course else None,
        "next_course": serialize_cours(next_course, etudiant_id=etudiant.id) if next_course else None,
        "today_courses": [serialize_cours(course, etudiant_id=etudiant.id) for course in courses],
    }


def _write_temp_selfie(selfie_bytes, selfie_filename):
    suffix = os.path.splitext(selfie_filename or "selfie.jpg")[1] or ".jpg"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
        temp_file.write(selfie_bytes)
        return temp_file.name


def _remove_file_if_exists(path):
    if path and os.path.exists(path):
        os.remove(path)


def _reference_path_or_none(etudiant):
    if not etudiant.photo:
        return None

    reference_path = face_service.reference_photo_path(etudiant.photo)
    if not os.path.exists(reference_path):
        return None
    return reference_path


def _comparer_selfie_reference(temp_path, reference_path):
    try:
        verification_payload = face_service.validate_faces(temp_path, reference_path)
        return face_service.extract_match_result(verification_payload)
    except face_service.FaceServiceError as exc:
        raise PointageError(exc.code, exc.message, exc.status_code) from exc


def _analyser_liveness_selfie(temp_path):
    try:
        liveness_payload = face_service.analyze_liveness(temp_path)
        return face_service.extract_liveness_result(liveness_payload)
    except face_service.FaceServiceError as exc:
        raise PointageError(exc.code, exc.message, exc.status_code) from exc


def _build_face_verification(match_info, liveness_info):
    similarity_score = match_info.get("similarity_score")
    similarity_ok = (
        similarity_score is None or similarity_score >= current_app.config["ARSA_FACE_MATCH_THRESHOLD"]
    )
    liveness_probability = liveness_info.get("liveness_probability") or 0
    liveness_ok = (
        liveness_info.get("is_real_face")
        and liveness_probability >= current_app.config["ARSA_FACE_LIVENESS_THRESHOLD"]
    )

    return {
        "match": bool(match_info.get("match")) and similarity_ok,
        "similarity_score": similarity_score,
        "is_real_face": liveness_ok,
        "liveness_probability": liveness_probability,
    }


def _build_face_justificatif(verification):
    similarity = verification.get("similarity_score")
    liveness = verification.get("liveness_probability")
    return (
        f"face_match={verification.get('match')};"
        f"similarity_score={similarity};liveness_probability={liveness}"
    )


def _public_face_verification(verification):
    return {
        "match": verification.get("match"),
        "similarity_score": verification.get("similarity_score"),
        "is_real_face": verification.get("is_real_face"),
        "liveness_probability": verification.get("liveness_probability"),
    }


def _enregistrer_invalide(etudiant_id, cours_id, raison, gps_lat, gps_lng, justificatif=None):
    pointage = _inserer_pointage_et_publier(
        cours_id=cours_id,
        etudiant_id=etudiant_id,
        timestamp=utcnow(),
        statut="invalide",
        methode="face_recognition",
        gps_lat=gps_lat,
        gps_lng=gps_lng,
        justificatif=justificatif,
    )

    return {
        "success": False,
        "statut": "invalide",
        "raison": raison,
        "pointage_id": pointage.id,
        "face_verification": {
            "match": False,
            "is_real_face": raison != "visage_non_vivant",
        },
    }
