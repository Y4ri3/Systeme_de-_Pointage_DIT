import { useEffect, useState } from 'react';
import {
  createAdminProfessor,
  getAdminProfessor,
  importAdminProfessors,
  listAdminProfessors,
  listAdminSubjects,
  resetAdminProfessorPassword,
  updateAdminProfessor
} from '../../../api/admin';
import { getApiErrorMessage } from '../../../utils/api';
import { getEntityStatus, splitPersonName } from './helpers';

const EMPTY_PROFESSOR_FORM = { nom: '', prenom: '', email: '', matiereIds: [], promotionIds: [] };
const EMPTY_PROFESSOR_EDIT_FORM = {
  nom: '',
  prenom: '',
  email: '',
  statut: 'Actif',
  matiereIds: [],
  promotionIds: []
};

export function useProfessorsManagement({ promotions, onError, onSuccess }) {
  const [professors, setProfessors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState([]);
  const [professorImportFile, setProfessorImportFile] = useState(null);
  const [professorPhoto, setProfessorPhoto] = useState(null);
  const [professorForm, setProfessorForm] = useState(EMPTY_PROFESSOR_FORM);
  const [importingProfessors, setImportingProfessors] = useState(false);
  const [creatingProfessor, setCreatingProfessor] = useState(false);
  const [selectedProfessorDetail, setSelectedProfessorDetail] = useState(null);
  const [loadingProfessorDetailId, setLoadingProfessorDetailId] = useState('');
  const [editingProfessorId, setEditingProfessorId] = useState('');
  const [professorEditForm, setProfessorEditForm] = useState(EMPTY_PROFESSOR_EDIT_FORM);
  const [professorEditPhoto, setProfessorEditPhoto] = useState(null);
  const [savingProfessorId, setSavingProfessorId] = useState('');

  useEffect(() => {
    let isMounted = true;

    // Charges ensemble (et sous le meme flag loading, qui masque le tableau et
    // donc les boutons "Modifier" tant qu'il est vrai) : si les matieres se
    // chargeaient separement sans bloquer l'affichage, un enregistrement lance
    // avant leur arrivee filtrait "subjects" comme vide et effacait silencieusement
    // les matieres/promotions deja rattachees au professeur.
    async function loadAll() {
      setLoading(true);

      try {
        const [professorsData, subjectsData] = await Promise.all([
          listAdminProfessors(),
          listAdminSubjects()
        ]);
        if (!isMounted) return;
        setProfessors(Array.isArray(professorsData) ? professorsData : []);
        setSubjects(Array.isArray(subjectsData) ? subjectsData : []);
      } catch (requestError) {
        if (!isMounted) return;
        onError(getApiErrorMessage(requestError, 'Impossible de charger les professeurs ou les matieres.'));
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadAll();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshProfessors = async () => {
    const data = await listAdminProfessors();
    setProfessors(Array.isArray(data) ? data : []);
  };

  const toggleFormAssociation = (setForm, field, id) => {
    setForm((current) => {
      const currentIds = current[field];
      const stringId = String(id);
      const nextIds = currentIds.includes(stringId)
        ? currentIds.filter((existingId) => existingId !== stringId)
        : [...currentIds, stringId];

      return { ...current, [field]: nextIds };
    });
  };

  const filterValidIds = (ids, items) => {
    const validIds = new Set(items.map((item) => String(item.id)));
    return ids.filter((id) => validIds.has(id));
  };

  const toggleProfessorFormMatiere = (matiereId) => toggleFormAssociation(setProfessorForm, 'matiereIds', matiereId);
  const toggleProfessorFormPromotion = (promotionId) => toggleFormAssociation(setProfessorForm, 'promotionIds', promotionId);
  const toggleProfessorEditMatiere = (matiereId) => toggleFormAssociation(setProfessorEditForm, 'matiereIds', matiereId);
  const toggleProfessorEditPromotion = (promotionId) => toggleFormAssociation(setProfessorEditForm, 'promotionIds', promotionId);

  const resetProfessorEdit = () => {
    setEditingProfessorId('');
    setProfessorEditForm(EMPTY_PROFESSOR_EDIT_FORM);
    setProfessorEditPhoto(null);
  };

  const openProfessorEdit = (professor) => {
    const parsedNames = splitPersonName(professor);

    setEditingProfessorId(String(professor.id));
    setProfessorEditForm({
      nom: parsedNames.nom,
      prenom: parsedNames.prenom,
      email: professor?.email || '',
      statut: getEntityStatus(professor),
      matiereIds: (professor?.matieres_enseignees || []).map((matiere) => String(matiere.id)),
      promotionIds: (professor?.promotions_en_charge || []).map((promotion) => String(promotion.id))
    });
    setProfessorEditPhoto(null);
  };

  const handleAddProfessor = async (event) => {
    event.preventDefault();
    if (!professorForm.nom || !professorForm.prenom || !professorForm.email) return;

    setCreatingProfessor(true);
    onError('');
    onSuccess('');

    try {
      const formData = new FormData();
      formData.append('nom', professorForm.nom);
      formData.append('prenom', professorForm.prenom);
      formData.append('email', professorForm.email);
      if (professorPhoto) {
        formData.append('photo', professorPhoto);
      }
      const validMatiereIds = filterValidIds(professorForm.matiereIds, subjects);
      const validPromotionIds = filterValidIds(professorForm.promotionIds, promotions);
      if (validMatiereIds.length) {
        formData.append('matiere_ids', validMatiereIds.join(','));
      }
      if (validPromotionIds.length) {
        formData.append('promotion_ids', validPromotionIds.join(','));
      }

      const response = await createAdminProfessor(formData);
      if (response?.email_sent === false) {
        onSuccess(response?.warning || "Professeur ajouté, mais l'email n'a pas pu être envoyé.");
      } else {
        onSuccess('Professeur ajouté avec succès.');
      }
      setProfessorForm(EMPTY_PROFESSOR_FORM);
      setProfessorPhoto(null);

      await refreshProfessors();
    } catch (requestError) {
      onError(getApiErrorMessage(requestError, "Impossible d'ajouter le professeur."));
    } finally {
      setCreatingProfessor(false);
    }
  };

  const handleProfessorImport = async () => {
    if (!professorImportFile) return;

    setImportingProfessors(true);
    onError('');
    onSuccess('');

    try {
      await importAdminProfessors(professorImportFile);
      await refreshProfessors();
      onSuccess('Import des professeurs effectué avec succès.');
      setProfessorImportFile(null);
    } catch (requestError) {
      onError(getApiErrorMessage(requestError, "Impossible d'importer les professeurs."));
    } finally {
      setImportingProfessors(false);
    }
  };

  const handleProfessorEditSave = async (professorId) => {
    setSavingProfessorId(String(professorId));
    onError('');
    onSuccess('');

    try {
      const hasPhoto = professorEditPhoto instanceof File;
      const payload = hasPhoto ? new FormData() : {};

      const fields = {
        nom: professorEditForm.nom.trim(),
        prenom: professorEditForm.prenom.trim(),
        email: professorEditForm.email.trim(),
        statut: professorEditForm.statut
      };

      Object.entries(fields).forEach(([key, value]) => {
        if (!value) return;

        if (hasPhoto) {
          payload.append(key, value);
        } else {
          payload[key] = value;
        }
      });

      const validMatiereIds = filterValidIds(professorEditForm.matiereIds, subjects);
      const validPromotionIds = filterValidIds(professorEditForm.promotionIds, promotions);

      if (hasPhoto) {
        payload.append('matiere_ids', validMatiereIds.join(','));
        payload.append('promotion_ids', validPromotionIds.join(','));
        payload.append('photo', professorEditPhoto);
      } else {
        payload.matiere_ids = validMatiereIds.map(Number);
        payload.promotion_ids = validPromotionIds.map(Number);
      }

      await updateAdminProfessor(professorId, payload);
      await refreshProfessors();
      resetProfessorEdit();
      onSuccess('Fiche professeur mise à jour avec succès.');
    } catch (requestError) {
      onError(getApiErrorMessage(requestError, 'Impossible de mettre a jour la fiche professeur.'));
    } finally {
      setSavingProfessorId('');
    }
  };

  const handleProfessorPasswordReset = async (professorId) => {
    try {
      await resetAdminProfessorPassword(professorId);
      onSuccess('Reinitialisation du mot de passe professeur demandee.');
    } catch (requestError) {
      onError(getApiErrorMessage(requestError, 'Impossible de reinitialiser le mot de passe professeur.'));
    }
  };

  const handleProfessorDetail = async (professorId) => {
    setLoadingProfessorDetailId(String(professorId));
    onError('');

    try {
      const detail = await getAdminProfessor(professorId);
      setSelectedProfessorDetail(detail || null);
    } catch (requestError) {
      onError(getApiErrorMessage(requestError, 'Impossible de charger le detail du professeur.'));
    } finally {
      setLoadingProfessorDetailId('');
    }
  };

  return {
    professors,
    loading,
    subjects,
    promotions,
    professorImportFile,
    setProfessorImportFile,
    professorPhoto,
    setProfessorPhoto,
    professorForm,
    setProfessorForm,
    toggleProfessorFormMatiere,
    toggleProfessorFormPromotion,
    importingProfessors,
    creatingProfessor,
    selectedProfessorDetail,
    loadingProfessorDetailId,
    editingProfessorId,
    professorEditForm,
    setProfessorEditForm,
    toggleProfessorEditMatiere,
    toggleProfessorEditPromotion,
    professorEditPhoto,
    setProfessorEditPhoto,
    savingProfessorId,
    resetProfessorEdit,
    openProfessorEdit,
    handleAddProfessor,
    handleProfessorImport,
    handleProfessorEditSave,
    handleProfessorPasswordReset,
    handleProfessorDetail
  };
}
