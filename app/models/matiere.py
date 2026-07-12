from app import db

class Matiere(db.Model):
    __tablename__ = 'matieres'

    id = db.Column(db.Integer, primary_key=True)
    nom = db.Column(db.String(150), nullable=False)
    code = db.Column(db.String(20), nullable=False, unique=True)
    credits = db.Column(db.Integer, default=0)

    # Relations
    cours = db.relationship('Cours', back_populates='matiere')
    suivi_absences = db.relationship('SuiviAbsences', back_populates='matiere')

    def __repr__(self):
        return f'<Matiere {self.code} - {self.nom}>'