import React from 'react';
import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Home,
  Clock,
  QrCode,
  User,
  Calendar,
  ListChecks,
  LayoutDashboard,
  AlertTriangle,
  Settings
} from 'lucide-react';
import Avatar from './Avatar';
import logo from '../assets/Logo_DIT_CARRE_696.png';

function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  if (!user) return null;

  const getNavItems = () => {
    switch (user.role) {
      case 'etudiant':
        return [
          { path: '/etudiant/dashboard', icon: Home, label: 'Tableau de Bord' },
          { path: '/etudiant/scan-qr', icon: QrCode, label: 'Pointage QR' },
          { path: '/etudiant/historique', icon: Clock, label: 'Historique' },
          { path: '/etudiant/profil', icon: User, label: 'Profil' }
        ];
      case 'professeur':
        return [
          { path: '/professeur/cours', icon: Calendar, label: 'Mes Cours' },
          { path: '/professeur/presences', icon: ListChecks, label: 'Présences' },
          { path: '/professeur/profil', icon: User, label: 'Profil' }
        ];
      case 'responsable':
        return [
          { path: '/responsable/dashboard', icon: LayoutDashboard, label: 'Tableau de Bord' },
          { path: '/responsable/alertes', icon: AlertTriangle, label: 'Alertes' },
          { path: '/responsable/gestion', icon: Settings, label: 'Gestion' },
          { path: '/responsable/profil', icon: User, label: 'Profil' }
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();
  const isActive = (item) => {
    if (item.path === '/professeur/cours') {
      return location.pathname.startsWith('/professeur/cours') || location.pathname.startsWith('/professeur/qr/');
    }

    if (item.path === '/professeur/presences') {
      return location.pathname.startsWith('/professeur/presences');
    }

    return location.pathname === item.path;
  };

  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-full w-64 bg-white border-r border-[#E2E8F0] flex-col shadow-sm z-20">
      {/* Logo Section */}
      <div className="p-6 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-xl bg-[#0C4A6E] flex items-center justify-center">
            <img src={logo} alt="Logo" className="h-full w-full object-contain p-1" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-[#0F172A] truncate">Pointage</h1>
            <p className="text-xs text-[#94A3B8] truncate">Système de présence</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`relative w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                active ? 'text-white shadow-md' : 'text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]'
              }`}
            >
              {active && (
                <motion.div
                  layoutId="sidebar-active-pill"
                  className="absolute inset-0 rounded-xl bg-[#0C4A6E]"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              )}
              <Icon className="relative z-10 w-5 h-5 flex-shrink-0" />
              <span className="relative z-10 font-medium text-sm truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User Info Footer */}
      <div className="p-4 border-t border-[#E2E8F0]">
        <div className="flex items-center gap-3">
          <Avatar user={user} size="md" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#0F172A] truncate">
              {[user.prenom, user.nom].filter(Boolean).join(' ') || user.nom}
            </p>
            <p className="text-xs text-[#94A3B8] truncate capitalize">
              {user.role === 'etudiant' ? 'Étudiant' : 
               user.role === 'professeur' ? 'Professeur' : 'Responsable'}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
