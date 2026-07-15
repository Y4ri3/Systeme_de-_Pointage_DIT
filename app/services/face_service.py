from pathlib import Path

import requests
from flask import current_app


class FaceServiceError(Exception):
    def __init__(self, code, message, status_code=400, details=None):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details or {}


def _headers(extra_headers=None):
    api_key = current_app.config.get("ARSA_FACE_API_KEY")
    if not api_key:
        raise FaceServiceError(
            "face_service_not_configured",
            "Le service de reconnaissance faciale n est pas configure.",
            503,
        )

    headers = {"x-key-secret": api_key}
    if extra_headers:
        headers.update(extra_headers)
    return headers


def _endpoint(path):
    return f"{current_app.config['ARSA_FACE_BASE_URL'].rstrip('/')}/{path.lstrip('/')}"


def _post_multipart(path, files=None, headers=None):
    try:
        response = requests.post(
            _endpoint(path),
            headers=_headers(headers),
            files=files or {},
            timeout=current_app.config["ARSA_FACE_TIMEOUT_SECONDS"],
        )
    except requests.RequestException as exc:
        raise FaceServiceError(
            "face_service_unavailable",
            "Le service de reconnaissance faciale est indisponible.",
            503,
            {"reason": str(exc)},
        ) from exc

    try:
        payload = response.json()
    except ValueError:
        payload = {}

    if response.status_code >= 400:
        raise FaceServiceError(
            "face_service_error",
            payload.get("message") or "Erreur retournee par le service de reconnaissance faciale.",
            502,
            {"status_code": response.status_code, "response": payload},
        )

    if isinstance(payload, dict) and payload.get("status") in {"error", "fail"}:
        raise FaceServiceError(
            "face_service_error",
            payload.get("message") or "Erreur retournee par le service de reconnaissance faciale.",
            502,
            {"response": payload},
        )

    return payload


def register_face(face_uid, image_path):
    with open(image_path, "rb") as image_file:
        return _post_multipart(
            "face_recognition/register_face",
            files={"face_image": image_file},
            headers={"x-face-uid": face_uid},
        )


def validate_faces(selfie_path, reference_path):
    with open(selfie_path, "rb") as selfie_file, open(reference_path, "rb") as reference_file:
        return _post_multipart(
            "face_recognition/validate_faces",
            files={
                "image1": selfie_file,
                "image2": reference_file,
            },
        )


def analyze_liveness(image_path):
    with open(image_path, "rb") as image_file:
        return _post_multipart(
            "face_liveness",
            files={"face_image": image_file},
        )


def extract_match_result(payload):
    similarity = payload.get("similarity_score")
    if similarity is None:
        similarity = payload.get("confidence") or payload.get("match_score")

    match = payload.get("match_result")
    if match is None:
        match = payload.get("matched")

    if isinstance(match, str):
        match = match.lower() in {"true", "success", "matched", "match", "yes"}

    if match is None and similarity is not None:
        match = similarity >= current_app.config["ARSA_FACE_MATCH_THRESHOLD"]

    return {
        "match": bool(match),
        "similarity_score": similarity,
        "raw": payload,
    }


def extract_liveness_result(payload):
    """Parse la reponse de POST /api/v1/face_liveness.

    Schema documente (https://faceapi.arsa.technology/docs/face-liveness) :
    {"status": "success", "faces": [{"is_real_face": bool, "liveness_confidence": float,
    "liveness_status": "real"|...}], "latency_ms": float}. Le champ de confiance s'appelle
    liveness_confidence sur cet endpoint (liveness_probability n'existe que dans la reponse
    imbriquee de validate_faces.faceN_analysis.passive_liveness) -- les deux noms sont
    acceptes ici par robustesse, en plus d'un eventuel payload deja "aplati" (sans "faces").
    """
    faces = payload.get("faces") if isinstance(payload, dict) else None
    face = (faces[0] if faces else payload) if isinstance(payload, dict) else {}

    is_real_face = face.get("is_real_face")
    probability = face.get("liveness_confidence")
    if probability is None:
        probability = face.get("liveness_probability")

    if probability is None:
        passive = face.get("passive_liveness") or {}
        if is_real_face is None:
            is_real_face = passive.get("is_real_face")
        probability = passive.get("liveness_probability")
        if probability is None:
            probability = passive.get("liveness_confidence")

    if isinstance(is_real_face, str):
        is_real_face = is_real_face.lower() in {"true", "success", "real"}

    if probability is None:
        probability = 0

    return {
        "is_real_face": bool(is_real_face),
        "liveness_probability": probability,
        "raw": payload,
    }


def build_face_uid(user_id):
    return f"utilisateur_{user_id}"


def reference_photo_path(photo_relative_path):
    return str(Path(current_app.config["UPLOAD_FOLDER"]) / photo_relative_path)
