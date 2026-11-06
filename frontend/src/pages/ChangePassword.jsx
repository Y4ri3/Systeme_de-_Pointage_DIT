import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ShieldCheck } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import AuthLayout from '../components/AuthLayout';
import { useAuth } from '../contexts/AuthContext';
import { getApiErrorMessage } from '../utils/api';

function ChangePassword() {
  const navigate = useNavigate();
  const { changePassword, getHomeRoute, user, isLoading } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword.length < 8) {
      setError('Le nouveau mot de passe doit contenir au moins 8 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('La confirmation du mot de passe ne correspond pas.');
      return;
    }

    try {
      const result = await changePassword(currentPassword, newPassword);
      setSuccess(result?.message || 'Mot de passe mis a jour.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      navigate(getHomeRoute(user?.role || 'etudiant'));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Impossible de modifier le mot de passe.'));
    }
  };

  return (
    <AuthLayout maxWidth="max-w-lg">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0C4A6E] shadow-lg">
          <ShieldCheck className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white drop-shadow">Changer le mot de passe</h1>
        <p className="mt-2 text-sm text-white/80 drop-shadow">
          Finalisez votre premiere connexion en definissant un mot de passe personnel.
        </p>
      </div>

      <Card glass className="p-6">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-xl bg-[#FEE2E2] px-4 py-3 text-sm text-[#B91C1C]">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-xl bg-[#D1FAE5] px-4 py-3 text-sm text-[#166534]">
                {success}
              </div>
            )}

            <label className="block text-sm font-medium text-[#0F172A]">
              Mot de passe actuel
              <div className="relative mt-2">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] py-3 pl-10 pr-4 text-sm text-[#0F172A] outline-none focus:border-[#0C4A6E]"
                  required
                />
              </div>
            </label>

            <label className="block text-sm font-medium text-[#0F172A]">
              Nouveau mot de passe
              <div className="relative mt-2">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] py-3 pl-10 pr-4 text-sm text-[#0F172A] outline-none focus:border-[#0C4A6E]"
                  required
                />
              </div>
            </label>

            <label className="block text-sm font-medium text-[#0F172A]">
              Confirmer le nouveau mot de passe
              <div className="relative mt-2">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] py-3 pl-10 pr-4 text-sm text-[#0F172A] outline-none focus:border-[#0C4A6E]"
                  required
                />
              </div>
            </label>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Mise a jour...' : 'Mettre a jour le mot de passe'}
            </Button>
          </form>
        </Card>
    </AuthLayout>
  );
}

export default ChangePassword;
