from io import BytesIO
from datetime import datetime, timedelta

import pytest
from sqlalchemy.exc import IntegrityError

from app import create_app
from app import db as _db
from app.models.cours import Cours
from app.models.filiere import Filiere
from app.models.matiere import Matiere
from app.models.pointage import Pointage
from app.models.promotion import Promotion
from app.models.salle import Salle
from app.models.utilisateur import Utilisateur
from app.services import face_service
from app.services.pointage_service import PointageError, enregistrer_pointage
from app.utils import utcnow

REF = datetime(2026, 7, 3, 10, 0, 0)


@pytest.fixture
def app(tmp_path):
    flask_app = create_app('testing')
    upload_dir = tmp_path / 'uploads' / 'users' / 'etudiant'
    upload_dir.mkdir(parents=True, exist_ok=True)
    (upload_dir / 'reference.jpg').write_bytes(b'reference-image')
    flask_app.config['UPLOAD_FOLDER'] = str(tmp_path / 'uploads')
    flask_app.config['ATTENDANCE_KIOSK_API_KEY'] = 'test-kiosk-key'
    with flask_app.app_context():
        _db.create_all()
        yield flask_app
        _db.session.remove()
        _db.drop_all()


def _creer_cours(heure_debut, heure_fin, tolerance_retard_minutes=10, jour=None):
    jour = jour or REF.date()

    filiere = Filiere(nom='Big Data')
    _db.session.add(filiere)
    _db.session.flush()

    promotion = Promotion(niveau='L1', filiere_id=filiere.id, annee_academique='2025-2026')
    professeur = Utilisateur(nom='Prof', prenom='Test', email='prof@test.com', role='professeur')
    professeur.set_password('secret')
    etudiant = Utilisateur(
        nom='Etu',
        prenom='Test',
        email='etudiant@test.com',
        role='etudiant',
        photo='users/etudiant/reference.jpg',
    )
    etudiant.set_password('secret')
    matiere = Matiere(nom='Fondamentaux du Big Data', code='BD-101')
    salle = Salle(nom='A101')
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
        tolerance_retard_minutes=tolerance_retard_minutes,
        created_by=professeur.id,
    )
    _db.session.add(cours)
    _db.session.commit()

    return cours, etudiant


def _mock_face_ok(monkeypatch, match=True, is_real_face=True, similarity=0.92, liveness=0.97):
    monkeypatch.setattr(face_service, 'validate_faces', lambda *_args, **_kwargs: {
        'match_result': match,
        'similarity_score': similarity,
    })
    monkeypatch.setattr(face_service, 'analyze_liveness', lambda *_args, **_kwargs: {
        'is_real_face': is_real_face,
        'liveness_probability': liveness,
    })


def test_visage_non_reconnu_enregistre_un_pointage_invalide(app, monkeypatch):
    cours, etudiant = _creer_cours(
        heure_debut=(REF - timedelta(minutes=5)).time(),
        heure_fin=(REF + timedelta(hours=1)).time(),
    )
    _mock_face_ok(monkeypatch, match=False, is_real_face=True, similarity=0.42, liveness=0.98)

    resultat = enregistrer_pointage(
        etudiant_id=etudiant.id,
        cours_id=cours.id,
        selfie_bytes=b'selfie-image',
        selfie_filename='selfie.jpg',
        gps_lat=None,
        gps_lng=None,
        timestamp=REF,
    )

    assert resultat['success'] is False
    assert resultat['statut'] == 'invalide'
    assert resultat['raison'] == 'visage_non_reconnu'
    assert resultat['face_verification']['match'] is False

    pointage = _db.session.get(Pointage, resultat['pointage_id'])
    assert pointage.methode == 'face_recognition'
    assert pointage.justificatif is not None


def test_visage_non_vivant_enregistre_un_pointage_invalide(app, monkeypatch):
    cours, etudiant = _creer_cours(
        heure_debut=(REF - timedelta(minutes=5)).time(),
        heure_fin=(REF + timedelta(hours=1)).time(),
    )
    _mock_face_ok(monkeypatch, match=True, is_real_face=False, similarity=0.95, liveness=0.2)

    resultat = enregistrer_pointage(
        etudiant_id=etudiant.id,
        cours_id=cours.id,
        selfie_bytes=b'selfie-image',
        selfie_filename='selfie.jpg',
        gps_lat=None,
        gps_lng=None,
        timestamp=REF,
    )

    assert resultat['success'] is False
    assert resultat['raison'] == 'visage_non_vivant'


def test_pointage_present(app, monkeypatch):
    cours, etudiant = _creer_cours(
        heure_debut=REF.time(),
        heure_fin=(REF + timedelta(hours=2)).time(),
        tolerance_retard_minutes=10,
    )
    _mock_face_ok(monkeypatch)

    resultat = enregistrer_pointage(
        etudiant_id=etudiant.id,
        cours_id=cours.id,
        selfie_bytes=b'selfie-image',
        selfie_filename='selfie.jpg',
        gps_lat=48.85,
        gps_lng=2.35,
        timestamp=REF,
    )

    assert resultat['success'] is True
    assert resultat['statut'] == 'present'
    assert resultat['face_verification']['match'] is True
    assert resultat['face_verification']['is_real_face'] is True

    pointage = _db.session.get(Pointage, resultat['pointage_id'])
    assert pointage.latitude == 48.85
    assert pointage.longitude == 2.35
    assert pointage.methode == 'face_recognition'


def test_pointage_retard(app, monkeypatch):
    cours, etudiant = _creer_cours(
        heure_debut=(REF - timedelta(minutes=20)).time(),
        heure_fin=(REF + timedelta(hours=1)).time(),
        tolerance_retard_minutes=10,
    )
    _mock_face_ok(monkeypatch)

    resultat = enregistrer_pointage(
        etudiant_id=etudiant.id,
        cours_id=cours.id,
        selfie_bytes=b'selfie-image',
        selfie_filename='selfie.jpg',
        gps_lat=None,
        gps_lng=None,
        timestamp=REF,
    )

    assert resultat['success'] is True
    assert resultat['statut'] == 'retard'


def test_pointage_hors_delai_refuse(app, monkeypatch):
    cours, etudiant = _creer_cours(
        heure_debut=(REF - timedelta(hours=3)).time(),
        heure_fin=(REF - timedelta(hours=1)).time(),
        tolerance_retard_minutes=10,
    )
    _mock_face_ok(monkeypatch)

    with pytest.raises(PointageError) as exc_info:
        enregistrer_pointage(
            etudiant_id=etudiant.id,
            cours_id=cours.id,
            selfie_bytes=b'selfie-image',
            selfie_filename='selfie.jpg',
            gps_lat=None,
            gps_lng=None,
            timestamp=REF,
        )

    assert exc_info.value.code == 'hors_delai'
    assert Pointage.query.filter_by(etudiant_id=etudiant.id, cours_id=cours.id).count() == 0


def test_photo_reference_absente_refuse_le_pointage(app, monkeypatch):
    cours, etudiant = _creer_cours(
        heure_debut=REF.time(),
        heure_fin=(REF + timedelta(hours=2)).time(),
    )
    etudiant.photo = None
    _db.session.commit()
    _mock_face_ok(monkeypatch)

    with pytest.raises(PointageError) as exc_info:
        enregistrer_pointage(
            etudiant_id=etudiant.id,
            cours_id=cours.id,
            selfie_bytes=b'selfie-image',
            selfie_filename='selfie.jpg',
            gps_lat=None,
            gps_lng=None,
            timestamp=REF,
        )

    assert exc_info.value.code == 'photo_reference_absente'


def test_double_pointage_conflit(app, monkeypatch):
    cours, etudiant = _creer_cours(
        heure_debut=REF.time(),
        heure_fin=(REF + timedelta(hours=2)).time(),
    )
    _mock_face_ok(monkeypatch)

    premier = enregistrer_pointage(
        etudiant_id=etudiant.id,
        cours_id=cours.id,
        selfie_bytes=b'selfie-image',
        selfie_filename='selfie.jpg',
        gps_lat=None,
        gps_lng=None,
        timestamp=REF,
    )
    assert premier['success'] is True
    with pytest.raises(PointageError) as exc_info:
        enregistrer_pointage(
            etudiant_id=etudiant.id,
            cours_id=cours.id,
            selfie_bytes=b'selfie-image',
            selfie_filename='selfie.jpg',
            gps_lat=None,
            gps_lng=None,
            timestamp=REF + timedelta(minutes=1),
        )

    assert exc_info.value.code == 'pointage_deja_enregistre'
    assert Pointage.query.filter_by(etudiant_id=etudiant.id, cours_id=cours.id).count() == 1


# FAILLE 1 : le timestamp envoyé par le client ne doit jamais déterminer le statut.
# Ces deux tests passent par le vrai client HTTP Flask (pas un appel direct au service)
# car c'est la route qui doit ignorer le timestamp du payload et utiliser l'heure serveur.

def test_checkin_ignore_timestamp_client_falsifie_pour_masquer_un_retard(app, monkeypatch):
    now = utcnow()
    debut_dt = now - timedelta(minutes=20)
    fin_dt = now + timedelta(hours=1)
    cours, etudiant = _creer_cours(
        heure_debut=debut_dt.time(),
        heure_fin=fin_dt.time(),
        tolerance_retard_minutes=10,
        jour=debut_dt.date(),
    )
    _mock_face_ok(monkeypatch)

    client = app.test_client()
    login = client.post('/api/v1/auth/login', json={
        'email': 'etudiant@test.com', 'password': 'secret',
    })
    access_token = login.get_json()['access_token']

    # Le client ment : il prétend pointer pile à l'heure (donc "present"),
    # alors qu'en réalité (heure serveur) le cours a débuté il y a 20 minutes.
    timestamp_falsifie = debut_dt.isoformat()

    resp = client.post(
        '/api/v1/etudiant/attendance/checkin',
        data={
            'course_id': str(cours.id),
            'timestamp': timestamp_falsifie,
            'selfie': (BytesIO(b'selfie-image'), 'selfie.jpg'),
        },
        content_type='multipart/form-data',
        headers={'Authorization': f'Bearer {access_token}'},
    )

    assert resp.status_code == 201
    data = resp.get_json()
    assert data['success'] is True
    assert data['statut'] == 'retard'  # et non 'present' comme le prétendait le client


def test_checkin_ignore_timestamp_client_falsifie_pour_contourner_hors_delai(app, monkeypatch):
    now = utcnow()
    debut_dt = now - timedelta(hours=3)
    fin_dt = now - timedelta(hours=1)
    cours, etudiant = _creer_cours(
        heure_debut=debut_dt.time(),
        heure_fin=fin_dt.time(),
        tolerance_retard_minutes=10,
        jour=debut_dt.date(),
    )
    _mock_face_ok(monkeypatch)

    client = app.test_client()
    login = client.post('/api/v1/auth/login', json={
        'email': 'etudiant@test.com', 'password': 'secret',
    })
    access_token = login.get_json()['access_token']

    # Le client prétend pointer pile à l'heure de début, alors qu'en réalité
    # (heure serveur) le cours est terminé depuis une heure.
    timestamp_falsifie = debut_dt.isoformat()

    resp = client.post(
        '/api/v1/etudiant/attendance/checkin',
        data={
            'course_id': str(cours.id),
            'timestamp': timestamp_falsifie,
            'selfie': (BytesIO(b'selfie-image'), 'selfie.jpg'),
        },
        content_type='multipart/form-data',
        headers={'Authorization': f'Bearer {access_token}'},
    )

    assert resp.status_code == 400
    data = resp.get_json()
    assert data['error'] == 'hors_delai'
    assert Pointage.query.filter_by(etudiant_id=etudiant.id, cours_id=cours.id).count() == 0


def test_kiosk_scan_identifie_etudiant_et_charge_son_cours_actif(app, monkeypatch):
    now = utcnow()
    cours, etudiant = _creer_cours(
        heure_debut=(now - timedelta(minutes=5)).time(),
        heure_fin=(now + timedelta(hours=1)).time(),
        tolerance_retard_minutes=10,
        jour=now.date(),
    )
    _mock_face_ok(monkeypatch)

    client = app.test_client()
    resp = client.post(
        '/api/v1/attendance/kiosk/scan',
        data={
            'selfie': (BytesIO(b'selfie-image'), 'selfie.jpg'),
        },
        content_type='multipart/form-data',
        headers={'X-Attendance-Kiosk-Key': 'test-kiosk-key'},
    )

    assert resp.status_code == 200
    data = resp.get_json()
    assert data['success'] is True
    assert data['student']['id'] == etudiant.id
    assert data['attendance_context']['can_checkin_now'] is True
    assert data['attendance_context']['active_course']['id'] == cours.id


def test_kiosk_checkin_enregistre_un_pointage_sans_session_etudiant(app, monkeypatch):
    now = utcnow()
    cours, etudiant = _creer_cours(
        heure_debut=(now - timedelta(minutes=5)).time(),
        heure_fin=(now + timedelta(hours=1)).time(),
        tolerance_retard_minutes=10,
        jour=now.date(),
    )
    _mock_face_ok(monkeypatch)

    client = app.test_client()
    resp = client.post(
        '/api/v1/attendance/kiosk/checkin',
        data={
            'student_id': str(etudiant.id),
            'course_id': str(cours.id),
            'selfie': (BytesIO(b'selfie-image'), 'selfie.jpg'),
        },
        content_type='multipart/form-data',
        headers={'X-Attendance-Kiosk-Key': 'test-kiosk-key'},
    )

    assert resp.status_code == 201
    data = resp.get_json()
    assert data['success'] is True
    assert data['statut'] == 'present'


def test_kiosk_scan_refuse_acces_sans_authentification_ni_cle(app, monkeypatch):
    now = utcnow()
    _creer_cours(
        heure_debut=(now - timedelta(minutes=5)).time(),
        heure_fin=(now + timedelta(hours=1)).time(),
        tolerance_retard_minutes=10,
        jour=now.date(),
    )
    _mock_face_ok(monkeypatch)

    client = app.test_client()
    resp = client.post(
        '/api/v1/attendance/kiosk/scan',
        data={
            'selfie': (BytesIO(b'selfie-image'), 'selfie.jpg'),
        },
        content_type='multipart/form-data',
    )

    assert resp.status_code == 401
    data = resp.get_json()
    assert data['error'] == 'authentication_required'


# FAILLE 2 : l'unicité (etudiant_id, cours_id) pour un pointage present/retard doit être
# garantie par la base, pas seulement par le SELECT applicatif dans enregistrer_pointage.

def test_contrainte_db_empeche_doublon_meme_en_contournant_le_service(app):
    """
    Insère directement deux Pointage 'present' pour le même (etudiant, cours) en
    contournant complètement enregistrer_pointage (donc sans passer par son SELECT
    de garde), pour prouver que c'est la base qui refuse le doublon.

    Note : sous SQLite (backend de test), l'index est créé unique mais SANS la
    clause WHERE partielle (postgresql_where est ignoré hors PostgreSQL) : il est
    donc unique sur tous les statuts confondus ici, alors qu'en production
    (PostgreSQL) seuls 'present'/'retard' sont concernés et les 'invalide'
    peuvent se répéter. Cette partialité est vérifiée manuellement sous
    PostgreSQL (cf. vérification manuelle), pas par ce test.
    """
    cours, etudiant = _creer_cours(
        heure_debut=REF.time(),
        heure_fin=(REF + timedelta(hours=2)).time(),
    )

    premier = Pointage(
        cours_id=cours.id, etudiant_id=etudiant.id, timestamp_pointage=REF,
        statut='present', methode='face_recognition', wifi_detecte=False, qr_valide=False,
    )
    _db.session.add(premier)
    _db.session.commit()

    second = Pointage(
        cours_id=cours.id, etudiant_id=etudiant.id, timestamp_pointage=REF,
        statut='present', methode='face_recognition', wifi_detecte=False, qr_valide=False,
    )
    _db.session.add(second)
    with pytest.raises(IntegrityError):
        _db.session.commit()
    _db.session.rollback()


def test_enregistrer_pointage_convertit_integrity_error_en_conflit(app, monkeypatch):
    """
    Simule la race condition que le SELECT de garde ne peut pas totalement éliminer :
    un pointage 'present' existe déjà en base, mais on neutralise ce SELECT pour
    forcer enregistrer_pointage jusqu'à l'INSERT, comme si deux requêtes concurrentes
    l'avaient toutes les deux dépassé avant qu'une des deux ne commit. On vérifie que
    l'IntegrityError levée par la contrainte de base est bien convertie en
    PointageError('pointage_deja_enregistre'), pas une exception 500 brute.
    """
    cours, etudiant = _creer_cours(
        heure_debut=REF.time(),
        heure_fin=(REF + timedelta(hours=2)).time(),
    )

    existant = Pointage(
        cours_id=cours.id, etudiant_id=etudiant.id, timestamp_pointage=REF,
        statut='present', methode='face_recognition', wifi_detecte=False, qr_valide=False,
    )
    _db.session.add(existant)
    _db.session.commit()

    class FakeQuery:
        def filter_by(self, **kwargs):
            return self

        def filter(self, *args):
            return self

        def first(self):
            return None  # simule la fenêtre de course : le doublon existant n'est pas vu

    monkeypatch.setattr(Pointage, 'query', FakeQuery())

    _mock_face_ok(monkeypatch)

    with pytest.raises(PointageError) as exc_info:
        enregistrer_pointage(
            etudiant_id=etudiant.id,
            cours_id=cours.id,
            selfie_bytes=b'selfie-image',
            selfie_filename='selfie.jpg',
            gps_lat=None,
            gps_lng=None,
            timestamp=REF,
        )

    assert exc_info.value.code == 'pointage_deja_enregistre'
    assert exc_info.value.status_code == 409


def test_index_pointage_est_bien_declare_partiel_sur_present_retard(app):
    """
    Vérifie la déclaration de l'index (Pointage.__table_args__), pas son application
    par le moteur : sous SQLite, le WHERE partiel est ignoré (cf. commentaire ci-dessus),
    donc ce test ne peut pas prouver l'enforcement réel — seulement que le code déclare
    la bonne contrainte pour PostgreSQL.
    """
    index = next(
        idx for idx in Pointage.__table__.indexes
        if idx.name == 'uq_pointage_etudiant_cours_valide'
    )
    where_clause = index.dialect_options['postgresql']['where']
    assert str(where_clause) == "statut IN ('present', 'retard')"


# return2.md section 4 : le front a besoin que can_checkin_now retombe a False une fois
# l'etudiant deja pointe sur le cours actif, pour desactiver le bouton de pointage borne
# et eviter un double scan inutile.

def test_kiosk_scan_can_checkin_now_devient_faux_apres_un_pointage_valide(app, monkeypatch):
    now = utcnow()
    cours, etudiant = _creer_cours(
        heure_debut=(now - timedelta(minutes=5)).time(),
        heure_fin=(now + timedelta(hours=1)).time(),
        tolerance_retard_minutes=10,
        jour=now.date(),
    )
    _mock_face_ok(monkeypatch)

    client = app.test_client()
    headers = {'X-Attendance-Kiosk-Key': 'test-kiosk-key'}

    premier_scan = client.post(
        '/api/v1/attendance/kiosk/scan',
        data={'selfie': (BytesIO(b'selfie-image'), 'selfie.jpg')},
        content_type='multipart/form-data',
        headers=headers,
    )
    assert premier_scan.status_code == 200
    premier_contexte = premier_scan.get_json()['attendance_context']
    assert premier_contexte['can_checkin_now'] is True
    assert premier_contexte['already_checked_in'] is False

    checkin_resp = client.post(
        '/api/v1/attendance/kiosk/checkin',
        data={
            'student_id': str(etudiant.id),
            'course_id': str(cours.id),
            'selfie': (BytesIO(b'selfie-image'), 'selfie.jpg'),
        },
        content_type='multipart/form-data',
        headers=headers,
    )
    assert checkin_resp.status_code == 201
    assert checkin_resp.get_json()['success'] is True

    second_scan = client.post(
        '/api/v1/attendance/kiosk/scan',
        data={'selfie': (BytesIO(b'selfie-image'), 'selfie.jpg')},
        content_type='multipart/form-data',
        headers=headers,
    )
    assert second_scan.status_code == 200
    second_contexte = second_scan.get_json()['attendance_context']
    assert second_contexte['can_checkin_now'] is False
    assert second_contexte['already_checked_in'] is True


# return2.md section 0 : le pointage self-service etudiant est retire du parcours nominal
# (borne uniquement) mais reste conserve pour d'eventuelles integrations futures ; il doit
# etre explicitement signale comme deprecie aux clients qui l'appellent encore.

def test_ancien_checkin_etudiant_reste_fonctionnel_mais_marque_deprecie(app, monkeypatch):
    now = utcnow()
    cours, etudiant = _creer_cours(
        heure_debut=(now - timedelta(minutes=5)).time(),
        heure_fin=(now + timedelta(hours=1)).time(),
        tolerance_retard_minutes=10,
        jour=now.date(),
    )
    _mock_face_ok(monkeypatch)

    client = app.test_client()
    login = client.post('/api/v1/auth/login', json={
        'email': 'etudiant@test.com', 'password': 'secret',
    })
    access_token = login.get_json()['access_token']

    resp = client.post(
        '/api/v1/etudiant/attendance/checkin',
        data={
            'course_id': str(cours.id),
            'selfie': (BytesIO(b'selfie-image'), 'selfie.jpg'),
        },
        content_type='multipart/form-data',
        headers={'Authorization': f'Bearer {access_token}'},
    )

    assert resp.status_code == 201
    assert resp.headers.get('Deprecation') == 'true'
