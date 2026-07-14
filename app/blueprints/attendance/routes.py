from datetime import datetime

from flask import current_app, jsonify, request

from app.blueprints.attendance import attendance_bp
from app.services.pointage_service import (
    PointageError,
    enregistrer_pointage,
    identifier_etudiant_pour_borne,
)
from app.utils import utcnow
from app.utils.decorators import kiosk_or_role_required


def _parse_client_timestamp(timestamp_raw):
    if not timestamp_raw:
        return None, None

    try:
        return datetime.fromisoformat(timestamp_raw), None
    except (TypeError, ValueError):
        return (
            None,
            jsonify(
                {
                    "error": "bad_request",
                    "message": "Le format du timestamp est invalide (ISO 8601 attendu).",
                    "details": {},
                }
            ),
            400,
        )


@attendance_bp.route("/kiosk/scan", methods=["POST"])
@kiosk_or_role_required("professeur", "responsable", "admin")
def kiosk_scan():
    selfie = request.files.get("selfie")
    if selfie is None or not selfie.filename:
        return (
            jsonify(
                {
                    "error": "bad_request",
                    "message": "Le selfie est requis.",
                    "details": {},
                }
            ),
            400,
        )

    timestamp_result = _parse_client_timestamp(request.form.get("timestamp"))
    if len(timestamp_result) == 3:
        return timestamp_result[1], timestamp_result[2]

    timestamp_client = timestamp_result[0]
    if timestamp_client is not None:
        current_app.logger.info(
            "Kiosk scan timestamp_client=%s",
            timestamp_client.isoformat(),
        )

    try:
        resultat = identifier_etudiant_pour_borne(
            selfie_bytes=selfie.read(),
            selfie_filename=selfie.filename,
            timestamp=utcnow(),
        )
    except PointageError as e:
        return (
            jsonify(
                {
                    "error": e.code,
                    "message": e.message,
                    "details": {},
                }
            ),
            e.status_code,
        )

    return jsonify(resultat), 200


@attendance_bp.route("/kiosk/checkin", methods=["POST"])
@kiosk_or_role_required("professeur", "responsable", "admin")
def kiosk_checkin():
    student_id = request.form.get("student_id", type=int)
    course_id = request.form.get("course_id", type=int)
    gps_lat = request.form.get("gps_lat", type=float)
    gps_lng = request.form.get("gps_lng", type=float)
    selfie = request.files.get("selfie")

    if not student_id or not course_id or selfie is None or not selfie.filename:
        return (
            jsonify(
                {
                    "error": "bad_request",
                    "message": "student_id, course_id et selfie sont requis.",
                    "details": {},
                }
            ),
            400,
        )

    timestamp_result = _parse_client_timestamp(request.form.get("timestamp"))
    if len(timestamp_result) == 3:
        return timestamp_result[1], timestamp_result[2]

    timestamp_client = timestamp_result[0]
    if timestamp_client is not None:
        current_app.logger.info(
            "Kiosk check-in cours=%s etudiant=%s timestamp_client=%s",
            course_id,
            student_id,
            timestamp_client.isoformat(),
        )

    try:
        resultat = enregistrer_pointage(
            etudiant_id=student_id,
            cours_id=course_id,
            selfie_bytes=selfie.read(),
            selfie_filename=selfie.filename,
            gps_lat=gps_lat,
            gps_lng=gps_lng,
            timestamp=utcnow(),
        )
    except PointageError as e:
        return (
            jsonify(
                {
                    "error": e.code,
                    "message": e.message,
                    "details": {},
                }
            ),
            e.status_code,
        )

    return jsonify(resultat), 201 if resultat["success"] else 200
