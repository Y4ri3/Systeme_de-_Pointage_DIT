from flask import jsonify
from sqlalchemy.exc import OperationalError
from werkzeug.exceptions import HTTPException


def _error_response(code, message, details=None, status=400):
    return jsonify({
        'error': code,
        'message': message,
        'details': details or {},
    }), status


def register_error_handlers(app):
    @app.errorhandler(HTTPException)
    def handle_http_exception(e):
        code = e.name.lower().replace(' ', '_')
        return _error_response(code, e.description, status=e.code)

    @app.errorhandler(OperationalError)
    def handle_operational_error(e):
        app.logger.exception(e)
        raw_message = str(getattr(e, 'orig', e)).lower()
        if 'no such column' in raw_message or 'no such table' in raw_message:
            return _error_response(
                'database_schema_outdated',
                'La base locale n est pas a jour par rapport au schema courant.',
                details={
                    'hint': 'Relance le serveur ou mets a jour la base de developpement.',
                },
                status=500,
            )

        return _error_response(
            'database_error',
            'Une erreur de base de donnees est survenue.',
            status=500,
        )

    @app.errorhandler(Exception)
    def handle_generic_exception(e):
        app.logger.exception(e)
        return _error_response(
            'internal_server_error',
            'Une erreur inattendue est survenue.',
            status=500,
        )


def register_jwt_error_handlers(jwt):
    @jwt.unauthorized_loader
    def handle_missing_token(reason):
        return _error_response('unauthorized', reason, status=401)

    @jwt.invalid_token_loader
    def handle_invalid_token(reason):
        return _error_response('invalid_token', reason, status=401)

    @jwt.expired_token_loader
    def handle_expired_token(jwt_header, jwt_payload):
        return _error_response('token_expired', 'Le jeton a expiré.', status=401)
