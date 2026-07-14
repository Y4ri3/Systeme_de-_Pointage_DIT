from datetime import date, time, timedelta

import pytest
from sqlalchemy.exc import IntegrityError

from app import create_app
from app import db as _db
from app.models.cours import Cours
from app.models.filiere import Filiere
from app.models.matiere import Matiere
from app.models.parametre import Parametre
from app.models.promotion import Promotion
from app.models.salle import Salle
from app.models.suivi_absences import SuiviAbsences
from app.models.utilisateur import Utilisateur


@pytest.fixture
def app():
    flask_app = create_app("testing")
    with flask_app.app_context():
        _db.create_all()
        yield flask_app
        _db.session.remove()
        _db.drop_all()


def _login(client, email, password="Password123!"):
    response = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200
    return response.get_json()["access_token"]


def _creer_etudiant_et_matiere():
    filiere = Filiere(nom="Big Data")
    matiere = Matiere(nom="Fondamentaux du Big Data", code="BD-101", credits=6)
    _db.session.add_all([filiere, matiere])
    _db.session.flush()

    promotion = Promotion(niveau="L1", filiere_id=filiere.id, annee_academique="2025-2026")
    etudiant = Utilisateur(
        nom="Etu",
        prenom="Test",
        email="etudiant@test.com",
        role="etudiant",
        promotion=promotion,
    )
    etudiant.set_password("Password123!")
    _db.session.add_all([promotion, etudiant])
    _db.session.commit()
    return etudiant, matiere


def _creer_cours_passe(jour, heure_debut, heure_fin):
    """Crée un cours (avec professeur, étudiant, matière) déjà terminé, utilisable pour la régularisation."""
    filiere = Filiere(nom="Big Data")
    _db.session.add(filiere)
    _db.session.flush()

    promotion = Promotion(niveau="L1", filiere_id=filiere.id, annee_academique="2025-2026")
    professeur = Utilisateur(nom="Prof", prenom="Test", email="prof@test.com", role="professeur")
    professeur.set_password("Password123!")
    etudiant = Utilisateur(nom="Etu", prenom="Test", email="etudiant@test.com", role="etudiant")
    etudiant.set_password("Password123!")
    matiere = Matiere(nom="Fondamentaux du Big Data", code="BD-101", credits=6)
    salle = Salle(nom="A101")
    _db.session.add_all([promotion, professeur, etudiant, matiere, salle])
    _db.session.flush()
    etudiant.promotion_id = promotion.id

    cours = Cours(
        matiere_id=matiere.id,
        professeur_id=professeur.id,
        salle_id=salle.id,
        promotion_id=promotion.id,
        date=jour,
        heure_debut=heure_debut,
        heure_fin=heure_fin,
        created_by=professeur.id,
    )
    _db.session.add(cours)
    _db.session.commit()
    return cours, professeur, etudiant


def _creer_responsable():
    responsable = Utilisateur(nom="Resp", prenom="Test", email="responsable@test.com", role="responsable")
    responsable.set_password("Password123!")
    _db.session.add(responsable)
    _db.session.commit()
    return responsable


# --- Tests unitaires sur le modèle SuiviAbsences ---


def test_incrementer_declenche_seuil_atteint_une_fois_le_seuil_par_defaut_atteint(app):
    etudiant, matiere = _creer_etudiant_et_matiere()
    suivi = SuiviAbsences(etudiant_id=etudiant.id, matiere_id=matiere.id)
    _db.session.add(suivi)
    _db.session.commit()

    seuil = Parametre.get_solo().seuil_absences  # 3 par défaut
    for _ in range(seuil - 1):
        suivi.incrementer()
    assert suivi.seuil_atteint is False

    suivi.incrementer()
    assert suivi.nombre_absences == seuil
    assert suivi.seuil_atteint is True


def test_justifier_decremente_les_absences_et_repasse_sous_le_seuil(app):
    etudiant, matiere = _creer_etudiant_et_matiere()
    suivi = SuiviAbsences(etudiant_id=etudiant.id, matiere_id=matiere.id)
    _db.session.add(suivi)
    _db.session.commit()

    for _ in range(3):
        suivi.incrementer()
    assert suivi.seuil_atteint is True

    suivi.justifier()
    assert suivi.nombre_absences == 2
    assert suivi.nb_absences_justifiees == 1
    assert suivi.seuil_atteint is False


def test_justifier_est_sans_effet_si_aucune_absence_injustifiee(app):
    etudiant, matiere = _creer_etudiant_et_matiere()
    suivi = SuiviAbsences(etudiant_id=etudiant.id, matiere_id=matiere.id)
    _db.session.add(suivi)
    _db.session.commit()

    suivi.justifier()

    assert suivi.nombre_absences == 0
    assert suivi.nb_absences_justifiees == 0


def test_contrainte_unique_etudiant_matiere_est_appliquee(app):
    etudiant, matiere = _creer_etudiant_et_matiere()
    _db.session.add(SuiviAbsences(etudiant_id=etudiant.id, matiere_id=matiere.id))
    _db.session.commit()

    _db.session.add(SuiviAbsences(etudiant_id=etudiant.id, matiere_id=matiere.id))
    with pytest.raises(IntegrityError):
        _db.session.commit()
    _db.session.rollback()


# --- Tests d'intégration : régularisation par le professeur et suivi des absences ---


def test_regularisation_absent_vers_present_annule_l_absence_comptee(app):
    hier = date.today() - timedelta(days=1)
    cours, professeur, etudiant = _creer_cours_passe(hier, time(9, 0), time(11, 0))

    client = app.test_client()
    headers = {"Authorization": f"Bearer {_login(client, professeur.email)}"}

    resp_absent = client.post(
        f"/api/v1/professeur/courses/{cours.id}/attendance/regularize",
        headers=headers,
        json={"etudiant_id": etudiant.id, "statut": "absent"},
    )
    assert resp_absent.status_code == 200

    suivi = SuiviAbsences.query.filter_by(etudiant_id=etudiant.id, matiere_id=cours.matiere_id).first()
    assert suivi.nombre_absences == 1

    resp_present = client.post(
        f"/api/v1/professeur/courses/{cours.id}/attendance/regularize",
        headers=headers,
        json={"etudiant_id": etudiant.id, "statut": "present"},
    )
    assert resp_present.status_code == 200

    _db.session.refresh(suivi)
    assert suivi.nombre_absences == 0


def test_justify_absence_refuse_si_aucune_absence_injustifiee(app):
    hier = date.today() - timedelta(days=1)
    cours, _professeur, etudiant = _creer_cours_passe(hier, time(9, 0), time(11, 0))
    suivi = SuiviAbsences(etudiant_id=etudiant.id, matiere_id=cours.matiere_id)
    _db.session.add(suivi)
    _db.session.commit()

    responsable = _creer_responsable()
    client = app.test_client()
    headers = {"Authorization": f"Bearer {_login(client, responsable.email)}"}

    resp = client.post(f"/api/v1/admin/absences/{suivi.id}/justify", headers=headers)
    assert resp.status_code == 400
    assert resp.get_json()["error"] == "bad_request"


def test_admin_peut_filtrer_les_absences_par_seuil_atteint(app):
    hier = date.today() - timedelta(days=1)
    cours, _professeur, etudiant = _creer_cours_passe(hier, time(9, 0), time(11, 0))

    suivi_critique = SuiviAbsences(
        etudiant_id=etudiant.id,
        matiere_id=cours.matiere_id,
        nombre_absences=3,
        seuil_atteint=True,
    )
    _db.session.add(suivi_critique)
    _db.session.commit()

    responsable = _creer_responsable()
    client = app.test_client()
    headers = {"Authorization": f"Bearer {_login(client, responsable.email)}"}

    resp_critique = client.get("/api/v1/admin/absences?seuil_atteint=true", headers=headers)
    assert resp_critique.status_code == 200
    payload_critique = resp_critique.get_json()
    assert payload_critique["count"] == 1
    assert payload_critique["absence_tracking"][0]["id"] == suivi_critique.id

    resp_non_critique = client.get("/api/v1/admin/absences?seuil_atteint=false", headers=headers)
    assert resp_non_critique.get_json()["count"] == 0
