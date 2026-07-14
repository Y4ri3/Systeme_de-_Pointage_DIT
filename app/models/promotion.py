from app import db


class Promotion(db.Model):
    __tablename__ = "promotions"

    id = db.Column(db.Integer, primary_key=True)
    niveau = db.Column(db.String(10), nullable=False)  # L1, L2, L3
    filiere_id = db.Column(db.Integer, db.ForeignKey("filieres.id"), nullable=False)
    annee_academique = db.Column(db.String(9), nullable=False)  # ex: 2024-2025

    # Relations
    filiere = db.relationship("Filiere", back_populates="promotions")
    etudiants = db.relationship("Utilisateur", back_populates="promotion")
    cours = db.relationship("Cours", back_populates="promotion")
    professeurs = db.relationship(
        "Utilisateur", secondary="professeur_promotions", back_populates="promotions_en_charge"
    )

    def __repr__(self):
        return f"<Promotion {self.niveau} - {self.filiere.nom}>"
