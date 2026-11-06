import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import Header from '../../components/Header';
import TabBarEtudiant from '../../components/TabBarEtudiant';
import PageLayout from '../../components/PageLayout';
import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';
import { getStudentAttendanceHistory, getStudentCourses } from '../../api/student';
import { formatBackendDate, formatBackendTime, getApiErrorMessage } from '../../utils/api';
import AlertBanner from '../../components/motion/AlertBanner';
import { StaggerContainer, StaggerItem } from '../../components/motion/Stagger';

function Historique() {
  const navigate = useNavigate();
  const [periode, setPeriode] = useState('semestre');
  const [history, setHistory] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadHistory() {
      setLoading(true);
      setError('');

      try {
        const [historyData, coursesData] = await Promise.all([getStudentAttendanceHistory(), getStudentCourses()]);

        if (!isMounted) return;

        setHistory(Array.isArray(historyData) ? historyData : []);
        setCourses(Array.isArray(coursesData) ? coursesData : []);
      } catch (requestError) {
        if (!isMounted) return;
        setError(getApiErrorMessage(requestError, 'Impossible de charger l’historique de presence.'));
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadHistory();

    return () => {
      isMounted = false;
    };
  }, []);

  // /etudiant/absences/summary ne fournit pas de taux/decompte utilisables ici
  // (voir student.js) : le resume "Semestre" est calcule a partir de
  // l'historique reel de pointages, comme le tableau de bord.
  const resumeParPeriode = useMemo(() => {
    const presences = history.filter((item) => item.statut === 'present').length;
    const retards = history.filter((item) => item.statut === 'retard').length;
    const absences = history.filter((item) => item.statut === 'absent').length;
    const total = history.length;
    const taux = total > 0 ? Math.round(((presences + retards * 0.5) / total) * 100) : 0;

    return {
      semaine: { taux: 94, presences: 5, retards: 1, absences: 0 },
      mois: { taux: 89, presences: 18, retards: 3, absences: 1 },
      semestre: { taux, presences, retards, absences, total }
    };
  }, [history]);

  const resumeActif = resumeParPeriode[periode];

  const historyBySubject = useMemo(() => {
    const groups = new Map();

    history.forEach((item) => {
      // serialize_pointage (backend) imbrique le nom de la matiere sous
      // item.cours.matiere (chaine), pas a la racine du pointage.
      const rawSubject = item.cours?.matiere ?? item.matiere ?? item.course_name ?? item.nom;
      const subjectName = (typeof rawSubject === 'object' ? rawSubject?.nom : rawSubject) || 'Matiere inconnue';
      const existing = groups.get(subjectName) || {
        id: encodeURIComponent(subjectName),
        nom: subjectName,
        professeur: '',
        tauxPresence: 0,
        presences: 0,
        retards: 0,
        absences: 0,
        total: 0
      };

      existing.total += 1;
      if (item.statut === 'present') existing.presences += 1;
      else if (item.statut === 'retard') existing.retards += 1;
      else if (item.statut === 'absent') existing.absences += 1;

      groups.set(subjectName, existing);
    });

    return [...groups.values()].map((subject) => {
      const relatedCourse = courses.find((course) => (course.nom || course.matiere) === subject.nom);
      const weightedPresent = subject.presences + subject.retards * 0.5;
      const tauxPresence = subject.total > 0 ? Math.round((weightedPresent / subject.total) * 100) : 0;

      return {
        ...subject,
        courseId: relatedCourse?.id || null,
        professeur: relatedCourse?.professeur || subject.professeur || 'Professeur non renseigne',
        tauxPresence
      };
    });
  }, [courses, history]);

  const attendanceEvolution = useMemo(() => {
    const recentItems = [...history].slice(0, 6).reverse();

    return recentItems.map((item, index) => {
      const dateValue = item.cours?.date ?? item.timestamp_pointage;
      return {
        label: dateValue ? formatBackendDate(dateValue) : `S${index + 1}`,
        value: item.statut === 'present' ? 100 : item.statut === 'retard' ? 50 : 0
      };
    });
  }, [history]);

  const getStatusIndicator = (taux) => {
    if (taux >= 90) return 'bon';
    if (taux >= 75) return 'attention';
    return 'critique';
  };

  const periods = [
    { value: 'semaine', label: 'Semaine' },
    { value: 'mois', label: 'Mois' },
    { value: 'semestre', label: 'Semestre' }
  ];

  return (
    <>
      <Header titre="Historique de Présence" />
      <PageLayout>
        <AlertBanner variant="error" message={error} />

        {/* Sélecteur de période */}
        <section>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {periods.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriode(p.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                  periode === p.value 
                    ? 'bg-[#0C4A6E] text-white' 
                    : 'bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0] hover:bg-[#F1F5F9]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </section>

        {/* Résumé global */}
        <section>
          <Card className="p-4 md:p-6">
            <h2 className="text-lg font-semibold text-[#0F172A] mb-4">Résumé Global</h2>
            <div className="flex items-center justify-center mb-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-[#0C4A6E]">{resumeActif.taux}%</div>
                <div className="text-sm text-[#94A3B8] mt-1">Taux de présence</div>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
              <div className="p-3 md:p-4 bg-[#F8FAFC] rounded-xl">
                <div className="text-lg md:text-xl font-semibold text-[#0F172A]">
                  {periode === 'semaine' ? 6 : periode === 'mois' ? 22 : resumeActif.total ?? 0}
                </div>
                <div className="text-xs text-[#94A3B8]">Total</div>
              </div>
              <div className="p-3 md:p-4 bg-[#D1FAE5] rounded-xl">
                <div className="text-lg md:text-xl font-semibold text-[#10B981]">{resumeActif.presences}</div>
                <div className="text-xs text-[#94A3B8]">Présents</div>
              </div>
              <div className="p-3 md:p-4 bg-[#FEF3C7] rounded-xl">
                <div className="text-lg md:text-xl font-semibold text-[#F59E0B]">{resumeActif.retards}</div>
                <div className="text-xs text-[#94A3B8]">Retards</div>
              </div>
              <div className="p-3 md:p-4 bg-[#FEE2E2] rounded-xl">
                <div className="text-lg md:text-xl font-semibold text-[#DC2626]">{resumeActif.absences}</div>
                <div className="text-xs text-[#94A3B8]">Absents</div>
              </div>
            </div>

            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#0F172A]">Évolution de la présence</h3>
                <span className="text-xs text-[#94A3B8]">Dernières séances</span>
              </div>
              <div className="grid grid-cols-6 gap-2">
                {attendanceEvolution.map((item) => (
                  <div key={item.label} className="flex flex-col items-center gap-2">
                    <div className="flex h-32 w-full items-end rounded-xl bg-[#F8FAFC] p-1">
                      <div
                        className="w-full rounded-lg bg-gradient-to-t from-[#0C4A6E] to-[#38BDF8]"
                        style={{ height: `${item.value}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-[#64748B]">{item.label}</span>
                  </div>
                ))}
                {attendanceEvolution.length === 0 && (
                  <div className="col-span-6 rounded-xl bg-[#F8FAFC] p-4 text-center text-sm text-[#64748B]">
                    Pas assez de donnees pour afficher une evolution.
                  </div>
                )}
              </div>
            </div>
          </Card>
        </section>

        {/* Liste des matières */}
        <section>
          <h2 className="text-lg font-semibold text-[#0F172A] mb-3">Mes Matières</h2>
          <StaggerContainer className="space-y-3">
            {historyBySubject.map((matiere) => (
              <StaggerItem key={matiere.id}>
              <Card
                className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/etudiant/historique/${matiere.courseId || matiere.id}`)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2 gap-2">
                      <h3 className="text-base font-semibold text-[#0F172A] truncate">{matiere.nom}</h3>
                      <StatusBadge statut={getStatusIndicator(matiere.tauxPresence)} />
                    </div>
                    <div className="text-sm text-[#64748B] mb-3">{matiere.professeur}</div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-3">
                      <div className="text-sm">
                        <span className="text-[#10B981] font-medium">{matiere.presences}</span>
                        <span className="text-[#64748B]"> présents</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-[#F59E0B] font-medium">{matiere.retards}</span>
                        <span className="text-[#64748B]"> retards</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-[#DC2626] font-medium">{matiere.absences}</span>
                        <span className="text-[#64748B]"> absents</span>
                      </div>
                    </div>
                    <div className="h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all"
                        style={{ 
                          width: `${matiere.tauxPresence}%`,
                          backgroundColor: matiere.tauxPresence >= 90 ? '#10B981' : matiere.tauxPresence >=75 ? '#F59E0B' : '#DC2626'
                        }}
                      ></div>
                    </div>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate(`/etudiant/historique/${matiere.courseId || matiere.id}`);
                      }}
                      className="mt-3 text-sm font-medium text-[#0369A1] hover:opacity-80"
                    >
                      Voir le détail
                    </button>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[#94A3B8] flex-shrink-0 mt-1" />
                </div>
              </Card>
              </StaggerItem>
            ))}
          </StaggerContainer>
          {!loading && historyBySubject.length === 0 && (
            <Card className="p-6 text-center text-sm text-[#64748B]">
              Aucune matière disponible dans votre historique pour le moment.
            </Card>
          )}
        </section>

        {/* Historique détaillé */}
        <section>
          <h2 className="text-lg font-semibold text-[#0F172A] mb-3">Historique Récent</h2>
          <Card className="overflow-hidden">
            <div className="divide-y divide-[#E2E8F0]">
              {loading ? (
                <div className="px-4 py-6 text-center text-sm text-[#64748B]">
                  Chargement de l&apos;historique...
                </div>
              ) : history.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-3.5 px-4 hover:bg-[#F8FAFC] transition">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="text-left">
                      <div className="text-base text-[#0F172A] truncate">
                        {(() => {
                          const rawSubject = item.cours?.matiere ?? item.matiere ?? item.course_name ?? item.nom;
                          return typeof rawSubject === 'object' ? rawSubject?.nom : rawSubject;
                        })()}
                      </div>
                      <div className="text-xs text-[#94A3B8]">
                        {formatBackendDate(item.cours?.date ?? item.timestamp_pointage)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {item.timestamp_pointage && (
                      <span className="text-sm text-[#64748B]">
                        {formatBackendTime(item.timestamp_pointage)}
                      </span>
                    )}
                    <StatusBadge statut={item.statut} />
                  </div>
                </div>
              ))}
              {!loading && history.length === 0 && (
                <div className="px-4 py-6 text-center text-sm text-[#64748B]">
                  Aucun historique n&apos;est disponible.
                </div>
              )}
            </div>
          </Card>
        </section>
      </PageLayout>
      <TabBarEtudiant />
    </>
  );
}

export default Historique;
