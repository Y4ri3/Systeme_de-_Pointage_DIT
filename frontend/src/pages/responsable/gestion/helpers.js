// Doit rester alignee sur MAX_CONTENT_LENGTH cote backend (config.py, 5 Mo) :
// sans ce controle cote front, un fichier trop lourd provoque une reponse 413
// que le navigateur traite parfois comme un echec reseau brut ("impossible de
// contacter le backend"), un message trompeur qui fait croire a un serveur
// injoignable alors qu'il tournait tres bien.
export const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;

export function getFileSizeErrorMessage(file, label = 'Le fichier') {
  if (!file || file.size <= MAX_UPLOAD_SIZE_BYTES) return null;

  const maxMb = (MAX_UPLOAD_SIZE_BYTES / (1024 * 1024)).toFixed(0);
  const fileMb = (file.size / (1024 * 1024)).toFixed(1);
  return `${label} (${fileMb} Mo) depasse la limite autorisee de ${maxMb} Mo. Choisissez un fichier plus leger.`;
}

export function buildDisplayName(entity) {
  if (!entity) return 'Non renseigne';

  const fullName = [entity.prenom, entity.nom].filter(Boolean).join(' ').trim();
  return fullName || entity.full_name || entity.name || entity.nom || 'Non renseigne';
}

export function splitPersonName(entity) {
  if (!entity) {
    return { nom: '', prenom: '' };
  }

  if (entity.prenom || !entity.nom) {
    return {
      nom: entity.nom || '',
      prenom: entity.prenom || ''
    };
  }

  const parts = String(entity.nom)
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length <= 1) {
    return { nom: entity.nom || '', prenom: '' };
  }

  return {
    prenom: parts[0],
    nom: parts.slice(1).join(' ')
  };
}

export function getStudentIdentifier(student) {
  return (
    student?.numeroEtudiant ||
    student?.numero_etudiant ||
    student?.student_number ||
    student?.matricule ||
    student?.email ||
    'Identifiant non renseigne'
  );
}

export function getPromotionLabel(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.nom || value.niveau || value.name || value.label || value.promotion_name || '';
}

// La filiere renvoyee par le backend est un objet {id, nom} (confirme sur
// /admin/promotions), pas une chaine : la rendre directement en JSX fait
// planter React ("Objects are not valid as a React child").
export function getFiliereLabel(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.nom || value.name || value.label || '';
}

export function getStudentPromotionLabel(student) {
  return (
    getPromotionLabel(student?.promotion) ||
    student?.promotion_nom ||
    student?.promotion_name ||
    'Promotion non renseignee'
  );
}

export function getEntityStatus(entity) {
  return entity?.statut || entity?.status || 'Non renseigne';
}

export function isActiveStatus(status) {
  const normalizedStatus = String(status || '').trim().toLowerCase();
  return normalizedStatus === 'actif' || normalizedStatus === 'active';
}

export function getProfessorPhone(professor) {
  return professor?.telephone || professor?.phone || 'Telephone non renseigne';
}

export function getCourseName(course) {
  return (
    course?.nom ||
    course?.course_name ||
    course?.title ||
    getFiliereLabel(course?.matiere) ||
    `Cours ${course?.id || ''}`.trim()
  );
}

export function getCourseProfessorLabel(course) {
  if (!course) return 'Professeur non renseigne';
  if (typeof course.professeur === 'string') return course.professeur;
  return buildDisplayName(course.professeur) || course?.professor_name || 'Professeur non renseigne';
}

export function getCoursePromotionLabel(course) {
  return (
    getPromotionLabel(course?.promotion) ||
    course?.promotion_name ||
    course?.promotion_nom ||
    'Promotion non renseignee'
  );
}

export function getCourseRoomLabel(course) {
  return (
    getFiliereLabel(course?.salle) ||
    course?.room_name ||
    getFiliereLabel(course?.room) ||
    'Salle non renseignee'
  );
}

export function getCourseScheduleLabel(course) {
  if (course?.horaire) return course.horaire;
  if (course?.schedule) return course.schedule;
  if (course?.time_range) return course.time_range;
  if (course?.heure_debut && course?.heure_fin) {
    return `${String(course.heure_debut).slice(0, 5)} - ${String(course.heure_fin).slice(0, 5)}`;
  }
  return 'Horaire non renseigne';
}

// /admin/absences imbrique l'etudiant sous item.etudiant (pas a la racine),
// n'a pas de champ taux_absence (seulement un booleen seuil_atteint calcule
// server-side) : partage entre Alertes.jsx et Dashboard.jsx, qui consomment
// tous les deux ce meme endpoint pour afficher des listes d'alertes.
export function getAlertStudent(item) {
  return item?.etudiant || {};
}

export function getEligibleProfessors(professors, { matiereId, promotionId }) {
  if (!Array.isArray(professors)) return [];
  if (!matiereId || !promotionId) return professors;

  return professors.filter((professor) => {
    const matieres = professor?.matieres_enseignees;
    const promotions = professor?.promotions_en_charge;

    if (!Array.isArray(matieres) || !Array.isArray(promotions)) return false;

    return (
      matieres.some((matiere) => String(matiere.id) === String(matiereId)) &&
      promotions.some((promotion) => String(promotion.id) === String(promotionId))
    );
  });
}
