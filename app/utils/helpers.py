from flask import abort
from flask import current_app

from app import db
from app.models.pointage import Pointage


def serialize_utilisateur(utilisateur):
    promotion = utilisateur.promotion
    photo = utilisateur.photo.replace('\\', '/') if utilisateur.photo else None
    return {
        'id': utilisateur.id,
        'nom': utilisateur.nom,
        'prenom': utilisateur.prenom,
        'email': utilisateur.email,
        'role': utilisateur.role,
        'statut': utilisateur.statut,
        'photo': photo,
        'photo_url': f"/uploads/{photo}" if photo else None,
        'must_change_password': utilisateur.must_change_password,
        'promotion': {
            'id': promotion.id,
            'niveau': promotion.niveau,
            'annee_academique': promotion.annee_academique,
            'filiere': promotion.filiere.nom,
        } if promotion else None,
    }


def serialize_cours(cours, etudiant_id=None):
    pointage = None
    if etudiant_id is not None:
        pointage = Pointage.query.filter_by(
            cours_id=cours.id,
            etudiant_id=etudiant_id,
        ).order_by(Pointage.timestamp_pointage.desc()).first()

    return {
        'id': cours.id,
        'date': cours.date.isoformat(),
        'heure_debut': cours.heure_debut.isoformat(),
        'heure_fin': cours.heure_fin.isoformat(),
        'statut': cours.statut,
        'motif_changement': cours.motif_changement,
        'tolerance_retard_minutes': cours.tolerance_retard_minutes,
        'matiere': {
            'id': cours.matiere.id,
            'code': cours.matiere.code,
            'nom': cours.matiere.nom,
            'credits': cours.matiere.credits,
        },
        'professeur': {
            'id': cours.professeur.id,
            'nom': cours.professeur.nom,
            'prenom': cours.professeur.prenom,
            'email': cours.professeur.email,
        },
        'salle': {
            'id': cours.salle.id,
            'nom': cours.salle.nom,
            'batiment': cours.salle.batiment,
        },
        'promotion': {
            'id': cours.promotion.id,
            'niveau': cours.promotion.niveau,
            'annee_academique': cours.promotion.annee_academique,
            'filiere': cours.promotion.filiere.nom,
        },
        'mon_pointage': serialize_pointage(pointage) if pointage else None,
    }


def serialize_pointage(pointage):
    if pointage is None:
        return None

    return {
        'id': pointage.id,
        'cours_id': pointage.cours_id,
        'etudiant_id': pointage.etudiant_id,
        'timestamp_pointage': pointage.timestamp_pointage.isoformat(),
        'statut': pointage.statut,
        'methode': pointage.methode,
        'wifi_detecte': pointage.wifi_detecte,
        'qr_valide': pointage.qr_valide,
        'latitude': pointage.latitude,
        'longitude': pointage.longitude,
        'justificatif': pointage.justificatif,
        'cours': {
            'id': pointage.cours.id,
            'date': pointage.cours.date.isoformat(),
            'heure_debut': pointage.cours.heure_debut.isoformat(),
            'heure_fin': pointage.cours.heure_fin.isoformat(),
            'matiere': pointage.cours.matiere.nom,
        } if pointage.cours else None,
    }


def serialize_notification(notification):
    return {
        'id': notification.id,
        'type': notification.type,
        'message': notification.message,
        'lu': notification.lu,
        'created_at': notification.created_at.isoformat(),
        'cours_id': notification.cours_id,
    }


def serialize_suivi_absence(suivi):
    return {
        'id': suivi.id,
        'etudiant_id': suivi.etudiant_id,
        'matiere': {
            'id': suivi.matiere.id,
            'code': suivi.matiere.code,
            'nom': suivi.matiere.nom,
        },
        'nombre_absences': suivi.nombre_absences,
        'nb_absences_justifiees': suivi.nb_absences_justifiees,
        'seuil_atteint': suivi.seuil_atteint,
        'updated_at': suivi.updated_at.isoformat(),
    }


def serialize_matiere(matiere):
    return {
        'id': matiere.id,
        'nom': matiere.nom,
        'code': matiere.code,
        'credits': matiere.credits,
    }


def serialize_salle(salle):
    return {
        'id': salle.id,
        'nom': salle.nom,
        'batiment': salle.batiment,
        'qr_code_token': salle.qr_code_token,
    }


def serialize_filiere(filiere):
    return {
        'id': filiere.id,
        'nom': filiere.nom,
    }


def serialize_promotion(promotion):
    return {
        'id': promotion.id,
        'niveau': promotion.niveau,
        'annee_academique': promotion.annee_academique,
        'filiere': serialize_filiere(promotion.filiere),
    }


def serialize_parametre(parametre):
    return {
        'id': parametre.id,
        'nom_etablissement': parametre.nom_etablissement,
        'seuil_absences': parametre.seuil_absences,
        'tolerance_retard_minutes_defaut': parametre.tolerance_retard_minutes_defaut,
        'contact_support_email': parametre.contact_support_email,
        'updated_at': parametre.updated_at.isoformat() if parametre.updated_at else None,
    }


def get_pagination_params(request, default_per_page=20, max_per_page=100):
    page = request.args.get('page', default=1, type=int) or 1
    per_page = request.args.get('per_page', default=default_per_page, type=int) or default_per_page
    page = max(page, 1)
    per_page = max(1, min(per_page, max_per_page))
    return page, per_page


def paginate_query(query, serializer, page, per_page):
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    return {
        'items': [serializer(item) for item in pagination.items],
        'pagination': {
            'page': pagination.page,
            'per_page': pagination.per_page,
            'pages': pagination.pages,
            'total': pagination.total,
            'has_next': pagination.has_next,
            'has_prev': pagination.has_prev,
        },
        'count': len(pagination.items),
        'total': pagination.total,
    }


def get_or_404(model, object_id, description='Ressource introuvable.'):
    instance = db.session.get(model, object_id)
    if instance is None:
        abort(404, description=description)
    return instance
