from flask import Blueprint, current_app, jsonify

from app.utils.network import client_ip_in_networks

attendance_bp = Blueprint("attendance", __name__)


@attendance_bp.before_request
def _restrict_to_kiosk_network():
    allowed_networks = current_app.config.get("KIOSK_ALLOWED_NETWORKS")
    if not client_ip_in_networks(allowed_networks):
        return (
            jsonify(
                {
                    "error": "kiosk_network_forbidden",
                    "message": "Cet endpoint n'est accessible que depuis le réseau de la borne.",
                    "details": {},
                }
            ),
            403,
        )


from app.blueprints.attendance import routes
