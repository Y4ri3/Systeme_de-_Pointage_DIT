import { BookMarked, IdCard, Upload, UserPlus } from 'lucide-react';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import { SkeletonList } from '../../../components/motion/Skeleton';
import { StaggerContainer, StaggerItem } from '../../../components/motion/Stagger';
import { buildDisplayName, getEntityStatus, getFileSizeErrorMessage, getProfessorPhone, getPromotionLabel } from './helpers';
import { toast } from '../../../utils/toast';

function AssociationCheckboxes({ label, items, selectedIds, onToggle, emptyLabel }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-[#0F172A]">{label}</p>
      {items.length === 0 ? (
        <p className="text-sm text-[#94A3B8]">{emptyLabel}</p>
      ) : (
        <div className="flex max-h-36 flex-wrap gap-2 overflow-y-auto rounded-xl border border-[#E2E8F0] bg-white p-3">
          {items.map((item) => {
            const itemId = String(item.id);
            const isChecked = selectedIds.includes(itemId);

            return (
              <label
                key={itemId}
                className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  isChecked
                    ? 'border-[#0C4A6E] bg-[#0C4A6E] text-white'
                    : 'border-[#E2E8F0] bg-[#F8FAFC] text-[#475569] hover:bg-white'
                }`}
              >
                <input type="checkbox" className="hidden" checked={isChecked} onChange={() => onToggle(item.id)} />
                {getPromotionLabel(item) || item.nom}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProfesseursTab({ professors }) {
  const {
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
  } = professors;

  const professorsList = professors.professors;

  return (
    <div className="space-y-6">
      <Card className="p-4 md:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-[#0F172A]">Professeurs de l&apos;organisation</h3>
            <p className="text-sm text-[#64748B]">
              Consultez, ajoutez et modifiez les professeurs de votre établissement.
            </p>
          </div>
          <div className="rounded-xl bg-[#E0F2FE] px-4 py-3 text-sm font-semibold text-[#0C4A6E]">
            {professorsList.length} professeurs
          </div>
        </div>
        <div className="mb-4 rounded-2xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h4 className="text-sm font-semibold text-[#0F172A]">Import des professeurs</h4>
              <p className="text-sm text-[#64748B]">
                Ajoutez plusieurs professeurs en une fois depuis un fichier CSV ou Excel.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="cursor-pointer rounded-xl border border-[#CBD5E1] bg-white px-4 py-2.5 text-sm font-medium text-[#0C4A6E]">
                <input
                  type="file"
                  accept=".csv,.xlsx"
                  className="hidden"
                  onChange={(event) => setProfessorImportFile(event.target.files?.[0] || null)}
                />
                {professorImportFile ? professorImportFile.name : 'Choisir un fichier'}
              </label>
              <Button
                variant="secondary"
                size="small"
                icon={Upload}
                onClick={handleProfessorImport}
                disabled={!professorImportFile || importingProfessors}
              >
                {importingProfessors ? 'Import...' : 'Importer'}
              </Button>
            </div>
          </div>
        </div>
        <Card className="p-4 md:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-[#0F172A]">Ajouter un professeur</h3>
              <p className="text-sm text-[#64748B]">Renseignez les informations du nouveau professeur.</p>
            </div>
            <UserPlus className="h-5 w-5 text-[#0C4A6E]" />
          </div>
          <form className="space-y-5" onSubmit={handleAddProfessor}>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#0F172A]">
                <IdCard className="h-4 w-4 text-[#0C4A6E]" />
                Identité
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  value={professorForm.nom}
                  onChange={(event) => setProfessorForm((current) => ({ ...current, nom: event.target.value }))}
                  placeholder="Nom"
                  className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A] outline-none focus:border-[#0C4A6E]"
                />
                <input
                  type="text"
                  value={professorForm.prenom}
                  onChange={(event) => setProfessorForm((current) => ({ ...current, prenom: event.target.value }))}
                  placeholder="Prenom"
                  className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A] outline-none focus:border-[#0C4A6E]"
                />
              </div>
              <input
                type="email"
                value={professorForm.email}
                onChange={(event) => setProfessorForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="Email"
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A] outline-none focus:border-[#0C4A6E]"
              />
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
                    setProfessorPhoto(file);
                  }}
                />
                {professorPhoto ? `Photo selectionnee : ${professorPhoto.name}` : 'Ajouter une photo (optionnelle)'}
              </label>
              {!professorPhoto && (
                <p className="text-xs text-[#94A3B8]">
                  Sans photo, ce professeur ne pourra pas utiliser le pointage par reconnaissance faciale tant
                  qu&apos;une photo n&apos;aura pas été ajoutée (le pointage par QR reste disponible).
                </p>
              )}
            </div>

            <div className="space-y-3 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#0F172A]">
                <BookMarked className="h-4 w-4 text-[#0C4A6E]" />
                Affectations pédagogiques
              </div>
              <p className="text-xs text-[#64748B]">
                Sélectionnez les matières que ce professeur enseigne et les promotions dont il a la charge. Ces
                rattachements conditionnent les cours qu&apos;il pourra se voir affecter.
              </p>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <AssociationCheckboxes
                  label="Matières enseignées"
                  items={subjects}
                  selectedIds={professorForm.matiereIds}
                  onToggle={toggleProfessorFormMatiere}
                  emptyLabel="Aucune matière disponible."
                />
                <AssociationCheckboxes
                  label="Promotions en charge"
                  items={promotions}
                  selectedIds={professorForm.promotionIds}
                  onToggle={toggleProfessorFormPromotion}
                  emptyLabel="Aucune promotion disponible."
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              icon={UserPlus}
              disabled={creatingProfessor || !professorForm.nom || !professorForm.prenom || !professorForm.email}
            >
              {creatingProfessor ? 'Création en cours...' : 'Creer le professeur'}
            </Button>
          </form>
        </Card>
        {loading ? (
          <SkeletonList count={3} variant="row" />
        ) : (
        <StaggerContainer className="space-y-3">
          {professorsList.map((professor) => (
            <StaggerItem key={professor.id} className="rounded-2xl border border-[#E2E8F0] p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-[200px] flex-1">
                  <h4 className="truncate text-base font-semibold text-[#0F172A]">{buildDisplayName(professor)}</h4>
                  <p className="mt-1 text-sm text-[#64748B]">{professor.email}</p>
                  <p className="mt-1 text-sm text-[#475569]">{getProfessorPhone(professor)}</p>
                  {(professor.matieres_enseignees?.length > 0 || professor.promotions_en_charge?.length > 0) && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(professor.matieres_enseignees || []).map((matiere) => (
                        <span key={`matiere-${matiere.id}`} className="rounded-full bg-[#E0F2FE] px-2.5 py-0.5 text-xs text-[#0C4A6E]">
                          {matiere.nom}
                        </span>
                      ))}
                      {(professor.promotions_en_charge || []).map((promotion) => (
                        <span key={`promotion-${promotion.id}`} className="rounded-full bg-[#F1F5F9] px-2.5 py-0.5 text-xs text-[#475569]">
                          {promotion.niveau || promotion.nom}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <Button variant="secondary" size="small" onClick={() => openProfessorEdit(professor)}>
                    Modifier
                  </Button>
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => handleProfessorDetail(professor.id)}
                    disabled={loadingProfessorDetailId === String(professor.id)}
                  >
                    {loadingProfessorDetailId === String(professor.id) ? 'Chargement...' : 'Voir detail'}
                  </Button>
                  <Button variant="secondary" size="small" onClick={() => handleProfessorPasswordReset(professor.id)}>
                    Reinit. mot de passe
                  </Button>
                </div>
              </div>
              {editingProfessorId === String(professor.id) && (
                <div className="mt-4 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                  <p className="text-sm font-semibold text-[#0F172A]">Modifier les informations du professeur</p>
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <input
                      type="text"
                      value={professorEditForm.nom}
                      onChange={(event) => setProfessorEditForm((current) => ({ ...current, nom: event.target.value }))}
                      placeholder="Nom"
                      className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#0F172A] outline-none focus:border-[#0C4A6E]"
                    />
                    <input
                      type="text"
                      value={professorEditForm.prenom}
                      onChange={(event) => setProfessorEditForm((current) => ({ ...current, prenom: event.target.value }))}
                      placeholder="Prenom"
                      className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#0F172A] outline-none focus:border-[#0C4A6E]"
                    />
                    <input
                      type="email"
                      value={professorEditForm.email}
                      onChange={(event) => setProfessorEditForm((current) => ({ ...current, email: event.target.value }))}
                      placeholder="Email"
                      className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#0F172A] outline-none focus:border-[#0C4A6E]"
                    />
                    <select
                      value={professorEditForm.statut}
                      onChange={(event) => setProfessorEditForm((current) => ({ ...current, statut: event.target.value }))}
                      className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#0F172A] outline-none focus:border-[#0C4A6E]"
                    >
                      <option value="Actif">Actif</option>
                      <option value="Suspendu">Suspendu</option>
                    </select>
                    <label className="block cursor-pointer rounded-xl border border-dashed border-[#CBD5E1] bg-white px-4 py-3 text-sm text-[#475569] sm:col-span-2">
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
                          setProfessorEditPhoto(file);
                        }}
                      />
                      {professorEditPhoto ? `Photo selectionnee : ${professorEditPhoto.name}` : 'Ajouter ou remplacer la photo'}
                    </label>
                    <div className="sm:col-span-2">
                      <AssociationCheckboxes
                        label="Matières enseignées"
                        items={subjects}
                        selectedIds={professorEditForm.matiereIds}
                        onToggle={toggleProfessorEditMatiere}
                        emptyLabel="Aucune matière disponible."
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <AssociationCheckboxes
                        label="Promotions en charge"
                        items={promotions}
                        selectedIds={professorEditForm.promotionIds}
                        onToggle={toggleProfessorEditPromotion}
                        emptyLabel="Aucune promotion disponible."
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <Button
                      size="small"
                      onClick={() => handleProfessorEditSave(professor.id)}
                      disabled={savingProfessorId === String(professor.id)}
                    >
                      {savingProfessorId === String(professor.id) ? 'Enregistrement...' : 'Enregistrer'}
                    </Button>
                    <Button variant="secondary" size="small" onClick={resetProfessorEdit}>
                      Annuler
                    </Button>
                  </div>
                </div>
              )}
            </StaggerItem>
          ))}
        </StaggerContainer>
        )}
        {!loading && professorsList.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[#CBD5E1] px-4 py-8 text-center text-sm text-[#64748B]">
            Aucun professeur n&apos;est disponible.
          </div>
        )}
        {selectedProfessorDetail && (
          <div className="mt-3 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
            <p className="text-sm font-semibold text-[#0F172A]">Fiche détaillée du professeur</p>
            <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-[#475569] sm:grid-cols-2">
              <p>Nom : {buildDisplayName(selectedProfessorDetail)}</p>
              <p>Email : {selectedProfessorDetail.email || 'Non renseigne'}</p>
              <p>Telephone : {getProfessorPhone(selectedProfessorDetail)}</p>
              <p>Statut : {getEntityStatus(selectedProfessorDetail)}</p>
              <p className="sm:col-span-2">
                Matières :{' '}
                {(selectedProfessorDetail.matieres_enseignees || []).map((matiere) => matiere.nom).join(', ') ||
                  'Aucune matière rattachée'}
              </p>
              <p className="sm:col-span-2">
                Promotions :{' '}
                {(selectedProfessorDetail.promotions_en_charge || [])
                  .map((promotion) => promotion.niveau || promotion.nom)
                  .join(', ') || 'Aucune promotion rattachée'}
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

export default ProfesseursTab;
