import { useEffect, useState } from 'react';
import { getAdminSettings, updateAdminSettings } from '../../../api/admin';
import { getApiErrorMessage } from '../../../utils/api';

const FALLBACK_SETTINGS = {
  nom_etablissement: '',
  seuil_absences: 0,
  tolerance_retard_minutes_defaut: 0,
  contact_support_email: ''
};

export function useSettingsManagement({ enabled = true, onError, onSuccess }) {
  const [settings, setSettings] = useState(FALLBACK_SETTINGS);
  const [initialSettings, setInitialSettings] = useState(FALLBACK_SETTINGS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Ne charge les parametres que lorsque l'onglet Parametres est reellement
  // ouvert : cet appel est le seul de la page Gestion connu pour echouer cote
  // backend (voir erreur.md), un chargement systematique au montage affichait
  // son erreur sur tous les autres onglets sans rapport.
  useEffect(() => {
    if (!enabled || hasLoaded) return undefined;

    let isMounted = true;

    async function loadSettings() {
      setLoading(true);

      try {
        const data = await getAdminSettings();
        if (!isMounted) return;
        const nextSettings = { ...FALLBACK_SETTINGS, ...data };
        setSettings(nextSettings);
        setInitialSettings(nextSettings);
        setHasLoaded(true);
      } catch (requestError) {
        if (!isMounted) return;
        onError(getApiErrorMessage(requestError, 'Impossible de charger les parametres.'));
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, [enabled, hasLoaded, onError]);

  const handleSettingsSave = async () => {
    setSaving(true);
    onError('');
    onSuccess('');

    try {
      const result = await updateAdminSettings({
        nom_etablissement: settings.nom_etablissement,
        seuil_absences: Number(settings.seuil_absences) || 0,
        tolerance_retard_minutes_defaut: Number(settings.tolerance_retard_minutes_defaut) || 0,
        contact_support_email: settings.contact_support_email || null
      });
      const nextSettings = { ...settings, ...(result || {}) };
      setSettings(nextSettings);
      setInitialSettings(nextSettings);
      onSuccess('Parametres systeme enregistres.');
    } catch (requestError) {
      onError(getApiErrorMessage(requestError, 'Impossible d’enregistrer les parametres.'));
    } finally {
      setSaving(false);
    }
  };

  const handleSettingsReset = () => {
    setSettings(initialSettings);
    onSuccess('Parametres reinitialises sur la derniere configuration connue.');
  };

  return {
    settings,
    setSettings,
    loading,
    saving,
    handleSettingsSave,
    handleSettingsReset
  };
}
