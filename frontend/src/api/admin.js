import { apiDownload, apiFetch, buildQuery, withMockFallback } from './client';
import {
  mockCoursGestion,
  mockEtudiantsEnAlerte,
  mockFilieres,
  mockHistoriqueEtudiant,
  mockMatieresEtudiant,
  mockNotificationsByRole,
  mockPresenceByMatiere,
  mockPresenceByPromotion,
  mockPresenceEvolution,
  mockProfesseur,
  mockPromotions,
  mockReportTemplates,
  mockRooms,
  mockStudentsManagement,
  mockSubjects,
  mockSystemSettings
} from '../data/mockData';

const mockProfessors = [
  {
    id: mockProfesseur.id,
    nom: mockProfesseur.nom,
    email: mockProfesseur.email,
    telephone: mockProfesseur.telephone,
    statut: 'Actif'
  },
  {
    id: 2,
    nom: 'Marc Dupont',
    email: 'marc.dupont@universite.edu',
    telephone: '+33 6 98 76 54 32',
    statut: 'Actif'
  }
];

const mockAbsences = mockEtudiantsEnAlerte.map((student, index) => ({
  id: index + 1,
  etudiant_id: student.id,
  nom: student.nom,
  promotion: student.promotion,
  filiere: student.filiere,
  taux_absence: student.tauxAbsence,
  total_absences: student.totalAbsences,
  justification: null
}));

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

function buildSubjectPayload(payload = {}) {
  const normalizedPayload = {
    nom: payload?.nom || payload?.name || payload?.label || ''
  };

  if (payload?.code) {
    normalizedPayload.code = payload.code;
  }

  if (payload?.credits !== undefined && payload?.credits !== '') {
    normalizedPayload.credits = Number(payload.credits);
  }

  return normalizedPayload;
}

function buildRoomPayload(payload = {}) {
  const normalizedPayload = {
    nom: payload?.nom || payload?.name || payload?.label || ''
  };

  if (payload?.batiment) {
    normalizedPayload.batiment = payload.batiment;
  }

  return normalizedPayload;
}

function normalizeNamedEntity(entity) {
  if (!entity || typeof entity !== 'object') {
    return entity;
  }

  return {
    ...entity,
    nom: entity.nom || entity.name || entity.label || ''
  };
}

function normalizeReportTemplate(template) {
  if (!template || typeof template !== 'object') {
    return template;
  }

  return {
    ...template,
    nom: template.nom || template.name || template.label || String(template.id || ''),
    description: template.description || template.resume || template.summary || '',
    parameters: Array.isArray(template.parameters) ? template.parameters : template.params || []
  };
}

export function listAdminStudents(params = {}) {
  return withMockFallback(
    () => apiFetch(`/admin/students${buildQuery(params)}`).then((data) => unwrapCollection(data, ['students', 'etudiants'])),
    async () => mockStudentsManagement
  );
}

export function createAdminStudent(formData) {
  return withMockFallback(
    () =>
      apiFetch('/admin/students', {
        method: 'POST',
        body: formData
      }),
    async () => ({
      success: true,
      student_id: Date.now()
    })
  );
}

// Reponse reelle : { student: {...}, absence_summary: [...], recent_attendance: [...] }
// (confirme via swagger + test en direct), pas l'objet etudiant a plat.
export function getAdminStudent(studentId) {
  return withMockFallback(
    () => apiFetch(`/admin/students/${studentId}`).then((data) => data?.student || data),
    async () => mockStudentsManagement.find((student) => String(student.id) === String(studentId))
  );
}

export function updateAdminStudent(studentId, payload) {
  const isFormData = payload instanceof FormData;

  return withMockFallback(
    () =>
      apiFetch(`/admin/students/${studentId}`, {
        method: 'PATCH',
        body: isFormData ? payload : JSON.stringify(payload || {})
      }),
    async () => ({
      success: true,
      student_id: studentId,
      ...(isFormData ? {} : payload)
    })
  );
}

export function resetAdminStudentPassword(studentId) {
  return withMockFallback(
    () =>
      apiFetch(`/admin/students/${studentId}/reset-password`, {
        method: 'POST'
      }),
    async () => ({
      success: true,
      student_id: studentId
    })
  );
}

export function importAdminStudents(file) {
  return withMockFallback(
    () => {
      const formData = new FormData();
      formData.append('file', file);

      return apiFetch('/admin/students/import', {
        method: 'POST',
        body: formData
      });
    },
    async () => ({
      success: true,
      imported: 0
    })
  );
}

export function listAdminProfessors() {
  return withMockFallback(
    () => apiFetch('/admin/professors').then((data) => unwrapCollection(data, ['professors', 'professeurs'])),
    async () => mockProfessors
  );
}

export function createAdminProfessor(payload) {
  const isFormData = payload instanceof FormData;

  return withMockFallback(
    () =>
      apiFetch('/admin/professors', {
        method: 'POST',
        body: isFormData ? payload : JSON.stringify(payload || {})
      }),
    async () => ({
      success: true,
      professor_id: Date.now()
    })
  );
}

export function getAdminProfessor(professorId) {
  return withMockFallback(
    () => apiFetch(`/admin/professors/${professorId}`),
    async () => mockProfessors.find((professor) => String(professor.id) === String(professorId))
  );
}

export function updateAdminProfessor(professorId, payload) {
  const isFormData = payload instanceof FormData;

  return withMockFallback(
    () =>
      apiFetch(`/admin/professors/${professorId}`, {
        method: 'PATCH',
        body: isFormData ? payload : JSON.stringify(payload || {})
      }),
    async () => ({
      success: true,
      professor_id: professorId,
      ...(isFormData ? {} : payload)
    })
  );
}

export function resetAdminProfessorPassword(professorId) {
  return withMockFallback(
    () =>
      apiFetch(`/admin/professors/${professorId}/reset-password`, {
        method: 'POST'
      }),
    async () => ({
      success: true,
      professor_id: professorId
    })
  );
}

export function importAdminProfessors(file) {
  return withMockFallback(
    () => {
      const formData = new FormData();
      formData.append('file', file);

      return apiFetch('/admin/professors/import', {
        method: 'POST',
        body: formData
      });
    },
    async () => ({
      success: true,
      imported: 0
    })
  );
}

export function listAdminCourses() {
  return withMockFallback(
    () => apiFetch('/admin/courses').then((data) => unwrapCollection(data, ['courses', 'cours'])),
    async () => mockCoursGestion
  );
}

// L'input HTML type="time" renvoie HH:MM (pas de secondes), alors que le
// backend attend HH:MM:SS (swagger.yml -> CourseCreateRequest, exemples
// "09:00:00"). On complete avec ":00" quand la seconde est absente.
function withSeconds(time) {
  if (!time) return time;
  return /^\d{2}:\d{2}$/.test(time) ? `${time}:00` : time;
}

export function createAdminCourse(payload) {
  // Le backend attend les noms de champs canoniques francais (confirme par
  // swagger.yml -> CourseCreateRequest), pas d'alias anglais accepte ici
  // (contrairement a /professeur/courses/:id/reschedule).
  const normalizedPayload = {
    matiere_id: payload?.matiere_id || payload?.subject_id,
    professeur_id: payload?.professeur_id || payload?.professor_id,
    salle_id: payload?.salle_id || payload?.room_id,
    promotion_id: payload?.promotion_id,
    date: payload?.date,
    heure_debut: withSeconds(payload?.heure_debut || payload?.start_time),
    heure_fin: withSeconds(payload?.heure_fin || payload?.end_time),
    tolerance_retard_minutes: payload?.tolerance_retard_minutes,
    motif_changement: payload?.motif_changement || payload?.reason
  };

  return withMockFallback(
    () =>
      apiFetch('/admin/courses', {
        method: 'POST',
        body: JSON.stringify(normalizedPayload)
      }),
    async () => ({
      success: true,
      course_id: Date.now(),
      ...normalizedPayload
    })
  );
}

export function getAdminCourse(courseId) {
  return withMockFallback(
    () => apiFetch(`/admin/courses/${courseId}`),
    async () => mockCoursGestion.find((course) => String(course.id) === String(courseId))
  );
}

export function listAdminAbsences(params = {}) {
  return withMockFallback(
    () =>
      apiFetch(`/admin/absences${buildQuery(params)}`).then((data) =>
        unwrapCollection(data, ['absences', 'alertes', 'absence_tracking'])
      ),
    async () => mockAbsences
  );
}

export function justifyAdminAbsence(absenceId, payload) {
  return withMockFallback(
    () =>
      apiFetch(`/admin/absences/${absenceId}/justify`, {
        method: 'POST',
        body: JSON.stringify(payload || {})
      }),
    async () => ({
      success: true,
      absence_id: absenceId,
      ...payload
    })
  );
}

export function getAdminDashboardSummary() {
  return withMockFallback(
    () => apiFetch('/admin/dashboard/summary'),
    async () => ({
      totals: {
        students_count: mockStudentsManagement.length,
        alert_students_count: mockEtudiantsEnAlerte.length,
        courses_count: mockCoursGestion.length,
        attendance_rate: 87
      },
      distribution: {
        by_promotion: mockPresenceByPromotion,
        by_department: mockPromotions.map((promotion) => ({
          label: promotion.filiere,
          value: promotion.effectif
        })),
        by_subject: mockPresenceByMatiere
      }
    })
  );
}

export function getAdminDashboardTrends(days = 7) {
  return withMockFallback(
    () =>
      apiFetch(`/admin/dashboard/trends${buildQuery({ days })}`).then((data) =>
        unwrapCollection(data, ['daily', 'trends'])
      ),
    async () =>
      mockPresenceEvolution.slice(0, days).map((item, index) => ({
        date: `2026-07-0${index + 1}`,
        courses_count: index + 2,
        present_count: item.value,
        retard_count: Math.max(0, 100 - item.value > 15 ? 2 : 1),
        absence_justifiee_count: 0,
        invalide_count: 0
      }))
  );
}

export function listAdminNotifications() {
  return withMockFallback(
    () => apiFetch('/admin/notifications').then((data) => unwrapCollection(data, ['notifications'])),
    async () =>
      mockNotificationsByRole.responsable.map((notification) => ({
        ...notification,
        read: false
      }))
  );
}

export function markAdminNotificationAsRead(notificationId) {
  return withMockFallback(
    () =>
      apiFetch(`/admin/notifications/${notificationId}/read`, {
        method: 'PATCH'
      }),
    async () => ({
      success: true,
      notification_id: notificationId
    })
  );
}

// Chaque ligne d'historique renvoie le cours associe imbrique sous `cours`
// (avec `matiere` en chaine, pas objet, contrairement a /admin/courses), et
// l'heure de pointage sous `timestamp_pointage` : rien de tout ca n'est a la
// racine de l'item, d'ou le nom de matiere manquant cote front sans ce mapping.
function normalizeHistoryItem(item) {
  if (!item || typeof item !== 'object') return item;

  const cours = item.cours || item.course || {};
  const matiereRaw = cours.matiere;
  const matiereLabel = typeof matiereRaw === 'string' ? matiereRaw : matiereRaw?.nom || '';

  return {
    ...item,
    matiere: matiereLabel || item.matiere || '',
    date: item.date || cours.date,
    heure: item.heure || (item.timestamp_pointage ? String(item.timestamp_pointage).slice(11, 16) : null),
    heure_debut: item.heure_debut || cours.heure_debut,
    heure_fin: item.heure_fin || cours.heure_fin,
    cours_id: item.cours_id || cours.id
  };
}

export function getAdminStudentAttendanceHistory(studentId, params = {}) {
  return withMockFallback(
    () =>
      apiFetch(`/admin/students/${studentId}/attendance/history${buildQuery(params)}`).then((data) => ({
        ...data,
        history: unwrapCollection(data, ['history']).map(normalizeHistoryItem)
      })),
    async () => ({
      student: mockStudentsManagement.find((student) => String(student.id) === String(studentId)) || null,
      history: mockHistoriqueEtudiant,
      pagination: null
    })
  );
}

export function getAdminStudentAttendanceSummary(studentId) {
  return withMockFallback(
    () => apiFetch(`/admin/students/${studentId}/attendance/summary`),
    async () => ({
      student: mockStudentsManagement.find((student) => String(student.id) === String(studentId)) || null,
      totals: {
        total_cours: mockHistoriqueEtudiant.length,
        presences: mockHistoriqueEtudiant.filter((item) => item.statut === 'present').length,
        retards: mockHistoriqueEtudiant.filter((item) => item.statut === 'retard').length,
        absences: mockHistoriqueEtudiant.filter((item) => item.statut === 'absent').length,
        taux_presence: 89
      },
      by_subject: mockMatieresEtudiant
    })
  );
}

export function getAdminStudentAttendanceByCourse(studentId) {
  return withMockFallback(
    () => apiFetch(`/admin/students/${studentId}/attendance/by-course`),
    async () => ({
      student: mockStudentsManagement.find((student) => String(student.id) === String(studentId)) || null,
      rows: mockHistoriqueEtudiant.map((attendance, index) => ({
        attendance,
        course: mockCoursGestion[index % mockCoursGestion.length]
      }))
    })
  );
}

function buildMockExport(format) {
  const content = format === 'xlsx' ? 'mock-xlsx-content' : 'nom;promotion;absences\nKarim Benali;L3 Informatique;3';
  const type =
    format === 'xlsx'
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'text/csv;charset=utf-8;';

  return {
    blob: new Blob([content], { type }),
    filename: `export-absences.${format}`
  };
}

export function exportAdminAbsences(format = 'csv') {
  const path = format === 'xlsx' ? '/admin/exports/absences/xlsx' : '/admin/exports/absences';

  return shouldUseBinaryDownload(() => apiDownload(path, { filename: `absences.${format}` }), () => buildMockExport(format));
}

export function exportAdminCourseAttendance(courseId, format = 'csv') {
  const path =
    format === 'xlsx'
      ? `/admin/exports/courses/${courseId}/attendance/xlsx`
      : `/admin/exports/courses/${courseId}/attendance`;

  return shouldUseBinaryDownload(
    () => apiDownload(path, { filename: `presence-cours-${courseId}.${format}` }),
    () => ({
      blob: new Blob(['nom;statut\nKarim Benali;present'], { type: 'text/csv;charset=utf-8;' }),
      filename: `presence-cours-${courseId}.${format}`
    })
  );
}

function shouldUseBinaryDownload(apiCall, fallbackCall) {
  return withMockFallback(apiCall, fallbackCall);
}

// Promotions/settings/subjects/rooms/report-templates were proposed in
// returnbackend2.md and confirmed implemented per returnbackend3.md.

export function listAdminPromotions() {
  return withMockFallback(
    () => apiFetch('/admin/promotions').then((data) => unwrapCollection(data, ['promotions'])),
    async () => mockPromotions
  );
}

// PromotionRequest reel (swagger.yml) : { niveau, annee_academique, filiere_id }.
// Ni "nom"/"filiere" en texte libre, ni "effectif"/"seuil_alerte" (n'existent
// pas sur ce modele cote backend).
function buildPromotionPayload(payload = {}) {
  const normalizedPayload = {};

  if (payload?.niveau !== undefined) normalizedPayload.niveau = payload.niveau;
  if (payload?.annee_academique !== undefined) normalizedPayload.annee_academique = payload.annee_academique;
  if (payload?.filiere_id !== undefined && payload?.filiere_id !== '') {
    normalizedPayload.filiere_id = Number(payload.filiere_id);
  }

  return normalizedPayload;
}

export function createAdminPromotion(payload) {
  const normalizedPayload = buildPromotionPayload(payload);

  return withMockFallback(
    () =>
      apiFetch('/admin/promotions', {
        method: 'POST',
        body: JSON.stringify(normalizedPayload)
      }).then((data) => data?.promotion || data),
    async () => ({
      id: Date.now(),
      niveau: normalizedPayload.niveau,
      annee_academique: normalizedPayload.annee_academique,
      filiere: { id: normalizedPayload.filiere_id, nom: '' },
      nombre_etudiants: 0,
      nombre_cours: 0
    })
  );
}

export function updateAdminPromotion(promotionId, payload) {
  const normalizedPayload = buildPromotionPayload(payload);

  return withMockFallback(
    () =>
      apiFetch(`/admin/promotions/${promotionId}`, {
        method: 'PATCH',
        body: JSON.stringify(normalizedPayload)
      }).then((data) => data?.promotion || data),
    async () => ({
      success: true,
      promotion_id: promotionId,
      ...normalizedPayload
    })
  );
}

export function deleteAdminPromotion(promotionId) {
  return withMockFallback(
    () => apiFetch(`/admin/promotions/${promotionId}`, { method: 'DELETE' }),
    async () => ({ success: true, promotion_id: promotionId })
  );
}

// /admin/filieres renvoie { departments: [...] } en liste et { department: {...} }
// a la creation/modification (confirme en direct), pas "filieres"/"filiere".
export function listAdminFilieres() {
  return withMockFallback(
    () =>
      apiFetch('/admin/filieres').then((data) =>
        unwrapCollection(data, ['departments', 'filieres']).map((filiere) => normalizeNamedEntity(filiere))
      ),
    async () => mockFilieres
  );
}

export function createAdminFiliere(payload) {
  return withMockFallback(
    () =>
      apiFetch('/admin/filieres', {
        method: 'POST',
        body: JSON.stringify({ nom: payload?.nom })
      }).then((data) => data?.department || data),
    async () => ({ id: Date.now(), nom: payload?.nom })
  );
}

export function updateAdminFiliere(filiereId, payload) {
  return withMockFallback(
    () =>
      apiFetch(`/admin/filieres/${filiereId}`, {
        method: 'PATCH',
        body: JSON.stringify({ nom: payload?.nom })
      }).then((data) => data?.department || data),
    async () => ({ id: filiereId, nom: payload?.nom })
  );
}

export function deleteAdminFiliere(filiereId) {
  return withMockFallback(
    () => apiFetch(`/admin/filieres/${filiereId}`, { method: 'DELETE' }),
    async () => ({ success: true, filiere_id: filiereId })
  );
}

export function listAdminSubjects() {
  return withMockFallback(
    () =>
      apiFetch('/admin/subjects').then((data) =>
        unwrapCollection(data, ['subjects', 'matieres']).map((subject) => normalizeNamedEntity(subject))
      ),
    async () => mockSubjects
  );
}

export function createAdminSubject(payload) {
  const normalizedPayload = buildSubjectPayload(payload);

  return withMockFallback(
    () =>
      apiFetch('/admin/subjects', {
        method: 'POST',
        body: JSON.stringify(normalizedPayload)
      }),
    async () => ({
      success: true,
      subject: { id: Date.now(), ...normalizedPayload }
    })
  );
}

export function updateAdminSubject(subjectId, payload) {
  const normalizedPayload = buildSubjectPayload(payload);

  return withMockFallback(
    () =>
      apiFetch(`/admin/subjects/${subjectId}`, {
        method: 'PATCH',
        body: JSON.stringify(normalizedPayload)
      }),
    async () => ({
      success: true,
      subject_id: subjectId,
      ...normalizedPayload
    })
  );
}

export function deleteAdminSubject(subjectId) {
  return withMockFallback(
    () =>
      apiFetch(`/admin/subjects/${subjectId}`, {
        method: 'DELETE'
      }),
    async () => ({
      success: true,
      subject_id: subjectId
    })
  );
}

export function listAdminRooms() {
  return withMockFallback(
    () =>
      apiFetch('/admin/rooms').then((data) =>
        unwrapCollection(data, ['rooms', 'salles']).map((room) => normalizeNamedEntity(room))
      ),
    async () => mockRooms
  );
}

export function createAdminRoom(payload) {
  const normalizedPayload = buildRoomPayload(payload);

  return withMockFallback(
    () =>
      apiFetch('/admin/rooms', {
        method: 'POST',
        body: JSON.stringify(normalizedPayload)
      }),
    async () => ({
      success: true,
      room: { id: Date.now(), ...normalizedPayload }
    })
  );
}

export function updateAdminRoom(roomId, payload) {
  const normalizedPayload = buildRoomPayload(payload);

  return withMockFallback(
    () =>
      apiFetch(`/admin/rooms/${roomId}`, {
        method: 'PATCH',
        body: JSON.stringify(normalizedPayload)
      }),
    async () => ({
      success: true,
      room_id: roomId,
      ...normalizedPayload
    })
  );
}

export function deleteAdminRoom(roomId) {
  return withMockFallback(
    () =>
      apiFetch(`/admin/rooms/${roomId}`, {
        method: 'DELETE'
      }),
    async () => ({
      success: true,
      room_id: roomId
    })
  );
}

// GET /admin/settings renvoie { settings: {...} } (guidefrontend.md section 9.6) :
// on deballe ici pour que le reste du front manipule l'objet settings directement.
export function getAdminSettings() {
  return withMockFallback(
    () => apiFetch('/admin/settings').then((data) => data?.settings || data),
    async () => mockSystemSettings
  );
}

export function updateAdminSettings(payload) {
  return withMockFallback(
    () =>
      apiFetch('/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify(payload || {})
      }).then((data) => data?.settings || data),
    async () => ({ ...mockSystemSettings, ...payload })
  );
}

export function listAdminReportTemplates() {
  return withMockFallback(
    () =>
      apiFetch('/admin/report-templates').then((data) =>
        unwrapCollection(data, ['templates', 'report_templates']).map((template) => normalizeReportTemplate(template))
      ),
    async () => mockReportTemplates
  );
}

export function generateAdminReport(payload) {
  const format = payload?.format === 'xlsx' ? 'xlsx' : 'csv';
  const filename = `rapport-${payload?.template_id || 'personnalise'}.${format}`;

  return shouldUseBinaryDownload(
    () =>
      apiDownload('/admin/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload || {}),
        filename
      }),
    () => ({
      blob: new Blob(
        [format === 'xlsx' ? 'mock-xlsx-content' : `rapport;${payload?.template_name || 'Rapport'}\n`],
        {
          type:
            format === 'xlsx'
              ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
              : 'text/csv;charset=utf-8;'
        }
      ),
      filename
    })
  );
}
