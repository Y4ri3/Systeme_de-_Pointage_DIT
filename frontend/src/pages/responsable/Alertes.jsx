import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Check } from 'lucide-react';
import Header from '../../components/Header';
import TabBarResponsable from '../../components/TabBarResponsable';
import PageLayout from '../../components/PageLayout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { justifyAdminAbsence, listAdminAbsences } from '../../api/admin';
import { getApiErrorMessage, formatBackendDate } from '../../utils/api';
import AlertBanner from '../../components/motion/AlertBanner';
import { SkeletonList } from '../../components/motion/Skeleton';
import { StaggerContainer, StaggerItem } from '../../components/motion/Stagger';
import { buildDisplayName, getAlertStudent, getFiliereLabel, getPromotionLabel } from './gestion/helpers';

function Alertes() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [criticiteFilter, setCriticiteFilter] = useState('tous');
  const [alerts, setAlerts] = useState([]);
  const [etudiantsTraites, setEtudiantsTraites] = useState([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [promotionFilter, setPromotionFilter] = useState('toutes');
  const [filiereFilter, setFiliereFilter] = useState('toutes');
  const [studentFilter, setStudentFilter] = useState('toutes');
  const [periodeFilter, setPeriodeFilter] = useState('7j');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [justifyingId, setJustifyingId] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadAlerts() {
      setLoading(true);
      setError('');

      try {
        const data = await listAdminAbsences();
        if (!isMounted) return;
        setAlerts(Array.isArray(data) ? data : []);
      } catch (requestError) {
        if (!isMounted) return;
        setError(getApiErrorMessage(requestError, "Impossible de charger les alertes d'absence."));
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadAlerts();

    return () => {
      isMounted = false;
    };
  }, []);

  const promotions = ['toutes', ...new Set(alerts.map((item) => getPromotionLabel(item.promotion)).filter(Boolean))];
  const filieres = ['toutes', ...new Set(alerts.map((item) => getFiliereLabel(item.promotion?.filiere)).filter(Boolean))];
  const students = ['toutes', ...new Set(alerts.map((item) => buildDisplayName(getAlertStudent(item))).filter(Boolean))];

  const filteredEtudiants = useMemo(
    () =>
      alerts.filter(item => {
        const etudiant = getAlertStudent(item);
        const nomComplet = buildDisplayName(etudiant);
        const matchesSearch =
          nomComplet.toLowerCase().includes(searchTerm.toLowerCase()) ||
          String(etudiant.email || item.etudiant_id || '').toLowerCase().includes(searchTerm.toLowerCase());
        const isCritical = Boolean(item.seuil_atteint);
        const matchesCriticite =
          criticiteFilter === 'tous' ||
          (criticiteFilter === 'critique' && isCritical) ||
          (criticiteFilter === 'attention' && !isCritical);
        const matchesPromotion = promotionFilter === 'toutes' || getPromotionLabel(item.promotion) === promotionFilter;
        const matchesFiliere = filiereFilter === 'toutes' || getFiliereLabel(item.promotion?.filiere) === filiereFilter;
        const matchesStudent = studentFilter === 'toutes' || nomComplet === studentFilter;
        const notTraite = !etudiantsTraites.includes(item.id);
        return matchesSearch && matchesCriticite && matchesPromotion && matchesFiliere && matchesStudent && notTraite;
      }),
    [alerts, searchTerm, criticiteFilter, promotionFilter, filiereFilter, studentFilter, etudiantsTraites]
  );

  const handleMarquerTraite = async (item) => {
    if (justifyingId) return;

    setJustifyingId(String(item.id));
    try {
      await justifyAdminAbsence(item.id, { status: 'justified' });
      setEtudiantsTraites((current) => [...current, item.id]);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Impossible de justifier cette absence."));
    } finally {
      setJustifyingId('');
    }
  };

  const stats = {
    total: alerts.length,
    critiques: alerts.filter((item) => item.seuil_atteint).length,
    attention: alerts.filter((item) => !item.seuil_atteint).length,
    variation: periodeFilter === '30j' ? '+6%' : '+3%'
  };

  return (
    <>
      <Header titre="Étudiants en Alerte" />
      <PageLayout>
        <AlertBanner variant="error" message={error} />

        {/* Statistiques */}
        <section>
          <Card className="p-4 md:p-6">
            <div className="grid grid-cols-3 gap-2 md:gap-4 text-center mb-3">
              <div className="p-3 bg-[#F8FAFC] rounded-xl">
                <div className="text-lg md:text-xl font-semibold text-[#0F172A]">{stats.total}</div>
                <div className="text-xs text-[#64748B]">Total</div>
              </div>
              <div className="p-3 bg-[#FEE2E2] rounded-xl">
                <div className="text-lg md:text-xl font-semibold text-[#DC2626]">{stats.critiques}</div>
                <div className="text-xs text-[#64748B]">Critiques</div>
              </div>
              <div className="p-3 bg-[#FEF3C7] rounded-xl">
                <div className="text-lg md:text-xl font-semibold text-[#F59E0B]">{stats.attention}</div>
                <div className="text-xs text-[#64748B]">Attention</div>
              </div>
            </div>
          </Card>
        </section>

        {/* Recherche et filtres */}
        <section>
          <div className="flex flex-col sm:flex-row gap-3 mb-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F1F5F9] border border-[#E2E8F0] text-sm text-[#0F172A] focus:outline-none focus:border-[#0C4A6E]"
              />
            </div>
            <Button
              variant="secondary"
              icon={Filter}
              size="small"
              onClick={() => setShowAdvancedFilters((current) => !current)}
            >
              {showAdvancedFilters ? 'Masquer' : 'Filtres'}
            </Button>
          </div>

          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs text-[#64748B]">Variation période: {stats.variation}</p>
            <button
              type="button"
              onClick={() => setShowAdvancedFilters((current) => !current)}
              className="text-sm font-medium text-[#0369A1] hover:opacity-80"
            >
              {showAdvancedFilters ? 'Masquer les filtres avancés' : 'Afficher les filtres avancés'}
            </button>
          </div>

          {showAdvancedFilters && (
            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <select
                value={promotionFilter}
                onChange={(e) => setPromotionFilter(e.target.value)}
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F1F5F9] px-3 py-2.5 text-sm text-[#0F172A] outline-none focus:border-[#0C4A6E]"
              >
                {promotions.map((promotion) => (
                  <option key={promotion} value={promotion}>
                    {promotion === 'toutes' ? 'Toutes les promotions' : promotion}
                  </option>
                ))}
              </select>
              <select
                value={filiereFilter}
                onChange={(e) => setFiliereFilter(e.target.value)}
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F1F5F9] px-3 py-2.5 text-sm text-[#0F172A] outline-none focus:border-[#0C4A6E]"
              >
                {filieres.map((filiere) => (
                  <option key={filiere} value={filiere}>
                    {filiere === 'toutes' ? 'Toutes les filières' : filiere}
                  </option>
                ))}
              </select>
              <select
                value={studentFilter}
                onChange={(e) => setStudentFilter(e.target.value)}
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F1F5F9] px-3 py-2.5 text-sm text-[#0F172A] outline-none focus:border-[#0C4A6E]"
              >
                {students.map((student) => (
                  <option key={student} value={student}>
                    {student === 'toutes' ? 'Tous les etudiants' : student}
                  </option>
                ))}
              </select>
              <select
                value={periodeFilter}
                onChange={(e) => setPeriodeFilter(e.target.value)}
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F1F5F9] px-3 py-2.5 text-sm text-[#0F172A] outline-none focus:border-[#0C4A6E]"
              >
                <option value="7j">7 derniers jours</option>
                <option value="30j">30 derniers jours</option>
                <option value="semestre">Semestre</option>
              </select>
            </div>
          )}

          <div className="flex gap-2 overflow-x-auto pb-2">
            {['tous', 'critique', 'attention'].map((criticite) => (
              <button
                key={criticite}
                onClick={() => setCriticiteFilter(criticite)}
                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition ${
                  criticiteFilter === criticite 
                    ? criticite === 'critique' 
                      ? 'bg-[#DC2626] text-white' 
                      : 'bg-[#F59E0B] text-white'
                    : 'bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0] hover:bg-[#F1F5F9]'
                }`}
              >
                {criticite === 'tous' ? 'Tous' : criticite === 'critique' ? 'Critiques' : 'Attention'}
              </button>
            ))}
          </div>
        </section>

        {/* Liste des étudiants */}
        <section>
          {loading ? (
            <SkeletonList count={4} variant="row" />
          ) : (
          <StaggerContainer className="space-y-3">
            {filteredEtudiants.map((item) => {
              const etudiant = getAlertStudent(item);
              const nomComplet = buildDisplayName(etudiant);
              const isCritical = Boolean(item.seuil_atteint);

              return (
              <StaggerItem key={item.id}>
              <Card className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3 gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-full bg-[#0C4A6E] flex items-center justify-center text-white text-lg font-semibold flex-shrink-0">
                      {etudiant.nom?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-base font-semibold text-[#0F172A] truncate">{nomComplet}</h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
                            isCritical ? 'bg-[#FEE2E2] text-[#DC2626]' : 'bg-[#FEF3C7] text-[#F59E0B]'
                          }`}
                        >
                          {isCritical ? 'Critique' : 'Attention'}
                        </span>
                      </div>
                      <p className="text-sm text-[#64748B] mb-2">
                        {getPromotionLabel(item.promotion)} • {getFiliereLabel(item.promotion?.filiere)} • {item.matiere?.nom}
                      </p>
                      <p className="text-sm text-[#0F172A] font-medium">
                        {item.nombre_absences || 0} absence(s) non justifiee(s)
                      </p>
                      <p className="text-xs text-[#64748B]">
                        Derniere mise a jour: {formatBackendDate(item.updated_at) || 'Non renseignee'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <p className="text-xs text-[#64748B] mb-1">Résumé :</p>
                  <div className="flex flex-wrap gap-1">
                    <span className="px-2 py-1 bg-[#F8FAFC] rounded-full text-xs text-[#64748B]">
                      {item.nombre_absences || 0} non justifiee(s)
                    </span>
                    <span className="px-2 py-1 bg-[#F8FAFC] rounded-full text-xs text-[#64748B]">
                      {item.nb_absences_justifiees || 0} justifiee(s)
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="primary"
                    size="small"
                    className="flex-1"
                    onClick={() => navigate(`/responsable/etudiant/${item.etudiant_id}`)}
                  >
                    Voir Détails
                  </Button>
                  <Button
                    variant="secondary"
                    size="small"
                    icon={Check}
                    disabled={!item.nombre_absences || justifyingId === String(item.id)}
                    onClick={() => handleMarquerTraite(item)}
                  >
                    {justifyingId === String(item.id) ? 'Justification...' : 'Justifier'}
                  </Button>
                </div>
              </Card>
              </StaggerItem>
              );
            })}
          </StaggerContainer>
          )}
          {!loading && filteredEtudiants.length === 0 && (
            <Card className="p-6 text-center">
              <p className="text-sm text-[#64748B]">Aucune alerte à afficher</p>
            </Card>
          )}
        </section>
      </PageLayout>
      <TabBarResponsable />
    </>
  );
}

export default Alertes;
