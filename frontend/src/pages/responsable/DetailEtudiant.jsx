import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Mail, Phone, Calendar, FileText, MessageSquare, MoreVertical } from 'lucide-react';
import Header from '../../components/Header';
import TabBarResponsable from '../../components/TabBarResponsable';
import PageLayout from '../../components/PageLayout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import StatusBadge from '../../components/StatusBadge';
import {
  getAdminStudent,
  getAdminStudentAttendanceByCourse,
  getAdminStudentAttendanceHistory,
  getAdminStudentAttendanceSummary
} from '../../api/admin';
import { formatBackendDate, formatBackendTime, getApiErrorMessage, getPhotoUrl } from '../../utils/api';
import AlertBanner from '../../components/motion/AlertBanner';
import { SkeletonList } from '../../components/motion/Skeleton';
import { StaggerContainer, StaggerItem } from '../../components/motion/Stagger';
import { buildDisplayName, getCourseName, getCourseScheduleLabel, getFiliereLabel, getPromotionLabel } from './gestion/helpers';

function DetailEtudiant() {
  const { etudiantId } = useParams();
  const navigate = useNavigate();
  const [selectedMatiere, setSelectedMatiere] = useState('toutes');
  const [notesInternes, setNotesInternes] = useState(
    "Étudiant à suivre sur la matière Développement Web. Prévoir un échange si la tendance continue."
  );
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [actionsOpen, setActionsOpen] = useState(false);
  const [student, setStudent] = useState(null);
  const [attendanceSummary, setAttendanceSummary] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [attendanceByCourse, setAttendanceByCourse] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadStudent() {
      setLoading(true);
      setError('');

      try {
        const [studentData, summaryData, historyData, byCourseData] = await Promise.all([
          getAdminStudent(etudiantId),
          getAdminStudentAttendanceSummary(etudiantId),
          getAdminStudentAttendanceHistory(etudiantId),
          getAdminStudentAttendanceByCourse(etudiantId)
        ]);

        if (!isMounted) return;

        const resolvedStudent =
          studentData ||
          summaryData?.student ||
          historyData?.student ||
          byCourseData?.student ||
          null;

        setStudent(resolvedStudent);
        setAttendanceSummary(summaryData || null);
        setAttendanceHistory(Array.isArray(historyData?.history) ? historyData.history : []);
        setAttendanceByCourse(Array.isArray(byCourseData?.rows) ? byCourseData.rows : []);
      } catch (requestError) {
        if (!isMounted) return;
        setError(getApiErrorMessage(requestError, "Impossible de charger la fiche etudiant detaillee."));
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadStudent();

    return () => {
      isMounted = false;
    };
  }, [etudiantId]);

  const getStatusIndicator = (taux) => {
    if (taux >= 90) return 'bon';
    if (taux >= 75) return 'attention';
    return 'critique';
  };

  const subjectRows = useMemo(
    () => Array.isArray(attendanceSummary?.by_subject) ? attendanceSummary.by_subject : [],
    [attendanceSummary]
  );

  const getHistoryItemSubject = (item) => {
    const rawSubject = item.matiere ?? item.course_name ?? item.nom;
    return (typeof rawSubject === 'object' ? rawSubject?.nom : rawSubject) || '';
  };

  const historiqueFiltre = useMemo(() => {
    if (selectedMatiere === 'toutes') return attendanceHistory;
    return attendanceHistory.filter((item) => getHistoryItemSubject(item) === selectedMatiere);
  }, [attendanceHistory, selectedMatiere]);

  const presenceTrend = useMemo(
    () =>
      attendanceHistory.slice(0, 6).reverse().map((item, index) => ({
        label: formatBackendDate(item.date) || `S${index + 1}`,
        value: item.statut === 'present' ? 100 : item.statut === 'retard' ? 50 : 0
      })),
    [attendanceHistory]
  );

  // Le vrai backend renvoie totals = { present, retard, absent, invalide,
  // total_pointages, total_absences_justifiees, total_absences_injustifiees,
  // seuils_atteints, ... } : pas de taux_presence ni de total_cours tout faits,
  // on les recalcule ici.
  const totals = useMemo(() => {
    const rawTotals = attendanceSummary?.totals || {};
    const presences = Number(rawTotals.present || 0);
    const retards = Number(rawTotals.retard || 0);
    const absences = Number(rawTotals.absent || 0);
    const totalCours = Number(rawTotals.total_pointages || presences + retards + absences);
    const tauxPresence = totalCours > 0 ? Math.round(((presences + retards * 0.5) / totalCours) * 100) : 0;

    return { presences, retards, absences, total_cours: totalCours, taux_presence: tauxPresence };
  }, [attendanceSummary]);

  if (loading) {
    return (
      <>
        <Header titre="Fiche etudiant" showBack />
        <PageLayout>
          <SkeletonList count={3} variant="card" />
        </PageLayout>
        <TabBarResponsable />
      </>
    );
  }

  if (!student) {
    return (
      <>
        <Header titre="Fiche etudiant" showBack />
        <PageLayout>
          <AlertBanner variant="error" message={error} />
          <Card className="p-6 text-center text-sm text-[#64748B]">
            Fiche étudiant introuvable.
          </Card>
        </PageLayout>
        <TabBarResponsable />
      </>
    );
  }

  return (
    <>
      <Header 
        showBack
        titre={buildDisplayName(student)}
        rightContent={
          <div className="relative">
            <Button
              variant="text"
              icon={MoreVertical}
              onClick={() => setActionsOpen((current) => !current)}
              aria-label="Actions sur l'etudiant"
            />
            {actionsOpen && (
              <div className="absolute right-0 top-full z-10 mt-2 w-64 overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_20px_25px_-5px_rgba(15,23,42,0.08),0_10px_10px_-5px_rgba(15,23,42,0.03)]">
                <button
                  type="button"
                  onClick={() => {
                    setFeedbackMessage("Notification d'accompagnement envoyee depuis le menu d'actions.");
                    setActionsOpen(false);
                  }}
                  className="w-full border-b border-[#F1F5F9] px-4 py-3 text-left text-sm font-medium text-[#0F172A] transition hover:bg-[#F8FAFC]"
                >
                  Envoyer une notification
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFeedbackMessage('Rendez-vous de suivi planifie dans les actions prioritaire.');
                    setActionsOpen(false);
                  }}
                  className="w-full border-b border-[#F1F5F9] px-4 py-3 text-left text-sm font-medium text-[#0F172A] transition hover:bg-[#F8FAFC]"
                >
                  Planifier un rendez-vous
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigate(`/responsable/gestion?tab=rapports&student=${etudiantId || student.id}`);
                    setActionsOpen(false);
                  }}
                  className="w-full px-4 py-3 text-left text-sm font-medium text-[#0F172A] transition hover:bg-[#F8FAFC]"
                >
                  Generer un rapport
                </button>
              </div>
            )}
          </div>
        }
      />
      <PageLayout>
        <AlertBanner variant="error" message={error} />
        <AlertBanner variant="success" message={feedbackMessage} />

        {/* Infos étudiant */}
        <section>
          <Card className="p-4 md:p-6 text-center">
            <div className="mx-auto mb-4 h-24 w-24 overflow-hidden rounded-full bg-[#0C4A6E] flex items-center justify-center text-white text-3xl font-bold">
              {student.photo_url ? (
                <img src={getPhotoUrl(student.photo_url)} alt="" className="h-full w-full object-cover" />
              ) : (
                student.prenom?.charAt(0) || student.nom?.charAt(0) || 'E'
              )}
            </div>
            <h2 className="text-xl font-bold text-[#0F172A] mb-1">{buildDisplayName(student)}</h2>
            <p className="text-sm text-[#64748B] mb-1">{student.email}</p>
            <p className="text-sm font-medium text-[#0C4A6E] mb-4">
              {getPromotionLabel(student.promotion) || 'Promotion non renseignee'}
              {' • '}
              {getFiliereLabel(student.promotion?.filiere) || 'Filiere non renseignee'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-2 justify-center text-sm">
                <Mail className="w-4 h-4 text-[#64748B] flex-shrink-0" />
                <span className="text-[#0F172A] truncate">{student.email}</span>
              </div>
              <div className="flex items-center gap-2 justify-center text-sm">
                <Phone className="w-4 h-4 text-[#64748B] flex-shrink-0" />
                <span className="text-[#0F172A]">{student.telephone || 'Non renseigne'}</span>
              </div>
            </div>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#F8FAFC] px-4 py-2 text-sm text-[#64748B]">
              <Calendar className="h-4 w-4" />
              Statut : {student.statut || 'Non renseigne'}
            </div>
          </Card>
        </section>

        {/* Résumé présence */}
        <section>
          <Card className="p-4 md:p-6">
            <h3 className="text-lg font-semibold text-[#0F172A] mb-4">Résumé de Présence</h3>
            <div className="flex items-center justify-center mb-4">
              <div className="text-center">
                <div className={`text-4xl font-bold ${
                  Number(totals.taux_presence || 0) >= 90 ? 'text-[#10B981]' : 
                  Number(totals.taux_presence || 0) >= 75 ? 'text-[#F59E0B]' : 'text-[#DC2626]'
                }`}>
                  {totals.taux_presence || 0}%
                </div>
                <div className="text-sm text-[#64748B]">Taux de présence</div>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 text-center mb-4">
              <div className="p-3 bg-[#F8FAFC] rounded-xl">
                <div className="text-lg md:text-xl font-semibold text-[#0F172A]">{totals.total_cours || 0}</div>
                <div className="text-xs text-[#64748B]">Total</div>
              </div>
              <div className="p-3 bg-[#D1FAE5] rounded-xl">
                <div className="text-lg md:text-xl font-semibold text-[#10B981]">{totals.presences || 0}</div>
                <div className="text-xs text-[#64748B]">Présents</div>
              </div>
              <div className="p-3 bg-[#FEF3C7] rounded-xl">
                <div className="text-lg md:text-xl font-semibold text-[#F59E0B]">{totals.retards || 0}</div>
                <div className="text-xs text-[#64748B]">Retards</div>
              </div>
              <div className="p-3 bg-[#FEE2E2] rounded-xl">
                <div className="text-lg md:text-xl font-semibold text-[#DC2626]">{totals.absences || 0}</div>
                <div className="text-xs text-[#64748B]">Absents</div>
              </div>
            </div>
            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-[#0F172A]">Évolution de la présence</h4>
                <span className="text-xs text-[#94A3B8]">Semestre</span>
              </div>
              <div className="grid grid-cols-6 gap-2">
                {presenceTrend.map((item) => (
                  <div key={item.label} className="flex flex-col items-center gap-2">
                    <div className="flex h-28 w-full items-end rounded-xl bg-[#F8FAFC] p-1">
                      <div
                        className="w-full rounded-lg bg-gradient-to-t from-[#0C4A6E] to-[#38BDF8]"
                        style={{ height: `${item.value}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-[#64748B]">{item.label}</span>
                  </div>
                ))}
                {presenceTrend.length === 0 && (
                  <div className="col-span-6 rounded-xl bg-[#F8FAFC] p-4 text-center text-sm text-[#64748B]">
                    Aucune tendance n&apos;est disponible.
                  </div>
                )}
              </div>
            </div>
          </Card>
        </section>

        {/* Détail par matière */}
        <section>
          <h3 className="text-lg font-semibold text-[#0F172A] mb-3">Détail par Matière</h3>
          <StaggerContainer className="space-y-3">
            {subjectRows.map((matiere, index) => (
              <StaggerItem key={matiere.id}>
              <Card className="p-4">
                <div className="flex items-start justify-between mb-2 gap-2">
                  <h4 className="text-sm font-semibold text-[#0F172A] truncate">{matiere.nom || matiere.label || `Matiere ${index + 1}`}</h4>
                  <StatusBadge statut={getStatusIndicator(Number(matiere.tauxPresence || matiere.taux_presence || 0))} />
                </div>
                <p className="text-xs text-[#64748B] mb-2">{matiere.professeur || 'Professeur non renseigne'}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs mb-2">
                  <span className="text-[#10B981]">{matiere.presences || 0} présents</span>
                  <span className="text-[#F59E0B]">{matiere.retards || 0} retards</span>
                  <span className="text-[#DC2626]">{matiere.absences || 0} absents</span>
                </div>
                <div className="h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full"
                    style={{ 
                      width: `${Number(matiere.tauxPresence || matiere.taux_presence || 0)}%`,
                      backgroundColor:
                        Number(matiere.tauxPresence || matiere.taux_presence || 0) >= 90
                          ? '#10B981'
                          : Number(matiere.tauxPresence || matiere.taux_presence || 0) >= 75
                            ? '#F59E0B'
                            : '#DC2626'
                    }}
                  ></div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedMatiere(matiere.nom || matiere.label)}
                  className="mt-3 text-sm font-medium text-[#0369A1] hover:opacity-80"
                >
                  Voir l'historique détaillé
                </button>
              </Card>
              </StaggerItem>
            ))}
          </StaggerContainer>
          {subjectRows.length === 0 && (
            <Card className="p-4 text-sm text-[#64748B]">
              Aucune répartition par matière disponible pour le moment.
            </Card>
          )}
        </section>

        {/* Historique récent */}
        <section>
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-lg font-semibold text-[#0F172A]">Historique Récent</h3>
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setSelectedMatiere('toutes')}
                className={`rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap ${selectedMatiere === 'toutes' ? 'bg-[#0C4A6E] text-white' : 'bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0]'}`}
              >
                Toutes les matières
              </button>
              {subjectRows.map((matiere, index) => (
                <button
                  key={matiere.id || index}
                  type="button"
                  onClick={() => setSelectedMatiere(matiere.nom || matiere.label)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap ${
                    selectedMatiere === (matiere.nom || matiere.label)
                      ? 'bg-[#0C4A6E] text-white'
                      : 'bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0]'
                  }`}
                >
                  {matiere.nom || matiere.label || `Matiere ${index + 1}`}
                </button>
              ))}
            </div>
          </div>
          <Card className="overflow-hidden">
            <div className="divide-y divide-[#E2E8F0]">
              {historiqueFiltre.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-3.5 px-4 hover:bg-[#F8FAFC] transition gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-[#0F172A] truncate">{getHistoryItemSubject(item)}</div>
                    <div className="text-xs text-[#64748B]">{formatBackendDate(item.date) || item.date}</div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {(item.heure || item.heure_pointage || item.pointage_time) && (
                      <span className="text-xs text-[#64748B]">
                        {formatBackendTime(item.heure || item.heure_pointage || item.pointage_time)}
                      </span>
                    )}
                    <StatusBadge statut={item.statut} />
                  </div>
                </div>
              ))}
              {historiqueFiltre.length === 0 && (
                <div className="px-4 py-6 text-center text-sm text-[#64748B]">
                  Aucun enregistrement pour cette matière.
                </div>
              )}
            </div>
          </Card>
        </section>

        <section>
          <h3 className="text-lg font-semibold text-[#0F172A] mb-3">Présences par cours</h3>
          <Card className="overflow-hidden">
            <div className="divide-y divide-[#E2E8F0]">
              {attendanceByCourse.map((row, index) => (
                <div key={row.attendance?.id || row.course?.id || index} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#0F172A]">
                        {row.course ? getCourseName(row.course) : 'Cours non renseigne'}
                      </p>
                      <p className="mt-1 text-sm text-[#64748B]">
                        {formatBackendDate(row.course?.date || row.attendance?.date) || 'Date non renseignee'}
                        {row.course ? ` • ${getCourseScheduleLabel(row.course)}` : ''}
                      </p>
                    </div>
                    <StatusBadge statut={row.attendance?.statut || 'termine'} />
                  </div>
                </div>
              ))}
              {attendanceByCourse.length === 0 && (
                <div className="px-4 py-6 text-center text-sm text-[#64748B]">
                  Aucun détail par cours disponible pour le moment.
                </div>
              )}
            </div>
          </Card>
        </section>

        {/* Actions */}
        <section className="space-y-6">
          <Card className="p-4 md:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-[#0F172A]">Notes internes</h3>
              <Button
                variant="text"
                onClick={() => setFeedbackMessage('Notes internes enregistrées avec succès.')}
              >
                Enregistrer
              </Button>
            </div>
            <textarea
              value={notesInternes}
              onChange={(e) => setNotesInternes(e.target.value)}
              rows={5}
              className="w-full rounded-xl border border-[#E2E8F0] bg-[#F1F5F9] px-4 py-3 text-sm text-[#0F172A] outline-none focus:border-[#0C4A6E]"
              placeholder="Ajoutez un commentaire interne..."
            />
          </Card>

          <div className="space-y-3">
            <Button
              variant="primary"
              className="w-full"
              icon={MessageSquare}
              onClick={() => setFeedbackMessage("Notification d'accompagnement préparée pour l'étudiant.")}
            >
            Envoyer une Notification
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              icon={Calendar}
              onClick={() => setFeedbackMessage('Rendez-vous de suivi ajouté à la liste des actions prioritaires.')}
            >
            Planifier un Rendez-vous
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              icon={FileText}
              onClick={() => navigate(`/responsable/gestion?tab=rapports&student=${etudiantId || student.id}`)}
            >
            Générer un Rapport
            </Button>
          </div>
        </section>
      </PageLayout>
      <TabBarResponsable />
    </>
  );
}

export default DetailEtudiant;
