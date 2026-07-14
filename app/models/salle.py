from app import db
import uuid


class Salle(db.Model):
    __tablename__ = "salles"

    id = db.Column(db.Integer, primary_key=True)
    nom = db.Column(db.String(50), nullable=False)
    batiment = db.Column(db.String(50), nullable=True)
    qr_code_token = db.Column(db.String(255), nullable=False, unique=True, default=lambda: str(uuid.uuid4()))

    # Relations
    cours = db.relationship("Cours", back_populates="salle")

    def regenerer_qr(self):
        self.qr_code_token = str(uuid.uuid4())
        return self.qr_code_token

    def __repr__(self):
        return f"<Salle {self.nom}>"
