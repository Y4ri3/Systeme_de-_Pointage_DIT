import socket

from flask import current_app
from flask_mail import Message

from app import mail

_original_getfqdn = socket.getfqdn


def _safe_getfqdn(name=""):
    """Neutralise les hostnames locaux malformes (ex. contenant une virgule, invalide
    dans la commande EHLO/HELO SMTP) que socket.getfqdn() peut renvoyer selon la config
    reseau/DNS de la machine (observe sur certains postes Windows derriere un routeur
    grand public). smtplib.SMTP() s'appuie sur cette fonction sans que flask-mail
    n'expose de moyen de le configurer autrement.
    """
    fqdn = _original_getfqdn(name)
    return socket.gethostname() if ("," in fqdn or " " in fqdn) else fqdn


socket.getfqdn = _safe_getfqdn


def _send_email(recipient, subject, body):
    sender = current_app.config.get("MAIL_DEFAULT_SENDER") or current_app.config.get("MAIL_USERNAME")
    if not sender:
        current_app.logger.warning("Email non envoye pour %s : expediteur non configure.", recipient)
        return False

    if not current_app.config.get("TESTING") and (
        not current_app.config.get("MAIL_USERNAME") or not current_app.config.get("MAIL_PASSWORD")
    ):
        current_app.logger.warning("Email non envoye pour %s : configuration SMTP incomplete.", recipient)
        return False

    message = Message(subject=subject, recipients=[recipient], sender=sender)
    message.body = body

    try:
        mail.send(message)
        return True
    except Exception:
        current_app.logger.exception("Echec envoi email vers %s", recipient)
        return False


def send_temporary_password_email(user, temporary_password):
    body = (
        f"Bonjour {user.prenom} {user.nom},\n\n"
        "Un compte a ete cree pour vous sur la plateforme de pointage.\n"
        f"Identifiant : {user.email}\n"
        f"Mot de passe temporaire : {temporary_password}\n\n"
        "Lors de votre premiere connexion, vous devrez obligatoirement changer ce mot de passe.\n"
    )
    return _send_email(user.email, "Vos acces temporaires - Systeme de pointage", body)


def send_password_reset_email(user, reset_url):
    from app.services.password_reset_service import PASSWORD_RESET_TOKEN_MAX_AGE_SECONDS

    minutes = PASSWORD_RESET_TOKEN_MAX_AGE_SECONDS // 60
    body = (
        f"Bonjour {user.prenom} {user.nom},\n\n"
        "Une demande de reinitialisation de mot de passe a ete effectuee pour votre compte.\n"
        f"Cliquez sur le lien suivant pour choisir un nouveau mot de passe (valable {minutes} minutes) :\n"
        f"{reset_url}\n\n"
        "Si vous n etes pas a l origine de cette demande, ignorez cet email : "
        "votre mot de passe actuel reste valide et rien ne change.\n"
    )
    return _send_email(user.email, "Reinitialisation de votre mot de passe - Systeme de pointage", body)
