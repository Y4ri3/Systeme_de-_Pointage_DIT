import json
import threading
from io import BytesIO
from datetime import date, datetime, time, timedelta

import pytest
from openpyxl import Workbook

from app import create_app
from app import db as _db
from app import mail
from app.models.cours import Cours
from app.models.filiere import Filiere
from app.models.matiere import Matiere
from app.models.notification import Notification
from app.models.pointage import Pointage
from app.models.promotion import Promotion
from app.models.salle import Salle
from app.models.suivi_absences import SuiviAbsences
from app.models.utilisateur import Utilisateur
from app.services import attendance_events
from app.utils import utcnow


@pytest.fixture
def app(tmp_path):
    flask_app = create_app("testing")
    flask_app.config["UPLOAD_FOLDER"] = str(tmp_path / "uploads")
    with flask_app.app_context():
        _db.create_all()
        yield flask_app
        _db.session.remove()
        _db.drop_all()


def _create_users_and_courses():
    filiere = Filiere(nom="Big Data")
    promotion_l1 = Promotion(niveau="L1", filiere=filiere, annee_academique="2025-2026")
    promotion_l2 = Promotion(niveau="L2", filiere=filiere, annee_academique="2025-2026")

    professeur = Utilisateur(
        nom="Prof",
        prenom="Alpha",
        email="prof.alpha@test.com",
        role="professeur",
    )
    professeur.set_password("Password123!")

    autre_prof = Utilisateur(
        nom="Prof",
        prenom="Beta",
        email="prof.beta@test.com",
        role="professeur",
    )
    autre_prof.set_password("Password123!")

    responsable = Utilisateur(
        nom="Resp",
        prenom="Sigma",
        email="responsable@test.com",
        role="responsable",
    )
    responsable.set_password("Password123!")

    etudiant_1 = Utilisateur(
        nom="Etu",
        prenom="One",
        email="etu.one@test.com",
        role="etudiant",
        promotion=promotion_l1,
    )
    etudiant_1.set_password("Password123!")

    etudiant_2 = Utilisateur(
        nom="Etu",
        prenom="Two",
        email="etu.two@test.com",
        role="etudiant",
        promotion=promotion_l1,
    )
    etudiant_2.set_password("Password123!")

    etudiant_autre_promo = Utilisateur(
        nom="Etu",
        prenom="Other",
        email="etu.other@test.com",
        role="etudiant",
        promotion=promotion_l2,
    )
    etudiant_autre_promo.set_password("Password123!")

    matiere_bd = Matiere(nom="Fondamentaux du Big Data", code="BD-101", credits=6)
    matiere_ia = Matiere(nom="Introduction IA", code="IA-101", credits=6)
    salle_a = Salle(nom="A101", batiment="A")
    salle_b = Salle(nom="B201", batiment="B")

    professeur.matieres_enseignees = [matiere_bd, matiere_ia]
    professeur.promotions_en_charge = [promotion_l1, promotion_l2]

    _db.session.add_all(
        [
            filiere,
            promotion_l1,
            promotion_l2,
            professeur,
            autre_prof,
            responsable,
            etudiant_1,
            etudiant_2,
            etudiant_autre_promo,
            matiere_bd,
            matiere_ia,
            salle_a,
            salle_b,
        ]
    )
    _db.session.flush()

    yesterday = date.today() - timedelta(days=1)
    tomorrow = date.today() + timedelta(days=1)

    cours_passe = Cours(
        matiere_id=matiere_bd.id,
        professeur_id=professeur.id,
        salle_id=salle_a.id,
        promotion_id=promotion_l1.id,
        date=yesterday,
        heure_debut=time(8, 0),
        heure_fin=time(10, 0),
        created_by=responsable.id,
    )
    cours_a_venir = Cours(
        matiere_id=matiere_ia.id,
        professeur_id=professeur.id,
        salle_id=salle_b.id,
        promotion_id=promotion_l1.id,
        date=tomorrow,
        heure_debut=time(14, 0),
        heure_fin=time(16, 0),
        created_by=responsable.id,
    )
    cours_autre_prof = Cours(
        matiere_id=matiere_bd.id,
        professeur_id=autre_prof.id,
        salle_id=salle_a.id,
        promotion_id=promotion_l2.id,
        date=tomorrow,
        heure_debut=time(10, 0),
        heure_fin=time(12, 0),
        created_by=responsable.id,
    )
    _db.session.add_all([cours_passe, cours_a_venir, cours_autre_prof])
    _db.session.flush()

    pointage = Pointage(
        cours_id=cours_passe.id,
        etudiant_id=etudiant_1.id,
        timestamp_pointage=utcnow() - timedelta(days=1),
        statut="present",
        methode="qr_wifi",
    )
    suivi = SuiviAbsences(
        etudiant_id=etudiant_1.id,
        matiere_id=matiere_bd.id,
        nombre_absences=2,
        nb_absences_justifiees=1,
        seuil_atteint=False,
    )
    notification = Notification(
        destinataire_id=etudiant_1.id,
        cours_id=cours_passe.id,
        type="alerte_absence",
        message="Deux absences ont ete enregistrees.",
    )
    _db.session.add_all([pointage, suivi, notification])
    _db.session.commit()

    return {
        "responsable": responsable,
        "professeur": professeur,
        "autre_prof": autre_prof,
        "etudiant_1": etudiant_1,
        "etudiant_2": etudiant_2,
        "etudiant_autre_promo": etudiant_autre_promo,
        "filiere": filiere,
        "promotion_l1": promotion_l1,
        "cours_passe": cours_passe,
        "cours_a_venir": cours_a_venir,
        "cours_autre_prof": cours_autre_prof,
        "matiere_bd": matiere_bd,
        "matiere_ia": matiere_ia,
        "salle_b": salle_b,
    }


def _login(client, email, password="Password123!"):
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": email,
            "password": password,
        },
    )
    assert response.status_code == 200
    return response.get_json()["access_token"]


def _extract_temporary_password(body):
    marker = "Mot de passe temporaire : "
    return body.split(marker, 1)[1].splitlines()[0].strip()


def _build_excel_file(headers, rows):
    workbook = Workbook()
    sheet = workbook.active
    sheet.append(headers)
    for row in rows:
        sheet.append(row)

    buffer = BytesIO()
    workbook.save(buffer)
    buffer.seek(0)
    return buffer


def test_etudiant_peut_consulter_ses_cours_son_historique_et_ses_notifications(app):
    data = _create_users_and_courses()
    client = app.test_client()
    token = _login(client, data["etudiant_1"].email)
    headers = {"Authorization": f"Bearer {token}"}

    courses_resp = client.get("/api/v1/etudiant/courses", headers=headers)
    assert courses_resp.status_code == 200
    courses_payload = courses_resp.get_json()
    assert courses_payload["count"] == 2
    assert {item["id"] for item in courses_payload["courses"]} == {
        data["cours_passe"].id,
        data["cours_a_venir"].id,
    }

    history_resp = client.get("/api/v1/etudiant/attendance/history", headers=headers)
    assert history_resp.status_code == 200
    history_payload = history_resp.get_json()
    assert history_payload["count"] == 1
    assert history_payload["history"][0]["statut"] == "present"

    absences_resp = client.get("/api/v1/etudiant/absences/summary", headers=headers)
    assert absences_resp.status_code == 200
    absences_payload = absences_resp.get_json()
    assert absences_payload["total_absences"] == 2
    assert absences_payload["total_absences_justifiees"] == 1

    notifications_resp = client.get("/api/v1/etudiant/notifications", headers=headers)
    assert notifications_resp.status_code == 200
    notifications_payload = notifications_resp.get_json()
    assert notifications_payload["count"] == 1
    assert notifications_payload["notifications"][0]["type"] == "alerte_absence"


def test_professeur_peut_consulter_presence_de_son_cours_et_pas_le_qr_dun_autre(app):
    data = _create_users_and_courses()
    client = app.test_client()
    token = _login(client, data["professeur"].email)
    headers = {"Authorization": f"Bearer {token}"}

    attendance_resp = client.get(
        f'/api/v1/professeur/courses/{data["cours_passe"].id}/attendance',
        headers=headers,
    )
    assert attendance_resp.status_code == 200
    payload = attendance_resp.get_json()
    assert payload["attendance_summary"]["present"] == 1
    assert payload["attendance_summary"]["absent"] == 1
    assert payload["count"] == 2

    forbidden_resp = client.get(
        f'/api/v1/professeur/courses/{data["cours_autre_prof"].id}/qr',
        headers=headers,
    )
    assert forbidden_resp.status_code == 403
    assert forbidden_resp.get_json()["error"] == "forbidden"


def test_responsable_peut_lister_les_etudiants_consulter_un_profil_et_creer_un_cours(app):
    data = _create_users_and_courses()
    client = app.test_client()
    token = _login(client, data["responsable"].email)
    headers = {"Authorization": f"Bearer {token}"}

    students_resp = client.get("/api/v1/admin/students", headers=headers)
    assert students_resp.status_code == 200
    assert students_resp.get_json()["count"] == 3

    student_resp = client.get(
        f'/api/v1/admin/students/{data["etudiant_1"].id}',
        headers=headers,
    )
    assert student_resp.status_code == 200
    student_payload = student_resp.get_json()
    assert student_payload["student"]["email"] == data["etudiant_1"].email
    assert len(student_payload["absence_summary"]) == 1

    create_resp = client.post(
        "/api/v1/admin/courses",
        headers=headers,
        json={
            "matiere_id": data["matiere_ia"].id,
            "professeur_id": data["professeur"].id,
            "salle_id": data["salle_b"].id,
            "promotion_id": data["promotion_l1"].id,
            "date": (date.today() + timedelta(days=3)).isoformat(),
            "heure_debut": "09:00:00",
            "heure_fin": "11:00:00",
            "tolerance_retard_minutes": 15,
        },
    )
    assert create_resp.status_code == 201
    created_payload = create_resp.get_json()
    assert created_payload["course"]["tolerance_retard_minutes"] == 15


def test_etudiant_peut_marquer_sa_notification_comme_lue(app):
    data = _create_users_and_courses()
    client = app.test_client()
    token = _login(client, data["etudiant_1"].email)
    headers = {"Authorization": f"Bearer {token}"}

    notification = Notification.query.filter_by(destinataire_id=data["etudiant_1"].id).first()
    response = client.patch(
        f"/api/v1/etudiant/notifications/{notification.id}/read",
        headers=headers,
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["notification"]["lu"] is True


def test_professeur_peut_annuler_et_reporter_son_cours(app):
    data = _create_users_and_courses()
    client = app.test_client()
    token = _login(client, data["professeur"].email)
    headers = {"Authorization": f"Bearer {token}"}

    cancel_resp = client.post(
        f'/api/v1/professeur/courses/{data["cours_a_venir"].id}/cancel',
        headers=headers,
        json={"motif": "Intervenant indisponible"},
    )
    assert cancel_resp.status_code == 200
    cancel_payload = cancel_resp.get_json()
    assert cancel_payload["course"]["statut"] == "annule"
    assert cancel_payload["notifications_sent"] == 2

    reschedule_resp = client.post(
        f'/api/v1/professeur/courses/{data["cours_a_venir"].id}/reschedule',
        headers=headers,
        json={
            "date": (date.today() + timedelta(days=5)).isoformat(),
            "heure_debut": "15:00:00",
            "heure_fin": "17:00:00",
            "motif": "Changement de planning",
        },
    )
    assert reschedule_resp.status_code == 200
    reschedule_payload = reschedule_resp.get_json()
    assert reschedule_payload["course"]["statut"] == "reporte"
    assert reschedule_payload["course"]["heure_debut"] == "15:00:00"
    assert reschedule_payload["course"]["heure_fin"] == "17:00:00"


def test_responsable_peut_lister_les_absences_et_les_justifier(app):
    data = _create_users_and_courses()
    client = app.test_client()
    token = _login(client, data["responsable"].email)
    headers = {"Authorization": f"Bearer {token}"}

    list_resp = client.get("/api/v1/admin/absences", headers=headers)
    assert list_resp.status_code == 200
    list_payload = list_resp.get_json()
    assert list_payload["count"] == 1
    suivi_id = list_payload["absence_tracking"][0]["id"]
    assert list_payload["absence_tracking"][0]["nombre_absences"] == 2

    justify_resp = client.post(
        f"/api/v1/admin/absences/{suivi_id}/justify",
        headers=headers,
    )
    assert justify_resp.status_code == 200
    justify_payload = justify_resp.get_json()
    assert justify_payload["absence_tracking"]["nombre_absences"] == 1
    assert justify_payload["absence_tracking"]["nb_absences_justifiees"] == 2


def test_professeur_peut_regulariser_manuellement_un_pointage(app):
    data = _create_users_and_courses()
    client = app.test_client()
    token = _login(client, data["professeur"].email)
    headers = {"Authorization": f"Bearer {token}"}

    regularize_resp = client.post(
        f'/api/v1/professeur/courses/{data["cours_passe"].id}/attendance/regularize',
        headers=headers,
        json={
            "etudiant_id": data["etudiant_2"].id,
            "statut": "absence_justifiee",
            "justificatif": "Certificat medical",
        },
    )
    assert regularize_resp.status_code == 200
    payload = regularize_resp.get_json()
    assert payload["attendance"]["statut"] == "absence_justifiee"
    assert payload["attendance"]["methode"] == "force_admin"

    suivi = SuiviAbsences.query.filter_by(
        etudiant_id=data["etudiant_2"].id,
        matiere_id=data["matiere_bd"].id,
    ).first()
    assert suivi is not None
    assert suivi.nombre_absences == 0
    assert suivi.nb_absences_justifiees == 1


def test_professeur_peut_utiliser_les_alias_front_pour_report_et_regularisation(app):
    data = _create_users_and_courses()
    client = app.test_client()
    token = _login(client, data["professeur"].email)
    headers = {"Authorization": f"Bearer {token}"}

    reschedule_resp = client.post(
        f'/api/v1/professeur/courses/{data["cours_a_venir"].id}/reschedule',
        headers=headers,
        json={
            "new_date": (date.today() + timedelta(days=7)).isoformat(),
            "new_start_time": "13:30:00",
            "new_end_time": "15:30:00",
            "reason": "Salle indisponible",
            "room_id": data["salle_b"].id,
        },
    )
    assert reschedule_resp.status_code == 200
    reschedule_payload = reschedule_resp.get_json()
    assert reschedule_payload["normalized_payload"]["heure_debut"] == "13:30:00"
    assert reschedule_payload["normalized_payload"]["heure_fin"] == "15:30:00"
    assert reschedule_payload["normalized_payload"]["motif"] == "Salle indisponible"

    regularize_resp = client.post(
        f'/api/v1/professeur/courses/{data["cours_passe"].id}/attendance/regularize',
        headers=headers,
        json={
            "student_id": data["etudiant_2"].id,
            "status": "retard",
            "reason": "Retard accepte",
            "pointage_time": datetime.combine(date.today(), time(9, 15)).isoformat(),
        },
    )
    assert regularize_resp.status_code == 200
    regularize_payload = regularize_resp.get_json()
    assert regularize_payload["attendance"]["etudiant_id"] == data["etudiant_2"].id
    assert regularize_payload["attendance"]["statut"] == "retard"
    assert regularize_payload["attendance"]["justificatif"] == "Retard accepte"
    assert "retard" in regularize_payload["attendance_summary"]


def test_professeur_et_responsable_peuvent_gerer_leurs_notifications(app):
    data = _create_users_and_courses()
    notification_prof = Notification(
        destinataire_id=data["professeur"].id,
        cours_id=data["cours_a_venir"].id,
        type="cours_modifie",
        message="Le cours a ete replanifie.",
    )
    notification_resp = Notification(
        destinataire_id=data["responsable"].id,
        cours_id=data["cours_passe"].id,
        type="alerte_absence",
        message="Un seuil d absence a ete atteint.",
    )
    _db.session.add_all([notification_prof, notification_resp])
    _db.session.commit()

    client = app.test_client()

    professeur_headers = {"Authorization": f'Bearer {_login(client, data["professeur"].email)}'}
    prof_list = client.get("/api/v1/professeur/notifications", headers=professeur_headers)
    assert prof_list.status_code == 200
    assert prof_list.get_json()["count"] == 1

    prof_notif_id = prof_list.get_json()["notifications"][0]["id"]
    prof_read = client.patch(
        f"/api/v1/professeur/notifications/{prof_notif_id}/read",
        headers=professeur_headers,
    )
    assert prof_read.status_code == 200
    assert prof_read.get_json()["notification"]["lu"] is True

    responsable_headers = {"Authorization": f'Bearer {_login(client, data["responsable"].email)}'}
    resp_list = client.get("/api/v1/admin/notifications", headers=responsable_headers)
    assert resp_list.status_code == 200
    assert resp_list.get_json()["count"] == 1

    resp_notif_id = resp_list.get_json()["notifications"][0]["id"]
    resp_read = client.patch(
        f"/api/v1/admin/notifications/{resp_notif_id}/read",
        headers=responsable_headers,
    )
    assert resp_read.status_code == 200
    assert resp_read.get_json()["notification"]["lu"] is True


def test_responsable_peut_consulter_detail_cours_et_gerer_crud_academique(app):
    data = _create_users_and_courses()
    client = app.test_client()
    token = _login(client, data["responsable"].email)
    headers = {"Authorization": f"Bearer {token}"}

    detail_resp = client.get(
        f'/api/v1/admin/courses/{data["cours_passe"].id}',
        headers=headers,
    )
    assert detail_resp.status_code == 200
    detail_payload = detail_resp.get_json()
    assert detail_payload["course"]["id"] == data["cours_passe"].id
    assert detail_payload["attendance_summary"]["present"] == 1
    assert len(detail_payload["students"]) == 2

    filiere_resp = client.post(
        "/api/v1/admin/filieres",
        headers=headers,
        json={"nom": "Cybersecurite"},
    )
    assert filiere_resp.status_code == 201
    filiere_id = filiere_resp.get_json()["department"]["id"]

    matiere_resp = client.post(
        "/api/v1/admin/matieres",
        headers=headers,
        json={"nom": "Securite Offensive", "code": "CYB-201", "credits": 4},
    )
    assert matiere_resp.status_code == 201
    matiere_id = matiere_resp.get_json()["subject"]["id"]

    salle_resp = client.post(
        "/api/v1/admin/salles",
        headers=headers,
        json={"nom": "C301", "batiment": "C"},
    )
    assert salle_resp.status_code == 201
    salle_id = salle_resp.get_json()["room"]["id"]

    promotion_resp = client.post(
        "/api/v1/admin/promotions",
        headers=headers,
        json={
            "niveau": "M2",
            "annee_academique": "2025-2026",
            "filiere_id": filiere_id,
        },
    )
    assert promotion_resp.status_code == 201
    promotion_id = promotion_resp.get_json()["promotion"]["id"]

    update_matiere_resp = client.patch(
        f"/api/v1/admin/matieres/{matiere_id}",
        headers=headers,
        json={"credits": 5},
    )
    assert update_matiere_resp.status_code == 200
    assert update_matiere_resp.get_json()["subject"]["credits"] == 5

    update_salle_resp = client.patch(
        f"/api/v1/admin/salles/{salle_id}",
        headers=headers,
        json={"batiment": "C-Nord"},
    )
    assert update_salle_resp.status_code == 200
    assert update_salle_resp.get_json()["room"]["batiment"] == "C-Nord"

    update_filiere_resp = client.patch(
        f"/api/v1/admin/filieres/{filiere_id}",
        headers=headers,
        json={"nom": "Cyber Defense"},
    )
    assert update_filiere_resp.status_code == 200
    assert update_filiere_resp.get_json()["department"]["nom"] == "Cyber Defense"

    update_promotion_resp = client.patch(
        f"/api/v1/admin/promotions/{promotion_id}",
        headers=headers,
        json={"niveau": "M2A"},
    )
    assert update_promotion_resp.status_code == 200
    assert update_promotion_resp.get_json()["promotion"]["niveau"] == "M2A"

    assert client.delete(f"/api/v1/admin/promotions/{promotion_id}", headers=headers).status_code == 200
    assert client.delete(f"/api/v1/admin/matieres/{matiere_id}", headers=headers).status_code == 200
    assert client.delete(f"/api/v1/admin/salles/{salle_id}", headers=headers).status_code == 200
    assert client.delete(f"/api/v1/admin/filieres/{filiere_id}", headers=headers).status_code == 200


def test_responsable_peut_consulter_dashboard_analytics_et_detail_attendance_etudiant(app):
    data = _create_users_and_courses()
    client = app.test_client()
    token = _login(client, data["responsable"].email)
    headers = {"Authorization": f"Bearer {token}"}

    dashboard_summary = client.get("/api/v1/admin/dashboard/summary", headers=headers)
    assert dashboard_summary.status_code == 200
    summary_payload = dashboard_summary.get_json()
    assert summary_payload["totals"]["students"] == 3
    assert len(summary_payload["distribution"]["by_promotion"]) >= 1

    dashboard_trends = client.get("/api/v1/admin/dashboard/trends?days=5", headers=headers)
    assert dashboard_trends.status_code == 200
    assert dashboard_trends.get_json()["range_days"] == 5

    history_resp = client.get(
        f'/api/v1/admin/students/{data["etudiant_1"].id}/attendance/history',
        headers=headers,
    )
    assert history_resp.status_code == 200
    assert history_resp.get_json()["count"] == 1

    summary_resp = client.get(
        f'/api/v1/admin/students/{data["etudiant_1"].id}/attendance/summary',
        headers=headers,
    )
    assert summary_resp.status_code == 200
    assert summary_resp.get_json()["totals"]["total_pointages"] == 1

    by_course_resp = client.get(
        f'/api/v1/admin/students/{data["etudiant_1"].id}/attendance/by-course',
        headers=headers,
    )
    assert by_course_resp.status_code == 200
    assert by_course_resp.get_json()["count"] == 1

    absences_resp = client.post(
        f"/api/v1/admin/absences/{SuiviAbsences.query.first().id}/justify",
        headers=headers,
        json={
            "reason": "Piece justificative recue",
            "document_url": "https://example.test/justif.pdf",
            "status": "approved",
        },
    )
    assert absences_resp.status_code == 200
    assert absences_resp.get_json()["justification"]["status"] == "approved"


def test_listes_principales_supportent_la_pagination(app):
    data = _create_users_and_courses()
    client = app.test_client()
    token = _login(client, data["responsable"].email)
    headers = {"Authorization": f"Bearer {token}"}

    students_resp = client.get("/api/v1/admin/students?page=1&per_page=2", headers=headers)
    assert students_resp.status_code == 200
    students_payload = students_resp.get_json()
    assert students_payload["count"] == 2
    assert students_payload["total"] == 3
    assert students_payload["pagination"]["page"] == 1
    assert students_payload["pagination"]["per_page"] == 2

    courses_resp = client.get(
        "/api/v1/professeur/courses?page=1&per_page=1",
        headers={"Authorization": f'Bearer {_login(client, data["professeur"].email)}'},
    )
    assert courses_resp.status_code == 200
    courses_payload = courses_resp.get_json()
    assert courses_payload["count"] == 1
    assert courses_payload["total"] == 2

    etu_courses_resp = client.get(
        "/api/v1/etudiant/courses?page=1&per_page=1",
        headers={"Authorization": f'Bearer {_login(client, data["etudiant_1"].email)}'},
    )
    assert etu_courses_resp.status_code == 200
    etu_courses_payload = etu_courses_resp.get_json()
    assert etu_courses_payload["count"] == 1
    assert etu_courses_payload["total"] == 2


def test_etudiant_peut_consulter_lhistorique_de_son_cours(app):
    data = _create_users_and_courses()
    client = app.test_client()
    token = _login(client, data["etudiant_1"].email)
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get(
        f'/api/v1/etudiant/courses/{data["cours_passe"].id}/attendance/history',
        headers=headers,
    )
    assert response.status_code == 200
    payload = response.get_json()
    assert payload["course"]["id"] == data["cours_passe"].id
    assert payload["count"] == 1
    assert payload["history"][0]["statut"] == "present"


def test_responsable_peut_exporter_absences_et_presence_cours_en_csv(app):
    data = _create_users_and_courses()
    client = app.test_client()
    token = _login(client, data["responsable"].email)
    headers = {"Authorization": f"Bearer {token}"}

    absences_resp = client.get("/api/v1/admin/exports/absences", headers=headers)
    assert absences_resp.status_code == 200
    assert absences_resp.mimetype == "text/csv"
    absences_csv = absences_resp.get_data(as_text=True)
    assert "matiere_code" in absences_csv
    assert "BD-101" in absences_csv

    attendance_resp = client.get(
        f'/api/v1/admin/exports/courses/{data["cours_passe"].id}/attendance',
        headers=headers,
    )
    assert attendance_resp.status_code == 200
    assert attendance_resp.mimetype == "text/csv"
    attendance_csv = attendance_resp.get_data(as_text=True)
    assert "statut_presence" in attendance_csv
    assert data["etudiant_1"].email in attendance_csv


def test_responsable_peut_exporter_absences_et_presence_cours_en_excel(app):
    data = _create_users_and_courses()
    client = app.test_client()
    token = _login(client, data["responsable"].email)
    headers = {"Authorization": f"Bearer {token}"}

    absences_resp = client.get("/api/v1/admin/exports/absences/xlsx", headers=headers)
    assert absences_resp.status_code == 200
    assert absences_resp.mimetype == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    assert absences_resp.get_data()[:2] == b"PK"

    attendance_resp = client.get(
        f'/api/v1/admin/exports/courses/{data["cours_passe"].id}/attendance/xlsx',
        headers=headers,
    )
    assert attendance_resp.status_code == 200
    assert attendance_resp.mimetype == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    assert attendance_resp.get_data()[:2] == b"PK"


def test_responsable_peut_creer_un_etudiant_avec_photo_et_email_temporaire(app):
    data = _create_users_and_courses()
    client = app.test_client()
    token = _login(client, data["responsable"].email)
    headers = {"Authorization": f"Bearer {token}"}

    with mail.record_messages() as outbox:
        response = client.post(
            "/api/v1/admin/students",
            headers=headers,
            content_type="multipart/form-data",
            data={
                "nom": "Nouveau",
                "prenom": "Student",
                "email": "nouveau.student@test.com",
                "promotion_id": str(data["promotion_l1"].id),
                "photo": (BytesIO(b"fake-image-content"), "student.jpg"),
            },
        )

    assert response.status_code == 201
    payload = response.get_json()
    assert payload["student"]["email"] == "nouveau.student@test.com"
    assert payload["student"]["must_change_password"] is True
    assert payload["student"]["photo_url"].startswith("/uploads/users/etudiant/")
    assert payload["email_sent"] is True
    assert len(outbox) == 1
    assert outbox[0].recipients == ["nouveau.student@test.com"]


def test_responsable_peut_creer_un_professeur_avec_photo_et_email_temporaire(app):
    data = _create_users_and_courses()
    client = app.test_client()
    token = _login(client, data["responsable"].email)
    headers = {"Authorization": f"Bearer {token}"}

    with mail.record_messages() as outbox:
        response = client.post(
            "/api/v1/admin/professors",
            headers=headers,
            content_type="multipart/form-data",
            data={
                "nom": "Nouveau",
                "prenom": "Prof",
                "email": "nouveau.prof@test.com",
                "photo": (BytesIO(b"fake-image-content"), "prof.png"),
            },
        )

    assert response.status_code == 201
    payload = response.get_json()
    assert payload["professor"]["email"] == "nouveau.prof@test.com"
    assert payload["professor"]["must_change_password"] is True
    assert payload["email_sent"] is True
    assert len(outbox) == 1


def test_utilisateur_avec_mot_de_passe_temporaire_doit_le_changer_avant_acces(app):
    data = _create_users_and_courses()
    client = app.test_client()
    responsable_token = _login(client, data["responsable"].email)
    headers = {"Authorization": f"Bearer {responsable_token}"}

    with mail.record_messages() as outbox:
        create_resp = client.post(
            "/api/v1/admin/students",
            headers=headers,
            content_type="multipart/form-data",
            data={
                "nom": "First",
                "prenom": "Login",
                "email": "first.login@test.com",
                "promotion_id": str(data["promotion_l1"].id),
                "photo": (BytesIO(b"fake-image-content"), "login.webp"),
            },
        )

    assert create_resp.status_code == 201
    temporary_password = _extract_temporary_password(outbox[0].body)

    login_resp = client.post(
        "/api/v1/auth/login",
        json={
            "email": "first.login@test.com",
            "password": temporary_password,
        },
    )
    assert login_resp.status_code == 200
    login_payload = login_resp.get_json()
    assert login_payload["must_change_password"] is True
    temp_token = login_payload["access_token"]

    blocked_resp = client.get(
        "/api/v1/etudiant/courses",
        headers={"Authorization": f"Bearer {temp_token}"},
    )
    assert blocked_resp.status_code == 403
    assert blocked_resp.get_json()["error"] == "password_change_required"

    change_resp = client.post(
        "/api/v1/auth/change-password",
        headers={"Authorization": f"Bearer {temp_token}"},
        json={
            "current_password": temporary_password,
            "new_password": "NewPassword123!",
        },
    )
    assert change_resp.status_code == 200
    change_payload = change_resp.get_json()
    assert change_payload["must_change_password"] is False

    new_token = change_payload["access_token"]
    courses_resp = client.get(
        "/api/v1/etudiant/courses",
        headers={"Authorization": f"Bearer {new_token}"},
    )
    assert courses_resp.status_code == 200


def test_responsable_peut_modifier_un_etudiant_desactiver_le_compte_et_remplacer_la_photo(app):
    data = _create_users_and_courses()
    client = app.test_client()
    token = _login(client, data["responsable"].email)
    headers = {"Authorization": f"Bearer {token}"}

    with mail.record_messages() as outbox:
        create_resp = client.post(
            "/api/v1/admin/students",
            headers=headers,
            content_type="multipart/form-data",
            data={
                "nom": "Edit",
                "prenom": "Student",
                "email": "edit.student@test.com",
                "promotion_id": str(data["promotion_l1"].id),
                "photo": (BytesIO(b"old-photo"), "old.jpg"),
            },
        )
    student_id = create_resp.get_json()["student"]["id"]
    initial_password = _extract_temporary_password(outbox[0].body)

    update_resp = client.patch(
        f"/api/v1/admin/students/{student_id}",
        headers=headers,
        content_type="multipart/form-data",
        data={
            "nom": "Edited",
            "statut": "inactif",
            "photo": (BytesIO(b"new-photo"), "new.png"),
        },
    )
    assert update_resp.status_code == 200
    payload = update_resp.get_json()
    assert payload["student"]["nom"] == "Edited"
    assert payload["student"]["statut"] == "inactif"
    assert payload["student"]["photo_url"].endswith(".png")

    login_resp = client.post(
        "/api/v1/auth/login",
        json={
            "email": "edit.student@test.com",
            "password": initial_password,
        },
    )
    assert login_resp.status_code == 403
    assert login_resp.get_json()["error"] == "account_disabled"


def test_responsable_peut_modifier_un_professeur_et_regenerer_son_mot_de_passe_temporaire(app):
    data = _create_users_and_courses()
    client = app.test_client()
    token = _login(client, data["responsable"].email)
    headers = {"Authorization": f"Bearer {token}"}

    with mail.record_messages() as outbox:
        create_resp = client.post(
            "/api/v1/admin/professors",
            headers=headers,
            content_type="multipart/form-data",
            data={
                "nom": "Reset",
                "prenom": "Prof",
                "email": "reset.prof@test.com",
                "photo": (BytesIO(b"photo-content"), "prof.jpg"),
            },
        )
        assert create_resp.status_code == 201
        first_temp_password = _extract_temporary_password(outbox[0].body)

        professor_id = create_resp.get_json()["professor"]["id"]
        update_resp = client.patch(
            f"/api/v1/admin/professors/{professor_id}",
            headers=headers,
            json={"prenom": "Updated", "statut": "actif"},
        )
        assert update_resp.status_code == 200
        assert update_resp.get_json()["professor"]["prenom"] == "Updated"

        reset_resp = client.post(
            f"/api/v1/admin/professors/{professor_id}/reset-password",
            headers=headers,
        )
        assert reset_resp.status_code == 200
        assert reset_resp.get_json()["email_sent"] is True
        second_temp_password = _extract_temporary_password(outbox[1].body)

    failed_login_resp = client.post(
        "/api/v1/auth/login",
        json={
            "email": "reset.prof@test.com",
            "password": first_temp_password,
        },
    )
    assert failed_login_resp.status_code == 401

    login_resp = client.post(
        "/api/v1/auth/login",
        json={
            "email": "reset.prof@test.com",
            "password": second_temp_password,
        },
    )
    assert login_resp.status_code == 200
    assert login_resp.get_json()["must_change_password"] is True


def test_responsable_peut_importer_des_etudiants_et_des_professeurs_depuis_excel(app):
    data = _create_users_and_courses()
    client = app.test_client()
    token = _login(client, data["responsable"].email)
    headers = {"Authorization": f"Bearer {token}"}

    students_file = _build_excel_file(
        ["nom", "prenom", "email", "promotion_id"],
        [
            ["Import", "Student1", "import.student1@test.com", data["promotion_l1"].id],
            ["Import", "Student2", "import.student2@test.com", data["promotion_l1"].id],
            ["Bad", "Student", "bad.student@test.com", 999999],
        ],
    )
    professors_file = _build_excel_file(
        ["nom", "prenom", "email"],
        [
            ["Import", "Prof1", "import.prof1@test.com"],
            ["Import", "Prof2", "import.prof2@test.com"],
        ],
    )

    with mail.record_messages() as outbox:
        students_resp = client.post(
            "/api/v1/admin/students/import",
            headers=headers,
            content_type="multipart/form-data",
            data={"file": (students_file, "students.xlsx")},
        )
        professors_resp = client.post(
            "/api/v1/admin/professors/import",
            headers=headers,
            content_type="multipart/form-data",
            data={"file": (professors_file, "professors.xlsx")},
        )

    assert students_resp.status_code == 200
    students_payload = students_resp.get_json()
    assert students_payload["created_count"] == 2
    assert students_payload["errors_count"] == 1

    assert professors_resp.status_code == 200
    professors_payload = professors_resp.get_json()
    assert professors_payload["created_count"] == 2
    assert professors_payload["errors_count"] == 0

    assert len(outbox) == 4
    assert Utilisateur.query.filter_by(email="import.student1@test.com").first() is not None
    assert Utilisateur.query.filter_by(email="import.prof2@test.com").first() is not None


# return2.md section 2 : /api/v1/admin/settings, jusque-la propose dans backreview.md
# mais non implemente. Le seuil d'absences pilote SuiviAbsences.seuil_atteint et doit
# recalculer les suivis existants des qu'il change, pour eviter un etat incoherent.


def test_responsable_peut_consulter_et_modifier_les_parametres(app):
    data = _create_users_and_courses()
    client = app.test_client()
    token = _login(client, data["responsable"].email)
    headers = {"Authorization": f"Bearer {token}"}

    default_resp = client.get("/api/v1/admin/settings", headers=headers)
    assert default_resp.status_code == 200
    default_settings = default_resp.get_json()["settings"]
    assert default_settings["seuil_absences"] == 3
    assert default_settings["tolerance_retard_minutes_defaut"] == 10

    # etudiant_1 a 2 absences non justifiees (cf. _create_users_and_courses) : sous le
    # seuil par defaut de 3, seuil_atteint doit rester False.
    suivi = SuiviAbsences.query.filter_by(etudiant_id=data["etudiant_1"].id).first()
    assert suivi.seuil_atteint is False

    update_resp = client.patch(
        "/api/v1/admin/settings",
        headers=headers,
        json={
            "nom_etablissement": "Institut Demo",
            "seuil_absences": 2,
            "tolerance_retard_minutes_defaut": 15,
            "contact_support_email": "support@institut-demo.test",
        },
    )
    assert update_resp.status_code == 200
    updated_settings = update_resp.get_json()["settings"]
    assert updated_settings["nom_etablissement"] == "Institut Demo"
    assert updated_settings["seuil_absences"] == 2
    assert updated_settings["tolerance_retard_minutes_defaut"] == 15
    assert updated_settings["contact_support_email"] == "support@institut-demo.test"

    # Abaisser le seuil a 2 doit immediatement faire basculer seuil_atteint a True
    # pour un etudiant qui a deja 2 absences non justifiees.
    _db.session.refresh(suivi)
    assert suivi.seuil_atteint is True

    invalid_resp = client.patch(
        "/api/v1/admin/settings",
        headers=headers,
        json={"seuil_absences": 0},
    )
    assert invalid_resp.status_code == 400


def test_responsable_peut_lister_templates_de_rapport_et_generer_un_rapport(app):
    data = _create_users_and_courses()
    client = app.test_client()
    token = _login(client, data["responsable"].email)
    headers = {"Authorization": f"Bearer {token}"}

    templates_resp = client.get("/api/v1/admin/report-templates", headers=headers)
    assert templates_resp.status_code == 200
    templates_payload = templates_resp.get_json()
    template_ids = {template["id"] for template in templates_payload["templates"]}
    assert template_ids == {"absences_summary", "course_attendance"}

    absences_csv_resp = client.post(
        "/api/v1/admin/reports/generate",
        headers=headers,
        json={"template_id": "absences_summary", "format": "csv"},
    )
    assert absences_csv_resp.status_code == 200
    assert "text/csv" in absences_csv_resp.content_type
    assert b"Etu,One" in absences_csv_resp.data or b"etu.one@test.com" in absences_csv_resp.data

    course_xlsx_resp = client.post(
        "/api/v1/admin/reports/generate",
        headers=headers,
        json={
            "template_id": "course_attendance",
            "format": "xlsx",
            "cours_id": data["cours_passe"].id,
        },
    )
    assert course_xlsx_resp.status_code == 200
    assert "spreadsheetml" in course_xlsx_resp.content_type

    missing_param_resp = client.post(
        "/api/v1/admin/reports/generate",
        headers=headers,
        json={"template_id": "course_attendance", "format": "csv"},
    )
    assert missing_param_resp.status_code == 400

    unknown_template_resp = client.post(
        "/api/v1/admin/reports/generate",
        headers=headers,
        json={"template_id": "inconnu", "format": "csv"},
    )
    assert unknown_template_resp.status_code == 400


# return2.md section 2 : /api/v1/admin/subjects et /api/v1/admin/rooms, alias directs
# de /matieres et /salles utilisant les memes handlers (le corps de reponse expose deja
# les cles anglaises "subjects"/"rooms" via serialize_matiere/serialize_salle).


def test_subjects_et_rooms_sont_des_alias_de_matieres_et_salles(app):
    data = _create_users_and_courses()
    client = app.test_client()
    token = _login(client, data["responsable"].email)
    headers = {"Authorization": f"Bearer {token}"}

    subjects_resp = client.get("/api/v1/admin/subjects", headers=headers)
    matieres_resp = client.get("/api/v1/admin/matieres", headers=headers)
    assert subjects_resp.status_code == matieres_resp.status_code == 200
    assert subjects_resp.get_json()["subjects"] == matieres_resp.get_json()["subjects"]

    rooms_resp = client.get("/api/v1/admin/rooms", headers=headers)
    salles_resp = client.get("/api/v1/admin/salles", headers=headers)
    assert rooms_resp.status_code == salles_resp.status_code == 200
    assert rooms_resp.get_json()["rooms"] == salles_resp.get_json()["rooms"]

    create_via_subjects = client.post(
        "/api/v1/admin/subjects",
        headers=headers,
        json={"nom": "Reseaux", "code": "RES-101", "credits": 3},
    )
    assert create_via_subjects.status_code == 201
    subject_id = create_via_subjects.get_json()["subject"]["id"]

    fetched_via_matieres = client.get(f"/api/v1/admin/matieres/{subject_id}", headers=headers)
    assert fetched_via_matieres.status_code == 200
    assert fetched_via_matieres.get_json()["subject"]["code"] == "RES-101"

    create_via_rooms = client.post(
        "/api/v1/admin/rooms",
        headers=headers,
        json={"nom": "D401", "batiment": "D"},
    )
    assert create_via_rooms.status_code == 201
    room_id = create_via_rooms.get_json()["room"]["id"]

    fetched_via_salles = client.get(f"/api/v1/admin/salles/{room_id}", headers=headers)
    assert fetched_via_salles.status_code == 200
    assert fetched_via_salles.get_json()["room"]["nom"] == "D401"


def test_creation_cours_utilise_la_tolerance_retard_par_defaut_configuree(app):
    data = _create_users_and_courses()
    client = app.test_client()
    token = _login(client, data["responsable"].email)
    headers = {"Authorization": f"Bearer {token}"}

    client.patch(
        "/api/v1/admin/settings",
        headers=headers,
        json={"tolerance_retard_minutes_defaut": 20},
    )

    payload = {
        "matiere_id": data["matiere_bd"].id,
        "professeur_id": data["professeur"].id,
        "salle_id": data["salle_b"].id,
        "promotion_id": data["promotion_l1"].id,
        "date": date.today().isoformat(),
        "heure_debut": "09:00:00",
        "heure_fin": "11:00:00",
    }
    create_resp = client.post("/api/v1/admin/courses", headers=headers, json=payload)
    assert create_resp.status_code == 201
    assert create_resp.get_json()["course"]["tolerance_retard_minutes"] == 20


def _parse_sse_payload(raw_chunk):
    text = raw_chunk.decode("utf-8") if isinstance(raw_chunk, bytes) else raw_chunk
    data_line = next(line for line in text.splitlines() if line.startswith("data: "))
    return json.loads(data_line[len("data: ") :])


# return2.md section 5 : canal push (SSE) pour remplacer le polling front de
# GET .../attendance toutes les 15s. Verifie l'evenement initial immediat, la
# notification poussee des qu'un pointage change (via attendance_events.publish,
# le meme signal que pointage_service et regularize_attendance utilisent en
# conditions reelles), et le nettoyage de l'abonnement a la fermeture du flux.


def test_stream_presence_pousse_un_evenement_des_quun_pointage_change(app):
    data = _create_users_and_courses()
    client = app.test_client()
    token = _login(client, data["professeur"].email)
    headers = {"Authorization": f"Bearer {token}"}

    cours_id = data["cours_a_venir"].id

    resp = client.get(
        f"/api/v1/professeur/courses/{cours_id}/attendance/stream",
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.mimetype == "text/event-stream"

    stream = resp.response
    try:
        premier = _parse_sse_payload(next(stream))
        assert premier["course"]["id"] == cours_id
        assert premier["attendance_summary"]["non_pointer"] == 2

        declencheur = threading.Event()

        def publier_apres_delai():
            declencheur.wait(timeout=2)
            attendance_events.publish(cours_id)

        thread = threading.Thread(target=publier_apres_delai)
        thread.start()
        declencheur.set()

        second = _parse_sse_payload(next(stream))
        thread.join(timeout=2)
        assert second["course"]["id"] == cours_id

        assert attendance_events._subscribers.get(cours_id)
    finally:
        resp.close()

    # La fermeture du flux (deconnexion client) doit desabonner la queue pour ne pas
    # accumuler des abonnes fantomes en memoire.
    assert attendance_events._subscribers.get(cours_id) is None


def test_stream_presence_refuse_un_professeur_etranger_au_cours(app):
    data = _create_users_and_courses()
    client = app.test_client()
    token = _login(client, data["professeur"].email)
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.get(
        f'/api/v1/professeur/courses/{data["cours_autre_prof"].id}/attendance/stream',
        headers=headers,
    )
    assert resp.status_code == 403
