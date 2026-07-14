from datetime import date, time, timedelta
from io import BytesIO

import pytest

from app import create_app
from app import db as _db
from app.models.cours import Cours
from app.models.filiere import Filiere
from app.models.matiere import Matiere
from app.models.promotion import Promotion
from app.models.salle import Salle
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


def _login(client, email, password="Password123!"):
    response = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200
    return response.get_json()["access_token"]


def _creer_base():
    filiere = Filiere(nom="Big Data")
    _db.session.add(filiere)
    _db.session.flush()

    promotions = [
        Promotion(niveau="L1", filiere_id=filiere.id, annee_academique="2025-2026"),
        Promotion(niveau="L2", filiere_id=filiere.id, annee_academique="2025-2026"),
    ]
    matieres = [
        Matiere(nom="Fondamentaux du Big Data", code="BD-101", credits=6),
        Matiere(nom="Introduction IA", code="IA-101", credits=6),
    ]
    salle = Salle(nom="A101")
    responsable = Utilisateur(nom="Resp", prenom="Test", email="responsable@test.com", role="responsable")
    responsable.set_password("Password123!")

    _db.session.add_all([*promotions, *matieres, salle, responsable])
    _db.session.commit()
    return {
        "filiere": filiere,
        "promotions": promotions,
        "matieres": matieres,
        "salle": salle,
        "responsable": responsable,
    }


def _creer_professeur_qualifie(base, matiere_index=0, promotion_index=0, email="prof@test.com"):
    professeur = Utilisateur(nom="Prof", prenom="Test", email=email, role="professeur")
    professeur.set_password("Password123!")
    professeur.matieres_enseignees = [base["matieres"][matiere_index]]
    professeur.promotions_en_charge = [base["promotions"][promotion_index]]
    _db.session.add(professeur)
    _db.session.commit()
    return professeur


# --- Modèle : relation many-to-many bidirectionnelle ---


def test_association_professeur_matiere_promotion_est_bidirectionnelle(app):
    base = _creer_base()
    professeur = _creer_professeur_qualifie(base)

    assert professeur in base["matieres"][0].professeurs
    assert professeur in base["promotions"][0].professeurs
    assert base["matieres"][1] not in professeur.matieres_enseignees


# --- Création / mise à jour d'un professeur avec associations ---


def test_creation_professeur_avec_matiere_ids_et_promotion_ids(app):
    base = _creer_base()
    client = app.test_client()
    headers = {"Authorization": f"Bearer {_login(client, base['responsable'].email)}"}

    resp = client.post(
        "/api/v1/admin/professors",
        headers=headers,
        content_type="multipart/form-data",
        data={
            "nom": "Nouveau",
            "prenom": "Prof",
            "email": "nouveau.prof@test.com",
            "matiere_ids": f"{base['matieres'][0].id},{base['matieres'][1].id}",
            "promotion_ids": str(base["promotions"][0].id),
            "photo": (BytesIO(b"fake-image"), "prof.png"),
        },
    )
    assert resp.status_code == 201
    payload = resp.get_json()["professor"]
    assert {m["id"] for m in payload["matieres_enseignees"]} == {
        base["matieres"][0].id,
        base["matieres"][1].id,
    }
    assert [p["id"] for p in payload["promotions_en_charge"]] == [base["promotions"][0].id]


def test_creation_professeur_avec_matiere_id_invalide_renvoie_400(app):
    base = _creer_base()
    client = app.test_client()
    headers = {"Authorization": f"Bearer {_login(client, base['responsable'].email)}"}

    resp = client.post(
        "/api/v1/admin/professors",
        headers=headers,
        content_type="multipart/form-data",
        data={
            "nom": "Nouveau",
            "prenom": "Prof",
            "email": "invalide.prof@test.com",
            "matiere_ids": "999999",
            "photo": (BytesIO(b"fake-image"), "prof.png"),
        },
    )
    assert resp.status_code == 400
    assert resp.get_json()["error"] == "bad_request"


def test_update_professeur_remplace_les_associations(app):
    base = _creer_base()
    professeur = _creer_professeur_qualifie(base)

    client = app.test_client()
    headers = {"Authorization": f"Bearer {_login(client, base['responsable'].email)}"}

    resp = client.patch(
        f"/api/v1/admin/professors/{professeur.id}",
        headers=headers,
        json={
            "matiere_ids": [base["matieres"][1].id],
            "promotion_ids": [base["promotions"][1].id],
        },
    )
    assert resp.status_code == 200
    payload = resp.get_json()["professor"]
    assert [m["id"] for m in payload["matieres_enseignees"]] == [base["matieres"][1].id]
    assert [p["id"] for p in payload["promotions_en_charge"]] == [base["promotions"][1].id]


# --- Validation de qualification à la création d'un cours ---


def test_creation_cours_refusee_si_professeur_non_rattache_a_la_matiere(app):
    base = _creer_base()
    professeur = _creer_professeur_qualifie(base)  # matiere[0] / promotion[0]

    client = app.test_client()
    headers = {"Authorization": f"Bearer {_login(client, base['responsable'].email)}"}

    resp = client.post(
        "/api/v1/admin/courses",
        headers=headers,
        json={
            "matiere_id": base["matieres"][1].id,
            "professeur_id": professeur.id,
            "salle_id": base["salle"].id,
            "promotion_id": base["promotions"][0].id,
            "date": (date.today() + timedelta(days=1)).isoformat(),
            "heure_debut": "09:00:00",
            "heure_fin": "11:00:00",
        },
    )
    assert resp.status_code == 400
    assert resp.get_json()["error"] == "professeur_matiere_non_associee"


def test_creation_cours_refusee_si_professeur_non_rattache_a_la_promotion(app):
    base = _creer_base()
    professeur = _creer_professeur_qualifie(base)

    client = app.test_client()
    headers = {"Authorization": f"Bearer {_login(client, base['responsable'].email)}"}

    resp = client.post(
        "/api/v1/admin/courses",
        headers=headers,
        json={
            "matiere_id": base["matieres"][0].id,
            "professeur_id": professeur.id,
            "salle_id": base["salle"].id,
            "promotion_id": base["promotions"][1].id,
            "date": (date.today() + timedelta(days=1)).isoformat(),
            "heure_debut": "09:00:00",
            "heure_fin": "11:00:00",
        },
    )
    assert resp.status_code == 400
    assert resp.get_json()["error"] == "professeur_promotion_non_associee"


def test_creation_cours_reussit_si_professeur_qualifie(app):
    base = _creer_base()
    professeur = _creer_professeur_qualifie(base)

    client = app.test_client()
    headers = {"Authorization": f"Bearer {_login(client, base['responsable'].email)}"}

    resp = client.post(
        "/api/v1/admin/courses",
        headers=headers,
        json={
            "matiere_id": base["matieres"][0].id,
            "professeur_id": professeur.id,
            "salle_id": base["salle"].id,
            "promotion_id": base["promotions"][0].id,
            "date": (date.today() + timedelta(days=1)).isoformat(),
            "heure_debut": "09:00:00",
            "heure_fin": "11:00:00",
        },
    )
    assert resp.status_code == 201


# --- Détection de conflit d'horaire ---


def test_creation_cours_refusee_si_conflit_horaire_meme_salle(app):
    base = _creer_base()
    professeur = _creer_professeur_qualifie(base)
    demain = date.today() + timedelta(days=1)

    cours_existant = Cours(
        matiere_id=base["matieres"][0].id,
        professeur_id=professeur.id,
        salle_id=base["salle"].id,
        promotion_id=base["promotions"][0].id,
        date=demain,
        heure_debut=time(9, 0),
        heure_fin=time(11, 0),
        created_by=professeur.id,
    )
    _db.session.add(cours_existant)
    _db.session.commit()

    client = app.test_client()
    headers = {"Authorization": f"Bearer {_login(client, base['responsable'].email)}"}

    resp = client.post(
        "/api/v1/admin/courses",
        headers=headers,
        json={
            "matiere_id": base["matieres"][0].id,
            "professeur_id": professeur.id,
            "salle_id": base["salle"].id,
            "promotion_id": base["promotions"][0].id,
            "date": demain.isoformat(),
            "heure_debut": "10:00:00",
            "heure_fin": "12:00:00",
        },
    )
    assert resp.status_code == 409
    assert resp.get_json()["error"] == "conflit_horaire"


def test_creation_cours_reussit_si_creneau_disjoint(app):
    base = _creer_base()
    professeur = _creer_professeur_qualifie(base)
    demain = date.today() + timedelta(days=1)

    cours_existant = Cours(
        matiere_id=base["matieres"][0].id,
        professeur_id=professeur.id,
        salle_id=base["salle"].id,
        promotion_id=base["promotions"][0].id,
        date=demain,
        heure_debut=time(9, 0),
        heure_fin=time(11, 0),
        created_by=professeur.id,
    )
    _db.session.add(cours_existant)
    _db.session.commit()

    client = app.test_client()
    headers = {"Authorization": f"Bearer {_login(client, base['responsable'].email)}"}

    resp = client.post(
        "/api/v1/admin/courses",
        headers=headers,
        json={
            "matiere_id": base["matieres"][0].id,
            "professeur_id": professeur.id,
            "salle_id": base["salle"].id,
            "promotion_id": base["promotions"][0].id,
            "date": demain.isoformat(),
            "heure_debut": "11:00:00",
            "heure_fin": "13:00:00",
        },
    )
    assert resp.status_code == 201


def test_reschedule_cours_refuse_si_conflit_horaire(app):
    base = _creer_base()
    professeur = _creer_professeur_qualifie(base)
    demain = date.today() + timedelta(days=1)
    apres_demain = demain + timedelta(days=1)

    cours_fixe = Cours(
        matiere_id=base["matieres"][0].id,
        professeur_id=professeur.id,
        salle_id=base["salle"].id,
        promotion_id=base["promotions"][0].id,
        date=demain,
        heure_debut=time(9, 0),
        heure_fin=time(11, 0),
        created_by=professeur.id,
    )
    cours_a_deplacer = Cours(
        matiere_id=base["matieres"][0].id,
        professeur_id=professeur.id,
        salle_id=base["salle"].id,
        promotion_id=base["promotions"][0].id,
        date=apres_demain,
        heure_debut=time(14, 0),
        heure_fin=time(16, 0),
        created_by=professeur.id,
    )
    _db.session.add_all([cours_fixe, cours_a_deplacer])
    _db.session.commit()

    client = app.test_client()
    headers = {"Authorization": f"Bearer {_login(client, professeur.email)}"}

    resp = client.post(
        f"/api/v1/professeur/courses/{cours_a_deplacer.id}/reschedule",
        headers=headers,
        json={
            "date": demain.isoformat(),
            "heure_debut": "10:00:00",
            "heure_fin": "12:00:00",
        },
    )
    assert resp.status_code == 409
    assert resp.get_json()["error"] == "conflit_horaire"
