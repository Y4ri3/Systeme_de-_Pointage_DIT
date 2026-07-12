from app import db
from datetime import datetime
from app.utils import utcnow

class Pointage(db.Model):
    __tablename__ = 'pointages'

    id = db.Column(db.Integer, primary_key=True)
    cours_id = db.Column(db.Integer, db.ForeignKey('cours.id'), nullable=False)
    etudiant_id = db.Column(db.Integer, db.ForeignKey('utilisateurs.id'), nullable=False)
    timestamp_pointage = db.Column(db.DateTime, default=utcnow)
    statut = db.Column(db.String(20), nullable=False)  # present/retard/absent/absence_justifiee/invalide
    methode = db.Column(db.String(20), nullable=True)  # qr_wifi / force_admin
    wifi_detecte = db.Column(db.Boolean, default=False)
    qr_valide = db.Column(db.Boolean, default=False)
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    accorde_par = db.Column(db.Integer, db.ForeignKey('utilisateurs.id'), nullable=True)
    justificatif = db.Column(db.Text, nullable=True)

    __table_args__ = (
        db.Index(
            'uq_pointage_etudiant_cours_valide',
            'etudiant_id', 'cours_id',
            unique=True,
            postgresql_where=db.text("statut IN ('present', 'retard')"),
        ),
    )

    # Relations
    cours = db.relationship('Cours', back_populates='pointages')
    etudiant = db.relationship('Utilisateur', foreign_keys=[etudiant_id], back_populates='pointages')
    accordeur = db.relationship('Utilisateur', foreign_keys=[accorde_par])

    def __repr__(self):
        return f'<Pointage {self.etudiant_id} - {self.statut} - {self.timestamp_pointage}>'
