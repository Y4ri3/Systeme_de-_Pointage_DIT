import { apiFetch, buildApiUrl, getAccessToken, shouldUseMockApi, withMockFallback } from './client';
import { computeDisplayStatus } from './courseStatus';
import { mockCoursProfesseur, mockEtudiantsCours, mockNotificationsByRole } from '../data/mockData';
import { formatBackendTime } from '../utils/api';

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

// Le backend renvoie un cours avec matiere/professeur/promotion/salle imbriques
// (objets {id, nom, ...}) et heure_debut/heure_fin au format HH:MM:SS, alors que
// cet ecran a ete construit sur un modele local a plat (nom, salle, promotion en
// chaines, horaireDebut/horaireFin). On normalise ici plutot que de reecrire
// chaque ecran consommateur.
function normalizeCourse(course) {
  if (!course || typeof course !== 'object') return course;

  const professeurLabel =
    typeof course.professeur === 'string'
      ? course.professeur
      : [course.professeur?.prenom, course.professeur?.nom].filter(Boolean).join(' ');

  return {
    ...course,
    nom: labelOf(course.matiere, 'nom') || course.nom || `Cours ${course.id}`,
    professeur: professeurLabel || course.professeur_name || '',
    promotion: labelOf(course.promotion, 'niveau', 'nom') || course.promotion_name || '',
    salle: labelOf(course.salle, 'nom') || course.room_name || '',
    horaireDebut: course.heure_debut ? String(course.heure_debut).slice(0, 5) : course.horaireDebut,
    horaireFin: course.heure_fin ? String(course.heure_fin).slice(0, 5) : course.horaireFin,
    statut: computeDisplayStatus(course)
  };
}

export function getProfessorCourses() {
  return withMockFallback(
    () =>
      apiFetch('/professeur/courses').then((data) => unwrapCollection(data, ['courses']).map(normalizeCourse)),
    async () => mockCoursProfesseur
  );
}

export function getProfessorCourse(courseId) {
  return withMockFallback(
    () => apiFetch(`/professeur/courses/${courseId}`).then((data) => normalizeCourse(data?.course || data)),
    async () => mockCoursProfesseur.find((course) => String(course.id) === String(courseId))
  );
}

// Reponse reelle (REST et SSE renvoient la meme forme, cf. _course_attendance_payload
// cote backend) : { attendance_summary, course, students, count }. Les etudiants
// ont `statut_presence` (pas `statut`) et `pointage.timestamp_pointage` (pas `heurePointage`).
// Utilisee a la fois par le fetch REST et par le flux SSE pour que les deux
// alimentent l'etat React avec exactement la meme forme.
function normalizeAttendancePayload(data) {
  return {
    cours: normalizeCourse(data?.course),
    attendance_summary: data?.attendance_summary || null,
    attendance: (Array.isArray(data?.students) ? data.students : []).map((student) => ({
      ...student,
      nom: labelOf(student, 'nom') || student?.nom,
      statut: student?.statut_presence || student?.statut,
      heurePointage: student?.pointage?.timestamp_pointage
        ? formatBackendTime(student.pointage.timestamp_pointage)
        : null,
      numeroEtudiant: student?.numeroEtudiant || student?.matricule || student?.email
    }))
  };
}

export function getProfessorCourseAttendance(courseId) {
  return withMockFallback(
    () => apiFetch(`/professeur/courses/${courseId}/attendance`).then(normalizeAttendancePayload),
    async () => ({
      cours: mockCoursProfesseur.find((course) => String(course.id) === String(courseId)),
      attendance: mockEtudiantsCours
    })
  );
}

// Pointage alternatif par QR (guidefrontend.md section 6.5) : le token expire
// en 120s, l'ecran qui affiche ce QR doit donc le rafraichir toutes les 60-90s.
export function getProfessorCourseQr(courseId) {
  return withMockFallback(
    () => apiFetch(`/professeur/courses/${courseId}/qr`),
    async () => ({
      token: `mock-qr-token-${courseId}-${Date.now()}`,
      qr_code_base64: '',
      expires_in: 120
    })
  );
}

// CourseCancelRequest exige un motif (swagger.yml) : sans lui, le backend
// renvoie 400 "Le motif d'annulation est requis."
export function cancelProfessorCourse(courseId, motif) {
  return withMockFallback(
    () =>
      apiFetch(`/professeur/courses/${courseId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motif })
      }),
    async () => ({
      success: true,
      course_id: courseId,
      status: 'cancelled'
    })
  );
}

// L'input HTML type="time" renvoie HH:MM (pas de secondes), alors que le
// backend attend HH:MM:SS (swagger.yml -> CourseRescheduleRequest).
function withSeconds(time) {
  if (!time) return time;
  return /^\d{2}:\d{2}$/.test(time) ? `${time}:00` : time;
}

export function rescheduleProfessorCourse(courseId, payload) {
  const normalizedPayload = {
    new_date: payload?.new_date || payload?.date || '',
    new_start_time: withSeconds(payload?.new_start_time || payload?.heure_debut || ''),
    new_end_time: withSeconds(payload?.new_end_time || payload?.heure_fin || ''),
    reason: payload?.reason || payload?.motif || '',
    room_id: payload?.room_id || payload?.salle_id || undefined
  };

  return withMockFallback(
    () =>
      apiFetch(`/professeur/courses/${courseId}/reschedule`, {
        method: 'POST',
        body: JSON.stringify(normalizedPayload)
      }),
    async () => ({
      success: true,
      course_id: courseId,
      ...normalizedPayload
    })
  );
}

export function regularizeProfessorAttendance(courseId, payload) {
  const normalizedPayload = {
    student_id: payload?.student_id || payload?.etudiant_id,
    status: payload?.status || payload?.statut,
    reason: payload?.reason || payload?.justificatif || '',
    pointage_time: payload?.pointage_time || payload?.attendance_time || undefined
  };

  return withMockFallback(
    () =>
      apiFetch(`/professeur/courses/${courseId}/attendance/regularize`, {
        method: 'POST',
        body: JSON.stringify(normalizedPayload)
      }),
    async () => ({
      success: true,
      course_id: courseId,
      ...normalizedPayload
    })
  );
}

export function getProfessorNotifications() {
  return withMockFallback(
    () => apiFetch('/professeur/notifications').then((data) => unwrapCollection(data, ['notifications'])),
    async () =>
      mockNotificationsByRole.professeur.map((notification) => ({
        ...notification,
        read: false
      }))
  );
}

export function markProfessorNotificationAsRead(notificationId) {
  return withMockFallback(
    () =>
      apiFetch(`/professeur/notifications/${notificationId}/read`, {
        method: 'PATCH'
      }),
    async () => ({
      success: true,
      notification_id: notificationId
    })
  );
}

// Subscribes to GET /professeur/courses/:coursId/attendance/stream (SSE).
// Native EventSource can't send an Authorization header, so this reads the
// stream manually via fetch + ReadableStream to keep the same Bearer auth used
// everywhere else (see returnbackend4.md). Auto-reconnects on drop/close;
// returns an unsubscribe function. No-op (never connects) in mock mode, so
// callers should keep their polling fallback active until onOpen fires.
export function subscribeToProfessorCourseAttendanceStream(courseId, { onData, onOpen, onError } = {}) {
  if (shouldUseMockApi()) {
    return () => {};
  }

  const controller = new AbortController();
  let stopped = false;

  async function connectOnce() {
    const token = getAccessToken();

    const response = await fetch(buildApiUrl(`/professeur/courses/${courseId}/attendance/stream`), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: controller.signal
    });

    if (!response.ok || !response.body) {
      throw new Error(`Flux de presence indisponible (HTTP ${response.status}).`);
    }

    onOpen?.();

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (!stopped) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const frames = buffer.split('\n\n');
      buffer = frames.pop() || '';

      for (const frame of frames) {
        const dataLines = frame
          .split('\n')
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).trim());

        if (dataLines.length === 0) continue;

        try {
          onData?.(normalizeAttendancePayload(JSON.parse(dataLines.join('\n'))));
        } catch {
          // Ignore malformed frames.
        }
      }
    }
  }

  async function connectLoop() {
    while (!stopped) {
      try {
        await connectOnce();
      } catch (streamError) {
        if (stopped || controller.signal.aborted) return;
        onError?.(streamError);
      }

      if (stopped) return;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  connectLoop();

  return () => {
    stopped = true;
    controller.abort();
  };
}
