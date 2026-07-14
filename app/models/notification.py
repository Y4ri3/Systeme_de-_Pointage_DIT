from app import db
from app.utils import utcnow


class Notification(db.Model):
    __tablename__ = "notifications"

    id = db.Column(db.Integer, primary_key=True)
    destinataire_id = db.Column(db.Integer, db.ForeignKey("utilisateurs.id"), nullable=False)
    cours_id = db.Column(db.Integer, db.ForeignKey("cours.id"), nullable=True)
    type = db.Column(db.String(30), nullable=False)  # alerte_absence / cours_annule / retard_accorde
    message = db.Column(db.Text, nullable=False)
    lu = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=utcnow)

    # Relations
    destinataire = db.relationship("Utilisateur", back_populates="notifications")
    cours = db.relationship("Cours", back_populates="notifications")

    def marquer_lu(self):
        self.lu = True

    def __repr__(self):
        return f"<Notification {self.type} -> {self.destinataire_id}>"
