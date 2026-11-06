import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ConfirmProvider } from './contexts/ConfirmContext';
import PageTransition from './components/motion/PageTransition';
import PageLoader from './components/motion/PageLoader';

const Login = lazy(() => import('./pages/Login'));
const ChangePassword = lazy(() => import('./pages/ChangePassword'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));

// Étudiant
const EtudiantDashboard = lazy(() => import('./pages/etudiant/Dashboard'));
const EtudiantScanQR = lazy(() => import('./pages/etudiant/ScanQR'));
const EtudiantHistorique = lazy(() => import('./pages/etudiant/Historique'));
const EtudiantDetailMatiere = lazy(() => import('./pages/etudiant/DetailMatiere'));
const EtudiantNotifications = lazy(() => import('./pages/etudiant/Notifications'));
const EtudiantProfil = lazy(() => import('./pages/etudiant/Profil'));

// Professeur
const ProfesseurMesCours = lazy(() => import('./pages/professeur/MesCours'));
const ProfesseurSuiviPresence = lazy(() => import('./pages/professeur/SuiviPresence'));
const ProfesseurListePresence = lazy(() => import('./pages/professeur/ListePresence'));
const ProfesseurProfil = lazy(() => import('./pages/professeur/Profil'));
const KioskAttendance = lazy(() => import('./pages/KioskAttendance'));

// Responsable
const ResponsableDashboard = lazy(() => import('./pages/responsable/Dashboard'));
const ResponsableAlertes = lazy(() => import('./pages/responsable/Alertes'));
const ResponsableDetailEtudiant = lazy(() => import('./pages/responsable/DetailEtudiant'));
const ResponsableGestion = lazy(() => import('./pages/responsable/gestion/Gestion'));
const ResponsableProfil = lazy(() => import('./pages/responsable/Profil'));

const RESPONSABLE_ROLES = ['responsable', 'admin'];

const ProtectedRoute = ({ children, requiredRole, requiredRoles }) => {
  const { isAuthenticated, user, getHomeRoute, mustChangePassword, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  const allowedRoles = requiredRoles || (requiredRole ? [requiredRole] : []);

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to={getHomeRoute(user.role)} replace />;
  }

  return <PageTransition>{children}</PageTransition>;
};

const HomeRedirect = () => {
  const { isAuthenticated, user, getHomeRoute, mustChangePassword, isInitializing } = useAuth();

  if (isInitializing) {
    return null;
  }

  if (isAuthenticated) {
    if (mustChangePassword) {
      return <Navigate to="/change-password" replace />;
    }

    return <Navigate to={getHomeRoute(user.role)} replace />;
  }

  return (
    <PageTransition>
      <Login />
    </PageTransition>
  );
};

function AppRoutes() {
  const location = useLocation();

  return (
    <Suspense fallback={<PageLoader />}>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/forgot-password" element={<PageTransition><ForgotPassword /></PageTransition>} />
          <Route path="/reset-password" element={<PageTransition><ResetPassword /></PageTransition>} />
          <Route path="/change-password" element={
            <ProtectedRoute>
              <ChangePassword />
            </ProtectedRoute>
          } />

          {/* Routes Étudiant */}
          <Route path="/etudiant/dashboard" element={
            <ProtectedRoute requiredRole="etudiant">
              <EtudiantDashboard />
            </ProtectedRoute>
          } />
          <Route path="/etudiant/scan-qr" element={
            <ProtectedRoute requiredRole="etudiant">
              <EtudiantScanQR />
            </ProtectedRoute>
          } />
          <Route path="/etudiant/historique" element={
            <ProtectedRoute requiredRole="etudiant">
              <EtudiantHistorique />
            </ProtectedRoute>
          } />
          <Route path="/etudiant/historique/:matiereId" element={
            <ProtectedRoute requiredRole="etudiant">
              <EtudiantDetailMatiere />
            </ProtectedRoute>
          } />
          <Route path="/etudiant/notifications" element={
            <ProtectedRoute requiredRole="etudiant">
              <EtudiantNotifications />
            </ProtectedRoute>
          } />
          <Route path="/etudiant/profil" element={
            <ProtectedRoute requiredRole="etudiant">
              <EtudiantProfil />
            </ProtectedRoute>
          } />

          {/* Routes Professeur */}
          <Route path="/professeur/cours" element={
            <ProtectedRoute requiredRole="professeur">
              <ProfesseurMesCours />
            </ProtectedRoute>
          } />
          <Route path="/professeur/qr/:courseId" element={
            <ProtectedRoute requiredRole="professeur">
              <ProfesseurSuiviPresence />
            </ProtectedRoute>
          } />
          <Route path="/professeur/presences" element={
            <ProtectedRoute requiredRole="professeur">
              <ProfesseurListePresence />
            </ProtectedRoute>
          } />
          <Route path="/professeur/presences/:courseId" element={
            <ProtectedRoute requiredRole="professeur">
              <ProfesseurListePresence />
            </ProtectedRoute>
          } />
          <Route path="/professeur/profil" element={
            <ProtectedRoute requiredRole="professeur">
              <ProfesseurProfil />
            </ProtectedRoute>
          } />

          <Route path="/borne-pointage" element={
            <ProtectedRoute requiredRoles={['professeur', 'responsable', 'admin']}>
              <KioskAttendance />
            </ProtectedRoute>
          } />

          {/* Routes Responsable */}
          <Route path="/responsable/dashboard" element={
            <ProtectedRoute requiredRoles={RESPONSABLE_ROLES}>
              <ResponsableDashboard />
            </ProtectedRoute>
          } />
          <Route path="/responsable/alertes" element={
            <ProtectedRoute requiredRoles={RESPONSABLE_ROLES}>
              <ResponsableAlertes />
            </ProtectedRoute>
          } />
          <Route path="/responsable/etudiant/:etudiantId" element={
            <ProtectedRoute requiredRoles={RESPONSABLE_ROLES}>
              <ResponsableDetailEtudiant />
            </ProtectedRoute>
          } />
          <Route path="/responsable/gestion" element={
            <ProtectedRoute requiredRoles={RESPONSABLE_ROLES}>
              <ResponsableGestion />
            </ProtectedRoute>
          } />
          <Route path="/responsable/profil" element={
            <ProtectedRoute requiredRoles={RESPONSABLE_ROLES}>
              <ResponsableProfil />
            </ProtectedRoute>
          } />
        </Routes>
      </AnimatePresence>
    </Suspense>
  );
}

function App() {
  return (
    <AuthProvider>
      <ConfirmProvider>
        <Router>
          <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
          <AppRoutes />
        </Router>
      </ConfirmProvider>
    </AuthProvider>
  );
}

export default App;
