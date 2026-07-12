from app import db
from app.utils import utcnow

class SuiviAbsences(db.Model):
    __tablename__ = 'suivi_absences'

    id = db.Column(db.Integer, primary_key=True)
    etudiant_id = db.Column(db.Integer, db.ForeignKey('utilisateurs.id'), nullable=False)
    matiere_id = db.Column(db.Integer, db.ForeignKey('matieres.id'), nullable=False)
    nombre_absences = db.Column(db.Integer, default=0)
    nb_absences_justifiees = db.Column(db.Integer, default=0)
    seuil_atteint = db.Column(db.Boolean, default=False)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    __table_args__ = (
        db.UniqueConstraint('etudiant_id', 'matiere_id', name='uq_etudiant_matiere'),
    )

    # Relations
    etudiant = db.relationship('Utilisateur', back_populates='suivi_absences')
    matiere = db.relationship('Matiere', back_populates='suivi_absences')

    def incrementer(self):
        """Incrémente les absences injustifiées et vérifie le seuil"""
        self.nombre_absences += 1
        self.verifier_seuil()

    def justifier(self):
        """Convertit la dernière absence en justifiée — ne compte pas dans le seuil"""
        if self.nombre_absences > 0:
            self.nombre_absences -= 1
            self.nb_absences_justifiees += 1
            self.verifier_seuil()

    def verifier_seuil(self):
        """Retourne True si l'étudiant a atteint ou dépassé le seuil d'absences configuré"""
        from app.models.parametre import Parametre

        seuil = Parametre.get_solo().seuil_absences
        self.seuil_atteint = self.nombre_absences >= seuil
        return self.seuil_atteint

    def __repr__(self):
        return f'<SuiviAbsences etudiant={self.etudiant_id} matiere={self.matiere_id} absences={self.nombre_absences}>'
