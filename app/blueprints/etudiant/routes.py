from datetime import date, datetime

from flask import current_app, jsonify, request
from flask_jwt_extended import get_jwt_identity

from app.blueprints.etudiant import etudiant_bp
from app.models.cours import Cours
from app.models.notification import Notification
from app.models.pointage import Pointage
from app.models.suivi_absences import SuiviAbsences
from app.models.utilisateur import Utilisateur
from app.services.pointage_service import PointageError, enregistrer_pointage
from app.utils import utcnow
from app.utils.decorators import role_required
from app.utils.helpers import (
    get_or_404,
    get_pagination_params,
    paginate_query,
    serialize_cours,
    serialize_notification,
    serialize_pointage,
    serialize_suivi_absence,
)


@etudiant_bp.route('/attendance/checkin', methods=['POST'])
@role_required('etudiant')
def checkin():
    # Depreciee : le pointage self-service depuis l'espace etudiant a ete retire du
    # front au profit du flow borne exclusif (voir /attendance/kiosk/*), un etudiant
    # connecte sur son propre appareil pouvant importer une ancienne photo au lieu de
    # se scanner en direct. Route conservee fonctionnelle pour d'eventuelles
    # integrations futures, mais ne doit plus etre le chemin nominal.
    current_app.logger.warning(
        'Appel a la route depreciee /etudiant/attendance/checkin par etudiant_id=%s. '
        'Le pointage nominal se fait desormais via /attendance/kiosk/*.',
        get_jwt_identity(),
    )

    if request.is_json:
        data = request.get_json(silent=True) or {}
        cours_id = data.get('course_id')
        gps_lat = data.get('gps_lat')
        gps_lng = data.get('gps_lng')
    else:
        data = request.form
        cours_id = request.form.get('course_id', type=int)
        gps_lat = request.form.get('gps_lat', type=float)
        gps_lng = request.form.get('gps_lng', type=float)

    timestamp_raw = data.get('timestamp')
    selfie = request.files.get('selfie')

    if not cours_id or selfie is None or not selfie.filename:
        return jsonify({
            'error': 'bad_request',
            'message': 'course_id et selfie sont requis.',
            'details': {},
        }), 400

    if request.is_json:
        try:
            cours_id = int(cours_id)
        except (TypeError, ValueError):
            return jsonify({
                'error': 'bad_request',
                'message': 'course_id doit etre un entier valide.',
                'details': {},
            }), 400

    timestamp_client = None
    if timestamp_raw:
        try:
            timestamp_client = datetime.fromisoformat(timestamp_raw)
        except (TypeError, ValueError):
            return jsonify({
                'error': 'bad_request',
                'message': 'Le format du timestamp est invalide (ISO 8601 attendu).',
                'details': {},
            }), 400

    if timestamp_client is not None:
        # Le timestamp fourni par le client n'est jamais utilisé pour la décision de statut
        # (present/retard/absent) : il est entièrement falsifiable. Seule l'heure serveur fait foi ;
        # le timestamp client n'est conservé ici qu'à des fins de logging/audit.
        current_app.logger.info(
            'Check-in facial cours=%s etudiant=%s timestamp_client=%s',
            cours_id, get_jwt_identity(), timestamp_client.isoformat(),
        )

    try:
        resultat = enregistrer_pointage(
            etudiant_id=int(get_jwt_identity()),
            cours_id=cours_id,
            selfie_bytes=selfie.read(),
            selfie_filename=selfie.filename,
            gps_lat=gps_lat,
            gps_lng=gps_lng,
            timestamp=utcnow(),
        )
    except PointageError as e:
        return jsonify({
            'error': e.code,
            'message': e.message,
            'details': {},
        }), e.status_code, {'Deprecation': 'true'}

    return jsonify(resultat), 201 if resultat['success'] else 200, {'Deprecation': 'true'}


@etudiant_bp.route('/courses', methods=['GET'])
@role_required('etudiant')
def list_courses():
    etudiant = get_or_404(Utilisateur, int(get_jwt_identity()), "Utilisateur introuvable.")
    if etudiant.promotion_id is None:
        return jsonify({
            'courses': [],
            'count': 0,
            'total': 0,
            'pagination': {
                'page': 1,
                'per_page': request.args.get('per_page', default=20, type=int) or 20,
                'pages': 0,
                'total': 0,
                'has_next': False,
                'has_prev': False,
            },
        }), 200

    query = Cours.query.filter_by(promotion_id=etudiant.promotion_id)

    statut = request.args.get('statut')
    if statut:
        query = query.filter_by(statut=statut)

    periode = request.args.get('periode')
    if periode == 'upcoming':
        query = query.filter(Cours.date >= date.today())
    elif periode == 'past':
        query = query.filter(Cours.date < date.today())

    page, per_page = get_pagination_params(request)
    payload = paginate_query(
        query.order_by(Cours.date.asc(), Cours.heure_debut.asc()),
        lambda item: serialize_cours(item, etudiant_id=etudiant.id),
        page,
        per_page,
    )
    return jsonify({
        'courses': payload['items'],
        'count': payload['count'],
        'total': payload['total'],
        'pagination': payload['pagination'],
    }), 200


@etudiant_bp.route('/attendance/history', methods=['GET'])
@role_required('etudiant')
def attendance_history():
    etudiant_id = int(get_jwt_identity())
    query = Pointage.query.filter_by(etudiant_id=etudiant_id)

    statut = request.args.get('statut')
    if statut:
        query = query.filter_by(statut=statut)

    page, per_page = get_pagination_params(request)
    payload = paginate_query(
        query.order_by(Pointage.timestamp_pointage.desc()),
        serialize_pointage,
        page,
        per_page,
    )
    return jsonify({
        'history': payload['items'],
        'count': payload['count'],
        'total': payload['total'],
        'pagination': payload['pagination'],
    }), 200


@etudiant_bp.route('/absences/summary', methods=['GET'])
@role_required('etudiant')
def absences_summary():
    suivis = SuiviAbsences.query.filter_by(
        etudiant_id=int(get_jwt_identity())
    ).order_by(SuiviAbsences.updated_at.desc()).all()

    total_absences = sum(item.nombre_absences for item in suivis)
    total_absences_justifiees = sum(item.nb_absences_justifiees for item in suivis)

    return jsonify({
        'subjects': [serialize_suivi_absence(item) for item in suivis],
        'total_absences': total_absences,
        'total_absences_justifiees': total_absences_justifiees,
        'seuils_atteints': sum(1 for item in suivis if item.seuil_atteint),
    }), 200


@etudiant_bp.route('/courses/<int:cours_id>/attendance/history', methods=['GET'])
@role_required('etudiant')
def course_attendance_history(cours_id):
    etudiant_id = int(get_jwt_identity())
    cours = get_or_404(Cours, cours_id, 'Cours introuvable.')

    etudiant = get_or_404(Utilisateur, etudiant_id, 'Utilisateur introuvable.')
    if etudiant.promotion_id != cours.promotion_id:
        return jsonify({
            'error': 'forbidden',
            'message': "Vous ne pouvez consulter que l'historique d'un cours de votre promotion.",
            'details': {},
        }), 403

    query = Pointage.query.filter_by(etudiant_id=etudiant_id, cours_id=cours_id)
    page, per_page = get_pagination_params(request)
    payload = paginate_query(
        query.order_by(Pointage.timestamp_pointage.desc()),
        serialize_pointage,
        page,
        per_page,
    )

    return jsonify({
        'course': serialize_cours(cours, etudiant_id=etudiant_id),
        'history': payload['items'],
        'count': payload['count'],
        'total': payload['total'],
        'pagination': payload['pagination'],
    }), 200


@etudiant_bp.route('/notifications', methods=['GET'])
@role_required('etudiant')
def list_notifications():
    notifications = Notification.query.filter_by(
        destinataire_id=int(get_jwt_identity())
    ).order_by(Notification.created_at.desc())

    page, per_page = get_pagination_params(request)
    payload = paginate_query(notifications, serialize_notification, page, per_page)

    return jsonify({
        'notifications': payload['items'],
        'count': payload['count'],
        'total': payload['total'],
        'pagination': payload['pagination'],
        'non_lues': Notification.query.filter_by(
            destinataire_id=int(get_jwt_identity()),
            lu=False,
        ).count(),
    }), 200


@etudiant_bp.route('/notifications/<int:notification_id>/read', methods=['PATCH'])
@role_required('etudiant')
def mark_notification_as_read(notification_id):
    notification = Notification.query.filter_by(
        id=notification_id,
        destinataire_id=int(get_jwt_identity()),
    ).first()
    if notification is None:
        return jsonify({
            'error': 'not_found',
            'message': 'Notification introuvable.',
            'details': {},
        }), 404

    notification.marquer_lu()
    from app import db
    db.session.commit()

    return jsonify({
        'message': 'Notification marquee comme lue.',
        'notification': serialize_notification(notification),
    }), 200
