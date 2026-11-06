import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle, Mail } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import AuthLayout from '../components/AuthLayout';
import { forgotPasswordRequest } from '../api/auth';
import { getApiErrorMessage } from '../utils/api';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await forgotPasswordRequest(email);
      // Message volontairement generique : on ne revele jamais si l'email existe.
      setSent(true);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Impossible d'envoyer la demande pour le moment."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-[#0C4A6E] flex items-center justify-center shadow-lg">
          <Mail className="h-9 w-9 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white drop-shadow mb-2">Mot de passe oublie</h1>
        <p className="text-sm text-white/80 drop-shadow">Recevez un lien pour choisir un nouveau mot de passe.</p>
      </div>

      <Card glass className="p-6">
          {sent ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4 text-center"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#D1FAE5]">
                <CheckCircle className="h-7 w-7 text-[#10B981]" />
              </div>
              <p className="text-sm text-[#0F172A]">
                Si un compte existe avec l&apos;adresse <span className="font-semibold">{email}</span>, un email
                contenant un lien de reinitialisation vient d&apos;etre envoye. Le lien est valable 30 minutes.
              </p>
              <Link
                to="/"
                className="inline-flex items-center justify-center gap-2 text-sm font-medium text-[#0369A1] hover:opacity-80"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour a la connexion
              </Link>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-[10px] bg-[#FEE2E2] text-[#DC2626] text-sm">{error}</div>
              )}

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-[#0F172A]">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="votre@email.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-[10px] bg-[#F1F5F9] border border-[#E2E8F0] text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#0C4A6E] focus:ring-1 focus:ring-[#0C4A6E]"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Envoi en cours...' : 'Envoyer le lien de reinitialisation'}
              </Button>

              <Link
                to="/"
                className="flex items-center justify-center gap-2 text-sm font-medium text-[#0369A1] hover:opacity-80"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour a la connexion
              </Link>
            </form>
          )}
        </Card>
    </AuthLayout>
  );
}

export default ForgotPassword;
