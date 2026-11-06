import { Download, FileText } from 'lucide-react';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import { StaggerContainer, StaggerItem } from '../../../components/motion/Stagger';
import { buildDisplayName } from './helpers';

function RapportsTab({ reports, students }) {
  const {
    templates,
    reportConfig,
    setReportConfig,
    selectedTemplate,
    generatedReports,
    generatedPreview,
    generatedFile,
    generating,
    handleGenerateReport,
    handleExportReport,
    promotionOptions
  } = reports;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="p-4 md:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-[#0F172A]">Generer un rapport</h3>
              <p className="text-sm text-[#64748B]">Preparez des syntheses fiables pour les reunions de suivi.</p>
            </div>
            <FileText className="h-5 w-5 text-[#0C4A6E]" />
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <select
                value={reportConfig.templateId}
                onChange={(event) => setReportConfig((current) => ({ ...current, templateId: event.target.value }))}
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A] outline-none focus:border-[#0C4A6E]"
              >
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.nom}
                  </option>
                ))}
              </select>
              <select
                value={reportConfig.period}
                onChange={(event) => setReportConfig((current) => ({ ...current, period: event.target.value }))}
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A] outline-none focus:border-[#0C4A6E]"
              >
                <option value="7j">7 derniers jours</option>
                <option value="30j">30 derniers jours</option>
                <option value="semestre">Semestre</option>
              </select>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <select
                value={reportConfig.promotion}
                onChange={(event) => setReportConfig((current) => ({ ...current, promotion: event.target.value }))}
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A] outline-none focus:border-[#0C4A6E]"
              >
                {promotionOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === 'toutes' ? 'Toutes les promotions' : option}
                  </option>
                ))}
              </select>
              <select
                value={reportConfig.studentId}
                onChange={(event) => setReportConfig((current) => ({ ...current, studentId: event.target.value }))}
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A] outline-none focus:border-[#0C4A6E]"
              >
                <option value="">Aucun etudiant specifique</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {buildDisplayName(student)}
                  </option>
                ))}
              </select>
            </div>
            <select
              value={reportConfig.format}
              onChange={(event) => setReportConfig((current) => ({ ...current, format: event.target.value }))}
              className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A] outline-none focus:border-[#0C4A6E]"
            >
              <option value="csv">CSV</option>
              <option value="xlsx">XLSX</option>
            </select>
            {selectedTemplate && (
              <div className="rounded-2xl bg-[#F8FAFC] p-4">
                <p className="text-sm font-semibold text-[#0F172A]">{selectedTemplate.nom}</p>
                <p className="mt-1 text-sm text-[#64748B]">{selectedTemplate.description}</p>
              </div>
            )}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button className="flex-1" icon={FileText} onClick={handleGenerateReport} disabled={generating || !selectedTemplate}>
                {generating ? 'Preparation...' : 'Preparer le rapport'}
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                icon={Download}
                onClick={handleExportReport}
                disabled={!generatedFile}
              >
                Exporter
              </Button>
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-4 md:p-6">
            <h3 className="text-lg font-semibold text-[#0F172A]">Apercu genere</h3>
            {generatedPreview ? (
              <div className="mt-4 space-y-3">
                <div>
                  <p className="text-base font-semibold text-[#0F172A]">{generatedPreview.title}</p>
                  <p className="mt-1 text-sm text-[#64748B]">{generatedPreview.context}</p>
                </div>
                <div className="space-y-2">
                  {generatedPreview.insights.map((item) => (
                    <div key={item} className="rounded-xl bg-[#F8FAFC] px-4 py-3 text-sm text-[#475569]">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-[#64748B]">
                Aucune generation lancee pour le moment. Configurez un modele puis preparez un rapport.
              </p>
            )}
          </Card>

          <Card className="p-4 md:p-6">
            <h3 className="text-lg font-semibold text-[#0F172A]">Historique recent</h3>
            <StaggerContainer className="mt-4 space-y-3">
              {generatedReports.length > 0 ? (
                generatedReports.map((report) => (
                  <StaggerItem key={report.id} className="rounded-2xl border border-[#E2E8F0] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[#0F172A]">{report.nom}</p>
                        <p className="mt-1 text-sm text-[#64748B]">{report.scope}</p>
                      </div>
                      <span className="text-xs text-[#94A3B8]">{report.date}</span>
                    </div>
                  </StaggerItem>
                ))
              ) : (
                <p className="text-sm text-[#64748B]">Aucun rapport genere recemment.</p>
              )}
            </StaggerContainer>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default RapportsTab;
