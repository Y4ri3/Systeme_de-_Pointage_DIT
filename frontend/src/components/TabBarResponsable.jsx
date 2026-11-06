import React from 'react';
import { LayoutDashboard, AlertTriangle, Settings, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

function TabBarResponsable() {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) => {
    if (path === '/responsable/dashboard') {
      return location.pathname.startsWith('/responsable/dashboard');
    }

    if (path === '/responsable/alertes') {
      return location.pathname.startsWith('/responsable/alertes') || location.pathname.startsWith('/responsable/etudiant/');
    }

    if (path === '/responsable/gestion') {
      return location.pathname.startsWith('/responsable/gestion');
    }

    return location.pathname === path;
  };

  const navItems = [
    { path: '/responsable/dashboard', icon: LayoutDashboard, label: 'Tableau de Bord' },
    { path: '/responsable/alertes', icon: AlertTriangle, label: 'Alertes' },
    { path: '/responsable/gestion', icon: Settings, label: 'Gestion' },
    { path: '/responsable/profil', icon: User, label: 'Profil' }
  ];

  return (
    <div className="md:hidden z-10 fixed bottom-0 w-full flex flex-col">
      <div className="bg-white shadow-[0_-1px_3px_rgba(15,23,42,0.08)]">
        <nav className="flex justify-around py-2 px-1 max-w-5xl mx-auto w-full">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="flex flex-1 flex-col items-center gap-1 py-1"
              >
                <div className="w-6 h-6 flex items-center justify-center">
                  <Icon 
                    className={`text-xl ${isActive(item.path) ? 'text-[#0C4A6E]' : 'text-[#94A3B8]'}`} 
                  />
                </div>
                <span className={`text-xs font-normal ${isActive(item.path) ? 'text-[#0C4A6E]' : 'text-[#94A3B8]'}`}>
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

export default TabBarResponsable;
