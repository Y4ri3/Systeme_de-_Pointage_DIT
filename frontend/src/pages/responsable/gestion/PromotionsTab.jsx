import { GraduationCap, Layers, Pencil, Plus, Trash2, X } from 'lucide-react';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import { SkeletonList } from '../../../components/motion/Skeleton';
import { StaggerContainer, StaggerItem } from '../../../components/motion/Stagger';
import { getFiliereLabel, getPromotionLabel } from './helpers';
import { useConfirm } from '../../../contexts/ConfirmContext';

function PromotionsTab({ promotions }) {
  const confirm = useConfirm();
  const {
    loading,
    promotions: promotionsList,
    filieres,
    promotionForm,
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
  } = promotions;

  const confirmDeletePromotion = async (promotion) => {
    const confirmed = await confirm({
      title: 'Supprimer cette promotion ?',
      message: `"${getPromotionLabel(promotion)}" sera définitivement supprimée, avec les cours qui lui sont rattachés. Cette action est irréversible.`,
      confirmLabel: 'Supprimer'
    });
    if (confirmed) handleDeletePromotion(promotion.id);
  };

  const confirmDeleteFiliere = async (filiere) => {
    const confirmed = await confirm({
      title: 'Supprimer cette filière ?',
      message: `"${getFiliereLabel(filiere)}" sera définitivement supprimée. Cette action est irréversible.`,
      confirmLabel: 'Supprimer'
    });
    if (confirmed) handleDeleteFiliere(filiere.id);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-2xl font-bold text-[#0F172A]">{promotionStats.total}</p>
          <p className="text-sm text-[#64748B]">Promotions actives</p>
        </Card>
        <Card className="p-5">
          <p className="text-2xl font-bold text-[#0F172A]">{promotionStats.effectif}</p>
          <p className="text-sm text-[#64748B]">Etudiants rattaches</p>
        </Card>
        <Card className="p-5">
          <p className="text-2xl font-bold text-[#0F172A]">{promotionStats.filieres}</p>
          <p className="text-sm text-[#64748B]">Filières</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        {loading ? (
          <SkeletonList count={2} variant="card" />
        ) : (
        <StaggerContainer className="space-y-4">
          {promotionsList.map((promotion) => (
            <StaggerItem key={promotion.id}>
            <Card className="p-4 md:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold text-[#0F172A]">{getPromotionLabel(promotion)}</h3>
                  <p className="mt-1 text-sm text-[#64748B]">{getFiliereLabel(promotion.filiere)}</p>
                  <p className="mt-1 text-xs text-[#94A3B8]">{promotion.annee_academique}</p>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-[#F8FAFC] px-4 py-3">
                      <p className="text-xs text-[#64748B]">Étudiants</p>
                      <p className="mt-1 text-lg font-semibold text-[#0F172A]">{promotion.nombre_etudiants ?? 0}</p>
                    </div>
                    <div className="rounded-xl bg-[#F8FAFC] px-4 py-3">
                      <p className="text-xs text-[#64748B]">Cours</p>
                      <p className="mt-1 text-lg font-semibold text-[#0F172A]">{promotion.nombre_cours ?? 0}</p>
                    </div>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="small"
                  icon={Trash2}
                  disabled={deletingPromotionId === String(promotion.id)}
                  onClick={() => confirmDeletePromotion(promotion)}
                >
                  {deletingPromotionId === String(promotion.id) ? 'Suppression...' : 'Supprimer'}
                </Button>
              </div>
            </Card>
            </StaggerItem>
          ))}
        </StaggerContainer>
        )}
        {!loading && promotionsList.length === 0 && (
          <Card className="p-6 text-center text-sm text-[#64748B]">Aucune promotion n&apos;est disponible.</Card>
        )}

        <Card className="p-4 md:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-[#0F172A]">Ajouter une promotion</h3>
              <p className="text-sm text-[#64748B]">Structurez les cohortes par niveau et filière.</p>
            </div>
            <GraduationCap className="h-5 w-5 text-[#0C4A6E]" />
          </div>
          <form className="space-y-3" onSubmit={handleAddPromotion}>
            <input
              type="text"
              value={promotionForm.niveau}
              onChange={(event) => setPromotionForm((current) => ({ ...current, niveau: event.target.value }))}
              placeholder="Niveau (ex. L1, M2)"
              className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A] outline-none focus:border-[#0C4A6E]"
            />
            <input
              type="text"
              value={promotionForm.annee_academique}
              onChange={(event) =>
                setPromotionForm((current) => ({ ...current, annee_academique: event.target.value }))
              }
              placeholder="Année académique (ex. 2025-2026)"
              className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A] outline-none focus:border-[#0C4A6E]"
            />
            <select
              value={promotionForm.filiere_id}
              onChange={(event) => setPromotionForm((current) => ({ ...current, filiere_id: event.target.value }))}
              className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A] outline-none focus:border-[#0C4A6E]"
            >
              <option value="">Sélectionner une filière</option>
              {filieres.map((filiere) => (
                <option key={filiere.id} value={filiere.id}>
                  {getFiliereLabel(filiere)}
                </option>
              ))}
            </select>
            <Button
              type="submit"
              className="w-full"
              icon={Plus}
              disabled={
                creatingPromotion ||
                !promotionForm.niveau.trim() ||
                !promotionForm.annee_academique.trim() ||
                !promotionForm.filiere_id
              }
            >
              {creatingPromotion ? 'Creation...' : 'Creer la promotion'}
            </Button>
          </form>
        </Card>
      </div>

      <Card className="p-4 md:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-[#0F172A]">Filières</h3>
            <p className="text-sm text-[#64748B]">Gérez la liste des filières utilisées pour les promotions.</p>
          </div>
          <Layers className="h-5 w-5 text-[#0C4A6E]" />
        </div>
        <form className="mb-4 flex flex-col gap-2 sm:flex-row" onSubmit={handleAddFiliere}>
          <input
            type="text"
            value={filiereForm.nom}
            onChange={(event) => setFiliereForm({ nom: event.target.value })}
            placeholder="Nom de la filière"
            className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A] outline-none focus:border-[#0C4A6E]"
          />
          <Button type="submit" size="small" icon={Plus} disabled={creatingFiliere} className="sm:w-auto">
            {creatingFiliere ? 'Ajout...' : 'Ajouter'}
          </Button>
        </form>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {filieres.map((filiere) =>
            editingFiliereId === String(filiere.id) ? (
              <div key={filiere.id} className="flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-2">
                <input
                  type="text"
                  value={filiereEditName}
                  onChange={(event) => setFiliereEditName(event.target.value)}
                  className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none focus:border-[#0C4A6E]"
                />
                <Button
                  size="small"
                  onClick={() => handleFiliereEditSave(filiere.id)}
                  disabled={savingFiliereId === String(filiere.id)}
                >
                  {savingFiliereId === String(filiere.id) ? '...' : 'OK'}
                </Button>
                <Button variant="secondary" size="small" icon={X} onClick={resetFiliereEdit} />
              </div>
            ) : (
              <div key={filiere.id} className="flex items-center justify-between gap-2 rounded-xl border border-[#E2E8F0] p-3">
                <span className="truncate text-sm text-[#0F172A]">{getFiliereLabel(filiere)}</span>
                <div className="flex flex-shrink-0 gap-1.5">
                  <Button variant="secondary" size="small" icon={Pencil} onClick={() => openFiliereEdit(filiere)} />
                  <Button
                    variant="secondary"
                    size="small"
                    icon={Trash2}
                    onClick={() => confirmDeleteFiliere(filiere)}
                    disabled={deletingFiliereId === String(filiere.id)}
                  />
                </div>
              </div>
            )
          )}
          {filieres.length === 0 && (
            <p className="text-center text-sm text-[#64748B] sm:col-span-2">Aucune filière n&apos;est disponible.</p>
          )}
        </div>
      </Card>
    </div>
  );
}

export default PromotionsTab;
