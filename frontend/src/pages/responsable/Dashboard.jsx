import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, AlertTriangle, GraduationCap, Calendar, Search, FileText, Settings, ChevronRight, BarChart3 } from 'lucide-react';
import Header from '../../components/Header';
import TabBarResponsable from '../../components/TabBarResponsable';
import PageLayout from '../../components/PageLayout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { useAuth } from '../../contexts/AuthContext';
import { getAdminDashboardSummary, getAdminDashboardTrends, listAdminAbsences, listAdminNotifications } from '../../api/admin';
import { formatBackendDate, getApiErrorMessage } from '../../utils/api';
import AlertBanner from '../../components/motion/AlertBanner';
import AnimatedNumber from '../../components/motion/AnimatedNumber';
import { StaggerContainer, StaggerItem } from '../../components/motion/Stagger';
import { buildDisplayName, getAlertStudent, getFiliereLabel, getPromotionLabel } from './gestion/helpers';

function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [department, setDepartment] = useState(user?.departement || 'Toutes les filieres');
  const [absences, setAbsences] = useState([]);
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      setLoading(true);
      setError('');

      try {
        const [summaryData, trendsData, absencesData, notificationsData] = await Promise.all([
          getAdminDashboardSummary(),
          getAdminDashboardTrends(7),
          listAdminAbsences(),
          listAdminNotifications()
        ]);

        if (!isMounted) return;

        setSummary(summaryData || null);
        setTrends(Array.isArray(trendsData) ? trendsData : []);
        setAbsences(Array.isArray(absencesData) ? absencesData : []);
        setNotifications(Array.isArray(notificationsData) ? notificationsData : []);
      } catch (requestError) {
        if (!isMounted) return;
        setError(getApiErrorMessage(requestError, "Impossible de charger le tableau de bord responsable."));
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

  const departmentOptions = useMemo(() => {
    const values = new Set();

    absences.forEach((item) => {
      const label = getFiliereLabel(item.promotion?.filiere);
      if (label) values.add(label);
    });
    summary?.distribution?.by_department?.forEach((item) => {
      const label = item.department_name || item.label;
      if (label) values.add(label);
    });

    return ['Toutes les filieres', ...values];
  }, [absences, summary]);

  const filteredAbsences = useMemo(() => {
    if (department === 'Toutes les filieres') return absences;

    return absences.filter(
      (item) =>
        getFiliereLabel(item.promotion?.filiere) === department ||
        getPromotionLabel(item.promotion) === department
    );
  }, [absences, department]);

  const criticalAlerts = useMemo(
    () =>
      [...filteredAbsences]
        .sort((a, b) => Number(b.seuil_atteint) - Number(a.seuil_atteint) || Number(b.nombre_absences || 0) - Number(a.nombre_absences || 0))
        .slice(0, 5),
    [filteredAbsences]
  );

  // /admin/dashboard/summary ne fournit pas de taux d'absence par matiere,
  // seulement un nombre de cours (courses_count) : le widget affiche donc une
  // repartition des cours plutot qu'un taux de risque, faute de signal reel.
  const subjectRiskStats = useMemo(() => {
    const apiRows = Array.isArray(summary?.distribution?.by_subject) ? summary.distribution.by_subject : [];
    const maxCourses = Math.max(1, ...apiRows.map((item) => Number(item.courses_count || 0)));

    return apiRows.slice(0, 4).map((item, index) => ({
      id: item.subject_id ?? index,
      label: item.subject_name || `Matiere ${index + 1}`,
      coursesCount: Number(item.courses_count || 0),
      value: Math.round((Number(item.courses_count || 0) / maxCourses) * 100)
    }));
  }, [summary]);

  const dashboardNotifications = useMemo(
    () => notifications.slice(0, 3),
    [notifications]
  );

  const stats = useMemo(() => {
    return {
      totalProfesseurs: Number(summary?.totals?.professors || 0),
      totalEtudiants: Number(summary?.totals?.students ?? summary?.totals?.students_count ?? 0),
      etudiantsEnAlerte: Number(
        summary?.totals?.critical_absence_cases ?? summary?.totals?.alert_students_count ?? filteredAbsences.length
      ),
      coursAujourdhui: Number(summary?.totals?.courses_today ?? summary?.totals?.courses_count ?? 0)
    };
  }, [filteredAbsences.length, summary]);

  return (
    <>
      <Header titre="Tableau de Bord" />
      <PageLayout>
        <AlertBanner variant="error" message={error} />

        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-[#0C4A6E] to-[#0369A1] p-5 text-white md:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#BAE6FD]">Pilotage du département</p>
                <h2 className="truncate text-2xl font-bold">{department}</h2>
                <p className="mt-2 max-w-2xl text-sm text-white/80">
                  Surveillez les tendances d&apos;assiduité, priorisez les alertes critiques et déclenchez les actions de suivi en quelques clics.
                </p>
              </div>
              <div className="w-full max-w-sm rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
                <label className="mb-2 block text-xs uppercase tracking-[0.12em] text-[#BAE6FD]">Département / filière</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-sm text-white outline-none"
                >
                  {departmentOptions.map((option) => (
                    <option key={option} value={option} className="text-[#0F172A]">
                      {option}
                    </option>
                  ))}
                </select>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white/10 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-[#BAE6FD]">Alertes</p>
                    <p className="mt-1 text-lg font-semibold">{loading ? '...' : stats.etudiantsEnAlerte}</p>
                  </div>
                  <div className="rounded-xl bg-white/10 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-[#BAE6FD]">Cours du jour</p>
                    <p className="mt-1 text-lg font-semibold">{loading ? '...' : stats.coursAujourdhui}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#E0F2FE] flex items-center justify-center flex-shrink-0">
                <GraduationCap className="w-6 h-6 text-[#0C4A6E]" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-[#0F172A]">
              {loading ? '...' : <AnimatedNumber value={stats.totalProfesseurs} />}
            </h3>
            <p className="text-sm text-[#94A3B8] mt-1">Professeurs</p>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#D1FAE5] flex items-center justify-center flex-shrink-0">
                <Users className="w-6 h-6 text-[#10B981]" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-[#0F172A]">
              {loading ? '...' : <AnimatedNumber value={stats.totalEtudiants} />}
            </h3>
            <p className="text-sm text-[#94A3B8] mt-1">Étudiants</p>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#FEE2E2] flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-[#DC2626]" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-[#DC2626]">
              {loading ? '...' : <AnimatedNumber value={stats.etudiantsEnAlerte} />}
            </h3>
            <p className="text-sm text-[#94A3B8] mt-1">Alertes</p>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#FEF3C7] flex items-center justify-center flex-shrink-0">
                <Calendar className="w-6 h-6 text-[#F59E0B]" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-[#0F172A]">
              {loading ? '...' : <AnimatedNumber value={stats.coursAujourdhui} />}
            </h3>
            <p className="text-sm text-[#94A3B8] mt-1">Cours aujourd'hui</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="space-y-6">
            <Card className="p-4 md:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-[#0F172A]">Tendance quotidienne</h2>
                  <p className="text-sm text-[#64748B]">Évolution des présences sur les 7 derniers jours.</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E0F2FE]">
                  <BarChart3 className="h-5 w-5 text-[#0C4A6E]" />
                </div>
              </div>
              <div className="grid grid-cols-7 gap-2">
                {trends.length > 0 ? trends.map((item) => {
                  const presentRate = Number(item.present_count || 0);
                  return (
                    <div key={item.date} className="flex flex-col items-center gap-2">
                      <div className="flex h-36 w-full items-end rounded-xl bg-[#F8FAFC] p-1">
                        <div
                          className="w-full rounded-lg bg-gradient-to-t from-[#0C4A6E] to-[#38BDF8]"
                          style={{ height: `${Math.max(8, Math.min(presentRate, 100))}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-[#64748B]">{formatBackendDate(item.date)}</span>
                    </div>
                  );
                }) : (
                  <div className="rounded-xl bg-[#F8FAFC] p-4 text-sm text-[#64748B]">
                    Aucune tendance quotidienne n'est disponible pour le moment.
                  </div>
                )}
              </div>
            </Card>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card className="p-4 md:p-6">
                <h3 className="mb-4 text-lg font-semibold text-[#0F172A]">Etudiants critiques</h3>
                <StaggerContainer className="space-y-4">
                  {criticalAlerts.slice(0, 4).map((item) => (
                    <StaggerItem key={item.id} className="rounded-xl border border-[#E2E8F0] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-[#0F172A]">{buildDisplayName(getAlertStudent(item))}</p>
                          <p className="mt-1 text-sm text-[#64748B]">
                            {getPromotionLabel(item.promotion)} • {getFiliereLabel(item.promotion?.filiere)}
                          </p>
                        </div>
                        <span className="rounded-full bg-[#FEE2E2] px-2.5 py-1 text-xs font-semibold text-[#DC2626]">
                          {item.nombre_absences || 0} abs.
                        </span>
                      </div>
                    </StaggerItem>
                  ))}
                  {criticalAlerts.length === 0 && (
                    <div className="rounded-xl bg-[#F8FAFC] p-4 text-sm text-[#64748B]">
                      Aucune alerte critique n'est disponible.
                    </div>
                  )}
                </StaggerContainer>
              </Card>

              <Card className="p-4 md:p-6">
                <h3 className="mb-4 text-lg font-semibold text-[#0F172A]">Répartition des cours par matière</h3>
                <div className="space-y-4">
                  {subjectRiskStats.map((item) => (
                    <div key={item.id}>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-[#0F172A]">{item.label}</span>
                        <span className="text-sm text-[#64748B]">{item.coursesCount} cours</span>
                      </div>
                      <div className="h-2 rounded-full bg-[#F1F5F9]">
                        <div
                          className={`h-full rounded-full ${item.value < 85 ? 'bg-[#F59E0B]' : 'bg-[#0C4A6E]'}`}
                          style={{ width: `${item.value}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                  {subjectRiskStats.length === 0 && (
                    <div className="rounded-xl bg-[#F8FAFC] p-4 text-sm text-[#64748B]">
                      Aucune donnée de répartition par cours n'est disponible pour le moment.
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </section>

          <section className="space-y-6">
            <Card className="p-4 md:p-6">
              <h2 className="mb-4 text-lg font-semibold text-[#0F172A]">Notifications responsables</h2>
              <div className="space-y-3">
                {dashboardNotifications.map((notification) => (
                  <div key={notification.id} className="rounded-xl border border-[#E2E8F0] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[#0F172A]">{notification.titre}</p>
                        <p className="mt-1 text-sm text-[#64748B]">{notification.description}</p>
                      </div>
                      <span className="flex-shrink-0 text-xs text-[#94A3B8]">{notification.date}</span>
                    </div>
                  </div>
                ))}
                {dashboardNotifications.length === 0 && (
                  <div className="rounded-xl bg-[#F8FAFC] p-4 text-sm text-[#64748B]">
                    Aucune notification pour le moment.
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-4 md:p-6">
              <h2 className="mb-4 text-lg font-semibold text-[#0F172A]">Accès rapides</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Button 
                  variant="secondary" 
                  className="h-auto flex-col py-5 text-center"
                  icon={Search}
                  onClick={() => navigate('/responsable/alertes')}
                >
                  <span className="mt-2 font-medium">Rechercher étudiant</span>
                </Button>
                <Button 
                  variant="secondary" 
                  className="h-auto flex-col py-5 text-center"
                  icon={FileText}
                  onClick={() => navigate('/responsable/gestion?tab=rapports')}
                >
                  <span className="mt-2 font-medium">Générer rapport</span>
                </Button>
                <Button 
                  variant="secondary" 
                  className="h-auto flex-col py-5 text-center"
                  icon={Settings}
                  onClick={() => navigate('/responsable/gestion?tab=promotions')}
                >
                  <span className="mt-2 font-medium">Gérer promotions</span>
                </Button>
                <Button 
                  variant="secondary" 
                  className="h-auto flex-col py-5 text-center"
                  icon={Calendar}
                  onClick={() => navigate('/responsable/gestion?tab=cours')}
                >
                  <span className="mt-2 font-medium">Planifier cours</span>
                </Button>
              </div>
            </Card>
          </section>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Alertes prioritaires */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#0F172A]">Alertes prioritaires</h2>
              <Button variant="text" size="small" onClick={() => navigate('/responsable/alertes')}>
                Voir tout
              </Button>
            </div>
            <StaggerContainer className="space-y-3">
              {criticalAlerts.slice(0, 2).map((item) => {
                const etudiant = getAlertStudent(item);
                const nomComplet = buildDisplayName(etudiant);
                const isCritical = Boolean(item.seuil_atteint);

                return (
                <StaggerItem key={item.id}>
                <Card
                  className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/responsable/etudiant/${item.etudiant_id}`)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-[#0C4A6E] flex items-center justify-center text-white text-base font-semibold flex-shrink-0">
                        {etudiant.nom?.charAt(0) || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="text-sm font-semibold text-[#0F172A] truncate">{nomComplet}</h3>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
                              isCritical ? 'bg-[#FEE2E2] text-[#DC2626]' : 'bg-[#FEF3C7] text-[#F59E0B]'
                            }`}
                          >
                            {isCritical ? 'Critique' : 'Attention'}
                          </span>
                        </div>
                        <p className="text-xs text-[#94A3B8] mb-1 truncate">{getPromotionLabel(item.promotion)}</p>
                        <p className="text-sm text-[#0F172A] font-medium">{item.nombre_absences || 0} absence(s)</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[#94A3B8] flex-shrink-0 mt-1" />
                  </div>
                </Card>
                </StaggerItem>
                );
              })}
              {!loading && criticalAlerts.length === 0 && (
                <Card className="p-4 text-sm text-[#64748B]">
                  Aucune alerte prioritaire pour le moment.
                </Card>
              )}
            </StaggerContainer>
          </section>
        </div>
      </PageLayout>
      <TabBarResponsable />
    </>
  );
}

export default Dashboard;
