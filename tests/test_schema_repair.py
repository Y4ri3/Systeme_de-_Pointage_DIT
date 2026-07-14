import sqlite3

from flask import Flask
from sqlalchemy import inspect

from app import _repair_local_sqlite_schema, db


def _build_app(db_path):
    app = Flask(__name__)
    app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{db_path}"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    db.init_app(app)
    return app


def test_repair_ajoute_les_colonnes_manquantes_sur_parametres(tmp_path):
    """Reproduit le bug rapporte par le front (500 database_schema_outdated sur
    /admin/settings) : une base 'parametres' creee avant l'ajout de
    tolerance_retard_minutes_defaut / contact_support_email au modele, jamais
    migree depuis. _repair_local_sqlite_schema doit combler l'ecart automatiquement
    au demarrage, sans intervention manuelle.
    """
    db_path = tmp_path / "repair_test.db"

    app = _build_app(db_path)
    with app.app_context():
        from app.models import (  # noqa: F401
            Cours,
            Filiere,
            Matiere,
            Notification,
            Parametre,
            Pointage,
            Promotion,
            Salle,
            SuiviAbsences,
            Utilisateur,
        )

        db.create_all()

    conn = sqlite3.connect(str(db_path))
    conn.execute("DROP TABLE parametres")
    conn.execute("""
        CREATE TABLE parametres (
            id INTEGER PRIMARY KEY,
            nom_etablissement VARCHAR(150) NOT NULL,
            seuil_absences INTEGER NOT NULL,
            updated_at DATETIME
        )
        """)
    conn.commit()
    conn.close()

    app2 = _build_app(db_path)
    with app2.app_context():
        _repair_local_sqlite_schema(app2)

        inspector = inspect(db.engine)
        columns = {col["name"] for col in inspector.get_columns("parametres")}
        assert "tolerance_retard_minutes_defaut" in columns
        assert "contact_support_email" in columns

        parametre = Parametre.get_solo()
        assert parametre.tolerance_retard_minutes_defaut == 10
        assert parametre.contact_support_email is None
