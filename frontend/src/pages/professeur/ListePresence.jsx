import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Search, Filter, Download, Calendar, Users, ChevronRight, AlertCircle, ClipboardCheck } from 'lucide-react';
import Header from '../../components/Header';
import TabBarProfesseur from '../../components/TabBarProfesseur';
import PageLayout from '../../components/PageLayout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import StatusBadge from '../../components/StatusBadge';
import {
  getProfessorCourseAttendance,
  getProfessorCourses,
  regularizeProfessorAttendance,
  subscribeToProfessorCourseAttendanceStream
} from '../../api/professor';
import { getApiErrorMessage } from '../../utils/api';
import { toast } from '../../utils/toast';
import AlertBanner from '../../components/motion/AlertBanner';
import { SkeletonList } from '../../components/motion/Skeleton';
import { StaggerContainer, StaggerItem } from '../../components/motion/Stagger';

const AUTO_REFRESH_MS = 15000;

function ListePresence() {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('tous');
  const [etudiants, setEtudiants] = useState([]);
  const [courses, setCourses] = useState([]);
  const [manualStudentId, setManualStudentId] = useState('');
  const [manualStatus, setManualStatus] = useState('present');
  const [manualReason, setManualReason] = useState('');
  const [manualTime, setManualTime] = useState('');
  const [regularizing, setRegularizing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isLive, setIsLive] = useState(false);

  const parsedCourseId = courseId ? parseInt(courseId, 10) : null;
  const cours = parsedCourseId ? courses.find((course) => course.id === parsedCourseId) : null;

  // Le polling (et le rechargement post-regularisation) sont asynchrones : si le
  // professeur navigue vers un autre cours pendant qu'une requete pour l'ancien
  // cours est encore en vol, sa reponse arrivant en retard ne doit pas ecraser
  // les presences du nouveau cours deja affiche.
  const currentCourseIdRef = useRef(parsedCourseId);
  useEffect(() => {
    currentCourseIdRef.current = parsedCourseId;
  }, [parsedCourseId]);

  const loadAttendance = async (nextCourseId) => {
    const attendanceData = await getProfessorCourseAttendance(nextCourseId);
    if (currentCourseIdRef.current !== nextCourseId) return;
    setEtudiants(Array.isArray(attendanceData?.attendance) ? attendanceData.attendance : []);
  };

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setLoading(true);
      setError('');

      try {
        const coursesData = await getProfessorCourses();
        if (!isMounted) return;

        const nextCourses = Array.isArray(coursesData) ? coursesData : [];
        setCourses(nextCourses);

        if (parsedCourseId) {
          const attendanceData = await getProfessorCourseAttendance(parsedCourseId);
          if (!isMounted) return;
          setEtudiants(Array.isArray(attendanceData?.attendance) ? attendanceData.attendance : []);
        } else {
          setEtudiants([]);
        }
      } catch (requestError) {
        if (!isMounted) return;
        setError(getApiErrorMessage(requestError, 'Impossible de charger les presences.'));
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [parsedCourseId]);

  // Pousse le statut d'un etudiant (present/retard) des qu'il pointe, sans que
  // le professeur ait besoin de recharger la page. Repli en polling si le flux
  // SSE se coupe (meme strategie que SuiviPresence.jsx).
  useEffect(() => {
    if (!parsedCourseId || loading) {
      return undefined;
    }

    const unsubscribe = subscribeToProfessorCourseAttendanceStream(parsedCourseId, {
      onOpen: () => setIsLive(true),
      onData: (payload) => {
        setEtudiants(Array.isArray(payload?.attendance) ? payload.attendance : []);
      },
      onError: () => setIsLive(false)
    });

    return () => {
      setIsLive(false);
      unsubscribe();
    };
  }, [parsedCourseId, loading]);

  useEffect(() => {
    if (!parsedCourseId || loading || isLive) {
      return undefined;
    }

    const timer = setInterval(() => {
      loadAttendance(parsedCourseId);
    }, AUTO_REFRESH_MS);

    return () => clearInterval(timer);
  }, [parsedCourseId, loading, isLive]);

  const filteredEtudiants = useMemo(
    () =>
      etudiants.filter(etudiant => {
        const matchesSearch = etudiant.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
          etudiant.numeroEtudiant.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'tous' || etudiant.statut === statusFilter;
        return matchesSearch && matchesStatus;
      }),
    [etudiants, searchTerm, statusFilter]
  );

  const stats = useMemo(
    () => ({
      total: etudiants.length,
      presents: etudiants.filter(e => e.statut === 'present').length,
      retards: etudiants.filter(e => e.statut === 'retard').length,
      absents: etudiants.filter(e => e.statut === 'absent').length
    }),
    [etudiants]
  );

  const absentOptions = etudiants.filter((etudiant) => etudiant.statut === 'absent');

  const handleManualAttendance = async () => {
    if (!manualStudentId || !parsedCourseId) return;

    setRegularizing(true);

    try {
      const result = await regularizeProfessorAttendance(parsedCourseId, {
        student_id: Number(manualStudentId),
        status: manualStatus,
        reason: manualReason,
        pointage_time: manualTime || undefined
      });

      await loadAttendance(parsedCourseId);
      setManualStudentId('');
      setManualStatus('present');
      setManualReason('');
      setManualTime('');
      toast.success(result?.message || 'Pointage regularise avec succes.');
    } catch (requestError) {
      toast.error(getApiErrorMessage(requestError, 'Impossible de regulariser ce pointage.'));
    } finally {
      setRegularizing(false);
    }
  };

  const handleExport = () => {
    const rows = [
      ['Nom', 'Numero etudiant', 'Statut', 'Heure'],
      ...etudiants.map((etudiant) => [etudiant.nom, etudiant.numeroEtudiant, etudiant.statut, etudiant.heurePointage || ''])
    ];

    const csvContent = rows.map((row) => row.join(';')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `presence-${cours?.id || 'cours'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!parsedCourseId) {
    return (
      <>
        <Header titre="Présences" />
        <PageLayout>
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="p-4 md:p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#E0F2FE]">
                  <Calendar className="h-6 w-6 text-[#0C4A6E]" />
                </div>
              </div>
              <h3 className="text-3xl font-bold text-[#0F172A]">{courses.length}</h3>
              <p className="mt-1 text-sm text-[#64748B]">Cours disponibles</p>
            </Card>
            <Card className="p-4 md:p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#D1FAE5]">
                  <Users className="h-6 w-6 text-[#10B981]" />
                </div>
              </div>
              <h3 className="text-3xl font-bold text-[#0F172A]">{etudiants.length}</h3>
              <p className="mt-1 text-sm text-[#64748B]">Étudiants suivis</p>
            </Card>
            <Card className="p-4 md:p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FEF3C7]">
                  <AlertCircle className="h-6 w-6 text-[#F59E0B]" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#0F172A]">Consultez un cours</h3>
                  <p className="text-sm text-[#64748B]">Choisissez un cours pour afficher la liste de présence.</p>
                </div>
              </div>
              <Button variant="primary" className="w-full" onClick={() => navigate('/professeur/cours')}>
                Voir mes cours
              </Button>
            </Card>
          </section>

          <AlertBanner variant="error" message={error} />

          <section>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-[#0F172A]">Présences par cours</h2>
              <p className="hidden text-sm text-[#64748B] md:block">Accès direct aux feuilles de présence</p>
            </div>
            {loading ? (
              <SkeletonList count={3} variant="row" />
            ) : (
            <StaggerContainer className="space-y-3">
              {courses.map((item) => (
                <StaggerItem key={item.id}>
                <Card
                  className="cursor-pointer p-4 transition-shadow hover:shadow-md"
                  onClick={() => navigate(`/professeur/presences/${item.id}`)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-start justify-between gap-2">
                        <h3 className="truncate text-base font-semibold text-[#0F172A]">{item.nom}</h3>
                        <StatusBadge statut={item.statut} />
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#64748B]">
                        <span>{item.date}</span>
                        <span className="hidden sm:inline">•</span>
                        <span>{item.horaireDebut} - {item.horaireFin}</span>
                        <span className="hidden sm:inline">•</span>
                        <span className="truncate">{item.promotion}</span>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 flex-shrink-0 text-[#94A3B8]" />
                  </div>
                </Card>
                </StaggerItem>
              ))}
            </StaggerContainer>
            )}
          </section>
        </PageLayout>
        <TabBarProfesseur />
      </>
    );
  }

  if (loading) {
    return (
      <>
        <Header titre="Liste de Présence" showBack />
        <PageLayout>
          <SkeletonList count={4} variant="row" />
        </PageLayout>
        <TabBarProfesseur />
      </>
    );
  }

  if (!cours) {
    return (
      <>
        <Header titre="Liste de Présence" showBack />
        <PageLayout>
          <section>
            <Card className="p-6 md:p-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#FEE2E2]">
                <AlertCircle className="h-7 w-7 text-[#DC2626]" />
              </div>
              <h2 className="mb-2 text-lg font-semibold text-[#0F172A]">Cours introuvable</h2>
              <p className="mx-auto mb-6 max-w-md text-sm text-[#64748B]">
                La feuille de présence demandée n&apos;existe pas ou n&apos;est plus disponible.
              </p>
              <div className="flex flex-col justify-center gap-3 sm:flex-row">
                <Button variant="primary" onClick={() => navigate('/professeur/presences')}>
                  Voir toutes les présences
                </Button>
                <Button variant="secondary" onClick={() => navigate('/professeur/cours')}>
                  Retour aux cours
                </Button>
              </div>
            </Card>
          </section>
        </PageLayout>
        <TabBarProfesseur />
      </>
    );
  }

  return (
    <>
      <Header titre="Liste de Présence" showBack />
      <PageLayout>
        <AlertBanner variant="error" message={error} />

        {/* Résumé */}
        <section>
          <Card className="p-4 md:p-6">
            <div className="mb-1 flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-[#0F172A] truncate">{cours.nom}</h2>
              <span className="flex flex-shrink-0 items-center gap-1.5 text-xs font-semibold">
                <span className={`h-2 w-2 rounded-full ${isLive ? 'bg-[#10B981]' : 'bg-[#F59E0B]'}`} />
                <span className={isLive ? 'text-[#10B981]' : 'text-[#F59E0B]'}>
                  {isLive ? 'En direct' : 'Actualisation auto'}
                </span>
              </span>
            </div>
            <p className="text-sm text-[#64748B] mb-4">{cours.date} • {cours.horaireDebut} - {cours.horaireFin}</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 text-center mb-4">
              <div className="p-3 bg-[#F8FAFC] rounded-xl">
                <div className="text-lg md:text-xl font-semibold text-[#0F172A]">{stats.total}</div>
                <div className="text-xs text-[#64748B]">Total</div>
              </div>
              <div className="p-3 bg-[#D1FAE5] rounded-xl">
                <div className="text-lg md:text-xl font-semibold text-[#10B981]">{stats.presents}</div>
                <div className="text-xs text-[#64748B]">Présents</div>
              </div>
              <div className="p-3 bg-[#FEF3C7] rounded-xl">
                <div className="text-lg md:text-xl font-semibold text-[#F59E0B]">{stats.retards}</div>
                <div className="text-xs text-[#64748B]">Retards</div>
              </div>
              <div className="p-3 bg-[#FEE2E2] rounded-xl">
                <div className="text-lg md:text-xl font-semibold text-[#DC2626]">{stats.absents}</div>
                <div className="text-xs text-[#64748B]">Absents</div>
              </div>
            </div>

            <div className="h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#10B981] rounded-full"
                style={{ width: `${(stats.presents / stats.total) * 100}%` }}
              ></div>
            </div>
          </Card>
        </section>

        <section>
          <Card className="p-4 md:p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E0F2FE]">
                <ClipboardCheck className="h-5 w-5 text-[#0C4A6E]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#0F172A]">Pointage manuel exceptionnel</h3>
                <p className="text-sm text-[#64748B]">
                  Utilisez cette action uniquement pour les cas particuliers validés par le professeur.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <select
                value={manualStudentId}
                onChange={(e) => setManualStudentId(e.target.value)}
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F1F5F9] px-3 py-2.5 text-sm text-[#0F172A] outline-none focus:border-[#0C4A6E]"
              >
                <option value="">Sélectionner un étudiant absent</option>
                {absentOptions.map((etudiant) => (
                  <option key={etudiant.id} value={etudiant.id}>
                    {etudiant.nom} • {etudiant.numeroEtudiant}
                  </option>
                ))}
              </select>
              <select
                value={manualStatus}
                onChange={(e) => setManualStatus(e.target.value)}
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F1F5F9] px-3 py-2.5 text-sm text-[#0F172A] outline-none focus:border-[#0C4A6E] lg:w-44"
              >
                <option value="present">Présent</option>
                <option value="retard">Retard</option>
                <option value="absent">Absent</option>
                <option value="absence_justifiee">Absence justifiee</option>
              </select>
              <input
                type="text"
                value={manualReason}
                onChange={(e) => setManualReason(e.target.value)}
                placeholder="Motif / justification"
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F1F5F9] px-3 py-2.5 text-sm text-[#0F172A] outline-none focus:border-[#0C4A6E]"
              />
              <input
                type="datetime-local"
                value={manualTime}
                onChange={(e) => setManualTime(e.target.value)}
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F1F5F9] px-3 py-2.5 text-sm text-[#0F172A] outline-none focus:border-[#0C4A6E]"
              />
              <Button variant="secondary" onClick={handleManualAttendance} disabled={!manualStudentId || regularizing}>
                {regularizing ? 'Application...' : 'Appliquer'}
              </Button>
            </div>
          </Card>
        </section>

        {/* Filtres et recherche */}
        <section>
          <div className="flex flex-col sm:flex-row gap-3 mb-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
              <input
                type="text"
                placeholder="Rechercher un étudiant..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F1F5F9] border border-[#E2E8F0] text-sm text-[#0F172A] focus:outline-none focus:border-[#0C4A6E]"
              />
            </div>
            <Button variant="secondary" icon={Filter} size="small">Filtrer</Button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            {['tous', 'present', 'retard', 'absent'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition ${
                  statusFilter === status 
                    ? 'bg-[#0C4A6E] text-white' 
                    : 'bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0] hover:bg-[#F1F5F9]'
                }`}
              >
                {status === 'tous' ? 'Tous' : status === 'present' ? 'Présents' : status === 'retard' ? 'Retards' : 'Absents'}
              </button>
            ))}
          </div>
        </section>

        {/* Liste des étudiants */}
        <section>
          <Card className="overflow-hidden">
            <StaggerContainer className="divide-y divide-[#E2E8F0]">
              {filteredEtudiants.map((etudiant) => (
                <StaggerItem key={etudiant.id} className="flex items-center justify-between py-3.5 px-4 hover:bg-[#F8FAFC] transition gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[#0C4A6E] flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                      {etudiant.nom.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[#0F172A] truncate">{etudiant.nom}</div>
                      <div className="text-xs text-[#64748B]">{etudiant.numeroEtudiant}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {etudiant.heurePointage && (
                      <span className="text-sm text-[#64748B]">{etudiant.heurePointage}</span>
                    )}
                    <StatusBadge statut={etudiant.statut} />
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
            {!loading && filteredEtudiants.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-[#64748B]">
                Aucun etudiant ne correspond aux filtres actifs.
              </div>
            )}
          </Card>
        </section>

        {/* Exporter */}
        <section>
          <Button variant="primary" className="w-full" icon={Download} onClick={handleExport}>
            Exporter la Liste
          </Button>
        </section>
      </PageLayout>
      <TabBarProfesseur />
    </>
  );
}

export default ListePresence;
