import { Bell, Plus, Search, Upload, UserPlus, Users } from 'lucide-react';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import { SkeletonList } from '../../../components/motion/Skeleton';
import { StaggerContainer } from '../../../components/motion/Stagger';
import StudentRow from './StudentRow';
import { getFileSizeErrorMessage, getPromotionLabel } from './helpers';
import { toast } from '../../../utils/toast';

const EMPTY_STUDENT_EDIT_FORM = { nom: '', prenom: '', email: '', statut: 'Actif', promotion_id: '' };

function EtudiantsTab({ students, promotions, promotionOptions, navigate }) {
  const {
    loading,
    filteredStudents,
    studentStats,
    studentSearch,
    setStudentSearch,
    studentPromotionFilter,
    setStudentPromotionFilter,
    studentForm,
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
  } = students;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card className="p-5">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#E0F2FE]">
            <Users className="h-5 w-5 text-[#0C4A6E]" />
          </div>
          <p className="text-2xl font-bold text-[#0F172A]">{studentStats.total}</p>
          <p className="text-sm text-[#64748B]">Etudiants repertories</p>
        </Card>
        <Card className="p-5">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#D1FAE5]">
            <UserPlus className="h-5 w-5 text-[#10B981]" />
          </div>
          <p className="text-2xl font-bold text-[#0F172A]">{studentStats.actifs}</p>
          <p className="text-sm text-[#64748B]">Comptes actifs</p>
        </Card>
        <Card className="p-5">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#FEF3C7]">
            <Bell className="h-5 w-5 text-[#F59E0B]" />
          </div>
          <p className="text-2xl font-bold text-[#0F172A]">{studentStats.surveillance}</p>
          <p className="text-sm text-[#64748B]">Sous surveillance</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="p-4 md:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-[#0F172A]">Ajouter un etudiant</h3>
              <p className="text-sm text-[#64748B]">Renseignez les informations du nouvel étudiant.</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E0F2FE]">
              <Plus className="h-5 w-5 text-[#0C4A6E]" />
            </div>
          </div>
          <form className="space-y-3" onSubmit={handleAddStudent}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                type="text"
                value={studentForm.nom}
                onChange={(event) => setStudentForm((current) => ({ ...current, nom: event.target.value }))}
                placeholder="Nom"
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A] outline-none focus:border-[#0C4A6E]"
              />
              <input
                type="text"
                value={studentForm.prenom}
                onChange={(event) => setStudentForm((current) => ({ ...current, prenom: event.target.value }))}
                placeholder="Prenom"
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A] outline-none focus:border-[#0C4A6E]"
              />
            </div>
            <input
              type="email"
              value={studentForm.email}
              onChange={(event) => setStudentForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="Email"
              className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A] outline-none focus:border-[#0C4A6E]"
            />
            <select
              value={studentForm.promotion}
              onChange={(event) => setStudentForm((current) => ({ ...current, promotion: event.target.value }))}
              className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A] outline-none focus:border-[#0C4A6E]"
            >
              {promotions.map((promotion) => (
                <option key={promotion.id} value={promotion.id}>
                  {getPromotionLabel(promotion)}
                </option>
              ))}
            </select>
            <label className="block cursor-pointer rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-4 py-3 text-sm text-[#475569]">
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0] || null;
                  const sizeError = getFileSizeErrorMessage(file, 'Cette photo');
                  if (sizeError) {
                    toast.error(sizeError);
                    event.target.value = '';
                    return;
                  }
                  setStudentPhoto(file);
                }}
              />
              {studentPhoto ? `Photo selectionnee : ${studentPhoto.name}` : "Ajouter une photo d'identité (optionnel)"}
            </label>
            {!studentPhoto && (
              <p className="text-xs text-[#94A3B8]">
                Sans photo, cet étudiant ne pourra pas utiliser le pointage par reconnaissance faciale tant
                qu&apos;une photo n&apos;aura pas été ajoutée (le pointage par QR reste disponible).
              </p>
            )}
            <Button
              type="submit"
              className="w-full"
              icon={UserPlus}
              disabled={creatingStudent || !studentForm.nom.trim() || !studentForm.prenom.trim() || !studentForm.email.trim()}
            >
              {creatingStudent ? 'Création en cours...' : "Ajouter l'etudiant"}
            </Button>
          </form>
        </Card>

        <Card className="p-4 md:p-6">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-[#0F172A]">Organisation des etudiants</h3>
              <p className="text-sm text-[#64748B]">Retrouvez, filtrez et mettez a jour les statuts.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="relative min-w-0 sm:min-w-[240px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(event) => setStudentSearch(event.target.value)}
                  placeholder="Nom ou numero"
                  className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] py-2.5 pl-9 pr-4 text-sm text-[#0F172A] outline-none focus:border-[#0C4A6E]"
                />
              </div>
              <select
                value={studentPromotionFilter}
                onChange={(event) => setStudentPromotionFilter(event.target.value)}
                className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-2.5 text-sm text-[#0F172A] outline-none focus:border-[#0C4A6E]"
              >
                {promotionOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === 'toutes' ? 'Toutes les promotions' : option}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {loading ? (
            <SkeletonList count={3} variant="row" />
          ) : (
          <StaggerContainer className="space-y-3">
            {filteredStudents.map((student) => {
              const isEditing = editingStudentId === String(student.id);
              const isSaving = savingStudentId === String(student.id);

              return (
                <StudentRow
                  key={student.id}
                  student={student}
                  promotions={promotions}
                  isEditing={isEditing}
                  editForm={isEditing ? studentEditForm : EMPTY_STUDENT_EDIT_FORM}
                  setEditForm={setStudentEditForm}
                  editPhoto={isEditing ? studentEditPhoto : null}
                  setEditPhoto={setStudentEditPhoto}
                  isSaving={isSaving}
                  onOpenEdit={openStudentEdit}
                  onResetEdit={resetStudentEdit}
                  onSaveEdit={handleStudentEditSave}
                  onPasswordReset={handleStudentPasswordReset}
                  onToggleStatus={handleToggleStudentStatus}
                  navigate={navigate}
                />
              );
            })}
          </StaggerContainer>
          )}
          {!loading && filteredStudents.length === 0 && (
            <div className="rounded-2xl border border-dashed border-[#CBD5E1] px-4 py-8 text-center text-sm text-[#64748B]">
              Aucun etudiant ne correspond aux filtres en cours.
            </div>
          )}
          <div className="mt-6 rounded-2xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h4 className="text-sm font-semibold text-[#0F172A]">Import en masse</h4>
                <p className="text-sm text-[#64748B]">Ajoutez plusieurs étudiants en une fois depuis un fichier CSV ou Excel.</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <label className="cursor-pointer rounded-xl border border-[#CBD5E1] bg-white px-4 py-2.5 text-sm font-medium text-[#0C4A6E]">
                  <input
                    type="file"
                    accept=".csv,.xlsx"
                    className="hidden"
                    onChange={(event) => setStudentImportFile(event.target.files?.[0] || null)}
                  />
                  {studentImportFile ? studentImportFile.name : 'Choisir un fichier'}
                </label>
                <Button
                  variant="secondary"
                  size="small"
                  icon={Upload}
                  onClick={handleStudentImport}
                  disabled={!studentImportFile || importingStudents}
                >
                  {importingStudents ? 'Import...' : 'Importer'}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default EtudiantsTab;
