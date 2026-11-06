import { useEffect, useState } from 'react';
import { exportAdminAbsences, justifyAdminAbsence, listAdminAbsences } from '../../../api/admin';
import { downloadBlob, getApiErrorMessage } from '../../../utils/api';

export function useAbsencesManagement({ onError, onSuccess }) {
  const [absences, setAbsences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [absenceForms, setAbsenceForms] = useState({});
  const [justifyingAbsenceId, setJustifyingAbsenceId] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadAbsences() {
      setLoading(true);

      try {
        const data = await listAdminAbsences();
        if (!isMounted) return;
        setAbsences(Array.isArray(data) ? data : []);
      } catch (requestError) {
        if (!isMounted) return;
        onError(getApiErrorMessage(requestError, 'Impossible de charger les absences.'));
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadAbsences();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshAbsences = async () => {
    const data = await listAdminAbsences();
    setAbsences(Array.isArray(data) ? data : []);
  };

  const setAbsenceFormField = (absenceId, field, value) => {
    setAbsenceForms((current) => ({
      ...current,
      [absenceId]: {
        ...current[absenceId],
        [field]: value
      }
    }));
  };

  const handleJustifyAbsence = async (absenceId) => {
    const form = absenceForms[absenceId] || {};

    setJustifyingAbsenceId(String(absenceId));
    onError('');
    onSuccess('');

    try {
      const result = await justifyAdminAbsence(absenceId, {
        reason: form.reason || '',
        document_url: form.document_url || '',
        status: form.status || 'approved'
      });

      onSuccess(result?.message || 'Absence justifiee avec succes.');
      await refreshAbsences();
    } catch (requestError) {
      onError(getApiErrorMessage(requestError, 'Impossible de justifier cette absence.'));
    } finally {
      setJustifyingAbsenceId('');
    }
  };

  const handleAbsenceExport = async (format) => {
    try {
      const { blob, filename } = await exportAdminAbsences(format);
      downloadBlob(blob, filename);
      onSuccess(`Export des absences prepare au format ${format.toUpperCase()}.`);
    } catch (requestError) {
      onError(getApiErrorMessage(requestError, "Impossible d'exporter les absences."));
    }
  };

  return {
    absences,
    loading,
    absenceForms,
    setAbsenceFormField,
    justifyingAbsenceId,
    handleJustifyAbsence,
    handleAbsenceExport
  };
}
