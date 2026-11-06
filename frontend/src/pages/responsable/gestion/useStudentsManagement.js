import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createAdminStudent,
  importAdminStudents,
  listAdminStudents,
  resetAdminStudentPassword,
  updateAdminStudent
} from '../../../api/admin';
import { getApiErrorMessage } from '../../../utils/api';
import {
  buildDisplayName,
  getEntityStatus,
  getPromotionLabel,
  getStudentIdentifier,
  getStudentPromotionLabel,
  isActiveStatus,
  splitPersonName
} from './helpers';

const EMPTY_STUDENT_FORM = { nom: '', prenom: '', email: '', promotion: '' };

export function useStudentsManagement({ promotions, onError, onSuccess }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentPromotionFilter, setStudentPromotionFilter] = useState('toutes');
  const [studentForm, setStudentForm] = useState(EMPTY_STUDENT_FORM);
  const [studentPhoto, setStudentPhoto] = useState(null);
  const [studentImportFile, setStudentImportFile] = useState(null);
  const [creatingStudent, setCreatingStudent] = useState(false);
  const [importingStudents, setImportingStudents] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState('');
  const [studentEditForm, setStudentEditForm] = useState({
    nom: '',
    prenom: '',
    email: '',
    statut: 'Actif',
    promotion_id: ''
  });
  const [studentEditPhoto, setStudentEditPhoto] = useState(null);
  const [savingStudentId, setSavingStudentId] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadStudents() {
      setLoading(true);

      try {
        const data = await listAdminStudents();
        if (!isMounted) return;
        setStudents(Array.isArray(data) ? data : []);
      } catch (requestError) {
        if (!isMounted) return;
        onError(getApiErrorMessage(requestError, 'Impossible de charger les etudiants.'));
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadStudents();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const effectiveStudentForm = useMemo(
    () => ({
      ...studentForm,
      promotion: studentForm.promotion || (promotions[0]?.id ? String(promotions[0].id) : '')
    }),
    [studentForm, promotions]
  );

  const filteredStudents = useMemo(
    () =>
      students.filter((student) => {
        const matchesSearch =
          buildDisplayName(student).toLowerCase().includes(studentSearch.toLowerCase()) ||
          getStudentIdentifier(student).toLowerCase().includes(studentSearch.toLowerCase());
        const matchesPromotion =
          studentPromotionFilter === 'toutes' || getStudentPromotionLabel(student) === studentPromotionFilter;

        return matchesSearch && matchesPromotion;
      }),
    [studentPromotionFilter, studentSearch, students]
  );

  const studentStats = useMemo(
    () => ({
      total: students.length,
      actifs: students.filter((student) => isActiveStatus(getEntityStatus(student))).length,
      surveillance: students.filter((student) => !isActiveStatus(getEntityStatus(student))).length
    }),
    [students]
  );

  const refreshStudents = async () => {
    const data = await listAdminStudents();
    setStudents(Array.isArray(data) ? data : []);
  };

  const resetStudentEdit = useCallback(() => {
    setEditingStudentId('');
    setStudentEditForm({ nom: '', prenom: '', email: '', statut: 'Actif', promotion_id: '' });
    setStudentEditPhoto(null);
  }, []);

  const openStudentEdit = useCallback(
    (student) => {
      const parsedNames = splitPersonName(student);
      const mappedPromotion = promotions.find(
        (promotion) => getPromotionLabel(promotion) === getStudentPromotionLabel(student)
      );

      setEditingStudentId(String(student.id));
      setStudentEditForm({
        nom: parsedNames.nom,
        prenom: parsedNames.prenom,
        email: student?.email || '',
        statut: getEntityStatus(student),
        promotion_id: String(student?.promotion_id || mappedPromotion?.id || '')
      });
      setStudentEditPhoto(null);
    },
    [promotions]
  );

  const handleAddStudent = (event) => {
    event.preventDefault();
    const promotionId = effectiveStudentForm.promotion;
    if (!studentForm.nom.trim() || !studentForm.prenom.trim() || !studentForm.email.trim() || !promotionId) return;

    const formData = new FormData();

    setCreatingStudent(true);
    onError('');
    onSuccess('');

    formData.append('nom', studentForm.nom.trim());
    formData.append('prenom', studentForm.prenom.trim());
    formData.append('email', studentForm.email.trim());
    formData.append('promotion_id', String(promotionId));
    if (studentPhoto) {
      formData.append('photo', studentPhoto);
    }

    createAdminStudent(formData)
      .then(async (response) => {
        await refreshStudents();
        setStudentForm({
          ...EMPTY_STUDENT_FORM,
          promotion: promotions[0]?.id ? String(promotions[0].id) : ''
        });
        setStudentPhoto(null);
        if (response?.email_sent === false) {
          onSuccess(response?.warning || "Étudiant ajouté, mais l'email n'a pas pu être envoyé.");
        } else {
          onSuccess("Nouvel étudiant ajouté à l'organisation.");
        }
      })
      .catch((requestError) => {
        onError(getApiErrorMessage(requestError, "Impossible d'ajouter l'etudiant."));
      })
      .finally(() => {
        setCreatingStudent(false);
      });
  };

  const handleStudentImport = async () => {
    if (!studentImportFile) return;

    setImportingStudents(true);
    onError('');
    onSuccess('');

    try {
      await importAdminStudents(studentImportFile);
      await refreshStudents();
      onSuccess('Import des étudiants effectué avec succès.');
      setStudentImportFile(null);
    } catch (requestError) {
      onError(getApiErrorMessage(requestError, "Impossible d'importer les etudiants."));
    } finally {
      setImportingStudents(false);
    }
  };

  const handleToggleStudentStatus = useCallback(async (studentId) => {
    const student = students.find((item) => String(item.id) === String(studentId));
    if (!student) return;

    const nextStatus = isActiveStatus(getEntityStatus(student)) ? 'Sous surveillance' : 'Actif';

    setSavingStudentId(String(studentId));
    onError('');
    onSuccess('');

    try {
      await updateAdminStudent(studentId, { statut: nextStatus });
      await refreshStudents();
      onSuccess("Le statut de l'étudiant a été mis à jour.");
    } catch (requestError) {
      onError(getApiErrorMessage(requestError, "Impossible de mettre a jour le statut de l'etudiant."));
    } finally {
      setSavingStudentId('');
    }
  }, [students, onError, onSuccess]);

  const handleStudentEditSave = useCallback(async (studentId) => {
    setSavingStudentId(String(studentId));
    onError('');
    onSuccess('');

    try {
      const hasPhoto = studentEditPhoto instanceof File;
      const payload = hasPhoto ? new FormData() : {};

      const fields = {
        nom: studentEditForm.nom.trim(),
        prenom: studentEditForm.prenom.trim(),
        email: studentEditForm.email.trim(),
        statut: studentEditForm.statut
      };

      Object.entries(fields).forEach(([key, value]) => {
        if (!value) return;

        if (hasPhoto) {
          payload.append(key, value);
        } else {
          payload[key] = value;
        }
      });

      if (studentEditForm.promotion_id) {
        if (hasPhoto) {
          payload.append('promotion_id', studentEditForm.promotion_id);
        } else {
          payload.promotion_id = Number(studentEditForm.promotion_id);
        }
      }

      if (hasPhoto) {
        payload.append('photo', studentEditPhoto);
      }

      await updateAdminStudent(studentId, payload);
      await refreshStudents();
      resetStudentEdit();
      onSuccess('Fiche étudiant mise à jour avec succès.');
    } catch (requestError) {
      onError(getApiErrorMessage(requestError, "Impossible de mettre a jour la fiche etudiant."));
    } finally {
      setSavingStudentId('');
    }
  }, [studentEditForm, studentEditPhoto, resetStudentEdit, onError, onSuccess]);

  const handleStudentPasswordReset = useCallback(async (studentId) => {
    try {
      await resetAdminStudentPassword(studentId);
      onSuccess('Reinitialisation du mot de passe etudiant demandee.');
    } catch (requestError) {
      onError(getApiErrorMessage(requestError, 'Impossible de reinitialiser le mot de passe etudiant.'));
    }
  }, [onError, onSuccess]);

  return {
    students,
    loading,
    filteredStudents,
    studentStats,
    studentSearch,
    setStudentSearch,
    studentPromotionFilter,
    setStudentPromotionFilter,
    studentForm: effectiveStudentForm,
    setStudentForm,
    studentPhoto,
    setStudentPhoto,
    studentImportFile,
    setStudentImportFile,
    creatingStudent,
    importingStudents,
    editingStudentId,
    studentEditForm,
    setStudentEditForm,
    studentEditPhoto,
    setStudentEditPhoto,
    savingStudentId,
    handleAddStudent,
    handleStudentImport,
    handleToggleStudentStatus,
    openStudentEdit,
    resetStudentEdit,
    handleStudentEditSave,
    handleStudentPasswordReset
  };
}
