import { Download } from 'lucide-react';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import { SkeletonList } from '../../../components/motion/Skeleton';
import { StaggerContainer, StaggerItem } from '../../../components/motion/Stagger';
import { getFiliereLabel, getPromotionLabel } from './helpers';

function AbsencesTab({ absences }) {
  const { loading, absences: absencesList, absenceForms, setAbsenceFormField, justifyingAbsenceId, handleJustifyAbsence, handleAbsenceExport } = absences;

  return (
    <div className="space-y-6">
      <Card className="p-4 md:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-[#0F172A]">Suivi des absences</h3>
            <p className="text-sm text-[#64748B]">
              Consultez les absences signalées, justifiez-les et exportez les résultats.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" size="small" icon={Download} onClick={() => handleAbsenceExport('csv')}>
              Export CSV
            </Button>
            <Button variant="secondary" size="small" icon={Download} onClick={() => handleAbsenceExport('xlsx')}>
              Export XLSX
            </Button>
          </div>
        </div>

        {loading ? (
          <SkeletonList count={3} variant="row" />
        ) : (
        <StaggerContainer className="space-y-3">
          {absencesList.map((absence) => (
            <StaggerItem key={absence.id} className="rounded-2xl border border-[#E2E8F0] p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-base font-semibold text-[#0F172A]">{absence.nom}</h4>
                  <p className="mt-1 text-sm text-[#64748B]">
                    {getPromotionLabel(absence.promotion)} • {getFiliereLabel(absence.filiere)}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-[#F8FAFC] px-3 py-1 text-[#475569]">
                      {absence.total_absences} absences
                    </span>
                    <span className="rounded-full bg-[#FEF3C7] px-3 py-1 text-[#92400E]">
                      {absence.taux_absence}% de taux d&apos;absence
                    </span>
                  </div>
                </div>
                <div className="rounded-xl bg-[#F8FAFC] px-4 py-3 text-sm text-[#64748B]">
                  {absence.justification ? 'Déjà justifiée' : 'En attente de justification'}
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1fr_auto]">
                <input
                  type="text"
                  value={absenceForms[absence.id]?.reason || ''}
                  onChange={(event) => setAbsenceFormField(absence.id, 'reason', event.target.value)}
                  placeholder="Motif"
                  className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A] outline-none focus:border-[#0C4A6E]"
                />
                <input
                  type="url"
                  value={absenceForms[absence.id]?.document_url || ''}
                  onChange={(event) => setAbsenceFormField(absence.id, 'document_url', event.target.value)}
                  placeholder="URL justificatif"
                  className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A] outline-none focus:border-[#0C4A6E]"
                />
                <div className="flex gap-3">
                  <select
                    value={absenceForms[absence.id]?.status || 'approved'}
                    onChange={(event) => setAbsenceFormField(absence.id, 'status', event.target.value)}
                    className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A] outline-none focus:border-[#0C4A6E]"
                  >
                    <option value="approved">Approuvee</option>
                    <option value="rejected">Rejetee</option>
                    <option value="pending">En attente</option>
                  </select>
                  <Button
                    variant="secondary"
                    onClick={() => handleJustifyAbsence(absence.id)}
                    disabled={justifyingAbsenceId === String(absence.id)}
                  >
                    {justifyingAbsenceId === String(absence.id) ? 'Envoi...' : 'Justifier'}
                  </Button>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
        )}
        {!loading && absencesList.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[#CBD5E1] px-4 py-8 text-center text-sm text-[#64748B]">
            Aucun suivi d&apos;absence n&apos;est disponible.
          </div>
        )}
      </Card>
    </div>
  );
}

export default AbsencesTab;
