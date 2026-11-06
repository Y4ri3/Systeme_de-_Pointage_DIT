import { apiFetch, appConfig, withMockFallback } from './client';
import { mockEtudiant, mockTodaySchedule } from '../data/mockData';

function appendOptionalCoordinate(formData, key, value) {
  if (value !== undefined && value !== null && value !== '') {
    formData.append(key, String(value));
  }
}

export function kioskScanStudent(selfieFile) {
  return withMockFallback(
    () => {
      const formData = new FormData();
      formData.append('selfie', selfieFile);
      formData.append('timestamp', new Date().toISOString());

      return apiFetch('/attendance/kiosk/scan', {
        method: 'POST',
        body: formData
      });
    },
    async () => ({
      success: true,
      student: {
        id: mockEtudiant.id,
        nom: mockEtudiant.nom.split(' ').slice(-1).join(' '),
        prenom: mockEtudiant.nom.split(' ').slice(0, -1).join(' ') || mockEtudiant.nom,
        email: mockEtudiant.email,
        role: 'etudiant',
        photo_url: '',
        promotion: {
          id: 1,
          niveau: 'L3',
          annee_academique: '2025-2026',
          filiere: mockEtudiant.filiere
        }
      },
      attendance_context: {
        scan_timestamp: new Date().toISOString(),
        can_checkin_now: true,
        active_course: {
          id: mockTodaySchedule[0]?.id,
          date: '2026-07-08',
          heure_debut: mockTodaySchedule[0]?.horaireDebut,
          heure_fin: mockTodaySchedule[0]?.horaireFin,
          statut: 'programme'
        },
        next_course: null,
        today_courses: mockTodaySchedule
      },
      face_verification: {
        match: true,
        similarity_score: 0.94,
        is_real_face: true,
        liveness_probability: 0.98
      }
    })
  );
}

// Pointage alternatif par QR (guidefrontend.md section 6.5) : pas de selfie, la
// preuve de presence vient de la fraicheur du token (120s) affiche en salle.
export function studentCheckinQr({ token, gpsLat, gpsLng }) {
  return withMockFallback(
    () => {
      const payload = { token };
      if (gpsLat !== undefined && gpsLat !== null) payload.gps_lat = gpsLat;
      if (gpsLng !== undefined && gpsLng !== null) payload.gps_lng = gpsLng;

      return apiFetch('/etudiant/attendance/checkin-qr', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    },
    async () => {
      if (!token) {
        const error = new Error('QR invalide ou expire.');
        error.status = 400;
        error.data = { error: 'qr_invalide_ou_expire' };
        throw error;
      }

      return { success: true, statut: 'present', pointage_id: Date.now() };
    }
  );
}

export function kioskCheckinStudent({ studentId, courseId, selfieFile, gpsLat, gpsLng }) {
  return withMockFallback(
    () => {
      const formData = new FormData();
      formData.append('student_id', String(studentId));
      formData.append('course_id', String(courseId));
      formData.append('selfie', selfieFile);
      appendOptionalCoordinate(formData, 'gps_lat', gpsLat);
      appendOptionalCoordinate(formData, 'gps_lng', gpsLng);
      formData.append('timestamp', new Date().toISOString());

      return apiFetch('/attendance/kiosk/checkin', {
        method: 'POST',
        body: formData
      });
    },
    async () => ({
      success: true,
      statut: 'present',
      student_id: studentId,
      course_id: courseId,
      pointage_id: Date.now(),
      message: `Pointage borne confirme sur ${appConfig.campusWifiName}.`
    })
  );
}
