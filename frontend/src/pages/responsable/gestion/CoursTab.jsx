import { BookOpen, CalendarDays, Download, MapPin, Pencil, Plus, Trash2, X } from 'lucide-react';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import { StaggerContainer, StaggerItem } from '../../../components/motion/Stagger';
import { buildDisplayName, getCourseName, getCourseProfessorLabel, getCoursePromotionLabel, getCourseRoomLabel, getCourseScheduleLabel, getPromotionLabel } from './helpers';
import { useConfirm } from '../../../contexts/ConfirmContext';

function CoursTab({ courses, promotions }) {
  const confirm = useConfirm();
  const {
    courses: coursesList,
    subjects,
    rooms,
    courseForm,
    setCourseForm,
    eligibleProfessors,
    creatingCourse,
    courseConflicts,
    courseStats,
    selectedCourseDetail,
    loadingCourseDetailId,
    exportingCourseId,
    handleAddCourse,
    handleCourseDetail,
    handleCourseAttendanceExport,
    subjectForm,
    setSubjectForm,
    creatingSubject,
    editingSubjectId,
    subjectEditName,
    setSubjectEditName,
    savingSubjectId,
    deletingSubjectId,
    openSubjectEdit,
    resetSubjectEdit,
    handleAddSubject,
    handleSubjectEditSave,
    handleDeleteSubject,
    roomForm,
    setRoomForm,
    creatingRoom,
    editingRoomId,
    roomEditName,
    setRoomEditName,
    savingRoomId,
    deletingRoomId,
    openRoomEdit,
    resetRoomEdit,
    handleAddRoom,
    handleRoomEditSave,
    handleDeleteRoom
  } = courses;

  const hasSubjectAndPromotion = Boolean(courseForm.subjectId && courseForm.promotionId);

  const confirmDeleteSubject = async (subject) => {
    const confirmed = await confirm({
      title: 'Supprimer cette matière ?',
      message: `"${subject.nom}" sera définitivement supprimée. Cette action est irréversible.`,
      confirmLabel: 'Supprimer'
    });
    if (confirmed) handleDeleteSubject(subject.id);
  };

  const confirmDeleteRoom = async (room) => {
    const confirmed = await confirm({
      title: 'Supprimer cette salle ?',
      message: `"${room.nom}" sera définitivement supprimée. Cette action est irréversible.`,
      confirmLabel: 'Supprimer'
    });
    if (confirmed) handleDeleteRoom(room.id);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card className="p-5">
          <p className="text-2xl font-bold text-[#0F172A]">{courseStats.total}</p>
          <p className="text-sm text-[#64748B]">Cours planifies</p>
        </Card>
        <Card className="p-5">
          <p className="text-2xl font-bold text-[#0F172A]">{courseStats.promotions}</p>
          <p className="text-sm text-[#64748B]">Promotions couvertes</p>
        </Card>
        <Card className="p-5">
          <p className="text-2xl font-bold text-[#0F172A]">{courseStats.salles}</p>
          <p className="text-sm text-[#64748B]">Salles mobilisees</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="p-4 md:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-[#0F172A]">Planifier un cours</h3>
              <p className="text-sm text-[#64748B]">Ajoutez une seance visible par les professeurs et les etudiants.</p>
            </div>
            <CalendarDays className="h-5 w-5 text-[#0C4A6E]" />
          </div>
          <form className="space-y-3" onSubmit={handleAddCourse}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <select
                value={courseForm.subjectId}
                onChange={(event) => setCourseForm((current) => ({ ...current, subjectId: event.target.value }))}
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A] outline-none focus:border-[#0C4A6E]"
              >
                <option value="">Selectionner une matiere</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.nom}
                  </option>
                ))}
              </select>
              <select
                value={courseForm.roomId}
                onChange={(event) => setCourseForm((current) => ({ ...current, roomId: event.target.value }))}
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A] outline-none focus:border-[#0C4A6E]"
              >
                <option value="">Selectionner une salle</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.nom}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <select
                  value={courseForm.professorId}
                  onChange={(event) => setCourseForm((current) => ({ ...current, professorId: event.target.value }))}
                  className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A] outline-none focus:border-[#0C4A6E]"
                >
                  <option value="">Selectionner un professeur</option>
                  {eligibleProfessors.map((professor) => (
                    <option key={professor.id} value={professor.id}>
                      {buildDisplayName(professor)}
                    </option>
                  ))}
                </select>
                {hasSubjectAndPromotion && eligibleProfessors.length === 0 && (
                  <p className="mt-1.5 text-xs text-[#DC2626]">
                    Aucun professeur n&apos;est rattache a cette matiere et cette promotion. Modifiez ses
                    rattachements depuis l&apos;onglet Professeurs.
                  </p>
                )}
              </div>
              <select
                value={courseForm.promotionId}
                onChange={(event) => setCourseForm((current) => ({ ...current, promotionId: event.target.value }))}
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A] outline-none focus:border-[#0C4A6E]"
              >
                {promotions.map((promotion) => (
                  <option key={promotion.id} value={promotion.id}>
                    {getPromotionLabel(promotion)}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                type="date"
                value={courseForm.date}
                onChange={(event) => setCourseForm((current) => ({ ...current, date: event.target.value }))}
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A] outline-none focus:border-[#0C4A6E]"
              />
              <input
                type="number"
                min="0"
                value={courseForm.toleranceRetardMinutes}
                onChange={(event) => setCourseForm((current) => ({ ...current, toleranceRetardMinutes: event.target.value }))}
                placeholder="Tolerance retard"
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A] outline-none focus:border-[#0C4A6E]"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                type="time"
                value={courseForm.startTime}
                onChange={(event) => setCourseForm((current) => ({ ...current, startTime: event.target.value }))}
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A] outline-none focus:border-[#0C4A6E]"
              />
              <input
                type="time"
                value={courseForm.endTime}
                onChange={(event) => setCourseForm((current) => ({ ...current, endTime: event.target.value }))}
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A] outline-none focus:border-[#0C4A6E]"
              />
            </div>
            {courseConflicts.length > 0 && (
              <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3">
                <p className="text-sm font-semibold text-[#DC2626]">Ce creneau est deja pris :</p>
                <ul className="mt-2 space-y-1 text-sm text-[#7F1D1D]">
                  {courseConflicts.map((conflict, index) => (
                    <li key={conflict.cours_id || index}>
                      Cours #{conflict.cours_id ?? '?'}
                      {' — '}
                      {Array.isArray(conflict.ressources)
                        ? conflict.ressources.join(', ')
                        : conflict.ressource || conflict.ressources || 'ressource en conflit'}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Button type="submit" className="w-full" icon={CalendarDays} disabled={creatingCourse}>
              {creatingCourse ? 'Creation...' : 'Ajouter au planning'}
            </Button>
          </form>
        </Card>

        <Card className="p-4 md:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-[#0F172A]">Planning consolide</h3>
              <p className="text-sm text-[#64748B]">Vision partagee des cours ouverts au pointage.</p>
            </div>
            <BookOpen className="h-5 w-5 text-[#0C4A6E]" />
          </div>
          <StaggerContainer className="space-y-3">
            {coursesList.map((course) => (
              <StaggerItem key={course.id} className="rounded-2xl border border-[#E2E8F0] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-[200px] flex-1">
                    <h4 className="truncate text-base font-semibold text-[#0F172A]">{getCourseName(course)}</h4>
                    <p className="mt-1 text-sm text-[#64748B]">{getCourseProfessorLabel(course)}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-[#F8FAFC] px-3 py-1 text-[#475569]">{getCoursePromotionLabel(course)}</span>
                      <span className="rounded-full bg-[#F8FAFC] px-3 py-1 text-[#475569]">{getCourseRoomLabel(course)}</span>
                      <span className="rounded-full bg-[#F8FAFC] px-3 py-1 text-[#475569]">{getCourseScheduleLabel(course)}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <Button
                      variant="secondary"
                      size="small"
                      disabled={loadingCourseDetailId === String(course.id)}
                      onClick={() => handleCourseDetail(course.id)}
                    >
                      {loadingCourseDetailId === String(course.id) ? 'Chargement...' : 'Voir detail'}
                    </Button>
                    <Button
                      variant="secondary"
                      size="small"
                      icon={Download}
                      disabled={exportingCourseId === `${course.id}-csv`}
                      onClick={() => handleCourseAttendanceExport(course.id, 'csv')}
                    >
                      {exportingCourseId === `${course.id}-csv` ? 'Export...' : 'Presences CSV'}
                    </Button>
                    <Button
                      variant="secondary"
                      size="small"
                      icon={Download}
                      disabled={exportingCourseId === `${course.id}-xlsx`}
                      onClick={() => handleCourseAttendanceExport(course.id, 'xlsx')}
                    >
                      {exportingCourseId === `${course.id}-xlsx` ? 'Export...' : 'Presences XLSX'}
                    </Button>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
          {selectedCourseDetail && (
            <div className="mt-3 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
              <p className="text-sm font-semibold text-[#0F172A]">Détails du cours</p>
              <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-[#475569] sm:grid-cols-2">
                <p>Nom : {getCourseName(selectedCourseDetail)}</p>
                <p>Promotion : {getCoursePromotionLabel(selectedCourseDetail)}</p>
                <p>Professeur : {getCourseProfessorLabel(selectedCourseDetail)}</p>
                <p>Salle : {getCourseRoomLabel(selectedCourseDetail)}</p>
              </div>
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="p-4 md:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-[#0F172A]">Matières</h3>
              <p className="text-sm text-[#64748B]">Gérez la liste des matières proposées à la planification.</p>
            </div>
            <BookOpen className="h-5 w-5 text-[#0C4A6E]" />
          </div>
          <form className="mb-4 space-y-2" onSubmit={handleAddSubject}>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[2fr_1fr_1fr]">
              <input
                type="text"
                value={subjectForm.nom}
                onChange={(event) => setSubjectForm((current) => ({ ...current, nom: event.target.value }))}
                placeholder="Nom de la matière"
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A] outline-none focus:border-[#0C4A6E]"
              />
              <input
                type="text"
                value={subjectForm.code}
                onChange={(event) => setSubjectForm((current) => ({ ...current, code: event.target.value }))}
                placeholder="Code (ex. BD-101)"
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A] outline-none focus:border-[#0C4A6E]"
              />
              <input
                type="number"
                min="0"
                value={subjectForm.credits}
                onChange={(event) => setSubjectForm((current) => ({ ...current, credits: event.target.value }))}
                placeholder="Crédits"
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A] outline-none focus:border-[#0C4A6E]"
              />
            </div>
            <Button
              type="submit"
              size="small"
              icon={Plus}
              disabled={creatingSubject || !subjectForm.nom.trim() || !subjectForm.code.trim()}
              className="w-full sm:w-auto"
            >
              {creatingSubject ? 'Ajout...' : 'Ajouter la matière'}
            </Button>
          </form>
          <div className="space-y-2">
            {subjects.map((subject) =>
              editingSubjectId === String(subject.id) ? (
                <div key={subject.id} className="flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-2">
                  <input
                    type="text"
                    value={subjectEditName}
                    onChange={(event) => setSubjectEditName(event.target.value)}
                    className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none focus:border-[#0C4A6E]"
                  />
                  <Button
                    size="small"
                    onClick={() => handleSubjectEditSave(subject.id)}
                    disabled={savingSubjectId === String(subject.id)}
                  >
                    {savingSubjectId === String(subject.id) ? '...' : 'OK'}
                  </Button>
                  <Button variant="secondary" size="small" icon={X} onClick={resetSubjectEdit} />
                </div>
              ) : (
                <div key={subject.id} className="flex items-center justify-between gap-2 rounded-xl border border-[#E2E8F0] p-3">
                  <span className="truncate text-sm text-[#0F172A]">{subject.nom}</span>
                  <div className="flex flex-shrink-0 gap-1.5">
                    <Button variant="secondary" size="small" icon={Pencil} onClick={() => openSubjectEdit(subject)} />
                    <Button
                      variant="secondary"
                      size="small"
                      icon={Trash2}
                      onClick={() => confirmDeleteSubject(subject)}
                      disabled={deletingSubjectId === String(subject.id)}
                    />
                  </div>
                </div>
              )
            )}
            {subjects.length === 0 && (
              <p className="text-center text-sm text-[#64748B]">Aucune matière n&apos;est disponible.</p>
            )}
          </div>
        </Card>

        <Card className="p-4 md:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-[#0F172A]">Salles</h3>
              <p className="text-sm text-[#64748B]">Gérez la liste des salles disponibles pour les cours.</p>
            </div>
            <MapPin className="h-5 w-5 text-[#0C4A6E]" />
          </div>
          <form className="mb-4 space-y-2" onSubmit={handleAddRoom}>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                type="text"
                value={roomForm.nom}
                onChange={(event) => setRoomForm((current) => ({ ...current, nom: event.target.value }))}
                placeholder="Nom de la salle"
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A] outline-none focus:border-[#0C4A6E]"
              />
              <input
                type="text"
                value={roomForm.batiment}
                onChange={(event) => setRoomForm((current) => ({ ...current, batiment: event.target.value }))}
                placeholder="Bâtiment (optionnel)"
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A] outline-none focus:border-[#0C4A6E]"
              />
            </div>
            <Button
              type="submit"
              size="small"
              icon={Plus}
              disabled={creatingRoom || !roomForm.nom.trim()}
              className="w-full sm:w-auto"
            >
              {creatingRoom ? 'Ajout...' : 'Ajouter la salle'}
            </Button>
          </form>
          <div className="space-y-2">
            {rooms.map((room) =>
              editingRoomId === String(room.id) ? (
                <div key={room.id} className="flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-2">
                  <input
                    type="text"
                    value={roomEditName}
                    onChange={(event) => setRoomEditName(event.target.value)}
                    className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none focus:border-[#0C4A6E]"
                  />
                  <Button size="small" onClick={() => handleRoomEditSave(room.id)} disabled={savingRoomId === String(room.id)}>
                    {savingRoomId === String(room.id) ? '...' : 'OK'}
                  </Button>
                  <Button variant="secondary" size="small" icon={X} onClick={resetRoomEdit} />
                </div>
              ) : (
                <div key={room.id} className="flex items-center justify-between gap-2 rounded-xl border border-[#E2E8F0] p-3">
                  <span className="truncate text-sm text-[#0F172A]">{room.nom}</span>
                  <div className="flex flex-shrink-0 gap-1.5">
                    <Button variant="secondary" size="small" icon={Pencil} onClick={() => openRoomEdit(room)} />
                    <Button
                      variant="secondary"
                      size="small"
                      icon={Trash2}
                      onClick={() => confirmDeleteRoom(room)}
                      disabled={deletingRoomId === String(room.id)}
                    />
                  </div>
                </div>
              )
            )}
            {rooms.length === 0 && <p className="text-center text-sm text-[#64748B]">Aucune salle n&apos;est disponible.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default CoursTab;
