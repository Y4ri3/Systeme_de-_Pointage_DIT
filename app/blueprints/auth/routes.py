from flask import current_app, jsonify, request
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required

from app.blueprints.auth import auth_bp
from app.models.utilisateur import Utilisateur
from app.services.email_service import send_password_reset_email
from app.services.password_reset_service import (
    PasswordResetError,
    build_password_reset_url,
    generer_token_reinitialisation,
    resoudre_utilisateur_pour_token,
)
from app.utils.decorators import allow_password_change_required
from app.utils.helpers import get_or_404


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return (
            jsonify(
                {
                    "error": "bad_request",
                    "message": "Email et mot de passe requis.",
                    "details": {},
                }
            ),
            400,
        )

    user = Utilisateur.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return (
            jsonify(
                {
                    "error": "invalid_credentials",
                    "message": "Email ou mot de passe incorrect.",
                    "details": {},
                }
            ),
            401,
        )

    if user.statut == "inactif":
        return (
            jsonify(
                {
                    "error": "account_disabled",
                    "message": "Votre compte est désactivé. Contactez l'administration.",
                    "details": {},
                }
            ),
            403,
        )

    access_token = create_access_token(
        identity=str(user.id),
        additional_claims={
            "role": user.role,
            "must_change_password": user.must_change_password,
        },
    )

    return (
        jsonify(
            {
                "access_token": access_token,
                "token_type": "bearer",
                "role": user.role,
                "user_id": user.id,
                "must_change_password": user.must_change_password,
            }
        ),
        200,
    )


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
@allow_password_change_required
def me():
    user = get_or_404(Utilisateur, int(get_jwt_identity()), "Utilisateur introuvable.")
    promotion = user.promotion

    return (
        jsonify(
            {
                "id": user.id,
                "nom": user.nom,
                "prenom": user.prenom,
                "email": user.email,
                "role": user.role,
                "filiere": promotion.filiere.nom if promotion else None,
                "niveau": promotion.niveau if promotion else None,
                "statut": user.statut,
                "photo_url": f"/uploads/{user.photo.replace('\\', '/')}" if user.photo else None,
                "must_change_password": user.must_change_password,
            }
        ),
        200,
    )


@auth_bp.route("/change-password", methods=["POST"])
@jwt_required()
@allow_password_change_required
def change_password():
    user = get_or_404(Utilisateur, int(get_jwt_identity()), "Utilisateur introuvable.")
    data = request.get_json(silent=True) or {}
    current_password = data.get("current_password")
    new_password = data.get("new_password")

    if not current_password or not new_password:
        return (
            jsonify(
                {
                    "error": "bad_request",
                    "message": "current_password et new_password sont requis.",
                    "details": {},
                }
            ),
            400,
        )

    if not user.check_password(current_password):
        return (
            jsonify(
                {
                    "error": "invalid_credentials",
                    "message": "Le mot de passe actuel est incorrect.",
                    "details": {},
                }
            ),
            401,
        )

    if len(new_password) < 8:
        return (
            jsonify(
                {
                    "error": "bad_request",
                    "message": "Le nouveau mot de passe doit contenir au moins 8 caracteres.",
                    "details": {},
                }
            ),
            400,
        )

    user.set_password(new_password)
    user.must_change_password = False

    access_token = create_access_token(
        identity=str(user.id),
        additional_claims={"role": user.role, "must_change_password": False},
    )

    from app import db

    db.session.commit()

    return (
        jsonify(
            {
                "message": "Mot de passe mis a jour avec succes.",
                "access_token": access_token,
                "token_type": "bearer",
                "must_change_password": False,
            }
        ),
        200,
    )


@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    """Demande de reinitialisation, disponible pour les 4 roles (etudiant, professeur,
    responsable, admin) : ils partagent tous la table Utilisateur.

    Reponse volontairement generique et systematiquement 200, que l'email corresponde
    ou non a un compte, pour ne pas permettre a un tiers de deviner quels emails sont
    enregistres (enumeration d'utilisateurs).
    """
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip()

    generic_response = {
        "message": "Si un compte existe pour cet email, un lien de reinitialisation vient d'etre envoye.",
    }

    if not email:
        return (
            jsonify(
                {
                    "error": "bad_request",
                    "message": "Email requis.",
                    "details": {},
                }
            ),
            400,
        )

    user = Utilisateur.query.filter_by(email=email).first()
    if user is not None and user.statut == "actif":
        token = generer_token_reinitialisation(user)
        reset_url = build_password_reset_url(token)
        email_sent = send_password_reset_email(user, reset_url)
        if not email_sent:
            current_app.logger.warning(
                "Email de reinitialisation non envoye pour user_id=%s (SMTP non configure ou en echec).",
                user.id,
            )

    return jsonify(generic_response), 200


@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    data = request.get_json(silent=True) or {}
    token = data.get("token")
    new_password = data.get("new_password")

    if not token or not new_password:
        return (
            jsonify(
                {
                    "error": "bad_request",
                    "message": "token et new_password sont requis.",
                    "details": {},
                }
            ),
            400,
        )

    if len(new_password) < 8:
        return (
            jsonify(
                {
                    "error": "bad_request",
                    "message": "Le nouveau mot de passe doit contenir au moins 8 caracteres.",
                    "details": {},
                }
            ),
            400,
        )

    try:
        user = resoudre_utilisateur_pour_token(token)
    except PasswordResetError as e:
        return (
            jsonify(
                {
                    "error": e.code,
                    "message": e.message,
                    "details": {},
                }
            ),
            e.status_code,
        )

    if user.statut == "inactif":
        return (
            jsonify(
                {
                    "error": "account_disabled",
                    "message": "Votre compte est désactivé. Contactez l'administration.",
                    "details": {},
                }
            ),
            403,
        )

    from app import db

    user.set_password(new_password)
    user.must_change_password = False
    db.session.commit()

    return (
        jsonify(
            {
                "message": "Mot de passe reinitialise avec succes. Vous pouvez vous connecter.",
            }
        ),
        200,
    )
