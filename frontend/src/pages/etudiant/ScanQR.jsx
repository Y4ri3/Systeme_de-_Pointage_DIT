import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, MapPin, QrCode, RotateCcw, Wifi, XCircle } from 'lucide-react';
import Header from '../../components/Header';
import TabBarEtudiant from '../../components/TabBarEtudiant';
import PageLayout from '../../components/PageLayout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import QrScanner from '../../components/QrScanner';
import AlertBanner from '../../components/motion/AlertBanner';
import { studentCheckinQr } from '../../api/attendance';
import { getQrCheckinErrorMessage, isKioskNetworkForbidden, isQrRetryableError } from '../../utils/api';

function ScanQR() {
  const navigate = useNavigate();

  const [scanning, setScanning] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [gpsPosition, setGpsPosition] = useState({ lat: '', lng: '' });
  const [error, setError] = useState('');
  const [networkBlocked, setNetworkBlocked] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsPosition({
          lat: position.coords.latitude.toFixed(6),
          lng: position.coords.longitude.toFixed(6)
        });
      },
      () => {},
      { timeout: 5000 }
    );
  }, []);

  const handleReset = () => {
    setResult(null);
    setError('');
    setNetworkBlocked(false);
    setScanning(true);
  };

  const handleDecode = async (token) => {
    setScanning(false);
    setSubmitting(true);
    setError('');
    setNetworkBlocked(false);

    try {
      const data = await studentCheckinQr({
        token,
        gpsLat: gpsPosition.lat || undefined,
        gpsLng: gpsPosition.lng || undefined
      });

      setResult({
        ...data,
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      });
    } catch (requestError) {
      setError(getQrCheckinErrorMessage(requestError));

      if (isKioskNetworkForbidden(requestError)) {
        // Retenter sans changer de reseau echouera de la meme facon : on reste
        // bloque sur le message plutot que de relancer la camera pour rien.
        setNetworkBlocked(true);
      } else if (isQrRetryableError(requestError)) {
        // Le QR affiche en salle a probablement deja ete rafraichi : on relance
        // directement le scan plutot que de bloquer sur un message d'erreur.
        setScanning(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Header titre="Pointage par QR" showBack />
      <PageLayout>
        <AlertBanner variant="error" message={error} />

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="p-4 md:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[#0F172A]">Scanner le QR affiche en salle</h2>
                <p className="text-sm text-[#64748B]">
                  Le pointage est confirme automatiquement des que le QR du cours en cours est reconnu.
                </p>
              </div>
              <div className="hidden rounded-xl bg-[#E0F2FE] px-3 py-2 text-sm font-medium text-[#0C4A6E] md:block">
                <QrCode className="h-4 w-4" />
              </div>
            </div>

            {result ? (
              <div className="flex flex-col items-center px-4 py-10 text-center">
                <div
                  className={`mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full ${
                    result.success === false ? 'bg-[#FEE2E2]' : result.statut === 'retard' ? 'bg-[#FEF3C7]' : 'bg-[#D1FAE5]'
                  }`}
                >
                  {result.success === false ? (
                    <XCircle className="h-12 w-12 text-[#DC2626]" />
                  ) : result.statut === 'retard' ? (
                    <Clock className="h-12 w-12 text-[#F59E0B]" />
                  ) : (
                    <CheckCircle className="h-12 w-12 text-[#10B981]" />
                  )}
                </div>
                <h3
                  className={`mb-2 text-2xl font-bold ${
                    result.success === false ? 'text-[#DC2626]' : result.statut === 'retard' ? 'text-[#F59E0B]' : 'text-[#10B981]'
                  }`}
                >
                  {result.success === false
                    ? 'Pointage invalide'
                    : result.statut === 'retard'
                      ? 'Retard enregistre'
                      : 'Presence enregistree'}
                </h3>
                <p className="text-sm text-[#64748B]">Pointe a {result.time}</p>
                <div className="mt-6 flex w-full max-w-xs flex-col gap-3">
                  <Button variant="secondary" size="large" className="w-full" icon={RotateCcw} onClick={handleReset}>
                    Scanner un autre QR
                  </Button>
                  <Button variant="primary" size="large" className="w-full" onClick={() => navigate('/etudiant/dashboard')}>
                    Retour au tableau de bord
                  </Button>
                </div>
              </div>
            ) : networkBlocked ? (
              <div className="flex flex-col items-center px-4 py-10 text-center">
                <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-[#FFFBEB]">
                  <Wifi className="h-12 w-12 text-[#B45309]" />
                </div>
                <h3 className="mb-2 text-xl font-bold text-[#92400E]">Wi-Fi de l&apos;etablissement requis</h3>
                <p className="max-w-sm text-sm text-[#64748B]">
                  Vous n&apos;etes pas connecte au reseau Wi-Fi de l&apos;etablissement. Le pointage par QR ne
                  fonctionne pas en 4G/donnees mobiles, meme si le QR est valide.
                </p>
                <Button variant="primary" size="large" className="mt-6 w-full max-w-xs" icon={RotateCcw} onClick={handleReset}>
                  Reessayer
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-3 flex items-center justify-center gap-2 rounded-xl bg-[#F0F9FF] px-3 py-2 text-sm text-[#0C4A6E]">
                  <Wifi className="h-4 w-4 flex-shrink-0" />
                  Restez connecte au Wi-Fi de l&apos;etablissement pendant le scan.
                </div>
                <QrScanner active={scanning} onDecode={handleDecode} />
                <p className="mt-4 text-center text-sm text-[#64748B]">
                  {submitting ? 'Verification du QR en cours...' : 'Cadrez le QR affiche par votre professeur.'}
                </p>
              </>
            )}
          </Card>

          <Card className="p-4 md:p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E0F2FE]">
                <MapPin className="h-5 w-5 text-[#0C4A6E]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[#0F172A]">Comment ca marche</h2>
                <p className="text-sm text-[#64748B]">Ce pointage ne necessite pas de selfie.</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#0C4A6E] text-xs font-semibold text-white">1</span>
                <p className="text-sm text-[#475569]">Votre professeur affiche un QR pour le cours en cours, valable 2 minutes.</p>
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#0C4A6E] text-xs font-semibold text-white">2</span>
                <p className="text-sm text-[#475569]">Vous le scannez avec votre telephone, connecte a votre compte : la presence est confirmee immediatement.</p>
              </div>
              <div className="flex items-start gap-3 rounded-xl bg-[#FFFBEB] p-4">
                <Wifi className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#B45309]" />
                <p className="text-sm text-[#92400E]">
                  Le Wi-Fi de l&apos;etablissement est obligatoire pour ce pointage : une connexion en 4G/donnees
                  mobiles est refusee, meme avec un QR valide et un compte actif.
                </p>
              </div>
              <div className="flex items-start gap-3 rounded-xl bg-[#F1F5F9] p-4">
                <Clock className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#475569]" />
                <p className="text-sm text-[#475569]">Si le QR a expire, relancez simplement le scan : l&apos;ecran de la salle en affiche un nouveau automatiquement.</p>
              </div>
            </div>
          </Card>
        </section>
      </PageLayout>
      <TabBarEtudiant />
    </>
  );
}

export default ScanQR;
