import { useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Settings,
  FileText,
  CalendarDays,
  AlertTriangle,
  GraduationCap,
  ScanFace
} from 'lucide-react';
import Header from '../../../components/Header';
import TabBarResponsable from '../../../components/TabBarResponsable';
import PageLayout from '../../../components/PageLayout';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import { fadeIn } from '../../../components/motion/variants';
import { toast } from '../../../utils/toast';
import { getPromotionLabel, getStudentPromotionLabel } from './helpers';
import { useStudentsManagement } from './useStudentsManagement';
import { useProfessorsManagement } from './useProfessorsManagement';
import { useAbsencesManagement } from './useAbsencesManagement';
import { usePromotionsManagement } from './usePromotionsManagement';
import { useCoursesManagement } from './useCoursesManagement';
import { useReportsManagement } from './useReportsManagement';
import { useSettingsManagement } from './useSettingsManagement';
import EtudiantsTab from './EtudiantsTab';
import ProfesseursTab from './ProfesseursTab';
import AbsencesTab from './AbsencesTab';
import PromotionsTab from './PromotionsTab';
import CoursTab from './CoursTab';
import RapportsTab from './RapportsTab';
import ParametresTab from './ParametresTab';

const tabs = [
  { id: 'etudiants', label: 'Etudiants', icon: Users },
  { id: 'professeurs', label: 'Professeurs', icon: Users },
  { id: 'absences', label: 'Absences', icon: AlertTriangle },
  { id: 'promotions', label: 'Promotions', icon: GraduationCap },
  { id: 'cours', label: 'Cours', icon: CalendarDays },
  { id: 'rapports', label: 'Rapports', icon: FileText },
  { id: 'parametres', label: 'Parametres', icon: Settings }
];

const validTabIds = tabs.map((tab) => tab.id);

function Gestion() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = validTabIds.includes(searchParams.get('tab')) ? searchParams.get('tab') : 'etudiants';
  const reportStudentParam = searchParams.get('student') || '';

  const onError = useCallback((message) => toast.error(message), []);
  const onSuccess = useCallback((message) => toast.success(message), []);

  const promotionsManagement = usePromotionsManagement({ onError, onSuccess });
  const studentsManagement = useStudentsManagement({ promotions: promotionsManagement.promotions, onError, onSuccess });
  const professorsManagement = useProfessorsManagement({
    promotions: promotionsManagement.promotions,
    onError,
    onSuccess
  });
  const absencesManagement = useAbsencesManagement({ onError, onSuccess });
  const coursesManagement = useCoursesManagement({
    promotions: promotionsManagement.promotions,
    professors: professorsManagement.professors,
    onError,
    onSuccess
  });
  const settingsManagement = useSettingsManagement({ enabled: activeTab === 'parametres', onError, onSuccess });

  const promotionOptions = useMemo(
    () => [
      'toutes',
      ...new Set(
        [
          ...promotionsManagement.promotions.map((promotion) => getPromotionLabel(promotion)),
          ...studentsManagement.students.map((student) => getStudentPromotionLabel(student))
        ].filter(Boolean)
      )
    ],
    [promotionsManagement.promotions, studentsManagement.students]
  );

  const reportsManagement = useReportsManagement({
    students: studentsManagement.students,
    promotionOptions,
    defaultStudentId: reportStudentParam,
    onError,
    onSuccess
  });

  const handleTabChange = (tabId) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', tabId);
    if (tabId !== 'rapports') {
      nextParams.delete('student');
    }
    setSearchParams(nextParams);
  };

  return (
    <>
      <Header titre="Gestion" />
      <PageLayout>
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-[#0C4A6E] to-[#0369A1] p-5 text-white md:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#BAE6FD]">Administration et parametrage</p>
                <h2 className="text-2xl font-bold text-white md:text-3xl">Pilotez les donnees du departement</h2>
                <p className="mt-2 max-w-3xl text-sm text-white/80">
                  Centralisez la gestion des promotions, la planification des cours, les rapports et les regles
                  operationnelles dans un seul espace coherent.
                </p>
              </div>
              <div className="flex flex-wrap items-stretch gap-3">
                <div className="min-w-[110px] flex-1 rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-sm sm:flex-none">
                  <p className="text-xs uppercase tracking-[0.12em] text-[#BAE6FD]">Etudiants</p>
                  <p className="mt-1 text-xl font-semibold text-white">{studentsManagement.studentStats.total}</p>
                </div>
                <div className="min-w-[110px] flex-1 rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-sm sm:flex-none">
                  <p className="text-xs uppercase tracking-[0.12em] text-[#BAE6FD]">Promotions</p>
                  <p className="mt-1 text-xl font-semibold text-white">{promotionsManagement.promotionStats.total}</p>
                </div>
                <div className="min-w-[110px] flex-1 rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-sm sm:flex-none">
                  <p className="text-xs uppercase tracking-[0.12em] text-[#BAE6FD]">Cours</p>
                  <p className="mt-1 text-xl font-semibold text-white">{coursesManagement.courseStats.total}</p>
                </div>
                <Button
                  variant="secondary"
                  className="w-full flex-shrink-0 bg-white text-[#0C4A6E] hover:bg-[#F8FAFC] sm:w-auto"
                  icon={ScanFace}
                  onClick={() => navigate('/borne-pointage')}
                >
                  Ouvrir la borne
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-max gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab.id)}
                  className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                    activeTab === tab.id
                      ? 'border-[#0C4A6E] bg-[#0C4A6E] text-white'
                      : 'border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F8FAFC]'
                  }`}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === 'etudiants' && (
              <EtudiantsTab
                students={studentsManagement}
                promotions={promotionsManagement.promotions}
                promotionOptions={promotionOptions}
                navigate={navigate}
              />
            )}
            {activeTab === 'professeurs' && <ProfesseursTab professors={professorsManagement} />}
            {activeTab === 'absences' && <AbsencesTab absences={absencesManagement} />}
            {activeTab === 'promotions' && <PromotionsTab promotions={promotionsManagement} />}
            {activeTab === 'cours' && (
              <CoursTab courses={coursesManagement} promotions={promotionsManagement.promotions} />
            )}
            {activeTab === 'rapports' && <RapportsTab reports={reportsManagement} students={studentsManagement.students} />}
            {activeTab === 'parametres' && <ParametresTab settings={settingsManagement} />}
          </motion.div>
        </AnimatePresence>
      </PageLayout>
      <TabBarResponsable />
    </>
  );
}

export default Gestion;
