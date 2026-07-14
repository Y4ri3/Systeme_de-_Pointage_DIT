from app import db
from app.utils import utcnow


class Parametre(db.Model):
    """Parametres globaux de pilotage, modifiables par un responsable/admin (ligne unique)."""

    __tablename__ = "parametres"

    id = db.Column(db.Integer, primary_key=True)
    nom_etablissement = db.Column(db.String(150), nullable=False, default="Etablissement")
    seuil_absences = db.Column(db.Integer, nullable=False, default=3)
    tolerance_retard_minutes_defaut = db.Column(db.Integer, nullable=False, default=10)
    contact_support_email = db.Column(db.String(150), nullable=True)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    @classmethod
    def get_solo(cls):
        """Retourne l'unique ligne de parametres, en la creant avec les valeurs par defaut si absente."""
        instance = db.session.get(cls, 1)
        if instance is None:
            instance = cls(id=1)
            db.session.add(instance)
            db.session.commit()
        return instance

    def __repr__(self):
        return f"<Parametre seuil_absences={self.seuil_absences}>"
