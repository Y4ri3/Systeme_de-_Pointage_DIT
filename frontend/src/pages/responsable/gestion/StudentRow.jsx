import { memo } from 'react';
import { ChevronRight } from 'lucide-react';
import Button from '../../../components/Button';
import { StaggerItem } from '../../../components/motion/Stagger';
import { buildDisplayName, getEntityStatus, getFileSizeErrorMessage, getPromotionLabel, getStudentIdentifier, getStudentPromotionLabel, isActiveStatus } from './helpers';
import { getPhotoUrl } from '../../../utils/api';
import { toast } from '../../../utils/toast';

function StudentRow({
  student,
  promotions,
  isEditing,
  editForm,
  setEditForm,
  editPhoto,
  setEditPhoto,
  isSaving,
  onOpenEdit,
  onResetEdit,
  onSaveEdit,
  onPasswordReset,
  onToggleStatus,
  navigate
}) {
  return (
    <StaggerItem className="rounded-2xl border border-[#E2E8F0] p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-[220px] flex-1 items-center gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#0C4A6E] text-sm font-semibold text-white">
            {student.photo_url ? (
              <img src={getPhotoUrl(student.photo_url)} alt="" className="h-full w-full object-cover" />
            ) : (
              student.prenom?.charAt(0) || student.nom?.charAt(0) || '?'
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="truncate text-sm font-semibold text-[#0F172A]">{buildDisplayName(student)}</h4>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  isActiveStatus(getEntityStatus(student)) ? 'bg-[#D1FAE5] text-[#10B981]' : 'bg-[#FEF3C7] text-[#B45309]'
                }`}
              >
                {getEntityStatus(student)}
              </span>
            </div>
            <p className="mt-1 text-sm text-[#64748B]">{getStudentIdentifier(student)}</p>
            <p className="mt-1 text-sm text-[#475569]">{getStudentPromotionLabel(student)}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Button variant="secondary" size="small" onClick={() => onOpenEdit(student)}>
            Modifier
          </Button>
          <Button variant="secondary" size="small" onClick={() => onPasswordReset(student.id)}>
            Reinit. mot de passe
          </Button>
          <Button
            variant="secondary"
            size="small"
            onClick={() => onToggleStatus(student.id)}
            disabled={isSaving}
          >
            {isSaving
              ? 'Mise a jour...'
              : isActiveStatus(getEntityStatus(student))
                ? 'Basculer en surveillance'
                : 'Repasser actif'}
          </Button>
          <Button size="small" onClick={() => navigate(`/responsable/etudiant/${student.id}`)} icon={ChevronRight}>
            Ouvrir la fiche
          </Button>
        </div>
      </div>
      {isEditing && (
        <div className="mt-4 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
          <p className="text-sm font-semibold text-[#0F172A]">Modifier la fiche étudiant</p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              type="text"
              value={editForm.nom}
              onChange={(event) => setEditForm((current) => ({ ...current, nom: event.target.value }))}
              placeholder="Nom"
              className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#0F172A] outline-none focus:border-[#0C4A6E]"
            />
            <input
              type="text"
              value={editForm.prenom}
              onChange={(event) => setEditForm((current) => ({ ...current, prenom: event.target.value }))}
              placeholder="Prenom"
              className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#0F172A] outline-none focus:border-[#0C4A6E]"
            />
            <input
              type="email"
              value={editForm.email}
              onChange={(event) => setEditForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="Email"
              className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#0F172A] outline-none focus:border-[#0C4A6E]"
            />
            <select
              value={editForm.statut}
              onChange={(event) => setEditForm((current) => ({ ...current, statut: event.target.value }))}
              className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#0F172A] outline-none focus:border-[#0C4A6E]"
            >
              <option value="Actif">Actif</option>
              <option value="Sous surveillance">Sous surveillance</option>
            </select>
            <select
              value={editForm.promotion_id}
              onChange={(event) => setEditForm((current) => ({ ...current, promotion_id: event.target.value }))}
              className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#0F172A] outline-none focus:border-[#0C4A6E]"
            >
              <option value="">Conserver la promotion actuelle</option>
              {promotions.map((promotion) => (
                <option key={promotion.id} value={promotion.id}>
                  {getPromotionLabel(promotion)}
                </option>
              ))}
            </select>
            <label className="block cursor-pointer rounded-xl border border-dashed border-[#CBD5E1] bg-white px-4 py-3 text-sm text-[#475569]">
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
                  setEditPhoto(file);
                }}
              />
              {editPhoto ? `Photo selectionnee : ${editPhoto.name}` : 'Ajouter ou remplacer la photo'}
            </label>
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Button size="small" onClick={() => onSaveEdit(student.id)} disabled={isSaving}>
              {isSaving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
            <Button variant="secondary" size="small" onClick={onResetEdit}>
              Annuler
            </Button>
          </div>
        </div>
      )}
    </StaggerItem>
  );
}

export default memo(StudentRow);
