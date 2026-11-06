import { AlertTriangle, Building2, Clock3, Mail, Save } from 'lucide-react';
import Card from '../../../components/Card';
import Button from '../../../components/Button';

function ParametresTab({ settings }) {
  const { settings: settingsData, setSettings, saving, handleSettingsSave, handleSettingsReset } = settings;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#E0F2FE]">
            <Building2 className="h-5 w-5 text-[#0C4A6E]" />
          </div>
          <p className="text-sm text-[#64748B]">Etablissement</p>
          <p className="mt-1 text-base font-semibold text-[#0F172A]">{settingsData.nom_etablissement || 'Non renseigne'}</p>
        </Card>
        <Card className="p-5">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#FEE2E2]">
            <AlertTriangle className="h-5 w-5 text-[#DC2626]" />
          </div>
          <p className="text-sm text-[#64748B]">Seuil d&apos;absences</p>
          <p className="mt-1 text-base font-semibold text-[#0F172A]">{settingsData.seuil_absences}</p>
        </Card>
        <Card className="p-5">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#FEF3C7]">
            <Clock3 className="h-5 w-5 text-[#F59E0B]" />
          </div>
          <p className="text-sm text-[#64748B]">Tolerance retard par defaut</p>
          <p className="mt-1 text-base font-semibold text-[#0F172A]">{settingsData.tolerance_retard_minutes_defaut} min</p>
        </Card>
      </div>

      <Card className="p-4 md:p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-[#0F172A]">Regles globales</h3>
          <p className="mt-1 text-sm text-[#64748B]">
            Ces valeurs prennent effet immédiatement : le seuil d&apos;absences recalcule
            aussitôt tous les suivis existants, et la tolérance de retard sert de valeur par défaut à la
            creation d&apos;un cours quand elle n&apos;est pas precisee.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <label className="block text-sm font-medium text-[#0F172A]">
              Nom de l&apos;etablissement
              <input
                type="text"
                value={settingsData.nom_etablissement || ''}
                onChange={(event) => setSettings((current) => ({ ...current, nom_etablissement: event.target.value }))}
                className="mt-2 w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A] outline-none focus:border-[#0C4A6E]"
              />
            </label>
            <label className="block text-sm font-medium text-[#0F172A]">
              Email de contact support
              <div className="relative mt-2">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  type="email"
                  value={settingsData.contact_support_email || ''}
                  onChange={(event) =>
                    setSettings((current) => ({ ...current, contact_support_email: event.target.value }))
                  }
                  placeholder="support@etablissement.edu"
                  className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] py-3 pl-9 pr-4 text-sm text-[#0F172A] outline-none focus:border-[#0C4A6E]"
                />
              </div>
            </label>
          </div>
          <div className="space-y-3">
            <label className="block text-sm font-medium text-[#0F172A]">
              Seuil d&apos;absences (nombre)
              <input
                type="number"
                min="0"
                value={settingsData.seuil_absences}
                onChange={(event) =>
                  setSettings((current) => ({ ...current, seuil_absences: Number(event.target.value) || 0 }))
                }
                className="mt-2 w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A] outline-none focus:border-[#0C4A6E]"
              />
            </label>
            <label className="block text-sm font-medium text-[#0F172A]">
              Tolerance de retard par defaut (minutes)
              <input
                type="number"
                min="0"
                value={settingsData.tolerance_retard_minutes_defaut}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    tolerance_retard_minutes_defaut: Number(event.target.value) || 0
                  }))
                }
                className="mt-2 w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A] outline-none focus:border-[#0C4A6E]"
              />
            </label>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button className="sm:w-auto" icon={Save} onClick={handleSettingsSave} disabled={saving}>
            {saving ? 'Enregistrement...' : 'Enregistrer les parametres'}
          </Button>
          <Button variant="secondary" className="sm:w-auto" onClick={handleSettingsReset}>
            Reinitialiser
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default ParametresTab;
