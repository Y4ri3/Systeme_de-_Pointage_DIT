import { useEffect, useMemo, useState } from 'react';
import {
  createAdminCourse,
  createAdminRoom,
  createAdminSubject,
  deleteAdminRoom,
  deleteAdminSubject,
  exportAdminCourseAttendance,
  getAdminCourse,
  listAdminCourses,
  listAdminRooms,
  listAdminSubjects,
  updateAdminRoom,
  updateAdminSubject
} from '../../../api/admin';
import { downloadBlob, getApiErrorMessage, getCourseErrorMessage, getCourseScheduleConflicts } from '../../../utils/api';
import { getCoursePromotionLabel, getCourseRoomLabel, getEligibleProfessors } from './helpers';

export function useCoursesManagement({ promotions, professors, onError, onSuccess }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [courseForm, setCourseForm] = useState({
    subjectId: '',
    professorId: '',
    roomId: '',
    promotionId: '',
    date: '',
    startTime: '',
    endTime: '',
    toleranceRetardMinutes: '15'
  });
  const [creatingCourse, setCreatingCourse] = useState(false);
  const [courseConflicts, setCourseConflicts] = useState([]);
  const [selectedCourseDetail, setSelectedCourseDetail] = useState(null);
  const [loadingCourseDetailId, setLoadingCourseDetailId] = useState('');
  const [exportingCourseId, setExportingCourseId] = useState('');

  const [subjectForm, setSubjectForm] = useState({ nom: '', code: '', credits: '' });
  const [creatingSubject, setCreatingSubject] = useState(false);
  const [editingSubjectId, setEditingSubjectId] = useState('');
  const [subjectEditName, setSubjectEditName] = useState('');
  const [savingSubjectId, setSavingSubjectId] = useState('');
  const [deletingSubjectId, setDeletingSubjectId] = useState('');

  const [roomForm, setRoomForm] = useState({ nom: '', batiment: '' });
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState('');
  const [roomEditName, setRoomEditName] = useState('');
  const [savingRoomId, setSavingRoomId] = useState('');
  const [deletingRoomId, setDeletingRoomId] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadCourses() {
      setLoading(true);

      try {
        const data = await listAdminCourses();
        if (!isMounted) return;
        setCourses(Array.isArray(data) ? data : []);
      } catch (requestError) {
        if (!isMounted) return;
        onError(getApiErrorMessage(requestError, 'Impossible de charger les cours.'));
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    async function loadSubjectsAndRooms() {
      try {
        const [subjectsData, roomsData] = await Promise.all([listAdminSubjects(), listAdminRooms()]);
        if (!isMounted) return;
        setSubjects(Array.isArray(subjectsData) ? subjectsData : []);
        setRooms(Array.isArray(roomsData) ? roomsData : []);
      } catch (requestError) {
        if (!isMounted) return;
        onError(getApiErrorMessage(requestError, 'Impossible de charger les matieres et salles.'));
      }
    }

    loadCourses();
    loadSubjectsAndRooms();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const eligibleProfessors = useMemo(
    () =>
      getEligibleProfessors(professors, {
        matiereId: courseForm.subjectId,
        promotionId: courseForm.promotionId || String(promotions[0]?.id || '')
      }),
    [professors, courseForm.subjectId, courseForm.promotionId, promotions]
  );

  // Si le professeur choisi n'est plus rattache a la matiere/promotion selectionnee
  // (changement fait apres coup), on le retire de la vue sans perdre le choix en
  // memoire : il reapparait si l'utilisateur revient a la combinaison d'origine.
  const effectiveCourseForm = useMemo(() => {
    const promotionId = courseForm.promotionId || String(promotions[0]?.id || '');
    const isProfessorEligible = eligibleProfessors.some(
      (professor) => String(professor.id) === String(courseForm.professorId)
    );

    return {
      ...courseForm,
      promotionId,
      professorId: isProfessorEligible ? courseForm.professorId : ''
    };
  }, [courseForm, promotions, eligibleProfessors]);

  const refreshCourses = async () => {
    const data = await listAdminCourses();
    setCourses(Array.isArray(data) ? data : []);
  };

  const refreshSubjectsAndRooms = async () => {
    const [subjectsData, roomsData] = await Promise.all([listAdminSubjects(), listAdminRooms()]);
    setSubjects(Array.isArray(subjectsData) ? subjectsData : []);
    setRooms(Array.isArray(roomsData) ? roomsData : []);
  };

  const courseStats = useMemo(
    () => ({
      total: courses.length,
      promotions: new Set(courses.map((course) => getCoursePromotionLabel(course))).size,
      salles: new Set(courses.map((course) => getCourseRoomLabel(course))).size
    }),
    [courses]
  );

  const handleAddCourse = (event) => {
    event.preventDefault();
    const promotionId = effectiveCourseForm.promotionId;
    const professorId = effectiveCourseForm.professorId;

    const missingFields = [];
    if (!courseForm.subjectId) missingFields.push('la matière');
    if (!professorId) missingFields.push('le professeur');
    if (!courseForm.roomId) missingFields.push('la salle');
    if (!promotionId) missingFields.push('la promotion');
    if (!courseForm.date) missingFields.push('la date');
    if (!courseForm.startTime) missingFields.push("l'heure de début");
    if (!courseForm.endTime) missingFields.push("l'heure de fin");

    if (missingFields.length > 0) {
      onError(`Veuillez renseigner : ${missingFields.join(', ')}.`);
      return;
    }

    setCreatingCourse(true);
    onError('');
    onSuccess('');
    setCourseConflicts([]);

    createAdminCourse({
      subject_id: Number(courseForm.subjectId),
      professor_id: Number(professorId),
      room_id: Number(courseForm.roomId),
      promotion_id: Number(promotionId),
      date: courseForm.date,
      start_time: courseForm.startTime,
      end_time: courseForm.endTime,
      tolerance_retard_minutes: Number(courseForm.toleranceRetardMinutes || 0)
    })
      .then(async () => {
        onSuccess('Cours créé avec succès.');
        setCourseForm({
          subjectId: '',
          professorId: '',
          roomId: '',
          promotionId: String(promotions[0]?.id || ''),
          date: '',
          startTime: '',
          endTime: '',
          toleranceRetardMinutes: '15'
        });

        await refreshCourses();
      })
      .catch((requestError) => {
        onError(getCourseErrorMessage(requestError));
        setCourseConflicts(getCourseScheduleConflicts(requestError));
      })
      .finally(() => {
        setCreatingCourse(false);
      });
  };

  const handleCourseDetail = async (courseId) => {
    setLoadingCourseDetailId(String(courseId));
    onError('');

    try {
      const detail = await getAdminCourse(courseId);
      setSelectedCourseDetail(detail || null);
    } catch (requestError) {
      onError(getApiErrorMessage(requestError, 'Impossible de charger le detail du cours.'));
    } finally {
      setLoadingCourseDetailId('');
    }
  };

  const handleCourseAttendanceExport = async (courseId, format) => {
    setExportingCourseId(`${courseId}-${format}`);
    onError('');
    onSuccess('');

    try {
      const { blob, filename } = await exportAdminCourseAttendance(courseId, format);
      downloadBlob(blob, filename);
      onSuccess(`Feuille de presence du cours ${courseId} exportee en ${format.toUpperCase()}.`);
    } catch (requestError) {
      onError(getApiErrorMessage(requestError, "Impossible d'exporter la feuille de presence."));
    } finally {
      setExportingCourseId('');
    }
  };

  const handleAddSubject = async (event) => {
    event.preventDefault();
    if (!subjectForm.nom.trim() || !subjectForm.code.trim()) return;

    setCreatingSubject(true);
    onError('');
    onSuccess('');

    try {
      await createAdminSubject({
        nom: subjectForm.nom.trim(),
        code: subjectForm.code.trim(),
        credits: subjectForm.credits
      });
      await refreshSubjectsAndRooms();
      setSubjectForm({ nom: '', code: '', credits: '' });
      onSuccess('Matière ajoutée avec succès.');
    } catch (requestError) {
      onError(getApiErrorMessage(requestError, "Impossible d'ajouter la matière."));
    } finally {
      setCreatingSubject(false);
    }
  };

  const openSubjectEdit = (subject) => {
    setEditingSubjectId(String(subject.id));
    setSubjectEditName(subject.nom || '');
  };

  const resetSubjectEdit = () => {
    setEditingSubjectId('');
    setSubjectEditName('');
  };

  const handleSubjectEditSave = async (subjectId) => {
    if (!subjectEditName.trim()) return;

    setSavingSubjectId(String(subjectId));
    onError('');
    onSuccess('');

    try {
      await updateAdminSubject(subjectId, { nom: subjectEditName.trim() });
      await refreshSubjectsAndRooms();
      resetSubjectEdit();
      onSuccess('Matière mise à jour avec succès.');
    } catch (requestError) {
      onError(getApiErrorMessage(requestError, 'Impossible de mettre à jour la matière.'));
    } finally {
      setSavingSubjectId('');
    }
  };

  const handleDeleteSubject = async (subjectId) => {
    setDeletingSubjectId(String(subjectId));
    onError('');
    onSuccess('');

    try {
      await deleteAdminSubject(subjectId);
      await refreshSubjectsAndRooms();
      onSuccess('Matière supprimée avec succès.');
    } catch (requestError) {
      onError(getApiErrorMessage(requestError, 'Impossible de supprimer la matière.'));
    } finally {
      setDeletingSubjectId('');
    }
  };

  const handleAddRoom = async (event) => {
    event.preventDefault();
    if (!roomForm.nom.trim()) return;

    setCreatingRoom(true);
    onError('');
    onSuccess('');

    try {
      await createAdminRoom({ nom: roomForm.nom.trim(), batiment: roomForm.batiment.trim() });
      await refreshSubjectsAndRooms();
      setRoomForm({ nom: '', batiment: '' });
      onSuccess('Salle ajoutée avec succès.');
    } catch (requestError) {
      onError(getApiErrorMessage(requestError, "Impossible d'ajouter la salle."));
    } finally {
      setCreatingRoom(false);
    }
  };

  const openRoomEdit = (room) => {
    setEditingRoomId(String(room.id));
    setRoomEditName(room.nom || '');
  };

  const resetRoomEdit = () => {
    setEditingRoomId('');
    setRoomEditName('');
  };

  const handleRoomEditSave = async (roomId) => {
    if (!roomEditName.trim()) return;

    setSavingRoomId(String(roomId));
    onError('');
    onSuccess('');

    try {
      await updateAdminRoom(roomId, { nom: roomEditName.trim() });
      await refreshSubjectsAndRooms();
      resetRoomEdit();
      onSuccess('Salle mise à jour avec succès.');
    } catch (requestError) {
      onError(getApiErrorMessage(requestError, 'Impossible de mettre à jour la salle.'));
    } finally {
      setSavingRoomId('');
    }
  };

  const handleDeleteRoom = async (roomId) => {
    setDeletingRoomId(String(roomId));
    onError('');
    onSuccess('');

    try {
      await deleteAdminRoom(roomId);
      await refreshSubjectsAndRooms();
      onSuccess('Salle supprimée avec succès.');
    } catch (requestError) {
      onError(getApiErrorMessage(requestError, 'Impossible de supprimer la salle.'));
    } finally {
      setDeletingRoomId('');
    }
  };

  return {
    courses,
    loading,
    subjects,
    rooms,
    courseForm: effectiveCourseForm,
    setCourseForm,
    eligibleProfessors,
    creatingCourse,
    courseConflicts,
    courseStats,
    selectedCourseDetail,
    loadingCourseDetailId,
    exportingCourseId,
    handleAddCourse,
    handleCourseDetail,
    handleCourseAttendanceExport,
    subjectForm,
    setSubjectForm,
    creatingSubject,
    editingSubjectId,
    subjectEditName,
    setSubjectEditName,
    savingSubjectId,
    deletingSubjectId,
    openSubjectEdit,
    resetSubjectEdit,
    handleAddSubject,
    handleSubjectEditSave,
    handleDeleteSubject,
    roomForm,
    setRoomForm,
    creatingRoom,
    editingRoomId,
    roomEditName,
    setRoomEditName,
    savingRoomId,
    deletingRoomId,
    openRoomEdit,
    resetRoomEdit,
    handleAddRoom,
    handleRoomEditSave,
    handleDeleteRoom
  };
}
