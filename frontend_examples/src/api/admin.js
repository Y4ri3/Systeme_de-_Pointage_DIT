import {
  apiFetch,
  extractFilename,
  toQueryString,
  triggerBrowserDownload,
} from "./client";

function appendArrayAsCsv(formData, key, values) {
  if (Array.isArray(values) && values.length > 0) {
    formData.append(key, values.join(","));
  }
}

function buildStudentFormData(payload) {
  const form = new FormData();
  form.append("nom", payload.nom);
  form.append("prenom", payload.prenom);
  form.append("email", payload.email);
  form.append("promotion_id", String(payload.promotion_id ?? payload.promotionId));

  if (payload.photo) {
    form.append("photo", payload.photo);
  }

  return form;
}

function buildProfessorFormData(payload) {
  const form = new FormData();
  form.append("nom", payload.nom);
  form.append("prenom", payload.prenom);
  form.append("email", payload.email);

  if (payload.photo) {
    form.append("photo", payload.photo);
  }

  appendArrayAsCsv(form, "matiere_ids", payload.matiere_ids ?? payload.matiereIds);
  appendArrayAsCsv(form, "promotion_ids", payload.promotion_ids ?? payload.promotionIds);

  return form;
}

export const adminApi = {
  login(credentials) {
    return apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
  },

  getDashboard() {
    return apiFetch("/admin/dashboard");
  },

  getDashboardSummary() {
    return apiFetch("/admin/dashboard/summary");
  },

  getDashboardTrends(days = 7) {
    return apiFetch(`/admin/dashboard/trends${toQueryString({ days })}`);
  },

  getNotifications() {
    return apiFetch("/admin/notifications");
  },

  getSettings() {
    return apiFetch("/admin/settings");
  },

  updateSettings(payload) {
    return apiFetch("/admin/settings", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  listStudents(params = {}) {
    return apiFetch(`/admin/students${toQueryString(params)}`);
  },

  getStudent(studentId) {
    return apiFetch(`/admin/students/${studentId}`);
  },

  createStudent(payload) {
    return apiFetch("/admin/students", {
      method: "POST",
      body: buildStudentFormData(payload),
    });
  },

  updateStudent(studentId, payload) {
    const useFormData = payload.photo instanceof File;

    return apiFetch(`/admin/students/${studentId}`, {
      method: "PATCH",
      body: useFormData ? buildStudentFormData(payload) : JSON.stringify(payload),
    });
  },

  resetStudentPassword(studentId) {
    return apiFetch(`/admin/students/${studentId}/reset-password`, {
      method: "POST",
    });
  },

  listProfessors(params = {}) {
    return apiFetch(`/admin/professors${toQueryString(params)}`);
  },

  getProfessor(professorId) {
    return apiFetch(`/admin/professors/${professorId}`);
  },

  createProfessor(payload) {
    return apiFetch("/admin/professors", {
      method: "POST",
      body: buildProfessorFormData(payload),
    });
  },

  updateProfessor(professorId, payload) {
    const useFormData = payload.photo instanceof File;

    return apiFetch(`/admin/professors/${professorId}`, {
      method: "PATCH",
      body: useFormData ? buildProfessorFormData(payload) : JSON.stringify(payload),
    });
  },

  resetProfessorPassword(professorId) {
    return apiFetch(`/admin/professors/${professorId}/reset-password`, {
      method: "POST",
    });
  },

  listCourses(params = {}) {
    return apiFetch(`/admin/courses${toQueryString(params)}`);
  },

  getCourse(courseId) {
    return apiFetch(`/admin/courses/${courseId}`);
  },

  createCourse(payload) {
    return apiFetch("/admin/courses", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  listPromotions() {
    return apiFetch("/admin/promotions");
  },

  createPromotion(payload) {
    return apiFetch("/admin/promotions", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updatePromotion(promotionId, payload) {
    return apiFetch(`/admin/promotions/${promotionId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  deletePromotion(promotionId) {
    return apiFetch(`/admin/promotions/${promotionId}`, {
      method: "DELETE",
    });
  },

  listMatieres() {
    return apiFetch("/admin/matieres");
  },

  createMatiere(payload) {
    return apiFetch("/admin/matieres", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateMatiere(matiereId, payload) {
    return apiFetch(`/admin/matieres/${matiereId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  deleteMatiere(matiereId) {
    return apiFetch(`/admin/matieres/${matiereId}`, {
      method: "DELETE",
    });
  },

  listSalles() {
    return apiFetch("/admin/salles");
  },

  createSalle(payload) {
    return apiFetch("/admin/salles", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateSalle(salleId, payload) {
    return apiFetch(`/admin/salles/${salleId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  deleteSalle(salleId) {
    return apiFetch(`/admin/salles/${salleId}`, {
      method: "DELETE",
    });
  },

  listFilieres() {
    return apiFetch("/admin/filieres");
  },

  createFiliere(payload) {
    return apiFetch("/admin/filieres", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateFiliere(filiereId, payload) {
    return apiFetch(`/admin/filieres/${filiereId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  deleteFiliere(filiereId) {
    return apiFetch(`/admin/filieres/${filiereId}`, {
      method: "DELETE",
    });
  },

  listAbsences(params = {}) {
    return apiFetch(`/admin/absences${toQueryString(params)}`);
  },

  justifyAbsence(suiviId, payload) {
    return apiFetch(`/admin/absences/${suiviId}/justify`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  getReportTemplates() {
    return apiFetch("/admin/report-templates");
  },

  generateReport(payload) {
    return apiFetch("/admin/reports/generate", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async downloadAbsencesCsv() {
    const result = await apiFetch("/admin/exports/absences");
    const filename = extractFilename(result.headers, "suivi_absences.csv");
    triggerBrowserDownload(result.data, filename);
    return result;
  },

  async downloadAbsencesXlsx() {
    const result = await apiFetch("/admin/exports/absences/xlsx");
    const filename = extractFilename(result.headers, "suivi_absences.xlsx");
    triggerBrowserDownload(result.data, filename);
    return result;
  },

  async downloadCourseAttendanceCsv(courseId) {
    const result = await apiFetch(`/admin/exports/courses/${courseId}/attendance`);
    const filename = extractFilename(result.headers, `course_${courseId}_attendance.csv`);
    triggerBrowserDownload(result.data, filename);
    return result;
  },

  async downloadCourseAttendanceXlsx(courseId) {
    const result = await apiFetch(`/admin/exports/courses/${courseId}/attendance/xlsx`);
    const filename = extractFilename(result.headers, `course_${courseId}_attendance.xlsx`);
    triggerBrowserDownload(result.data, filename);
    return result;
  },
};

export function getEligibleProfessors(professors, { matiereId, promotionId }) {
  return professors.filter(
    (professor) =>
      professor.matieres_enseignees?.some((item) => item.id === matiereId) &&
      professor.promotions_en_charge?.some((item) => item.id === promotionId)
  );
}
