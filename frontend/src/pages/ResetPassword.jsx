import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Eye, EyeOff, Lock, ShieldAlert } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import AuthLayout from '../components/AuthLayout';
import { resetPasswordRequest } from '../api/auth';
import { getPasswordResetErrorMessage } from '../utils/api';

function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setSubmitting(true);

    try {
      await resetPasswordRequest(token, newPassword);
      setSuccess(true);
    } catch (requestError) {
      setError(getPasswordResetErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <AuthLayout>
        <Card glass className="p-6 text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FEE2E2]">
            <ShieldAlert className="h-8 w-8 text-[#DC2626]" />
          </div>
          <h1 className="text-xl font-bold text-[#0F172A]">Lien invalide</h1>
          <p className="text-sm text-[#64748B]">
            Ce lien de reinitialisation est incomplet ou invalide. Redemandez un nouveau lien.
          </p>
          <Link to="/forgot-password">
            <Button variant="primary" className="w-full">
              Redemander un lien
            </Button>
          </Link>
        </Card>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-[#0C4A6E] flex items-center justify-center shadow-lg">
          <Lock className="h-9 w-9 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white drop-shadow mb-2">Nouveau mot de passe</h1>
        <p className="text-sm text-white/80 drop-shadow">Choisissez un nouveau mot de passe pour votre compte.</p>
      </div>

      <Card glass className="p-6">
          {success ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4 text-center"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#D1FAE5]">
                <CheckCircle className="h-7 w-7 text-[#10B981]" />
              </div>
              <p className="text-sm text-[#0F172A]">
                Votre mot de passe a ete reinitialise avec succes. Vous pouvez maintenant vous connecter.
              </p>
              <Button variant="primary" className="w-full" onClick={() => navigate('/')}>
                Aller a la connexion
              </Button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-[10px] bg-[#FEE2E2] text-[#DC2626] text-sm">{error}</div>
              )}

              <div className="space-y-2">
                <label htmlFor="newPassword" className="text-sm font-medium text-[#0F172A]">
                  Nouveau mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
                  <input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-12 py-2.5 rounded-[10px] bg-[#F1F5F9] border border-[#E2E8F0] text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#0C4A6E] focus:ring-1 focus:ring-[#0C4A6E]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B]"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-[#0F172A]">
                  Confirmer le mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
                  <input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-[10px] bg-[#F1F5F9] border border-[#E2E8F0] text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#0C4A6E] focus:ring-1 focus:ring-[#0C4A6E]"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Reinitialisation...' : 'Reinitialiser le mot de passe'}
              </Button>
            </form>
          )}
        </Card>
    </AuthLayout>
  );
}

export default ResetPassword;
