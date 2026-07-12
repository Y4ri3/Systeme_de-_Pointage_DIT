from app import db

class Filiere(db.Model):
    __tablename__ = 'filieres'

    id = db.Column(db.Integer, primary_key=True)
    nom = db.Column(db.String(100), nullable=False, unique=True)

    # Relations
    promotions = db.relationship('Promotion', back_populates='filiere')

    def __repr__(self):
        return f'<Filiere {self.nom}>'