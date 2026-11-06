import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  Clock,
  LoaderCircle,
  Lock,
  MapPin,
  RotateCcw,
  ScanFace,
  ShieldCheck,
  UserRound
} from 'lucide-react';
import Header from '../components/Header';
import PageLayout from '../components/PageLayout';
import Card from '../components/Card';
import Button from '../components/Button';
import CameraCapture from '../components/CameraCapture';
import AlertBanner from '../components/motion/AlertBanner';
import { StaggerContainer, StaggerItem } from '../components/motion/Stagger';
import { kioskCheckinStudent, kioskScanStudent } from '../api/attendance';
import { getKioskErrorMessage, formatBackendTime, getPhotoUrl } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { buildDisplayName, getCourseName } from './responsable/gestion/helpers';

const AUTO_RESET_DELAY_MS = 8000;

function courseTimeLabel(course) {
  const start = formatBackendTime(course?.heure_debut);
  const end = formatBackendTime(course?.heure_fin);
  if (!start && !end) return 'Horaire non renseigne';
  return `${start} - ${end}`;
}

function KioskAttendance() {
  const { user, logout } = useAuth();

  const [step, setStep] = useState('capture'); // 'capture' | 'scanning' | 'identified' | 'checking' | 'result'
  const [selfieFile, setSelfieFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [checkinResult, setCheckinResult] = useState(null);
  const [gpsPosition, setGpsPosition] = useState({ lat: '', lng: '' });
  const [error, setError] = useState('');
  const [now, setNow] = useState(new Date());

  const isStaff = user?.role === 'professeur' || user?.role === 'responsable' || user?.role === 'admin';

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleReset = () => {
    setStep('capture');
    setSelfieFile(null);
    setPreviewUrl('');
    setScanResult(null);
    setCheckinResult(null);
    setGpsPosition({ lat: '', lng: '' });
    setError('');
  };

  useEffect(() => {
    if (step !== 'result') return undefined;

    const timer = setTimeout(() => handleReset(), AUTO_RESET_DELAY_MS);
    return () => clearTimeout(timer);
  }, [step]);

  const handleCapture = async (file, nextPreviewUrl) => {
    setSelfieFile(file);
    setPreviewUrl(nextPreviewUrl);
    setStep('scanning');
    setError('');

    try {
      const result = await kioskScanStudent(file);
      setScanResult(result);
      setStep('identified');
    } catch (requestError) {
      setError(getKioskErrorMessage(requestError));
      setStep('capture');
      setSelfieFile(null);
      setPreviewUrl('');
    }
  };

  const handleCaptureLocation = () => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsPosition({
          lat: position.coords.latitude.toFixed(6),
          lng: position.coords.longitude.toFixed(6)
        });
      },
      () => {}
    );
  };

  const activeCourse = scanResult?.attendance_context?.active_course || null;
  const nextCourse = scanResult?.attendance_context?.next_course || null;
  const todayCourses = scanResult?.attendance_context?.today_courses || [];
  const alreadyCheckedIn = Boolean(scanResult?.attendance_context?.already_checked_in);
  const canCheckinNow = Boolean(scanResult?.attendance_context?.can_checkin_now && activeCourse && !alreadyCheckedIn);

  const handleCheckin = async () => {
    const studentId = scanResult?.student?.id;
    const courseId = activeCourse?.id;
    if (!studentId || !courseId) return;

    setStep('checking');
    setError('');

    try {
      const result = await kioskCheckinStudent({
        studentId,
        courseId,
        selfieFile,
        gpsLat: gpsPosition.lat || undefined,
        gpsLng: gpsPosition.lng || undefined
      });
      setCheckinResult(result);
      setStep('result');
    } catch (requestError) {
      setError(getKioskErrorMessage(requestError));
      setStep('identified');
    }
  };

  const clockLabel = useMemo(
    () => now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    [now]
  );

  if (!isStaff) {
    return (
      <>
        <Header titre="Borne de Pointage" showBack />
        <PageLayout>
          <Card className="p-6 text-center text-sm text-[#64748B]">
            Cet ecran est reserve aux comptes staff pour un usage borne supervise.
          </Card>
        </PageLayout>
      </>
    );
  }

  return (
    <>
      <Header
        titre="Borne de Pointage"
        showBack
        rightContent={
          <div className="hidden items-center gap-2 rounded-xl bg-[#F8FAFC] px-3 py-2 text-sm font-semibold text-[#0C4A6E] md:flex">
            <Clock className="h-4 w-4" />
            {clockLabel}
          </div>
        }
      />
      <PageLayout>
        <AlertBanner variant="error" message={error} />

        <Card className="overflow-hidden">
          <div className="flex flex-col gap-3 bg-gradient-to-r from-[#0C4A6E] to-[#0369A1] p-5 text-white md:flex-row md:items-center md:justify-between md:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white/15">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#BAE6FD]">Borne securisee — operee par {buildDisplayName(user)}</p>
                <p className="mt-1 text-sm text-white/80">
                  Chaque etudiant scanne son propre visage pour pointer. Aucune saisie manuelle n&apos;est necessaire.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold md:hidden">
              <Clock className="h-4 w-4" />
              {clockLabel}
            </div>
          </div>
        </Card>

        {step === 'capture' && (
          <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <Card className="p-4 md:p-6">
              <div className="mb-4 text-center">
                <h2 className="text-lg font-semibold text-[#0F172A]">Etudiant suivant, regardez la camera</h2>
                <p className="mt-1 text-sm text-[#64748B]">La capture se fait directement via la camera de cet appareil.</p>
              </div>
              <CameraCapture capturedPreviewUrl="" onCapture={handleCapture} />
            </Card>

            <Card className="p-4 md:p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E0F2FE]">
                  <ShieldCheck className="h-5 w-5 text-[#0C4A6E]" />
                </div>
                <h2 className="text-lg font-semibold text-[#0F172A]">Pourquoi cette borne ?</h2>
              </div>
              <div className="space-y-3">
                <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-sm text-[#475569]">
                  Pour renforcer la fiabilite du pointage, la reconnaissance faciale ne se fait plus depuis l&apos;espace
                  personnel de l&apos;etudiant : elle passe uniquement par cette borne controlee, avec capture live (pas
                  d&apos;import d&apos;une ancienne photo).
                </div>
                <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-sm text-[#475569]">
                  Une fois le visage reconnu, le profil de l&apos;etudiant et le cours qu&apos;il doit suivre a cet instant
                  s&apos;affichent automatiquement, selon l&apos;heure du jour.
                </div>
              </div>
            </Card>
          </section>
        )}

        {step === 'scanning' && (
          <Card className="flex flex-col items-center gap-4 p-10 text-center">
            <LoaderCircle className="h-10 w-10 animate-spin text-[#0C4A6E]" />
            <p className="text-base font-semibold text-[#0F172A]">Reconnaissance en cours...</p>
            <p className="text-sm text-[#64748B]">Verification du visage et chargement du profil.</p>
          </Card>
        )}

        {(step === 'identified' || step === 'checking') && scanResult?.student && (
          <StaggerContainer className="space-y-6">
            <StaggerItem>
              <Card className="overflow-hidden">
                <div className="flex flex-col gap-4 bg-gradient-to-r from-[#0C4A6E] to-[#0369A1] p-5 text-white md:flex-row md:items-center md:justify-between md:p-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/15 text-2xl font-bold">
                      {previewUrl || scanResult.student.photo_url ? (
                        <img
                          src={previewUrl || getPhotoUrl(scanResult.student.photo_url)}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <UserRound className="h-8 w-8" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#BAE6FD]">Visage reconnu</p>
                      <h2 className="text-xl font-bold md:text-2xl">
                        {scanResult.student.prenom} {scanResult.student.nom}
                      </h2>
                      <p className="mt-1 text-sm text-white/80">
                        {scanResult.student.promotion?.niveau} •{' '}
                        {typeof scanResult.student.promotion?.filiere === 'string'
                          ? scanResult.student.promotion.filiere
                          : scanResult.student.promotion?.filiere?.nom || ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-medium">
                    <CheckCircle className="h-5 w-5" />
                    {Math.round((scanResult.face_verification?.similarity_score || 0) * 100)}% de correspondance
                  </div>
                </div>
              </Card>
            </StaggerItem>

            <StaggerItem>
              {activeCourse && alreadyCheckedIn ? (
                <Card className="border border-[#D1FAE5] bg-[#ECFDF5] p-4 md:p-6">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#166534]">
                    <CheckCircle className="h-4 w-4" />
                    Presence deja enregistree
                  </div>
                  <h3 className="text-xl font-bold text-[#0F172A]">{getCourseName(activeCourse)}</h3>
                  <p className="mt-1 text-sm text-[#166534]">
                    {courseTimeLabel(activeCourse)} — cet etudiant a deja pointe pour ce cours, aucune nouvelle
                    confirmation n&apos;est necessaire.
                  </p>
                </Card>
              ) : activeCourse ? (
                <Card className="border border-[#0C4A6E]/20 bg-[#E0F2FE] p-4 md:p-6">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#0C4A6E]">
                    <Clock className="h-4 w-4" />
                    Cours en cours maintenant
                  </div>
                  <h3 className="text-xl font-bold text-[#0F172A]">{getCourseName(activeCourse)}</h3>
                  <p className="mt-1 text-sm text-[#334155]">{courseTimeLabel(activeCourse)}</p>
                </Card>
              ) : nextCourse ? (
                <Card className="border border-[#FDE68A] bg-[#FFFBEB] p-4 md:p-6">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#92400E]">
                    <Clock className="h-4 w-4" />
                    Aucun cours a pointer pour l&apos;instant
                  </div>
                  <h3 className="text-lg font-semibold text-[#0F172A]">Prochain cours : {getCourseName(nextCourse)}</h3>
                  <p className="mt-1 text-sm text-[#92400E]">{courseTimeLabel(nextCourse)}</p>
                </Card>
              ) : (
                <Card className="p-4 text-center text-sm text-[#64748B] md:p-6">
                  Aucun cours n&apos;est prevu aujourd&apos;hui pour cet etudiant.
                </Card>
              )}
            </StaggerItem>

            {todayCourses.length > 0 && (
              <StaggerItem>
                <Card className="p-4 md:p-6">
                  <h3 className="mb-3 text-sm font-semibold text-[#0F172A]">Emploi du temps du jour</h3>
                  <div className="space-y-2">
                    {todayCourses.map((course) => (
                      <div
                        key={course.id}
                        className={`flex items-center justify-between gap-3 rounded-xl border p-3 text-sm ${
                          activeCourse?.id === course.id ? 'border-[#0C4A6E] bg-[#E0F2FE]' : 'border-[#E2E8F0] bg-white'
                        }`}
                      >
                        <span className="font-medium text-[#0F172A]">{getCourseName(course)}</span>
                        <span className="text-[#64748B]">{courseTimeLabel(course)}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </StaggerItem>
            )}

            <StaggerItem>
              <Button variant="secondary" size="large" className="w-full sm:w-auto" icon={MapPin} onClick={handleCaptureLocation}>
                Ajouter la position GPS (optionnel)
              </Button>
            </StaggerItem>

            <StaggerItem className="flex flex-col gap-3 sm:flex-row">
              <Button variant="secondary" size="large" className="sm:flex-1" icon={RotateCcw} onClick={handleReset}>
                Annuler / etudiant suivant
              </Button>
              <Button
                variant="primary"
                size="large"
                className="sm:flex-1"
                icon={step === 'checking' ? LoaderCircle : ScanFace}
                onClick={handleCheckin}
                disabled={!canCheckinNow || step === 'checking'}
              >
                {step === 'checking'
                  ? 'Pointage en cours...'
                  : alreadyCheckedIn
                    ? 'Deja pointe pour ce cours'
                    : 'Confirmer la presence'}
              </Button>
            </StaggerItem>
          </StaggerContainer>
        )}

        {step === 'result' && checkinResult && (
          <Card className="p-6 text-center md:p-10">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#D1FAE5]">
              <CheckCircle className="h-10 w-10 text-[#10B981]" />
            </div>
            <h3 className="text-2xl font-bold text-[#0F172A]">Pointage confirme</h3>
            <p className="mt-2 text-sm text-[#64748B]">
              {checkinResult.message || `Presence enregistree pour ${scanResult?.student?.prenom || 'l’etudiant'}.`}
            </p>
            <div className="mx-auto mt-6 max-w-xs">
              <motion.div
                key="reset-progress"
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: AUTO_RESET_DELAY_MS / 1000, ease: 'linear' }}
                className="h-1.5 origin-left rounded-full bg-[#0C4A6E]"
              />
              <p className="mt-2 text-xs text-[#94A3B8]">Retour automatique pour l&apos;etudiant suivant...</p>
            </div>
            <Button variant="secondary" className="mt-6" icon={RotateCcw} onClick={handleReset}>
              Etudiant suivant maintenant
            </Button>
          </Card>
        )}

        <div className="flex justify-center">
          <button
            type="button"
            onClick={logout}
            className="text-xs font-medium text-[#94A3B8] hover:text-[#64748B]"
          >
            Fermer la session de la borne
          </button>
        </div>
      </PageLayout>
    </>
  );
}

export default KioskAttendance;
