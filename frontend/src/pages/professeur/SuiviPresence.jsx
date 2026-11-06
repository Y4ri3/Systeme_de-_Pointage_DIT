import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, MapPin, Users, RefreshCw, List, X, CheckCircle, AlertTriangle, QrCode, ScanFace } from 'lucide-react';
import Header from '../../components/Header';
import TabBarProfesseur from '../../components/TabBarProfesseur';
import PageLayout from '../../components/PageLayout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import StatusBadge from '../../components/StatusBadge';
import { getProfessorCourse, getProfessorCourseAttendance, getProfessorCourseQr, subscribeToProfessorCourseAttendanceStream } from '../../api/professor';
import { getApiErrorMessage } from '../../utils/api';
import AlertBanner from '../../components/motion/AlertBanner';
import { SkeletonList } from '../../components/motion/Skeleton';
import { StaggerContainer, StaggerItem } from '../../components/motion/Stagger';

const AUTO_REFRESH_MS = 15000;
const QR_REFRESH_MS = 60000;

function SuiviPresence() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [cours, setCours] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [sessionClosed, setSessionClosed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [qrExpiresAt, setQrExpiresAt] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState('');

  const scannedCount = attendance.filter((etudiant) => etudiant.statut !== 'absent').length;
  const totalEtudiants = attendance.length || 1;
  const tauxActuel = Math.round((scannedCount / totalEtudiants) * 100);

  useEffect(() => {
    let isMounted = true;

    async function loadCourseData() {
      setLoading(true);
      setError('');

      try {
        const [courseData, attendanceData] = await Promise.all([
          getProfessorCourse(courseId),
          getProfessorCourseAttendance(courseId)
        ]);

        if (!isMounted) return;

        setCours(courseData || attendanceData?.cours || null);
        setAttendance(Array.isArray(attendanceData?.attendance) ? attendanceData.attendance : []);
        setLastUpdated(new Date());
      } catch (requestError) {
        if (!isMounted) return;
        setError(getApiErrorMessage(requestError, 'Impossible de charger la session de suivi.'));
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadCourseData();

    return () => {
      isMounted = false;
    };
  }, [courseId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setError('');

    try {
      const attendanceData = await getProfessorCourseAttendance(courseId);
      setAttendance(Array.isArray(attendanceData?.attendance) ? attendanceData.attendance : []);
      setLastUpdated(new Date());
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Impossible d'actualiser les presences."));
    } finally {
      setRefreshing(false);
    }
  };

  // Push en temps reel (SSE). Tant qu'il n'est pas connecte, le polling
  // ci-dessous reste actif comme repli (voir returnbackend4.md).
  useEffect(() => {
    if (sessionClosed || loading) {
      return undefined;
    }

    const unsubscribe = subscribeToProfessorCourseAttendanceStream(courseId, {
      onOpen: () => setIsLive(true),
      onData: (payload) => {
        setAttendance(Array.isArray(payload?.attendance) ? payload.attendance : []);
        setLastUpdated(new Date());
      },
      onError: () => setIsLive(false)
    });

    return () => {
      setIsLive(false);
      unsubscribe();
    };
  }, [sessionClosed, loading, courseId]);

  useEffect(() => {
    if (sessionClosed || loading || isLive) return undefined;

    const timer = setInterval(() => {
      handleRefresh();
    }, AUTO_REFRESH_MS);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionClosed, loading, isLive, courseId]);

  const handleCloseSession = () => {
    setSessionClosed(true);
  };

  const handleLoadQr = async () => {
    setQrLoading(true);
    setError('');

    try {
      const data = await getProfessorCourseQr(courseId);
      setQrData(data);
      setQrExpiresAt(Date.now() + Number(data?.expires_in || 120) * 1000);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Impossible de generer le QR de pointage.'));
    } finally {
      setQrLoading(false);
    }
  };

  // Le QR expire au bout de 120s cote backend : on le rafraichit toutes les
  // 60s tant qu'il est affiche pour qu'il reste toujours valide.
  useEffect(() => {
    if (!showQr || sessionClosed) return undefined;

    let isMounted = true;

    async function loadQr() {
      setQrLoading(true);
      setError('');

      try {
        const data = await getProfessorCourseQr(courseId);
        if (!isMounted) return;
        setQrData(data);
        setQrExpiresAt(Date.now() + Number(data?.expires_in || 120) * 1000);
      } catch (requestError) {
        if (!isMounted) return;
        setError(getApiErrorMessage(requestError, 'Impossible de generer le QR de pointage.'));
      } finally {
        if (isMounted) setQrLoading(false);
      }
    }

    loadQr();
    const timer = setInterval(loadQr, QR_REFRESH_MS);

    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [showQr, sessionClosed, courseId]);

  useEffect(() => {
    if (!showQr) return undefined;

    const ticker = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(ticker);
  }, [showQr]);

  const qrSecondsLeft = qrExpiresAt ? Math.max(0, Math.round((qrExpiresAt - now) / 1000)) : 0;

  if (loading) {
    return (
      <>
        <Header titre="Suivi de Presence" showBack />
        <PageLayout>
          <SkeletonList count={3} variant="card" />
        </PageLayout>
        <TabBarProfesseur />
      </>
    );
  }

  if (!cours) {
    return (
      <>
        <Header titre="Suivi de Presence" showBack />
        <PageLayout>
          <section>
            <Card className="p-6 md:p-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#FEE2E2]">
                <AlertTriangle className="h-7 w-7 text-[#DC2626]" />
              </div>
              <h2 className="mb-2 text-lg font-semibold text-[#0F172A]">Cours introuvable</h2>
              <p className="mx-auto mb-6 max-w-md text-sm text-[#64748B]">
                La session demandée n&apos;existe pas ou n&apos;est plus disponible.
              </p>
              <Button variant="primary" onClick={() => navigate('/professeur/cours')}>
                Retour aux cours
              </Button>
            </Card>
          </section>
        </PageLayout>
        <TabBarProfesseur />
      </>
    );
  }

  return (
    <>
      <Header
        titre="Suivi de Presence"
        showBack
        rightContent={
          <Button variant="text" icon={X} onClick={() => navigate('/professeur/cours')}>
            Fermer
          </Button>
        }
      />
      <PageLayout>
        <AlertBanner variant="error" message={error} />

        {sessionClosed && (
          <Card className="border border-[#D1FAE5] bg-[#ECFDF5] p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#10B981]" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[#0F172A]">Session de suivi clôturée</p>
                <p className="mt-1 text-sm text-[#166534]">
                  Les présences sont finalisées. Vous pouvez maintenant consulter ou exporter la feuille complète.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Infos du cours */}
        <section>
          <Card className="p-4 md:p-6">
            <h2 className="text-lg font-semibold text-[#0F172A] mb-3 truncate">{cours.nom}</h2>
            <div className="space-y-2 text-sm text-[#64748B]">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 flex-shrink-0" />
                {cours.horaireDebut} - {cours.horaireFin}
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{cours.salle}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{cours.promotion}</span>
              </div>
              <div className="mt-3 p-3 bg-[#E0F2FE] rounded-xl">
                <span className="text-sm text-[#0C4A6E]">Tolérance retards: {cours.tolerance_retard_minutes ?? '—'} minutes</span>
              </div>
            </div>
          </Card>
        </section>

        {/* Suivi en direct */}
        <section>
          <Card className="p-4 md:p-6 text-center">
            {!sessionClosed ? (
              <>
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#E0F2FE]">
                  <ScanFace className="h-10 w-10 text-[#0C4A6E]" />
                </div>
                <div className="mb-2 flex items-center justify-center gap-2">
                  <motion.span
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                    className={`h-2.5 w-2.5 rounded-full ${isLive ? 'bg-[#10B981]' : 'bg-[#F59E0B]'}`}
                  />
                  <span className={`text-sm font-semibold ${isLive ? 'text-[#10B981]' : 'text-[#F59E0B]'}`}>
                    {isLive ? 'En direct' : `Actualisation automatique (${AUTO_REFRESH_MS / 1000}s)`}
                  </span>
                </div>
                <p className="mx-auto mb-4 max-w-md text-sm text-[#64748B]">
                  Les étudiants pointent en scannant leur visage à la borne sécurisée. Cette page se met à jour
                  {isLive
                    ? ' automatiquement des qu’une nouvelle présence est enregistrée pour ce cours.'
                    : ' regulierement en attendant la reconnexion au flux temps reel.'}
                </p>
                {lastUpdated && (
                  <p className="mb-4 text-xs text-[#94A3B8]">
                    Dernière mise à jour : {lastUpdated.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </p>
                )}
                <Button variant="secondary" icon={RefreshCw} onClick={handleRefresh} disabled={refreshing}>
                  {refreshing ? 'Actualisation...' : 'Actualiser maintenant'}
                </Button>
              </>
            ) : (
              <div className="rounded-2xl bg-[#F8FAFC] p-8">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#D1FAE5]">
                  <CheckCircle className="h-8 w-8 text-[#10B981]" />
                </div>
                <h3 className="text-xl font-bold text-[#0F172A]">Suivi terminé</h3>
                <p className="mt-2 text-sm text-[#64748B]">
                  Le suivi en direct est arrêté. Vous pouvez consulter la liste finale des présences.
                </p>
              </div>
            )}
          </Card>
        </section>

        {/* Pointage alternatif par QR */}
        {!sessionClosed && (
          <section>
            <Card className="p-4 md:p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F1F5F9]">
                    <QrCode className="h-5 w-5 text-[#475569]" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-[#0F172A]">Pointage alternatif par QR</h3>
                    <p className="text-sm text-[#64748B]">
                      Les étudiants peuvent aussi pointer depuis leur propre téléphone en scannant ce QR affiché en salle.
                    </p>
                  </div>
                </div>
                <Button variant="secondary" size="small" onClick={() => setShowQr((current) => !current)}>
                  {showQr ? 'Masquer le QR' : 'Afficher le QR'}
                </Button>
              </div>

              {showQr && (
                <div className="flex flex-col items-center gap-4 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-6 text-center">
                  {qrLoading && !qrData ? (
                    <p className="text-sm text-[#64748B]">Generation du QR...</p>
                  ) : qrData?.qr_code_base64 ? (
                    <img
                      src={`data:image/png;base64,${qrData.qr_code_base64}`}
                      alt="QR de pointage"
                      className="h-56 w-56 rounded-xl border border-[#E2E8F0] bg-white p-2"
                    />
                  ) : (
                    <p className="text-sm text-[#64748B]">QR indisponible pour le moment.</p>
                  )}
                  <p className="text-sm font-medium text-[#0C4A6E]">
                    {qrSecondsLeft > 0 ? `Expire dans ${qrSecondsLeft}s` : 'Rafraichissement en cours...'}
                  </p>
                  <Button variant="secondary" size="small" icon={RefreshCw} onClick={handleLoadQr} disabled={qrLoading}>
                    {qrLoading ? 'Actualisation...' : 'Regenerer maintenant'}
                  </Button>
                </div>
              )}
            </Card>
          </section>
        )}

        {/* Statistiques */}
        <section>
          <Card className="p-4 md:p-6">
            <div className="flex items-start justify-between mb-4 gap-3">
              <h3 className="text-base font-semibold text-[#0F172A]">Statistiques en Temps Réel</h3>
              <div className="text-right flex-shrink-0">
                <div className="text-2xl font-bold text-[#0C4A6E]">{scannedCount}</div>
                <div className="text-xs text-[#64748B]">étudiants scannés sur {totalEtudiants}</div>
              </div>
            </div>
            <div className="h-2 bg-[#F1F5F9] rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-[#0C4A6E] rounded-full transition-all"
                style={{ width: `${tauxActuel}%` }}
              ></div>
            </div>
            <div className="mb-4 flex items-center justify-between rounded-xl bg-[#F8FAFC] px-4 py-3">
              <div>
                <p className="text-xs text-[#64748B]">Taux de présence actuel</p>
                <p className="text-sm font-semibold text-[#0F172A]">{tauxActuel}%</p>
              </div>
              <StatusBadge statut={sessionClosed ? 'termine' : 'en cours'} />
            </div>

            <StaggerContainer className="space-y-2">
              <h4 className="text-sm font-medium text-[#0F172A] mb-2">Derniers étudiants scannés:</h4>
              {attendance.slice(0, 4).map((etudiant) => (
                <StaggerItem key={etudiant.id} className="flex items-center justify-between py-2 gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[#0C4A6E] flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                      {etudiant.nom.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[#0F172A] truncate">{etudiant.nom}</div>
                      <div className="text-xs text-[#64748B]">{etudiant.numeroEtudiant}</div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="mb-1 text-sm text-[#0F172A]">{etudiant.heurePointage || 'Aucune'}</div>
                    <StatusBadge statut={etudiant.statut} />
                  </div>
                </StaggerItem>
              ))}
              {!loading && attendance.length === 0 && (
                <div className="rounded-xl bg-[#F8FAFC] p-4 text-sm text-[#64748B]">
                  Aucun pointage n&apos;a encore ete enregistre pour cette session.
                </div>
              )}
            </StaggerContainer>
          </Card>
        </section>

        {/* Actions */}
        <section className="space-y-3">
          <Button
            variant="primary"
            className="w-full"
            icon={List}
            onClick={() => navigate(`/professeur/presences/${courseId}`)}
          >
            Voir la Liste Complète
          </Button>
          <Button variant="secondary" className="w-full" onClick={handleCloseSession} disabled={sessionClosed}>
            {sessionClosed ? 'Suivi déjà clôturé' : 'Arrêter le Suivi en Direct'}
          </Button>
        </section>
      </PageLayout>
      <TabBarProfesseur />
    </>
  );
}

export default SuiviPresence;
