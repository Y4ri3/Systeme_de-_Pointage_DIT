// Le backend ne stocke que "programme" / "modifie" / "annule" / "reporte" en
// base (app/models/cours.py) : il ne fait jamais lui-meme la distinction
// avenir / en cours / termine, qui depend de l'heure actuelle. On la calcule
// donc cote front a partir de date + heure_debut/heure_fin, sinon un cours
// "programme" dont la seance est deja passee reste affiche comme "a venir"
// indefiniment (et fausse les compteurs "cours du jour"/"cours termines").
//
// Partage entre api/professor.js et api/student.js : les deux copies avaient
// fini par diverger (le statut "modifie" etait ecrase des que date/heure sont
// presentes, alors que StatusBadge.jsx prevoit un badge dedie pour ce statut).
export function computeDisplayStatus(course) {
  if (course.statut === 'annule' || course.statut === 'modifie') return course.statut;
  if (!course.date || !course.heure_debut || !course.heure_fin) {
    return ['programme', 'reporte'].includes(course.statut) ? 'avenir' : course.statut;
  }

  const now = new Date();
  const debut = new Date(`${course.date}T${course.heure_debut}`);
  const fin = new Date(`${course.date}T${course.heure_fin}`);

  if (now < debut) return 'avenir';
  if (now > fin) return 'termine';
  return 'en cours';
}
