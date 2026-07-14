import hashlib

from flask import current_app
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

PASSWORD_RESET_TOKEN_MAX_AGE_SECONDS = 30 * 60
_PASSWORD_RESET_SALT = "password-reset"


class PasswordResetError(Exception):
    def __init__(self, code, message, status_code=400):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code


def _get_serializer():
    return URLSafeTimedSerializer(current_app.config["SECRET_KEY"])


def _password_fingerprint(mot_de_passe_hash):
    """Empreinte courte du hash de mot de passe courant.

    Incluse dans le token pour le rendre a usage unique sans avoir besoin d'une table
    de tokens revoques : des qu'un reset (ou tout autre changement de mot de passe)
    aboutit, le hash change et toute empreinte anterieure devient invalide.
    """
    return hashlib.sha256(mot_de_passe_hash.encode("utf-8")).hexdigest()[:16]


def generer_token_reinitialisation(utilisateur):
    serializer = _get_serializer()
    payload = {
        "user_id": utilisateur.id,
        "pwd_fp": _password_fingerprint(utilisateur.mot_de_passe),
    }
    return serializer.dumps(payload, salt=_PASSWORD_RESET_SALT)


def build_password_reset_url(token):
    base_url = current_app.config["FRONTEND_PASSWORD_RESET_URL"]
    separator = "&" if "?" in base_url else "?"
    return f"{base_url}{separator}token={token}"


def resoudre_utilisateur_pour_token(token):
    """Decode le token, verifie sa validite/expiration puis son usage unique.

    Leve PasswordResetError avec un code distinct par cas d'echec, pour permettre au
    front d'afficher un message adapte (lien expire vs lien deja utilise vs invalide).
    """
    from app import db
    from app.models.utilisateur import Utilisateur

    serializer = _get_serializer()
    try:
        data = serializer.loads(
            token,
            salt=_PASSWORD_RESET_SALT,
            max_age=PASSWORD_RESET_TOKEN_MAX_AGE_SECONDS,
        )
    except SignatureExpired as exc:
        raise PasswordResetError(
            "token_expire",
            "Le lien de reinitialisation a expire. Demandez-en un nouveau.",
            400,
        ) from exc
    except BadSignature as exc:
        raise PasswordResetError(
            "token_invalide",
            "Le lien de reinitialisation est invalide.",
            400,
        ) from exc

    if not isinstance(data, dict) or "user_id" not in data or "pwd_fp" not in data:
        raise PasswordResetError("token_invalide", "Le lien de reinitialisation est invalide.", 400)

    utilisateur = db.session.get(Utilisateur, data["user_id"])
    if utilisateur is None:
        raise PasswordResetError("token_invalide", "Le lien de reinitialisation est invalide.", 400)

    if data["pwd_fp"] != _password_fingerprint(utilisateur.mot_de_passe):
        raise PasswordResetError(
            "token_deja_utilise",
            "Ce lien de reinitialisation a deja ete utilise ou n est plus valide. Demandez-en un nouveau.",
            400,
        )

    return utilisateur
