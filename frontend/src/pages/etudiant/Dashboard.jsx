import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, TrendingUp, Calendar, Clock, MapPin, QrCode, ScanFace, ShieldCheck, Users, AlertTriangle, Bell } from 'lucide-react';
import Header from '../../components/Header';
import TabBarEtudiant from '../../components/TabBarEtudiant';
import PageLayout from '../../components/PageLayout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import StatusBadge from '../../components/StatusBadge';
import { useAuth } from '../../contexts/AuthContext';
import { getStudentAttendanceHistory, getStudentCourses, getStudentNotifications } from '../../api/student';
import { getApiErrorMessage, getLocalDateIso } from '../../utils/api';
import AlertBanner from '../../components/motion/AlertBanner';
import AnimatedNumber from '../../components/motion/AnimatedNumber';
import { SkeletonList } from '../../components/motion/Skeleton';
import { StaggerContainer, StaggerItem } from '../../components/motion/Stagger';
import { buildDisplayName } from '../responsable/gestion/helpers';

function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [history, setHistory] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      setLoading(true);
      setError('');

      try {
        const [coursesData, historyData, notificationsData] = await Promise.all([
          getStudentCourses({ periode: 'upcoming' }),
          getStudentAttendanceHistory(),
          getStudentNotifications()
        ]);

        if (!isMounted) return;

        setCourses(Array.isArray(coursesData) ? coursesData : []);
        setHistory(Array.isArray(historyData) ? historyData : []);
        setNotifications(Array.isArray(notificationsData) ? notificationsData.slice(0, 3) : []);
      } catch (requestError) {
        if (!isMounted) return;
        setError(getApiErrorMessage(requestError, 'Impossible de charger votre tableau de bord.'));
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  // getStudentCourses({ periode: 'upcoming' }) ne filtre que sur date >= aujourd'hui
  // cote backend (n'importe quel jour futur) : on restreint ici a la date du jour
  // pour que "Cours du jour" n'affiche pas des seances a plusieurs semaines.
  const todayIso = getLocalDateIso();
  const todayCourses = useMemo(
    () => courses.filter((course) => course.date === todayIso && course.statut !== 'annule'),
    [courses, todayIso]
  );

  const recentHistory = history.slice(0, 3);

  // /etudiant/absences/summary ne fournit pas de taux/decompte utilisables ici
  // (voir student.js) : les stats sont calculees a partir de l'historique reel.
  const attendanceStats = useMemo(() => {
    const presences = history.filter((item) => item.statut === 'present').length;
    const retards = history.filter((item) => item.statut === 'retard').length;
    const absences = history.filter((item) => item.statut === 'absent').length;
    const total = history.length;
    const taux = total > 0 ? Math.round(((presences + retards * 0.5) / total) * 100) : 0;

    return { taux, presences, retards, absences, total };
  }, [history]);

  const tauxGlobal = attendanceStats.taux;
  const statusGlobal = tauxGlobal >= 90 ? 'bon' : tauxGlobal >= 75 ? 'attention' : 'critique';
  const totalAbsences = attendanceStats.absences;
  const totalRetards = attendanceStats.retards;
  const totalCours = attendanceStats.total;
  const alertCount = notifications.filter((notification) => notification.type === 'warning' || notification.type === 'error').length;

  return (
    <>
      <Header titre="Tableau de Bord" />
      <PageLayout>
        <AlertBanner variant="error" message={error} />

        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-[#0C4A6E] to-[#0369A1] p-5 text-white md:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#BAE6FD]">Bonjour</p>
                <h2 className="truncate text-2xl font-bold">{buildDisplayName(user)}</h2>
                <p className="mt-2 max-w-2xl text-sm text-white/80">
                  Suivez votre assiduite et vos alertes ici. Le pointage se fait uniquement a la borne securisee, par reconnaissance faciale.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm">
                  <p className="text-xs uppercase tracking-[0.12em] text-[#BAE6FD]">Presence</p>
                  <p className="mt-1 text-xl font-bold">{tauxGlobal}%</p>
                </div>
                <div className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm">
                  <p className="text-xs uppercase tracking-[0.12em] text-[#BAE6FD]">Cours</p>
                  <p className="mt-1 text-xl font-bold">{totalCours}</p>
                </div>
                <div className="col-span-2 rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm sm:col-span-1">
                  <p className="text-xs uppercase tracking-[0.12em] text-[#BAE6FD]">Statut</p>
                  <p className="mt-1 text-sm font-semibold">
                    {statusGlobal === 'bon' ? 'Bon niveau' : statusGlobal === 'attention' ? 'Sous vigilance' : 'Critique'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 md:gap-6">
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#E0F2FE]">
                <TrendingUp className="w-6 h-6 text-[#0C4A6E]" />
              </div>
              <StatusBadge statut={statusGlobal} />
            </div>
            <h3 className="text-3xl font-bold text-[#0F172A]"><AnimatedNumber value={tauxGlobal} suffix="%" /></h3>
            <p className="mt-1 text-sm text-[#94A3B8]">Taux de presence</p>
          </Card>
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#D1FAE5]">
                <Calendar className="w-6 h-6 text-[#10B981]" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-[#0F172A]"><AnimatedNumber value={totalAbsences} /></h3>
            <p className="mt-1 text-sm text-[#94A3B8]">Absences totales</p>
          </Card>
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FEF3C7]">
                <Clock className="w-6 h-6 text-[#F59E0B]" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-[#0F172A]"><AnimatedNumber value={totalRetards} /></h3>
            <p className="mt-1 text-sm text-[#94A3B8]">Retards cumules</p>
          </Card>
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FEE2E2]">
                <AlertTriangle className="w-6 h-6 text-[#DC2626]" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-[#0F172A]"><AnimatedNumber value={alertCount} /></h3>
            <p className="mt-1 text-sm text-[#94A3B8]">Alertes actives</p>
          </Card>
        </div>

        <Card className="bg-gradient-to-r from-[#0C4A6E] to-[#1E3A8A] p-6 text-white">
          <div className="flex flex-col items-start gap-4 md:flex-row md:items-center">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-white/15">
              <ScanFace className="h-7 w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="mb-2 flex items-center gap-2 text-xl font-bold">
                Deux facons de pointer
                <ShieldCheck className="h-5 w-5 text-[#BAE6FD]" />
              </h3>
              <p className="text-blue-100">
                Pour votre securite, la validation de presence ne se fait plus par selfie depuis votre espace
                personnel. Rendez-vous a la borne du campus pour un pointage par reconnaissance faciale, ou scannez
                depuis votre telephone le QR affiche en salle par votre professeur.
              </p>
            </div>
            <Button
              variant="secondary"
              className="flex-shrink-0 bg-white text-[#0C4A6E] hover:bg-[#F8FAFC]"
              icon={QrCode}
              onClick={() => navigate('/etudiant/scan-qr')}
            >
              Scanner un QR
            </Button>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_1fr]">
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#0F172A]">Cours du jour</h2>
              <Button variant="text" size="small" onClick={() => navigate('/etudiant/historique')}>
                Voir l&apos;historique
              </Button>
            </div>
            {loading ? (
              <SkeletonList count={2} variant="row" />
            ) : todayCourses.length > 0 ? (
              <StaggerContainer className="space-y-3">
                {todayCourses.map((cours) => (
                <StaggerItem key={cours.id}>
                <Card className="cursor-pointer p-4 transition-shadow hover:shadow-md">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start">
                    <div className="flex flex-col items-center flex-shrink-0">
                      <span className="text-sm font-semibold text-[#0C4A6E]">{cours.heure_debut || cours.horaireDebut}</span>
                      <div className="my-2 h-8 w-0.5 bg-[#E2E8F0]"></div>
                      <span className="text-xs text-[#94A3B8]">{cours.heure_fin || cours.horaireFin}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-start justify-between gap-2">
                        <h3 className="truncate text-base font-semibold text-[#0F172A]">{cours.nom}</h3>
                        <StatusBadge statut={cours.statut === 'programme' ? 'avenir' : cours.statut} />
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-[#64748B]">
                        <Users className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{cours.professeur}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[#64748B]">
                        <MapPin className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{cours.salle}</span>
                      </div>
                    </div>
                    <div className="w-full md:w-auto md:flex-shrink-0">
                      <Button
                        variant="secondary"
                        className="w-full md:w-auto"
                        onClick={() => navigate(`/etudiant/historique/${cours.id}`)}
                      >
                        Voir le detail
                      </Button>
                    </div>
                  </div>
                </Card>
                </StaggerItem>
                ))}
              </StaggerContainer>
            ) : (
              <Card className="p-6 text-center text-sm text-[#64748B]">
                Aucun cours a venir n&apos;est disponible.
              </Card>
            )}
          </section>

          <section className="space-y-6">
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[#0F172A]">Alertes et rappels</h2>
                <Button variant="text" size="small" onClick={() => navigate('/etudiant/notifications')}>
                  Voir tout
                </Button>
              </div>
              <div className="space-y-3">
                {notifications.slice(0, 2).map((alerte) => (
                  <Card key={alerte.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${
                        alerte.type === 'warning' ? 'bg-[#FEF3C7]' : 'bg-[#E0F2FE]'
                      }`}>
                        {alerte.type === 'warning' ? (
                          <AlertTriangle className="h-5 w-5 text-[#F59E0B]" />
                        ) : (
                          <Bell className="h-5 w-5 text-[#0C4A6E]" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[#0F172A]">{alerte.titre}</p>
                        <p className="mt-1 text-sm text-[#64748B]">{alerte.description}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[#0F172A]">Notifications recentes</h2>
                <Button variant="text" size="small" onClick={() => navigate('/etudiant/notifications')}>
                  Centre
                </Button>
              </div>
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <Card key={notification.id} className="p-4 transition-shadow hover:shadow-md">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-[#0F172A]">{notification.titre}</p>
                          <span className="flex-shrink-0 text-xs text-[#94A3B8]">{notification.date}</span>
                        </div>
                        <p className="mt-1 text-sm text-[#64748B]">{notification.description}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        </div>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#0F172A]">Historique recent</h2>
            <Button variant="text" size="small" onClick={() => navigate('/etudiant/historique')}>
              Voir tout
            </Button>
          </div>
          <StaggerContainer className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {recentHistory.map((cours) => (
              <StaggerItem key={cours.id}>
              <Card
                className="cursor-pointer p-4 transition-shadow hover:shadow-md"
                onClick={() => navigate('/etudiant/historique')}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <h3 className="truncate text-sm font-semibold text-[#0F172A]">
                        {typeof cours.matiere === 'object' ? cours.matiere?.nom : cours.matiere || cours.nom}
                      </h3>
                      <StatusBadge statut={cours.statut || 'termine'} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#64748B]">
                      <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{cours.date}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 flex-shrink-0 text-[#94A3B8]" />
                </div>
              </Card>
              </StaggerItem>
            ))}
            {!loading && recentHistory.length === 0 && (
              <Card className="p-6 text-center text-sm text-[#64748B] lg:col-span-3">
                Aucun historique recent n&apos;est disponible.
              </Card>
            )}
          </StaggerContainer>
        </section>
      </PageLayout>
      <TabBarEtudiant />
    </>
  );
}

export default Dashboard;
