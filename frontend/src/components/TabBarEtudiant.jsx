import React from 'react';
import { motion } from 'framer-motion';
import { Home, Clock, QrCode, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

function TabBarEtudiant() {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) => {
    if (path === '/etudiant/historique') {
      return location.pathname.startsWith('/etudiant/historique');
    }

    return location.pathname === path;
  };

  const navItems = [
    { path: '/etudiant/dashboard', icon: Home, label: 'Tableau de Bord' },
    { path: '/etudiant/scan-qr', icon: QrCode, label: 'Pointage QR' },
    { path: '/etudiant/historique', icon: Clock, label: 'Historique' },
    { path: '/etudiant/profil', icon: User, label: 'Profil' }
  ];

  return (
    <div className="md:hidden z-10 fixed bottom-0 w-full flex flex-col">
      <div className="bg-white shadow-[0_-1px_3px_rgba(15,23,42,0.08)]">
        <nav className="flex justify-around py-2 px-1 max-w-5xl mx-auto w-full">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="relative flex flex-1 flex-col items-center gap-1 py-1"
              >
                {active && (
                  <motion.div
                    layoutId="tabbar-etudiant-pill"
                    className="absolute inset-x-2 inset-y-0.5 rounded-2xl bg-[#E0F2FE]"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  />
                )}
                <div className="relative z-10 w-6 h-6 flex items-center justify-center">
                  <Icon
                    className={`text-xl ${active ? 'text-[#0C4A6E]' : 'text-[#94A3B8]'}`}
                  />
                </div>
                <span className={`relative z-10 text-xs font-normal ${active ? 'text-[#0C4A6E]' : 'text-[#94A3B8]'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
        <div className="h-[env(safe-area-inset-bottom,0px)]"></div>
      </div>
    </div>
  );
}

export default TabBarEtudiant;
