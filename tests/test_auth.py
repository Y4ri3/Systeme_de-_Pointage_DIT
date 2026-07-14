import re

import pytest

from app import create_app
from app import db as _db
from app import mail
from app.models.utilisateur import Utilisateur


@pytest.fixture
def app(tmp_path):
    flask_app = create_app("testing")
    flask_app.config["UPLOAD_FOLDER"] = str(tmp_path / "uploads")
    with flask_app.app_context():
        _db.create_all()
        yield flask_app
        _db.session.remove()
        _db.drop_all()


def _create_user(role, email, password="Password123!"):
    user = Utilisateur(nom="Nom", prenom="Prenom", email=email, role=role)
    user.set_password(password)
    _db.session.add(user)
    _db.session.commit()
    return user


def _extract_token_from_email(body):
    match = re.search(r"token=([^\s&]+)", body)
    assert match is not None, f"Aucun token trouve dans le corps du mail : {body}"
    return match.group(1)


@pytest.mark.parametrize("role", ["etudiant", "professeur", "responsable", "admin"])
def test_forgot_password_envoie_un_lien_pour_chaque_role(app, role):
    user = _create_user(role, f"{role}@test.com")
    client = app.test_client()

    with mail.record_messages() as outbox:
        resp = client.post("/api/v1/auth/forgot-password", json={"email": user.email})

    assert resp.status_code == 200
    assert "lien de reinitialisation" in resp.get_json()["message"]
    assert len(outbox) == 1
    assert outbox[0].recipients == [user.email]
    assert "reset-password" in outbox[0].body
    assert "token=" in outbox[0].body


def test_forgot_password_reste_generique_si_email_inconnu(app):
    client = app.test_client()

    with mail.record_messages() as outbox:
        resp = client.post("/api/v1/auth/forgot-password", json={"email": "inconnu@test.com"})

    # Meme statut et meme message qu'un email connu : evite l'enumeration de comptes.
    assert resp.status_code == 200
    assert "lien de reinitialisation" in resp.get_json()["message"]
    assert len(outbox) == 0


def test_forgot_password_ne_notifie_pas_un_compte_desactive(app):
    user = _create_user("etudiant", "inactif@test.com")
    user.statut = "inactif"
    _db.session.commit()

    client = app.test_client()
    with mail.record_messages() as outbox:
        resp = client.post("/api/v1/auth/forgot-password", json={"email": user.email})

    assert resp.status_code == 200
    assert len(outbox) == 0


def test_reset_password_change_le_mot_de_passe_et_permet_la_connexion(app):
    user = _create_user("etudiant", "etu@test.com", password="AncienMdp123!")
    client = app.test_client()

    with mail.record_messages() as outbox:
        client.post("/api/v1/auth/forgot-password", json={"email": user.email})
    token = _extract_token_from_email(outbox[0].body)

    reset_resp = client.post(
        "/api/v1/auth/reset-password",
        json={
            "token": token,
            "new_password": "NouveauMdp456!",
        },
    )
    assert reset_resp.status_code == 200

    ancien_login = client.post(
        "/api/v1/auth/login",
        json={
            "email": user.email,
            "password": "AncienMdp123!",
        },
    )
    assert ancien_login.status_code == 401

    nouveau_login = client.post(
        "/api/v1/auth/login",
        json={
            "email": user.email,
            "password": "NouveauMdp456!",
        },
    )
    assert nouveau_login.status_code == 200


def test_reset_password_token_est_a_usage_unique(app):
    user = _create_user("professeur", "prof@test.com")
    client = app.test_client()

    with mail.record_messages() as outbox:
        client.post("/api/v1/auth/forgot-password", json={"email": user.email})
    token = _extract_token_from_email(outbox[0].body)

    premier = client.post(
        "/api/v1/auth/reset-password",
        json={
            "token": token,
            "new_password": "PremierMdp123!",
        },
    )
    assert premier.status_code == 200

    second = client.post(
        "/api/v1/auth/reset-password",
        json={
            "token": token,
            "new_password": "SecondMdp123!",
        },
    )
    assert second.status_code == 400
    assert second.get_json()["error"] == "token_deja_utilise"


def test_reset_password_rejette_un_token_invalide(app):
    client = app.test_client()
    resp = client.post(
        "/api/v1/auth/reset-password",
        json={
            "token": "ceci-nest-pas-un-token-valide",
            "new_password": "NouveauMdp123!",
        },
    )
    assert resp.status_code == 400
    assert resp.get_json()["error"] == "token_invalide"


def test_reset_password_rejette_un_mot_de_passe_trop_court(app):
    user = _create_user("responsable", "resp@test.com")
    client = app.test_client()

    with mail.record_messages() as outbox:
        client.post("/api/v1/auth/forgot-password", json={"email": user.email})
    token = _extract_token_from_email(outbox[0].body)

    resp = client.post(
        "/api/v1/auth/reset-password",
        json={
            "token": token,
            "new_password": "court",
        },
    )
    assert resp.status_code == 400


def test_reset_password_apres_changement_de_mot_de_passe_normal_invalide_lancien_token(app):
    """L'empreinte du hash incluse dans le token le rend caduc des que le mot de
    passe change par n'importe quel autre canal (change-password), pas seulement
    apres un premier reset."""
    user = _create_user("admin", "admin@test.com", password="AncienMdp123!")
    client = app.test_client()

    with mail.record_messages() as outbox:
        client.post("/api/v1/auth/forgot-password", json={"email": user.email})
    token = _extract_token_from_email(outbox[0].body)

    login = client.post(
        "/api/v1/auth/login",
        json={
            "email": user.email,
            "password": "AncienMdp123!",
        },
    )
    access_token = login.get_json()["access_token"]

    client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "AncienMdp123!", "new_password": "ChangeNormal123!"},
        headers={"Authorization": f"Bearer {access_token}"},
    )

    resp = client.post(
        "/api/v1/auth/reset-password",
        json={
            "token": token,
            "new_password": "ViaResetApres123!",
        },
    )
    assert resp.status_code == 400
    assert resp.get_json()["error"] == "token_deja_utilise"
