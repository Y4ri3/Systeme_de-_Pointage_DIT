import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import AuthLayout from '../components/AuthLayout';
import { useAuth } from '../contexts/AuthContext';
import logo from '../assets/Logo_DIT_CARRE_696.png';

function Login() {
  const navigate = useNavigate();
  const { login, isLoading, getHomeRoute } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const user = await login(email, password);
      navigate(user.mustChangePassword ? '/change-password' : getHomeRoute(user.role));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <AuthLayout>
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-4 overflow-hidden rounded-2xl bg-[#0C4A6E] flex items-center justify-center shadow-lg">
          <img src={logo} alt="Logo" className="h-full w-full object-contain p-1" />
        </div>
        <h1 className="text-2xl font-bold text-white drop-shadow mb-2">Pointage Système</h1>
        <p className="text-sm text-white/80 drop-shadow">Gestion de présence simplifiée</p>
      </div>

      <Card glass className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-[10px] bg-[#FEE2E2] text-[#DC2626] text-sm">
                {error}
              </div>
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

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-[#0F172A]">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-2.5 rounded-[10px] bg-[#F1F5F9] border border-[#E2E8F0] text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#0C4A6E] focus:ring-1 focus:ring-[#0C4A6E]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B]"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              <div className="text-right">
                <Link to="/forgot-password" className="text-sm font-medium text-[#0369A1] hover:opacity-80">
                  Mot de passe oublie ?
                </Link>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Connexion en cours...' : 'Se connecter'}
            </Button>
          </form>
        </Card>
    </AuthLayout>
  );
}

export default Login;
