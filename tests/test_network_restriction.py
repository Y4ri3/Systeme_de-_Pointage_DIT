import pytest

from app import create_app
from app import db as _db
from app.models.utilisateur import Utilisateur


@pytest.fixture
def app():
    flask_app = create_app("testing")
    flask_app.config["ATTENDANCE_KIOSK_API_KEY"] = "test-kiosk-key"
    flask_app.config["KIOSK_ALLOWED_NETWORKS"] = ["10.0.0.0/24"]
    with flask_app.app_context():
        _db.create_all()
        yield flask_app
        _db.session.remove()
        _db.drop_all()


def _login(client, email, password="Password123!"):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
        environ_overrides={"REMOTE_ADDR": "10.0.0.5"},
    )
    assert response.status_code == 200
    return response.get_json()["access_token"]


def test_kiosk_scan_refuse_ip_hors_reseau_meme_avec_cle_de_borne_valide(app):
    client = app.test_client()
    resp = client.post(
        "/api/v1/attendance/kiosk/scan",
        headers={"X-Attendance-Kiosk-Key": "test-kiosk-key"},
        environ_overrides={"REMOTE_ADDR": "203.0.113.5"},
        data={},
    )
    assert resp.status_code == 403
    assert resp.get_json()["error"] == "kiosk_network_forbidden"


def test_kiosk_scan_refuse_ip_hors_reseau_meme_avec_jwt_staff_valide(app):
    responsable = Utilisateur(nom="Resp", prenom="Test", email="resp@test.com", role="responsable")
    responsable.set_password("Password123!")
    _db.session.add(responsable)
    _db.session.commit()

    client = app.test_client()
    token = _login(client, responsable.email)

    resp = client.post(
        "/api/v1/attendance/kiosk/scan",
        headers={"Authorization": f"Bearer {token}"},
        environ_overrides={"REMOTE_ADDR": "203.0.113.5"},
        data={},
    )
    assert resp.status_code == 403
    assert resp.get_json()["error"] == "kiosk_network_forbidden"


def test_kiosk_checkin_refuse_ip_hors_reseau(app):
    client = app.test_client()
    resp = client.post(
        "/api/v1/attendance/kiosk/checkin",
        headers={"X-Attendance-Kiosk-Key": "test-kiosk-key"},
        environ_overrides={"REMOTE_ADDR": "203.0.113.5"},
        data={},
    )
    assert resp.status_code == 403
    assert resp.get_json()["error"] == "kiosk_network_forbidden"


def test_kiosk_scan_depasse_le_controle_reseau_depuis_une_ip_autorisee(app):
    client = app.test_client()
    resp = client.post(
        "/api/v1/attendance/kiosk/scan",
        headers={"X-Attendance-Kiosk-Key": "test-kiosk-key"},
        environ_overrides={"REMOTE_ADDR": "10.0.0.42"},
        data={},
    )
    # Le hook réseau laisse passer ; l'échec suivant (selfie manquant) prouve qu'on l'a dépassé.
    assert resp.status_code == 400
    assert resp.get_json()["error"] == "bad_request"


def test_pas_de_restriction_si_kiosk_allowed_networks_vide(app):
    app.config["KIOSK_ALLOWED_NETWORKS"] = []
    client = app.test_client()
    resp = client.post(
        "/api/v1/attendance/kiosk/scan",
        headers={"X-Attendance-Kiosk-Key": "test-kiosk-key"},
        environ_overrides={"REMOTE_ADDR": "203.0.113.5"},
        data={},
    )
    assert resp.status_code == 400
    assert resp.get_json()["error"] == "bad_request"


def _login_etudiant(client, email="etudiant@test.com", password="Password123!"):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
        environ_overrides={"REMOTE_ADDR": "10.0.0.5"},
    )
    assert response.status_code == 200
    return response.get_json()["access_token"]


def test_checkin_qr_refuse_ip_hors_reseau_meme_avec_jwt_etudiant_valide(app):
    etudiant = Utilisateur(nom="Etu", prenom="Test", email="etudiant@test.com", role="etudiant")
    etudiant.set_password("Password123!")
    _db.session.add(etudiant)
    _db.session.commit()

    client = app.test_client()
    token = _login_etudiant(client)

    resp = client.post(
        "/api/v1/etudiant/attendance/checkin-qr",
        headers={"Authorization": f"Bearer {token}"},
        json={"token": "peu-importe"},
        environ_overrides={"REMOTE_ADDR": "203.0.113.5"},
    )
    assert resp.status_code == 403
    assert resp.get_json()["error"] == "kiosk_network_forbidden"


def test_checkin_qr_depasse_le_controle_reseau_depuis_une_ip_autorisee(app):
    etudiant = Utilisateur(nom="Etu", prenom="Test", email="etudiant@test.com", role="etudiant")
    etudiant.set_password("Password123!")
    _db.session.add(etudiant)
    _db.session.commit()

    client = app.test_client()
    token = _login_etudiant(client)

    resp = client.post(
        "/api/v1/etudiant/attendance/checkin-qr",
        headers={"Authorization": f"Bearer {token}"},
        json={"token": "peu-importe"},
        environ_overrides={"REMOTE_ADDR": "10.0.0.42"},
    )
    # Le hook réseau laisse passer ; l'échec suivant (token invalide) prouve qu'on l'a dépassé.
    assert resp.status_code == 400
    assert resp.get_json()["error"] == "qr_invalide_ou_expire"
