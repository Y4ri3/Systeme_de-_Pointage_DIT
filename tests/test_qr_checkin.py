import time as time_module
from datetime import datetime, timedelta

import pytest

from app import create_app
from app import db as _db
from app.models.cours import Cours
from app.models.filiere import Filiere
from app.models.matiere import Matiere
from app.models.promotion import Promotion
from app.models.salle import Salle
from app.models.utilisateur import Utilisateur
from app.services import qr_service
from app.services.pointage_service import PointageError, enregistrer_pointage_par_qr

REF = datetime(2026, 7, 3, 10, 0, 0)


@pytest.fixture
def app():
    flask_app = create_app("testing")
    with flask_app.app_context():
        _db.create_all()
        yield flask_app
        _db.session.remove()
        _db.drop_all()


def _creer_cours(heure_debut, heure_fin, tolerance_retard_minutes=10, jour=None, promotion_etudiant=True):
    jour = jour or REF.date()

    filiere = Filiere(nom="Big Data")
    _db.session.add(filiere)
    _db.session.flush()

    promotion = Promotion(niveau="L1", filiere_id=filiere.id, annee_academique="2025-2026")
    autre_promotion = Promotion(niveau="L2", filiere_id=filiere.id, annee_academique="2025-2026")
    professeur = Utilisateur(nom="Prof", prenom="Test", email="prof@test.com", role="professeur")
    professeur.set_password("secret")
    etudiant = Utilisateur(nom="Etu", prenom="Test", email="etudiant@test.com", role="etudiant")
    etudiant.set_password("secret")
    matiere = Matiere(nom="Fondamentaux du Big Data", code="BD-101")
    salle = Salle(nom="A101")
    _db.session.add_all([promotion, autre_promotion, professeur, etudiant, matiere, salle])
    _db.session.flush()
    etudiant.promotion_id = promotion.id if promotion_etudiant else autre_promotion.id

    cours = Cours(
        matiere_id=matiere.id,
        professeur_id=professeur.id,
        salle_id=salle.id,
        promotion_id=promotion.id,
        date=jour,
        heure_debut=heure_debut,
        heure_fin=heure_fin,
        tolerance_retard_minutes=tolerance_retard_minutes,
        created_by=professeur.id,
    )
    _db.session.add(cours)
    _db.session.commit()

    return cours, etudiant


def test_qr_checkin_avant_la_limite_de_tolerance_est_present(app):
    cours, etudiant = _creer_cours(
        heure_debut=REF.time(),
        heure_fin=(REF + timedelta(hours=2)).time(),
        tolerance_retard_minutes=10,
    )
    qr = qr_service.generer_qr_cours(cours.id)

    resultat = enregistrer_pointage_par_qr(
        etudiant_id=etudiant.id,
        token=qr["token"],
        gps_lat=None,
        gps_lng=None,
        timestamp=REF,
    )

    assert resultat["success"] is True
    assert resultat["statut"] == "present"


def test_qr_checkin_apres_la_tolerance_mais_avant_la_fin_est_retard(app):
    cours, etudiant = _creer_cours(
        heure_debut=REF.time(),
        heure_fin=(REF + timedelta(hours=2)).time(),
        tolerance_retard_minutes=10,
    )
    qr = qr_service.generer_qr_cours(cours.id)

    resultat = enregistrer_pointage_par_qr(
        etudiant_id=etudiant.id,
        token=qr["token"],
        gps_lat=None,
        gps_lng=None,
        timestamp=REF + timedelta(minutes=30),
    )

    assert resultat["statut"] == "retard"


def test_qr_checkin_apres_la_fin_du_cours_est_refuse(app):
    cours, etudiant = _creer_cours(
        heure_debut=REF.time(),
        heure_fin=(REF + timedelta(hours=2)).time(),
        tolerance_retard_minutes=10,
    )
    qr = qr_service.generer_qr_cours(cours.id)

    with pytest.raises(PointageError) as exc_info:
        enregistrer_pointage_par_qr(
            etudiant_id=etudiant.id,
            token=qr["token"],
            gps_lat=None,
            gps_lng=None,
            timestamp=REF + timedelta(hours=3),
        )

    assert exc_info.value.code == "hors_delai"


def test_qr_checkin_token_invalide_est_refuse(app):
    with pytest.raises(PointageError) as exc_info:
        enregistrer_pointage_par_qr(
            etudiant_id=1,
            token="ceci-nest-pas-un-token-valide",
            gps_lat=None,
            gps_lng=None,
            timestamp=REF,
        )

    assert exc_info.value.code == "qr_invalide_ou_expire"
    assert exc_info.value.status_code == 400


def test_qr_token_expire_est_resolu_a_none(app, monkeypatch):
    cours, _etudiant = _creer_cours(
        heure_debut=REF.time(),
        heure_fin=(REF + timedelta(hours=2)).time(),
    )
    qr = qr_service.generer_qr_cours(cours.id)

    monkeypatch.setattr(qr_service, "QR_TOKEN_MAX_AGE_SECONDS", 0)
    time_module.sleep(1)

    assert qr_service.resoudre_qr_token(qr["token"]) is None


def test_qr_checkin_etudiant_hors_promotion_est_refuse(app):
    cours, etudiant = _creer_cours(
        heure_debut=REF.time(),
        heure_fin=(REF + timedelta(hours=2)).time(),
        promotion_etudiant=False,
    )
    qr = qr_service.generer_qr_cours(cours.id)

    with pytest.raises(PointageError) as exc_info:
        enregistrer_pointage_par_qr(
            etudiant_id=etudiant.id,
            token=qr["token"],
            gps_lat=None,
            gps_lng=None,
            timestamp=REF,
        )

    assert exc_info.value.code == "cours_non_autorise"


def test_qr_checkin_double_pointage_est_refuse(app):
    cours, etudiant = _creer_cours(
        heure_debut=REF.time(),
        heure_fin=(REF + timedelta(hours=2)).time(),
    )

    premier_qr = qr_service.generer_qr_cours(cours.id)
    enregistrer_pointage_par_qr(
        etudiant_id=etudiant.id,
        token=premier_qr["token"],
        gps_lat=None,
        gps_lng=None,
        timestamp=REF,
    )

    second_qr = qr_service.generer_qr_cours(cours.id)
    with pytest.raises(PointageError) as exc_info:
        enregistrer_pointage_par_qr(
            etudiant_id=etudiant.id,
            token=second_qr["token"],
            gps_lat=None,
            gps_lng=None,
            timestamp=REF + timedelta(minutes=5),
        )

    assert exc_info.value.code == "pointage_deja_enregistre"


def test_route_checkin_qr_sans_token_renvoie_400(app):
    _cours, etudiant = _creer_cours(
        heure_debut=REF.time(),
        heure_fin=(REF + timedelta(hours=2)).time(),
    )
    client = app.test_client()
    login = client.post(
        "/api/v1/auth/login",
        json={"email": etudiant.email, "password": "secret"},
    )
    token = login.get_json()["access_token"]

    resp = client.post(
        "/api/v1/etudiant/attendance/checkin-qr",
        headers={"Authorization": f"Bearer {token}"},
        json={},
    )
    assert resp.status_code == 400
    assert resp.get_json()["error"] == "bad_request"


def test_route_checkin_qr_avec_token_invalide_renvoie_400(app):
    _cours, etudiant = _creer_cours(
        heure_debut=REF.time(),
        heure_fin=(REF + timedelta(hours=2)).time(),
    )
    client = app.test_client()
    login = client.post(
        "/api/v1/auth/login",
        json={"email": etudiant.email, "password": "secret"},
    )
    token = login.get_json()["access_token"]

    resp = client.post(
        "/api/v1/etudiant/attendance/checkin-qr",
        headers={"Authorization": f"Bearer {token}"},
        json={"token": "pas-un-token-valide"},
    )
    assert resp.status_code == 400
    assert resp.get_json()["error"] == "qr_invalide_ou_expire"
