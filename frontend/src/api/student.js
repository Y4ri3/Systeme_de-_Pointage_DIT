import { apiFetch, buildQuery, withMockFallback } from './client';
import { computeDisplayStatus } from './courseStatus';
import {
  mockCours,
  mockEtudiant,
  mockHistoriqueEtudiant,
  mockNotificationsByRole,
  mockTodaySchedule
} from '../data/mockData';

function unwrapCollection(data, keys = []) {
  if (Array.isArray(data)) {
    return data;
  }

  for (const key of keys) {
    if (Array.isArray(data?.[key])) {
      return data[key];
    }
  }

  return [];
}

function labelOf(value, ...fields) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  for (const field of fields) {
    if (value[field]) return value[field];
  }
  return '';
}

// Meme forme imbriquee que /admin/courses et /professeur/courses (matiere,
// professeur, promotion, salle en objets ; heure_debut/heure_fin en HH:MM:SS) :
// on normalise vers le modele a plat deja consomme par les ecrans etudiant.
function normalizeCourse(course) {
  if (!course || typeof course !== 'object') return course;

  const professeurLabel =
    typeof course.professeur === 'string'
      ? course.professeur
      : [course.professeur?.prenom, course.professeur?.nom].filter(Boolean).join(' ');

  return {
    ...course,
    nom: labelOf(course.matiere, 'nom') || course.nom || `Cours ${course.id}`,
    matiere: labelOf(course.matiere, 'nom') || course.matiere,
    professeur: professeurLabel || course.professeur_name || '',
    promotion: labelOf(course.promotion, 'niveau', 'nom') || course.promotion_name || '',
    salle: labelOf(course.salle, 'nom') || course.room_name || '',
    horaireDebut: course.heure_debut ? String(course.heure_debut).slice(0, 5) : course.horaireDebut,
    horaireFin: course.heure_fin ? String(course.heure_fin).slice(0, 5) : course.horaireFin,
    statut: computeDisplayStatus(course)
  };
}

// Chaque ligne d'historique renvoie le cours associe imbrique sous `cours`
// (avec `matiere` en chaine, pas objet, contrairement a /etudiant/courses), et
// l'heure de pointage sous `timestamp_pointage` : rien de tout ca n'est a la
// racine de l'item, d'ou le nom de matiere manquant dans Historique/Dashboard
// sans ce mapping.
function normalizeHistoryItem(item) {
  if (!item || typeof item !== 'object') return item;

  const cours = item.cours || item.course || {};

  return {
    ...item,
    matiere: labelOf(cours.matiere, 'nom') || item.matiere || '',
    date: item.date || cours.date,
    heure: item.heure || (item.timestamp_pointage ? String(item.timestamp_pointage).slice(11, 16) : null),
    heure_debut: item.heure_debut || cours.heure_debut,
    heure_fin: item.heure_fin || cours.heure_fin,
    cours_id: item.cours_id || cours.id
  };
}

function buildMockStudentCourses() {
  const currentDate = '2026-07-06';

  const todayCourses = mockTodaySchedule.map((course) => ({
    id: course.id,
    nom: course.nom,
    date: currentDate,
    heure_debut: course.horaireDebut,
    heure_fin: course.horaireFin,
    salle: course.salle,
    professeur: course.professeur,
    statut: course.statut === 'present' ? 'programme' : course.statut
  }));

  const historicCourses = mockCours.map((course) => ({
    id: course.id + 100,
    nom: course.nom,
    date: course.date,
    heure_debut: '09:00',
    heure_fin: '11:00',
    salle: 'Salle A101',
    professeur: 'Sofia Andersson',
    statut: course.statut
  }));

  return [...todayCourses, ...historicCourses];
}

export function getStudentCourses(params = {}) {
  return withMockFallback(
    () =>
      apiFetch(`/etudiant/courses${buildQuery(params)}`).then((data) =>
        unwrapCollection(data, ['courses']).map(normalizeCourse)
      ),
    async () => {
      const allCourses = buildMockStudentCourses();

      return allCourses.filter((course) => {
        if (params.periode === 'upcoming') {
          return course.statut === 'avenir' || course.statut === 'programme';
        }

        if (params.statut) {
          return course.statut === params.statut;
        }

        return true;
      });
    }
  );
}

export function getStudentAttendanceHistory() {
  return withMockFallback(
    () =>
      apiFetch('/etudiant/attendance/history').then((data) =>
        unwrapCollection(data, ['history']).map(normalizeHistoryItem)
      ),
    async () => mockHistoriqueEtudiant
  );
}

// Le vrai backend renvoie { seuils_atteints, subjects, total_absences,
// total_absences_justifiees } (confirme via swagger.yml), pas de taux_presence
// ni de decompte presences/retards : ces stats sont recalculees cote front a
// partir de l'historique de pointages (voir Dashboard/Historique etudiant).
export function getStudentAbsenceSummary() {
  return withMockFallback(
    () => apiFetch('/etudiant/absences/summary'),
    async () => ({
      taux_presence: mockEtudiant.tauxPresenceGlobal,
      total_cours: mockEtudiant.totalCours,
      presences: mockEtudiant.presences,
      retards: mockEtudiant.retards,
      absences: mockEtudiant.absences
    })
  );
}

export function getStudentNotifications() {
  return withMockFallback(
    () => apiFetch('/etudiant/notifications').then((data) => unwrapCollection(data, ['notifications'])),
    async () =>
      mockNotificationsByRole.etudiant.map((notification) => ({
        ...notification,
        read: false
      }))
  );
}

export function markStudentNotificationAsRead(notificationId) {
  return withMockFallback(
    () =>
      apiFetch(`/etudiant/notifications/${notificationId}/read`, {
        method: 'PATCH'
      }),
    async () => ({
      success: true,
      notification_id: notificationId
    })
  );
}

export function getStudentCourseAttendanceHistory(courseId, params = {}) {
  return withMockFallback(
    () =>
      apiFetch(`/etudiant/courses/${courseId}/attendance/history${buildQuery(params)}`).then((data) => ({
        ...data,
        course: normalizeCourse(data?.course),
        history: unwrapCollection(data, ['history']).map(normalizeHistoryItem)
      })),
    async () => ({
      course: buildMockStudentCourses().find((course) => String(course.id) === String(courseId)) || null,
      history: mockHistoriqueEtudiant.filter(
        (item) => String(item.course_id || item.id) === String(courseId)
      )
    })
  );
}
