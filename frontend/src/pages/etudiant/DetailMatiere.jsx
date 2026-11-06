import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Calendar, Clock, BookOpen, GraduationCap } from 'lucide-react';
import Header from '../../components/Header';
import TabBarEtudiant from '../../components/TabBarEtudiant';
import PageLayout from '../../components/PageLayout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import StatusBadge from '../../components/StatusBadge';
import { getStudentAttendanceHistory, getStudentCourseAttendanceHistory, getStudentCourses } from '../../api/student';
import { formatBackendDate, formatBackendTime, getApiErrorMessage } from '../../utils/api';
import AlertBanner from '../../components/motion/AlertBanner';
import { SkeletonList } from '../../components/motion/Skeleton';

function DetailMatiere() {
  const navigate = useNavigate();
  const { matiereId } = useParams();
  const decodedMatiereId = decodeURIComponent(matiereId || '');
  const numericCourseId = /^\d+$/.test(decodedMatiereId) ? decodedMatiereId : null;
  const [history, setHistory] = useState([]);
  const [courses, setCourses] = useState([]);
  const [courseDetail, setCourseDetail] = useState(null);
  const [courseHistory, setCourseHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const getStatusIndicator = (taux) => {
    if (taux >= 90) return 'bon';
    if (taux >= 75) return 'attention';
    return 'critique';
  };

  useEffect(() => {
    let isMounted = true;

    async function loadSubjectDetails() {
      setLoading(true);
      setError('');

      try {
        const [historyData, coursesData, courseHistoryData] = await Promise.all([
          getStudentAttendanceHistory(),
          getStudentCourses(),
          numericCourseId ? getStudentCourseAttendanceHistory(numericCourseId) : Promise.resolve(null)
        ]);

        if (!isMounted) return;

        setHistory(Array.isArray(historyData) ? historyData : []);
        setCourses(Array.isArray(coursesData) ? coursesData : []);
        setCourseDetail(courseHistoryData?.course || null);
        setCourseHistory(Array.isArray(courseHistoryData?.history) ? courseHistoryData.history : []);
      } catch (requestError) {
        if (!isMounted) return;
        setError(getApiErrorMessage(requestError, "Impossible de charger le detail de la matiere."));
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadSubjectDetails();

    return () => {
      isMounted = false;
    };
  }, [numericCourseId]);

  const subjectSessions = useMemo(
    () =>
      history.filter((item) => {
        const rawSubject = item.cours?.matiere ?? item.matiere ?? item.course_name ?? item.nom;
        const subjectName = (typeof rawSubject === 'object' ? rawSubject?.nom : rawSubject) || '';
        return subjectName === decodedMatiereId;
      }),
    [decodedMatiereId, history]
  );

  const relatedCourse = useMemo(
    () =>
      courseDetail ||
      courses.find((course) =>
        numericCourseId ? String(course.id) === String(numericCourseId) : (course.nom || course.matiere) === decodedMatiereId
      ) ||
      null,
    [courseDetail, courses, decodedMatiereId, numericCourseId]
  );

  const matiere = useMemo(() => {
    const effectiveSessions = numericCourseId && courseHistory.length > 0 ? courseHistory : subjectSessions;
    if (effectiveSessions.length === 0 && !relatedCourse) return null;

    const presences = effectiveSessions.filter((item) => item.statut === 'present').length;
    const retards = effectiveSessions.filter((item) => item.statut === 'retard').length;
    const absences = effectiveSessions.filter((item) => item.statut === 'absent').length;
    const total = effectiveSessions.length;
    const tauxPresence = total > 0 ? Math.round(((presences + retards * 0.5) / total) * 100) : 0;
    const evolution = effectiveSessions.slice(0, 5).reverse().map((item, index) => {
      const dateValue = item.cours?.date ?? item.timestamp_pointage;
      return {
        label: dateValue ? formatBackendDate(dateValue) : `S${index + 1}`,
        value: item.statut === 'present' ? 100 : item.statut === 'retard' ? 50 : 0
      };
    });

    return {
      nom: relatedCourse?.nom || decodedMatiereId,
      professeur: relatedCourse?.professeur || 'Professeur non renseigne',
      tauxPresence,
      salle: relatedCourse?.salle || 'Salle non renseignee',
      horaire:
        relatedCourse?.horaire ||
        ((relatedCourse?.heure_debut || relatedCourse?.heure_fin)
          ? `${formatBackendTime(relatedCourse?.heure_debut)} - ${formatBackendTime(relatedCourse?.heure_fin)}`
          : 'Horaire non renseigne'),
      presences,
      retards,
      absences,
      evolution,
      seances: effectiveSessions.map((item) => ({
        id: item.id,
        date: formatBackendDate(item.cours?.date ?? item.timestamp_pointage),
        heure: item.timestamp_pointage ? formatBackendTime(item.timestamp_pointage) : '',
        statut: item.statut,
        remarque: item.raison || item.message || 'Présence enregistrée.'
      }))
    };
  }, [courseHistory, decodedMatiereId, numericCourseId, relatedCourse, subjectSessions]);

  if (!loading && !matiere) {
    return (
      <>
        <Header titre="Détail matière" showBack />
        <PageLayout>
          <AlertBanner variant="error" message={error} />
          <section>
            <Card className="p-6 md:p-8 text-center">
              <h2 className="mb-2 text-lg font-semibold text-[#0F172A]">Matière introuvable</h2>
              <p className="mx-auto mb-6 max-w-md text-sm text-[#64748B]">
                Cette matière n&apos;est pas disponible dans votre historique.
              </p>
              <Button variant="primary" onClick={() => navigate('/etudiant/historique')}>
                Retour à l&apos;historique
              </Button>
            </Card>
          </section>
        </PageLayout>
        <TabBarEtudiant />
      </>
    );
  }

  return (
    <>
      <Header titre={matiere?.nom || 'Detail matiere'} showBack />
      <PageLayout>
        <AlertBanner variant="error" message={error} />

        {loading && <SkeletonList count={2} variant="card" />}

        {!loading && (
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-r from-[#0C4A6E] to-[#0369A1] p-5 text-white md:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm text-[#BAE6FD]">Matière suivie</p>
                    <h2 className="truncate text-2xl font-bold">{matiere.nom}</h2>
                    <p className="mt-2 text-sm text-white/80">{matiere.professeur}</p>
                  </div>
                  <StatusBadge statut={getStatusIndicator(matiere.tauxPresence)} />
                </div>
              </div>
              <div className="grid gap-3 p-4 sm:grid-cols-2 md:p-6 xl:grid-cols-4">
                <div className="rounded-xl bg-[#F8FAFC] p-4">
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-[#E0F2FE]">
                    <BookOpen className="h-5 w-5 text-[#0C4A6E]" />
                  </div>
                  <p className="text-xs text-[#64748B]">Taux de présence</p>
                  <p className="mt-1 text-lg font-semibold text-[#0F172A]">{matiere.tauxPresence}%</p>
                </div>
                <div className="rounded-xl bg-[#F8FAFC] p-4">
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-[#D1FAE5]">
                    <Calendar className="h-5 w-5 text-[#10B981]" />
                  </div>
                  <p className="text-xs text-[#64748B]">Présences</p>
                  <p className="mt-1 text-lg font-semibold text-[#0F172A]">{matiere.presences}</p>
                </div>
                <div className="rounded-xl bg-[#F8FAFC] p-4">
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-[#FEF3C7]">
                    <Clock className="h-5 w-5 text-[#F59E0B]" />
                  </div>
                  <p className="text-xs text-[#64748B]">Retards</p>
                  <p className="mt-1 text-lg font-semibold text-[#0F172A]">{matiere.retards}</p>
                </div>
                <div className="rounded-xl bg-[#F8FAFC] p-4">
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-[#E0F2FE]">
                    <GraduationCap className="h-5 w-5 text-[#0C4A6E]" />
                  </div>
                  <p className="text-xs text-[#64748B]">Salle / horaire</p>
                  <p className="mt-1 text-sm font-semibold text-[#0F172A]">{matiere.salle}</p>
                  <p className="text-xs text-[#64748B]">{matiere.horaire}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 md:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-[#0F172A]">Évolution de l&apos;assiduité</h3>
                  <p className="text-sm text-[#64748B]">Variation de présence sur les dernières séances connues.</p>
                </div>
              </div>
              <div className="grid grid-cols-5 gap-3">
                {matiere.evolution.map((item) => (
                  <div key={item.label} className="flex flex-col items-center gap-2">
                    <div className="flex h-36 w-full items-end rounded-xl bg-[#F8FAFC] p-1">
                      <div
                        className="w-full rounded-lg bg-gradient-to-t from-[#0C4A6E] to-[#38BDF8]"
                        style={{ height: `${item.value}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-[#64748B]">{item.label}</span>
                  </div>
                ))}
                {matiere.evolution.length === 0 && (
                  <div className="col-span-5 rounded-xl bg-[#F8FAFC] p-4 text-center text-sm text-[#64748B]">
                    Pas assez de seances pour tracer une evolution.
                  </div>
                )}
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="overflow-hidden">
              <div className="border-b border-[#E2E8F0] px-4 py-3.5 md:px-6">
                <h3 className="text-lg font-semibold text-[#0F172A]">Séances récentes</h3>
              </div>
              <div className="divide-y divide-[#E2E8F0]">
                {matiere.seances.map((seance) => (
                  <div key={seance.id} className="px-4 py-4 md:px-6">
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[#0F172A]">{seance.date}</p>
                        <p className="text-xs text-[#64748B]">{matiere.horaire}</p>
                      </div>
                      <StatusBadge statut={seance.statut} />
                    </div>
                    <div className="rounded-xl bg-[#F8FAFC] p-3">
                      <p className="text-xs text-[#64748B]">Heure de pointage</p>
                      <p className="mt-1 text-sm font-medium text-[#0F172A]">{seance.heure || 'Aucune'}</p>
                      <p className="mt-2 text-sm text-[#64748B]">{seance.remarque}</p>
                    </div>
                  </div>
                ))}
                {matiere.seances.length === 0 && (
                  <div className="px-4 py-6 text-center text-sm text-[#64748B]">
                    Aucune seance n&apos;est disponible pour cette matiere.
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-4 md:p-6">
              <h3 className="mb-3 text-lg font-semibold text-[#0F172A]">Actions rapides</h3>
              <div className="space-y-3">
                <Button variant="secondary" className="w-full" onClick={() => navigate('/etudiant/historique')}>
                  Revenir à l&apos;historique
                </Button>
              </div>
            </Card>
          </div>
        </section>
        )}
      </PageLayout>
      <TabBarEtudiant />
    </>
  );
}

export default DetailMatiere;
