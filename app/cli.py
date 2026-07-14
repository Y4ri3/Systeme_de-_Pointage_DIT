from datetime import date, time, timedelta

import click

from app import db
from app.models.filiere import Filiere
from app.models.promotion import Promotion
from app.models.utilisateur import Utilisateur
from app.models.matiere import Matiere
from app.models.salle import Salle
from app.models.cours import Cours


def register_cli(app):
    @app.cli.command("seed-db")
    def seed_db():
        """Peuple la base avec des données de test minimales
        (filières, promotions, salles, comptes, cours)."""
        filiere_bd = Filiere.query.filter_by(nom="Big Data").first()
        if filiere_bd is None:
            filiere_bd = Filiere(nom="Big Data")
            db.session.add(filiere_bd)

        filiere_ia = Filiere.query.filter_by(nom="Intelligence Artificielle").first()
        if filiere_ia is None:
            filiere_ia = Filiere(nom="Intelligence Artificielle")
            db.session.add(filiere_ia)

        db.session.flush()

        annee = "2025-2026"
        promotions_def = [
            ("L1", filiere_bd),
            ("L2", filiere_bd),
            ("L3", filiere_bd),
            ("M1", filiere_ia),
        ]
        promotions = {}
        for niveau, filiere in promotions_def:
            promo = Promotion.query.filter_by(
                niveau=niveau, filiere_id=filiere.id, annee_academique=annee
            ).first()
            if promo is None:
                promo = Promotion(niveau=niveau, filiere=filiere, annee_academique=annee)
                db.session.add(promo)
            promotions[(niveau, filiere.nom)] = promo

        salles_def = [
            ("A101", "Bâtiment A"),
            ("A102", "Bâtiment A"),
            ("Amphi B", "Bâtiment B"),
        ]
        salles = {}
        for nom, batiment in salles_def:
            salle = Salle.query.filter_by(nom=nom).first()
            if salle is None:
                salle = Salle(nom=nom, batiment=batiment)
                db.session.add(salle)
            salles[nom] = salle

        matieres_def = [
            ("BD-101", "Fondamentaux du Big Data", 6),
            ("IA-101", "Introduction à l'Intelligence Artificielle", 6),
        ]
        matieres = {}
        for code, nom, credits in matieres_def:
            matiere = Matiere.query.filter_by(code=code).first()
            if matiere is None:
                matiere = Matiere(code=code, nom=nom, credits=credits)
                db.session.add(matiere)
            matieres[code] = matiere

        db.session.flush()

        comptes_def = [
            ("etudiant", "Etudiant", "Test", "etudiant@test.com", promotions[("L1", "Big Data")]),
            ("professeur", "Professeur", "Test", "professeur@test.com", None),
            ("responsable", "Responsable", "Test", "responsable@test.com", None),
            ("admin", "Admin", "Test", "admin@test.com", None),
        ]
        utilisateurs = {}
        for role, nom, prenom, email, promotion in comptes_def:
            user = Utilisateur.query.filter_by(email=email).first()
            if user is None:
                user = Utilisateur(nom=nom, prenom=prenom, email=email, role=role, promotion=promotion)
                user.set_password("Password123!")
                db.session.add(user)
            utilisateurs[role] = user

        db.session.flush()

        cours_def = [
            (
                matieres["BD-101"],
                utilisateurs["professeur"],
                salles["A101"],
                promotions[("L1", "Big Data")],
                date.today() + timedelta(days=1),
                time(9, 0),
                time(11, 0),
            ),
            (
                matieres["IA-101"],
                utilisateurs["professeur"],
                salles["Amphi B"],
                promotions[("M1", "Intelligence Artificielle")],
                date.today() + timedelta(days=2),
                time(14, 0),
                time(16, 0),
            ),
        ]
        for matiere, professeur, salle, promotion, jour, debut, fin in cours_def:
            existe = Cours.query.filter_by(
                matiere_id=matiere.id, promotion_id=promotion.id, date=jour
            ).first()
            if existe is None:
                cours = Cours(
                    matiere=matiere,
                    professeur=professeur,
                    salle=salle,
                    promotion=promotion,
                    date=jour,
                    heure_debut=debut,
                    heure_fin=fin,
                    created_by=utilisateurs["admin"].id,
                )
                db.session.add(cours)

        db.session.commit()
        click.echo("Données de test insérées avec succès.")
        click.echo("Comptes créés (mot de passe: Password123!) :")
        for role, user in utilisateurs.items():
            click.echo(f"  - {role}: {user.email}")
