from app import db
from werkzeug.security import generate_password_hash, check_password_hash
from app.utils import utcnow

professeur_matieres = db.Table(
    "professeur_matieres",
    db.Column("utilisateur_id", db.Integer, db.ForeignKey("utilisateurs.id"), primary_key=True),
    db.Column("matiere_id", db.Integer, db.ForeignKey("matieres.id"), primary_key=True),
)

professeur_promotions = db.Table(
    "professeur_promotions",
    db.Column("utilisateur_id", db.Integer, db.ForeignKey("utilisateurs.id"), primary_key=True),
    db.Column("promotion_id", db.Integer, db.ForeignKey("promotions.id"), primary_key=True),
)


class Utilisateur(db.Model):
    __tablename__ = "utilisateurs"

    id = db.Column(db.Integer, primary_key=True)
    nom = db.Column(db.String(100), nullable=False)
    prenom = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    mot_de_passe = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # etudiant / professeur / responsable / admin
    promotion_id = db.Column(db.Integer, db.ForeignKey("promotions.id"), nullable=True)
    photo = db.Column(db.String(255), nullable=True)
    statut = db.Column(db.String(10), default="actif")
    must_change_password = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow)

    # Relations
    promotion = db.relationship("Promotion", back_populates="etudiants")
    cours_enseignes = db.relationship(
        "Cours", foreign_keys="Cours.professeur_id", back_populates="professeur"
    )
    pointages = db.relationship("Pointage", foreign_keys="Pointage.etudiant_id", back_populates="etudiant")
    suivi_absences = db.relationship("SuiviAbsences", back_populates="etudiant")
    notifications = db.relationship("Notification", back_populates="destinataire")
    matieres_enseignees = db.relationship(
        "Matiere", secondary=professeur_matieres, back_populates="professeurs"
    )
    promotions_en_charge = db.relationship(
        "Promotion", secondary=professeur_promotions, back_populates="professeurs"
    )

    # Méthodes mot de passe
    def set_password(self, password):
        self.mot_de_passe = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.mot_de_passe, password)

    # Méthodes rôles
    def is_etudiant(self):
        return self.role == "etudiant"

    def is_professeur(self):
        return self.role == "professeur"

    def is_responsable(self):
        return self.role == "responsable"

    def is_admin(self):
        return self.role in ("admin", "responsable")

    def __repr__(self):
        return f"<Utilisateur {self.prenom} {self.nom} ({self.role})>"
