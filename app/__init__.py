from flask import Flask, redirect, send_from_directory
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_mail import Mail
from flask_migrate import Migrate
from flask_swagger_ui import get_swaggerui_blueprint
from sqlalchemy import inspect, text
from werkzeug.middleware.proxy_fix import ProxyFix
from config import config
import os

db = SQLAlchemy()
jwt = JWTManager()
mail = Mail()
migrate = Migrate()


def _repair_local_sqlite_schema(app):
    """Ajoute les colonnes critiques manquantes sur les anciennes bases SQLite de dev."""
    database_uri = app.config.get("SQLALCHEMY_DATABASE_URI") or ""
    if not database_uri.startswith("sqlite:///"):
        return

    inspector = inspect(db.engine)
    try:
        tables = set(inspector.get_table_names())
    except Exception:
        app.logger.exception("Impossible d inspecter la base SQLite locale.")
        return

    statements = []

    if "utilisateurs" in tables:
        columns = {column["name"] for column in inspector.get_columns("utilisateurs")}
        if "must_change_password" not in columns:
            statements.append(
                "ALTER TABLE utilisateurs ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT 0"
            )

    if "parametres" in tables:
        columns = {column["name"] for column in inspector.get_columns("parametres")}
        if "tolerance_retard_minutes_defaut" not in columns:
            statements.append(
                "ALTER TABLE parametres ADD COLUMN tolerance_retard_minutes_defaut "
                "INTEGER NOT NULL DEFAULT 10"
            )
        if "contact_support_email" not in columns:
            statements.append("ALTER TABLE parametres ADD COLUMN contact_support_email VARCHAR(150)")

    if not statements:
        return

    with db.engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))

    app.logger.warning(
        "Base SQLite locale mise a niveau automatiquement pour correspondre au schema courant."
    )


def create_app(config_name="default"):
    app = Flask(__name__)
    app.config.from_object(config[config_name]())
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

    trusted_proxy_hops = app.config.get("TRUSTED_PROXY_HOPS", 0)
    if trusted_proxy_hops > 0:
        app.wsgi_app = ProxyFix(app.wsgi_app, x_for=trusted_proxy_hops)

    db.init_app(app)
    jwt.init_app(app)
    mail.init_app(app)
    migrate.init_app(app, db)
    CORS(
        app,
        resources={r"/api/*": {"origins": app.config["CORS_ALLOWED_ORIGINS"]}},
        supports_credentials=False,
        allow_headers=["Content-Type", "Authorization", "X-Attendance-Kiosk-Key"],
        methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    )

    from app.errors import register_error_handlers, register_jwt_error_handlers

    register_error_handlers(app)
    register_jwt_error_handlers(jwt)

    # Import des modèles pour que Flask-Migrate les détecte
    with app.app_context():
        from app.models import (
            Filiere,
            Promotion,
            Utilisateur,
            Matiere,
            Salle,
            Cours,
            Pointage,
            SuiviAbsences,
            Notification,
            Parametre,
        )

        _repair_local_sqlite_schema(app)

    from app.blueprints.auth import auth_bp
    from app.blueprints.attendance import attendance_bp
    from app.blueprints.etudiant import etudiant_bp
    from app.blueprints.professeur import professeur_bp
    from app.blueprints.admin import admin_bp

    app.register_blueprint(auth_bp, url_prefix="/api/v1/auth")
    app.register_blueprint(attendance_bp, url_prefix="/api/v1/attendance")
    app.register_blueprint(etudiant_bp, url_prefix="/api/v1/etudiant")
    app.register_blueprint(professeur_bp, url_prefix="/api/v1/professeur")
    app.register_blueprint(admin_bp, url_prefix="/api/v1/admin")

    from app.cli import register_cli

    register_cli(app)

    # Configuration Swagger UI
    SWAGGER_URL = "/swagger"
    API_URL = "/swagger.yml"

    swaggerui_blueprint = get_swaggerui_blueprint(
        SWAGGER_URL, API_URL, config={"app_name": "Système de Pointage API"}
    )
    app.register_blueprint(swaggerui_blueprint, url_prefix=SWAGGER_URL)

    # Route pour servir le fichier swagger.yml
    @app.route("/swagger.yml")
    def swagger_spec():
        return send_from_directory(os.path.dirname(os.path.dirname(__file__)), "swagger.yml")

    @app.route("/uploads/<path:filename>")
    def uploaded_file(filename):
        return send_from_directory(app.config["UPLOAD_FOLDER"], filename)

    # Rediriger la racine vers la documentation
    @app.route("/")
    def index():
        return redirect("/swagger")

    return app
