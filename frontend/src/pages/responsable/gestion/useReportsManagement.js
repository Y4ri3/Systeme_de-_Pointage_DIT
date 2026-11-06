import { useEffect, useMemo, useState } from 'react';
import { generateAdminReport, listAdminReportTemplates } from '../../../api/admin';
import { downloadBlob, getApiErrorMessage } from '../../../utils/api';
import { buildDisplayName, getStudentIdentifier } from './helpers';

export function useReportsManagement({ students, promotionOptions, defaultStudentId, onError, onSuccess }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportConfig, setReportConfig] = useState({
    templateId: '',
    period: '30j',
    promotion: 'toutes',
    format: 'csv',
    studentId: defaultStudentId || ''
  });
  const [generatedReports, setGeneratedReports] = useState([]);
  const [generatedPreview, setGeneratedPreview] = useState(null);
  const [generatedFile, setGeneratedFile] = useState(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadTemplates() {
      setLoading(true);

      try {
        const data = await listAdminReportTemplates();
        if (!isMounted) return;
        const nextTemplates = Array.isArray(data) ? data : [];
        setTemplates(nextTemplates);
        setReportConfig((current) => ({
          ...current,
          templateId: current.templateId || String(nextTemplates[0]?.id || '')
        }));
      } catch (requestError) {
        if (!isMounted) return;
        onError(getApiErrorMessage(requestError, 'Impossible de charger les modeles de rapport.'));
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadTemplates();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Syncs report config to the ?student= query param whenever the user
    // navigates here from a student's "Generer un rapport" action.
    if (!defaultStudentId) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReportConfig((current) => ({
      ...current,
      templateId: String(templates.find((item) => /etudiant/i.test(item.nom))?.id || current.templateId),
      studentId: defaultStudentId
    }));
  }, [defaultStudentId, templates]);

  const selectedTemplate = useMemo(
    () => templates.find((template) => String(template.id) === reportConfig.templateId),
    [reportConfig.templateId, templates]
  );

  const selectedStudent = useMemo(
    () => students.find((student) => String(student.id) === String(reportConfig.studentId)),
    [reportConfig.studentId, students]
  );

  const handleGenerateReport = async () => {
    if (!selectedTemplate) return;

    setGenerating(true);
    onError('');
    onSuccess('');

    try {
      const file = await generateAdminReport({
        template_id: selectedTemplate.id,
        template_name: selectedTemplate.nom,
        period: reportConfig.period,
        promotion: reportConfig.promotion,
        format: reportConfig.format,
        student_id: reportConfig.studentId || undefined
      });

      setGeneratedFile(file);

      const preview = {
        title: selectedTemplate.nom,
        context: selectedStudent
          ? `Rapport centre sur ${buildDisplayName(selectedStudent)} (${getStudentIdentifier(selectedStudent)}).`
          : reportConfig.promotion === 'toutes'
            ? 'Synthese globale de toutes les promotions.'
            : `Analyse ciblee pour ${reportConfig.promotion}.`,
        insights: [
          `Periode analysee : ${reportConfig.period === '7j' ? '7 derniers jours' : reportConfig.period === '30j' ? '30 derniers jours' : 'Semestre'}`,
          `Format d'export : ${reportConfig.format}`,
          selectedStudent
            ? "Inclut l'historique detaille, les alertes et les actions de suivi."
            : 'Inclut les tendances, les promotions comparees et les alertes actives.'
        ]
      };

      setGeneratedPreview(preview);
      setGeneratedReports((current) => [
        {
          id: Date.now(),
          nom: selectedTemplate.nom,
          date: "A l'instant",
          scope: selectedStudent
            ? buildDisplayName(selectedStudent)
            : reportConfig.promotion === 'toutes'
              ? 'Departement complet'
              : reportConfig.promotion
        },
        ...current
      ]);
      onSuccess('Rapport prepare et pret a etre exporte.');
    } catch (requestError) {
      onError(getApiErrorMessage(requestError, 'Impossible de generer le rapport.'));
    } finally {
      setGenerating(false);
    }
  };

  const handleExportReport = () => {
    if (!generatedFile) return;
    downloadBlob(generatedFile.blob, generatedFile.filename);
  };

  return {
    templates,
    loading,
    reportConfig,
    setReportConfig,
    selectedTemplate,
    selectedStudent,
    generatedReports,
    generatedPreview,
    generatedFile,
    generating,
    handleGenerateReport,
    handleExportReport,
    promotionOptions
  };
}
