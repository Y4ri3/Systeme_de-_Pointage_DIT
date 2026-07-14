from flask import Blueprint

etudiant_bp = Blueprint("etudiant", __name__)

from app.blueprints.etudiant import routes
