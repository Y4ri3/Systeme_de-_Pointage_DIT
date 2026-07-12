from functools import wraps

from flask import current_app, jsonify, request
from flask_jwt_extended import get_jwt, verify_jwt_in_request


def allow_password_change_required(f):
    f._allow_password_change_required = True
    return f


def role_required(*roles):
    """Exige un JWT valide dont le claim 'role' figure parmi les rôles autorisés."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            verify_jwt_in_request()
            refusal = _validate_role_claims(roles, f)
            if refusal is not None:
                return refusal
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def kiosk_api_key_required(f):
    """Exige une cle secrete propre a la borne de pointage."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        expected_key = current_app.config.get('ATTENDANCE_KIOSK_API_KEY')
        if not expected_key:
            return jsonify({
                'error': 'attendance_kiosk_not_configured',
                'message': 'La borne de pointage n est pas configuree.',
                'details': {},
            }), 503

        provided_key = request.headers.get('X-Attendance-Kiosk-Key')
        if provided_key != expected_key:
            return jsonify({
                'error': 'invalid_kiosk_key',
                'message': 'La cle de securite de la borne est invalide.',
                'details': {},
            }), 401

        return f(*args, **kwargs)

    return decorated_function


def kiosk_or_role_required(*roles):
    """Autorise l acces via cle de borne ou via JWT staff."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            expected_key = current_app.config.get('ATTENDANCE_KIOSK_API_KEY')
            provided_key = request.headers.get('X-Attendance-Kiosk-Key')
            if expected_key and provided_key == expected_key:
                return f(*args, **kwargs)

            try:
                verify_jwt_in_request()
            except Exception:
                if provided_key:
                    return jsonify({
                        'error': 'invalid_kiosk_key',
                        'message': 'La cle de securite de la borne est invalide.',
                        'details': {},
                    }), 401
                return jsonify({
                    'error': 'authentication_required',
                    'message': 'Une authentification staff ou une cle de borne valide est requise.',
                    'details': {'required_roles': list(roles)},
                }), 401

            refusal = _validate_role_claims(roles, f)
            if refusal is not None:
                return refusal
            return f(*args, **kwargs)

        return decorated_function

    return decorator


def _validate_role_claims(roles, f):
    claims = get_jwt()
    if claims.get('must_change_password') and not getattr(f, '_allow_password_change_required', False):
        return jsonify({
            'error': 'password_change_required',
            'message': 'Vous devez changer votre mot de passe temporaire avant d acceder a cette ressource.',
            'details': {},
        }), 403

    role = claims.get('role')
    if role not in roles:
        return jsonify({
            'error': 'forbidden',
            'message': "Vous n'avez pas les droits pour accéder à cette ressource.",
            'details': {'required_roles': list(roles)},
        }), 403

    return None
