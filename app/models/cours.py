from app import db
from app.utils import utcnow
from sqlalchemy.orm import validates


class Cours(db.Model):
    __tablename__ = "cours"

    id = db.Column(db.Integer, primary_key=True)
    matiere_id = db.Column(db.Integer, db.ForeignKey("matieres.id"), nullable=False)
    professeur_id = db.Column(db.Integer, db.ForeignKey("utilisateurs.id"), nullable=False)
    salle_id = db.Column(db.Integer, db.ForeignKey("salles.id"), nullable=False)
    promotion_id = db.Column(db.Integer, db.ForeignKey("promotions.id"), nullable=False)
    date = db.Column(db.Date, nullable=False)
    heure_debut = db.Column(db.Time, nullable=False)
    heure_fin = db.Column(db.Time, nullable=False)
    tolerance_retard_minutes = db.Column(db.Integer, nullable=False, default=10)
    statut = db.Column(db.String(20), default="programme")  # programme/modifie/annule/reporte
    motif_changement = db.Column(db.Text, nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey("utilisateurs.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    @validates("heure_debut", "heure_fin")
    def _valider_heure_fin_apres_heure_debut(self, key, value):
        heure_debut = value if key == "heure_debut" else self.heure_debut
        heure_fin = value if key == "heure_fin" else self.heure_fin
        if heure_debut is not None and heure_fin is not None and heure_fin <= heure_debut:
            raise ValueError(
                "heure_fin doit être strictement postérieure à heure_debut : "
                "un cours ne peut pas chevaucher minuit ni avoir une durée nulle "
                "(cours.date est un jour calendaire unique)."
            )
        return value

    # Relations
    matiere = db.relationship("Matiere", back_populates="cours")
    professeur = db.relationship(
        "Utilisateur", foreign_keys=[professeur_id], back_populates="cours_enseignes"
    )
    salle = db.relationship("Salle", back_populates="cours")
    promotion = db.relationship("Promotion", back_populates="cours")
    pointages = db.relationship("Pointage", back_populates="cours")
    notifications = db.relationship("Notification", back_populates="cours")

    def annuler(self, motif):
        self.statut = "annule"
        self.motif_changement = motif
        self.updated_at = utcnow()

    def reporter(self, nouvelle_date, nouvelle_heure):
        self.date = nouvelle_date
        self.heure_debut = nouvelle_heure
        self.statut = "reporte"
        self.updated_at = utcnow()

    def __repr__(self):
        return f"<Cours {self.matiere.nom} - {self.date} {self.heure_debut}>"
