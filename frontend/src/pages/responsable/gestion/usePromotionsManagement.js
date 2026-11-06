import { useEffect, useMemo, useState } from 'react';
import {
  createAdminFiliere,
  createAdminPromotion,
  deleteAdminFiliere,
  deleteAdminPromotion,
  listAdminFilieres,
  listAdminPromotions,
  updateAdminFiliere
} from '../../../api/admin';
import { getApiErrorMessage } from '../../../utils/api';

const EMPTY_PROMOTION_FORM = { niveau: '', annee_academique: '', filiere_id: '' };

export function usePromotionsManagement({ onError, onSuccess }) {
  const [promotions, setPromotions] = useState([]);
  const [filieres, setFilieres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [promotionForm, setPromotionForm] = useState(EMPTY_PROMOTION_FORM);
  const [creatingPromotion, setCreatingPromotion] = useState(false);
  const [deletingPromotionId, setDeletingPromotionId] = useState('');

  const [filiereForm, setFiliereForm] = useState({ nom: '' });
  const [creatingFiliere, setCreatingFiliere] = useState(false);
  const [editingFiliereId, setEditingFiliereId] = useState('');
  const [filiereEditName, setFiliereEditName] = useState('');
  const [savingFiliereId, setSavingFiliereId] = useState('');
  const [deletingFiliereId, setDeletingFiliereId] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadPromotions() {
      setLoading(true);

      try {
        const data = await listAdminPromotions();
        if (!isMounted) return;
        setPromotions(Array.isArray(data) ? data : []);
      } catch (requestError) {
        if (!isMounted) return;
        onError(getApiErrorMessage(requestError, 'Impossible de charger les promotions.'));
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    async function loadFilieres() {
      try {
        const data = await listAdminFilieres();
        if (!isMounted) return;
        setFilieres(Array.isArray(data) ? data : []);
      } catch (requestError) {
        if (!isMounted) return;
        onError(getApiErrorMessage(requestError, 'Impossible de charger les filieres.'));
      }
    }

    loadPromotions();
    loadFilieres();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshPromotions = async () => {
    const data = await listAdminPromotions();
    setPromotions(Array.isArray(data) ? data : []);
  };

  const refreshFilieres = async () => {
    const data = await listAdminFilieres();
    setFilieres(Array.isArray(data) ? data : []);
  };

  const promotionStats = useMemo(
    () => ({
      total: promotions.length,
      effectif: promotions.reduce((sum, promotion) => sum + Number(promotion.nombre_etudiants || 0), 0),
      filieres: filieres.length
    }),
    [promotions, filieres]
  );

  const effectivePromotionForm = useMemo(
    () => ({
      ...promotionForm,
      filiere_id: promotionForm.filiere_id || String(filieres[0]?.id || '')
    }),
    [promotionForm, filieres]
  );

  const handleAddPromotion = async (event) => {
    event.preventDefault();
    const filiereId = effectivePromotionForm.filiere_id;
    if (!promotionForm.niveau.trim() || !promotionForm.annee_academique.trim() || !filiereId) return;

    setCreatingPromotion(true);
    onError('');
    onSuccess('');

    try {
      await createAdminPromotion({
        niveau: promotionForm.niveau.trim(),
        annee_academique: promotionForm.annee_academique.trim(),
        filiere_id: filiereId
      });
      await refreshPromotions();
      setPromotionForm(EMPTY_PROMOTION_FORM);
      onSuccess('Nouvelle promotion creee avec succes.');
    } catch (requestError) {
      onError(getApiErrorMessage(requestError, 'Impossible de creer la promotion.'));
    } finally {
      setCreatingPromotion(false);
    }
  };

  const handleDeletePromotion = async (promotionId) => {
    setDeletingPromotionId(String(promotionId));
    onError('');
    onSuccess('');

    try {
      await deleteAdminPromotion(promotionId);
      await refreshPromotions();
      onSuccess('Promotion supprimée avec succès.');
    } catch (requestError) {
      onError(getApiErrorMessage(requestError, 'Impossible de supprimer la promotion.'));
    } finally {
      setDeletingPromotionId('');
    }
  };

  const handleAddFiliere = async (event) => {
    event.preventDefault();
    if (!filiereForm.nom.trim()) return;

    setCreatingFiliere(true);
    onError('');
    onSuccess('');

    try {
      await createAdminFiliere({ nom: filiereForm.nom.trim() });
      await refreshFilieres();
      setFiliereForm({ nom: '' });
      onSuccess('Filière ajoutée avec succès.');
    } catch (requestError) {
      onError(getApiErrorMessage(requestError, "Impossible d'ajouter la filière."));
    } finally {
      setCreatingFiliere(false);
    }
  };

  const openFiliereEdit = (filiere) => {
    setEditingFiliereId(String(filiere.id));
    setFiliereEditName(filiere.nom || '');
  };

  const resetFiliereEdit = () => {
    setEditingFiliereId('');
    setFiliereEditName('');
  };

  const handleFiliereEditSave = async (filiereId) => {
    if (!filiereEditName.trim()) return;

    setSavingFiliereId(String(filiereId));
    onError('');
    onSuccess('');

    try {
      await updateAdminFiliere(filiereId, { nom: filiereEditName.trim() });
      await refreshFilieres();
      resetFiliereEdit();
      onSuccess('Filière mise à jour avec succès.');
    } catch (requestError) {
      onError(getApiErrorMessage(requestError, 'Impossible de mettre à jour la filière.'));
    } finally {
      setSavingFiliereId('');
    }
  };

  const handleDeleteFiliere = async (filiereId) => {
    setDeletingFiliereId(String(filiereId));
    onError('');
    onSuccess('');

    try {
      await deleteAdminFiliere(filiereId);
      await refreshFilieres();
      onSuccess('Filière supprimée avec succès.');
    } catch (requestError) {
      onError(getApiErrorMessage(requestError, 'Impossible de supprimer la filière.'));
    } finally {
      setDeletingFiliereId('');
    }
  };

  return {
    promotions,
    filieres,
    loading,
    promotionForm: effectivePromotionForm,
    setPromotionForm,
    creatingPromotion,
    deletingPromotionId,
    promotionStats,
    handleAddPromotion,
    handleDeletePromotion,
    filiereForm,
    setFiliereForm,
    creatingFiliere,
    editingFiliereId,
    filiereEditName,
    setFiliereEditName,
    savingFiliereId,
    deletingFiliereId,
    openFiliereEdit,
    resetFiliereEdit,
    handleAddFiliere,
    handleFiliereEditSave,
    handleDeleteFiliere
  };
}
