from datetime import date, time

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
def app():
    flask_app = create_app('testing')
    with flask_app.app_context():
        _db.create_all()
        yield flask_app
        _db.session.remove()
        _db.drop_all()


def _creer_dependances():
    filiere = Filiere(nom='Big Data')
    _db.session.add(filiere)
    _db.session.flush()

    promotion = Promotion(niveau='L1', filiere_id=filiere.id, annee_academique='2025-2026')
    professeur = Utilisateur(nom='Prof', prenom='Test', email='prof_cours@test.com', role='professeur')
    professeur.set_password('secret')
    matiere = Matiere(nom='Fondamentaux du Big Data', code='BD-101')
    salle = Salle(nom='A101')
    _db.session.add_all([promotion, professeur, matiere, salle])
    _db.session.flush()

    return promotion, professeur, matiere, salle


def _construire_cours(heure_debut, heure_fin):
    promotion, professeur, matiere, salle = _creer_dependances()
    return Cours(
        matiere_id=matiere.id,
        professeur_id=professeur.id,
        salle_id=salle.id,
        promotion_id=promotion.id,
        date=date(2026, 9, 1),
        heure_debut=heure_debut,
        heure_fin=heure_fin,
        created_by=professeur.id,
    )


def test_cours_refuse_heure_fin_avant_heure_debut(app):
    with pytest.raises(ValueError, match='heure_fin'):
        _construire_cours(time(23, 0), time(1, 0))


def test_cours_refuse_heure_fin_egale_a_heure_debut(app):
    with pytest.raises(ValueError, match='heure_fin'):
        _construire_cours(time(9, 0), time(9, 0))


def test_cours_accepte_heure_fin_apres_heure_debut(app):
    cours = _construire_cours(time(9, 0), time(11, 0))
    _db.session.add(cours)
    _db.session.commit()

    assert cours.id is not None
