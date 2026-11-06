import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, MapPin, Users, Play, ChevronRight, Calendar, ListChecks, TrendingUp, Ban, ScanFace } from 'lucide-react';
import Header from '../../components/Header';
import TabBarProfesseur from '../../components/TabBarProfesseur';
import PageLayout from '../../components/PageLayout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import StatusBadge from '../../components/StatusBadge';
import { useAuth } from '../../contexts/AuthContext';
import { cancelProfessorCourse, getProfessorCourses, rescheduleProfessorCourse } from '../../api/professor';
import { getApiErrorMessage, getCourseErrorMessage, getCourseScheduleConflicts, getLocalDateIso } from '../../utils/api';
import { buildDisplayName } from '../responsable/gestion/helpers';
import { toast } from '../../utils/toast';
import AlertBanner from '../../components/motion/AlertBanner';
import { SkeletonList } from '../../components/motion/Skeleton';
import { StaggerContainer, StaggerItem } from '../../components/motion/Stagger';

function MesCours() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [filtre, setFiltre] = useState('tous');
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancellingCourseId, setCancellingCourseId] = useState(null);
  const [cancelTargetId, setCancelTargetId] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [reschedulingCourseId, setReschedulingCourseId] = useState('');
  const [rescheduleForm, setRescheduleForm] = useState({
    new_date: '',
    new_start_time: '',
    new_end_time: '',
    reason: '',
    room_id: ''
  });
  const [submittingReschedule, setSubmittingReschedule] = useState(false);
  const [rescheduleConflicts, setRescheduleConflicts] = useState([]);

  useEffect(() => {
    let isMounted = true;

    async function loadCourses() {
      setLoading(true);
      setError('');

      try {
        const data = await getProfessorCourses();
        if (!isMounted) return;
        setCourses(Array.isArray(data) ? data : []);
      } catch (requestError) {
        if (!isMounted) return;
        setError(getApiErrorMessage(requestError, 'Impossible de charger vos cours.'));
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadCourses();

    return () => {
      isMounted = false;
    };
  }, []);

  const todayIso = getLocalDateIso();
  // useMemo (pas juste un filter direct) : coursFiltres le liste comme
  // dependance, une nouvelle reference de tableau a chaque rendu rendrait cette
  // memoisation la inoperante.
  const coursDuJour = useMemo(
    () => courses.filter((course) => course.date === todayIso && course.statut !== 'annule'),
    [courses, todayIso]
  );
  const coursCetteSemaine = useMemo(() => {
    const debutSemaine = new Date();
    const jour = (debutSemaine.getDay() + 6) % 7; // lundi = 0
    debutSemaine.setDate(debutSemaine.getDate() - jour);
    debutSemaine.setHours(0, 0, 0, 0);
    const finSemaine = new Date(debutSemaine);
    finSemaine.setDate(finSemaine.getDate() + 7);

    // course.date est un "YYYY-MM-DD" local (voir getLocalDateIso ci-dessus) :
    // le parser via new Date("YYYY-MM-DD") le lirait en UTC minuit, un instant
    // different de debutSemaine/finSemaine construits en local, ce qui decale
    // les jours limites de la semaine selon le fuseau. On force un parsing local
    // en ajoutant un composant horaire.
    return courses.filter((course) => {
      const dateCours = new Date(`${course.date}T00:00:00`);
      return dateCours >= debutSemaine && dateCours < finSemaine;
    });
  }, [courses]);

  const coursFiltres = useMemo(() => {
    const now = new Date();

    switch (filtre) {
      case 'aujourdhui':
        return coursDuJour;
      case 'semaine':
        return coursCetteSemaine;
      case 'mois':
        return courses.filter((course) => {
          const dateCours = new Date(`${course.date}T00:00:00`);
          return dateCours.getMonth() === now.getMonth() && dateCours.getFullYear() === now.getFullYear();
        });
      default:
        return courses;
    }
  }, [coursDuJour, coursCetteSemaine, courses, filtre]);

  // Pas de fallback vers coursDuJour[0] : si aucun cours du jour n'est encore a
  // venir ou en cours (tous termines/annules), il n'y a justement pas de
  // "prochain cours" a afficher -- l'ancien fallback pouvait remonter un cours
  // deja termine avec un bouton "Suivre" toujours actif.
  const prochainCours =
    coursDuJour.find((cours) => cours.statut === 'avenir') ||
    coursDuJour.find((cours) => cours.statut === 'en cours');

  const filters = [
    { value: 'tous', label: 'Tous' },
    { value: 'aujourdhui', label: "Aujourd'hui" },
    { value: 'semaine', label: 'Cette semaine' },
    { value: 'mois', label: 'Ce mois' }
  ];

  const openCancelForm = (course) => {
    setCancelTargetId(String(course.id));
    setCancelReason('');
  };

  const closeCancelForm = () => {
    setCancelTargetId('');
    setCancelReason('');
  };

  const handleCancelCourse = async () => {
    if (!cancelTargetId || !cancelReason.trim()) return;

    const courseId = cancelTargetId;
    setCancellingCourseId(courseId);

    try {
      await cancelProfessorCourse(courseId, cancelReason.trim());
      setCourses((current) =>
        current.map((course) =>
          String(course.id) === String(courseId)
            ? {
                ...course,
                statut: 'annule'
              }
            : course
        )
      );
      toast.success('Le cours a bien été annulé.');
      closeCancelForm();
    } catch (requestError) {
      toast.error(getApiErrorMessage(requestError, "Impossible d'annuler ce cours."));
    } finally {
      setCancellingCourseId(null);
    }
  };

  const openRescheduleForm = (course) => {
    setReschedulingCourseId(String(course.id));
    setRescheduleForm({
      new_date: course.date || '',
      new_start_time: course.horaireDebut || '',
      new_end_time: course.horaireFin || '',
      reason: '',
      room_id: ''
    });
    setRescheduleConflicts([]);
  };

  const handleRescheduleCourse = async () => {
    if (!reschedulingCourseId) return;

    setSubmittingReschedule(true);
    setRescheduleConflicts([]);

    try {
      const result = await rescheduleProfessorCourse(reschedulingCourseId, rescheduleForm);
      setCourses((current) =>
        current.map((course) =>
          String(course.id) === String(reschedulingCourseId)
            ? {
                ...course,
                date: rescheduleForm.new_date || course.date,
                horaireDebut: rescheduleForm.new_start_time || course.horaireDebut,
                horaireFin: rescheduleForm.new_end_time || course.horaireFin
              }
            : course
        )
      );
      toast.success(result?.message || 'Le cours a bien ete reporte.');
      setReschedulingCourseId('');
    } catch (requestError) {
      toast.error(getCourseErrorMessage(requestError));
      setRescheduleConflicts(getCourseScheduleConflicts(requestError));
    } finally {
      setSubmittingReschedule(false);
    }
  };

  return (
    <>
      <Header titre="Mes Cours" />
      <PageLayout>
        <AlertBanner variant="error" message={error} />

        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-[#0C4A6E] to-[#0369A1] p-5 text-white md:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#BAE6FD]">Espace professeur</p>
                <h2 className="truncate text-2xl font-bold">{buildDisplayName(user)}</h2>
                <p className="mt-2 max-w-2xl text-sm text-white/80">
                  Lancez rapidement vos sessions de pointage, surveillez l&apos;arrivee des etudiants et finalisez les feuilles de presence sans perdre de temps.
                </p>
              </div>
              {prochainCours && (
                <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm lg:max-w-sm">
                  <p className="text-xs uppercase tracking-[0.12em] text-[#BAE6FD]">Prochain cours</p>
                  <p className="mt-2 text-lg font-semibold">{prochainCours.nom}</p>
                  <p className="mt-1 text-sm text-white/80">{prochainCours.horaireDebut} - {prochainCours.horaireFin} • {prochainCours.salle}</p>
                  <div className="mt-4 flex flex-col gap-3">
                    <Button
                      variant="secondary"
                      className="w-full bg-white text-[#0C4A6E] hover:bg-[#F8FAFC]"
                      onClick={() => navigate(`/professeur/qr/${prochainCours.id}`)}
                    >
                      Suivre la presence
                    </Button>
                    <Button
                      variant="secondary"
                      className="w-full bg-white text-[#0C4A6E] hover:bg-[#F8FAFC]"
                      icon={ScanFace}
                      onClick={() => navigate('/borne-pointage')}
                    >
                      Ouvrir la borne
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        {reschedulingCourseId && (
          <Card className="p-4 md:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[#0F172A]">Reporter un cours</h2>
                <p className="text-sm text-[#64748B]">
                  Choisissez la nouvelle date et le nouveau créneau pour ce cours.
                </p>
              </div>
              <Button variant="text" size="small" onClick={() => setReschedulingCourseId('')}>
                Fermer
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <input
                type="date"
                value={rescheduleForm.new_date}
                onChange={(event) => setRescheduleForm((current) => ({ ...current, new_date: event.target.value }))}
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A] outline-none focus:border-[#0C4A6E]"
              />
              <input
                type="number"
                min="1"
                value={rescheduleForm.room_id}
                onChange={(event) => setRescheduleForm((current) => ({ ...current, room_id: event.target.value }))}
                placeholder="ID salle optionnel"
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A] outline-none focus:border-[#0C4A6E]"
              />
              <input
                type="time"
                value={rescheduleForm.new_start_time}
                onChange={(event) => setRescheduleForm((current) => ({ ...current, new_start_time: event.target.value }))}
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A] outline-none focus:border-[#0C4A6E]"
              />
              <input
                type="time"
                value={rescheduleForm.new_end_time}
                onChange={(event) => setRescheduleForm((current) => ({ ...current, new_end_time: event.target.value }))}
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A] outline-none focus:border-[#0C4A6E]"
              />
              <textarea
                rows={3}
                value={rescheduleForm.reason}
                onChange={(event) => setRescheduleForm((current) => ({ ...current, reason: event.target.value }))}
                placeholder="Motif du report"
                className="md:col-span-2 w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A] outline-none focus:border-[#0C4A6E]"
              />
            </div>
            {rescheduleConflicts.length > 0 && (
              <div className="mt-3 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3">
                <p className="text-sm font-semibold text-[#DC2626]">Ce creneau est deja pris :</p>
                <ul className="mt-2 space-y-1 text-sm text-[#7F1D1D]">
                  {rescheduleConflicts.map((conflict, index) => (
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
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Button className="sm:w-auto" onClick={handleRescheduleCourse} disabled={submittingReschedule}>
                {submittingReschedule ? 'Enregistrement...' : 'Confirmer le report'}
              </Button>
              <Button variant="secondary" className="sm:w-auto" onClick={() => setReschedulingCourseId('')}>
                Annuler
              </Button>
            </div>
          </Card>
        )}

        {cancelTargetId && (
          <Card className="p-4 md:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[#0F172A]">Annuler ce cours</h2>
                <p className="text-sm text-[#64748B]">
                  Indiquez le motif d&apos;annulation — il sera communiqué aux étudiants concernés.
                </p>
              </div>
              <Button variant="text" size="small" onClick={closeCancelForm}>
                Fermer
              </Button>
            </div>
            <textarea
              rows={3}
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              placeholder="Motif d'annulation (obligatoire)"
              className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A] outline-none focus:border-[#0C4A6E]"
            />
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Button
                variant="secondary"
                className="sm:w-auto"
                icon={Ban}
                onClick={handleCancelCourse}
                disabled={!cancelReason.trim() || cancellingCourseId === cancelTargetId}
              >
                {cancellingCourseId === cancelTargetId ? 'Annulation...' : "Confirmer l'annulation"}
              </Button>
              <Button variant="secondary" className="sm:w-auto" onClick={closeCancelForm}>
                Ne pas annuler
              </Button>
            </div>
          </Card>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mb-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#E0F2FE] flex items-center justify-center flex-shrink-0">
                <Calendar className="w-6 h-6 text-[#0C4A6E]" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-[#0F172A]">{coursDuJour.length}</h3>
            <p className="text-sm text-[#94A3B8] mt-1">Cours aujourd'hui</p>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#D1FAE5] flex items-center justify-center flex-shrink-0">
                <ListChecks className="w-6 h-6 text-[#10B981]" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-[#0F172A]">{coursCetteSemaine.length}</h3>
            <p className="text-sm text-[#94A3B8] mt-1">Cours cette semaine</p>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#FEF3C7] flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-6 h-6 text-[#F59E0B]" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-[#0F172A]">
              {courses.filter((cours) => cours.statut === 'termine').length}
            </h3>
            <p className="text-sm text-[#94A3B8] mt-1">Cours terminés</p>
          </Card>
        </div>

        {coursDuJour.length > 0 && (
          <section className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#0F172A]">Cours du jour</h2>
            </div>
            <StaggerContainer className="space-y-3">
              {coursDuJour.map((cours) => (
                <StaggerItem key={cours.id}>
                <Card className="p-5 border-l-4 border-[#0C4A6E]">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2 gap-2">
                        <h3 className="text-lg font-semibold text-[#0F172A] truncate">{cours.nom}</h3>
                        <StatusBadge statut={cours.statut} />
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-[#64748B]">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 flex-shrink-0" />
                          <span>{cours.horaireDebut} - {cours.horaireFin}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{cours.salle}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 flex-shrink-0" />
                          <span>{cours.promotion}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
                      {cours.statut === 'avenir' && (
                        <Button 
                          variant="primary" 
                          icon={Play}
                          className="w-full md:w-auto"
                          onClick={() => navigate(`/professeur/qr/${cours.id}`)}
                        >
                          Suivre la presence
                        </Button>
                      )}
                      {cours.statut === 'en cours' && (
                        <Button
                          variant="primary"
                          className="w-full md:w-auto"
                          onClick={() => navigate(`/professeur/qr/${cours.id}`)}
                        >
                          Suivre la presence
                        </Button>
                      )}
                      {cours.statut === 'termine' && (
                        <Button 
                          variant="secondary" 
                          className="w-full md:w-auto"
                          onClick={() => navigate(`/professeur/presences/${cours.id}`)}
                        >
                          Voir la présence
                        </Button>
                      )}
                      {['avenir', 'en cours'].includes(cours.statut) && (
                        <Button
                          variant="secondary"
                          icon={Ban}
                          className="w-full md:w-auto"
                          disabled={cancellingCourseId === String(cours.id)}
                          onClick={() => openCancelForm(cours)}
                        >
                          {cancellingCourseId === String(cours.id) ? 'Annulation...' : 'Annuler le cours'}
                        </Button>
                      )}
                      {['avenir', 'en cours'].includes(cours.statut) && (
                        <Button
                          variant="secondary"
                          className="w-full md:w-auto"
                          onClick={() => openRescheduleForm(cours)}
                        >
                          Reporter
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </section>
        )}

        <section>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
            <h2 className="text-lg font-semibold text-[#0F172A]">Tous les cours</h2>
            <div className="flex gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              {filters.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFiltre(f.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                    filtre === f.value 
                      ? 'bg-[#0C4A6E] text-white' 
                      : 'bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0] hover:bg-[#F1F5F9]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          {loading ? (
            <SkeletonList count={3} variant="row" />
          ) : (
          <StaggerContainer className="space-y-3">
            {coursFiltres.map((cours) => (
              <StaggerItem key={cours.id}>
              <Card className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1 gap-2">
                      <h3 className="text-base font-semibold text-[#0F172A] truncate">{cours.nom}</h3>
                      <StatusBadge statut={cours.statut} />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#64748B]">
                      <span>{cours.date}</span>
                      <span className="hidden sm:inline">•</span>
                      <span>{cours.horaireDebut} - {cours.horaireFin}</span>
                      <span className="hidden sm:inline">•</span>
                      <span className="truncate">{cours.promotion}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => {
                        if (cours.statut === 'en cours' || cours.statut === 'avenir') {
                          navigate(`/professeur/qr/${cours.id}`);
                        } else {
                          navigate(`/professeur/presences/${cours.id}`);
                        }
                      }}
                    >
                      Ouvrir
                    </Button>
                    {['avenir', 'en cours'].includes(cours.statut) && (
                      <Button
                        variant="secondary"
                        size="small"
                        icon={Ban}
                        disabled={cancellingCourseId === String(cours.id)}
                        onClick={() => openCancelForm(cours)}
                      >
                        {cancellingCourseId === String(cours.id) ? '...' : 'Annuler'}
                      </Button>
                    )}
                    {['avenir', 'en cours'].includes(cours.statut) && (
                      <Button
                        variant="secondary"
                        size="small"
                        onClick={() => openRescheduleForm(cours)}
                      >
                        Reporter
                      </Button>
                    )}
                    <ChevronRight className="w-5 h-5 text-[#94A3B8] flex-shrink-0" />
                  </div>
                </div>
              </Card>
              </StaggerItem>
            ))}
          </StaggerContainer>
          )}
          {!loading && coursFiltres.length === 0 && (
            <Card className="p-6 text-center">
              <p className="text-sm text-[#64748B]">Aucun cours ne correspond au filtre sélectionné.</p>
            </Card>
          )}
        </section>
      </PageLayout>
      <TabBarProfesseur />
    </>
  );
}

export default MesCours;
