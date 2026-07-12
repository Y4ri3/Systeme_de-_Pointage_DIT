from flask import Blueprint

professeur_bp = Blueprint('professeur', __name__)

from app.blueprints.professeur import routes