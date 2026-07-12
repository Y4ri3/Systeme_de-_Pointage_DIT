import base64
from io import BytesIO

import qrcode
from flask import current_app
from itsdangerous import BadSignature, URLSafeTimedSerializer

QR_TOKEN_MAX_AGE_SECONDS = 120
_QR_SALT = 'qr-cours'


def _get_serializer():
    return URLSafeTimedSerializer(current_app.config['SECRET_KEY'])


def generer_qr_cours(cours_id):
    """Génère un token signé (expirant) pour un cours, ainsi que son QR code en base64."""
    serializer = _get_serializer()
    token = serializer.dumps({'cours_id': cours_id}, salt=_QR_SALT)

    image = qrcode.make(token)
    buffer = BytesIO()
    image.save(buffer, format='PNG')
    qr_code_base64 = base64.b64encode(buffer.getvalue()).decode('ascii')

    return {
        'token': token,
        'qr_code_base64': qr_code_base64,
        'expires_in': QR_TOKEN_MAX_AGE_SECONDS,
    }


def valider_qr_token(token, cours_id_attendu):
    """Vérifie que le token est valide, non expiré, et correspond au cours attendu."""
    serializer = _get_serializer()
    try:
        data = serializer.loads(token, salt=_QR_SALT, max_age=QR_TOKEN_MAX_AGE_SECONDS)
    except BadSignature:
        return False

    return isinstance(data, dict) and data.get('cours_id') == cours_id_attendu
