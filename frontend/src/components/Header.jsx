import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Bell, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getStudentNotifications } from '../api/student';
import { getProfessorNotifications, markProfessorNotificationAsRead } from '../api/professor';
import { listAdminNotifications, markAdminNotificationAsRead } from '../api/admin';
import { markStudentNotificationAsRead } from '../api/student';
import Avatar from './Avatar';

function Header({ titre, showBack = false, showNotifications = true, showLogout = true, rightContent = null }) {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    let isMounted = true;

    async function loadNotifications() {
      if (!user) {
        if (isMounted) {
          setNotifications([]);
        }
        return;
      }

      try {
        let data = [];

        if (user.role === 'etudiant') {
          data = await getStudentNotifications();
        } else if (user.role === 'professeur') {
          data = await getProfessorNotifications();
        } else if (user.role === 'responsable' || user.role === 'admin') {
          data = await listAdminNotifications();
        }

        if (!isMounted) return;
        setNotifications(Array.isArray(data) ? data : []);
      } catch (error) {
        if (!isMounted) return;
        setNotifications([]);
      }
    }

    loadNotifications();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const notificationCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length || notifications.length,
    [notifications]
  );

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleNotificationClick = async (notificationId) => {
    setNotificationsOpen(false);

    try {
      if (user?.role === 'etudiant') {
        await markStudentNotificationAsRead(notificationId);
      } else if (user?.role === 'professeur') {
        await markProfessorNotificationAsRead(notificationId);
      } else if (user?.role === 'responsable' || user?.role === 'admin') {
        await markAdminNotificationAsRead(notificationId);
      }
    } catch (error) {
      return;
    }

    setNotifications((current) =>
      current.map((item) =>
        item.id === notificationId
          ? {
              ...item,
              read: true
            }
          : item
      )
    );
  };

  const roleLabel = useMemo(() => {
    if (!user?.role) return '';

    const labels = {
      etudiant: 'Etudiant',
      professeur: 'Professeur',
      responsable: 'Responsable'
    };

    return labels[user.role] || user.role;
  }, [user]);

  return (
    <div className="fixed top-0 left-0 right-0 z-30 bg-white/95 shadow-[0_1px_3px_rgba(15,23,42,0.08)] backdrop-blur-sm md:left-64">
      <div className="h-[env(safe-area-inset-top,0px)]"></div>
      <header className="mx-auto flex h-14 w-full max-w-screen-2xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="flex items-center gap-3 min-w-0">
          {showBack && (
            <button 
              onClick={() => navigate(-1)}
              className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-[#F8FAFC] transition flex-shrink-0"
            >
              <ChevronLeft className="w-5 h-5 text-[#334155]" />
            </button>
          )}
          <h1 className="text-xl font-semibold text-[#0F172A] truncate">{titre}</h1>
        </div>
        <div className="relative flex items-center gap-2 flex-shrink-0">
          {user && (
            <div className="hidden sm:flex items-center gap-3 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <Avatar user={user} size="sm" />
              <div className="min-w-0">
                <p className="max-w-[140px] truncate text-sm font-semibold leading-5 text-[#0F172A] md:max-w-[180px]">
                  {[user.prenom, user.nom].filter(Boolean).join(' ') || user.nom}
                </p>
                <p className="truncate text-xs text-[#64748B]">
                  {roleLabel}
                </p>
              </div>
            </div>
          )}
          {showNotifications && (
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen((current) => !current)}
                className="relative flex h-10 w-10 items-center justify-center rounded-xl hover:bg-[#F8FAFC] transition"
                title="Notifications"
                aria-label={`Notifications${notificationCount > 0 ? ` (${notificationCount})` : ''}`}
              >
                <Bell className="w-5 h-5 text-[#334155]" />
                {notificationCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-[#DC2626] px-1 text-[10px] font-semibold leading-none text-white shadow-sm">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </span>
                )}
              </button>
            </div>
          )}
          {showLogout && (
            <button 
              onClick={handleLogout}
              className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-[#F8FAFC] transition"
              title="Se déconnecter"
            >
              <LogOut className="w-5 h-5 text-[#334155]" />
            </button>
          )}
          {rightContent}
          {showNotifications && notificationsOpen && (
            <div className="absolute right-0 top-full mt-3 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_20px_25px_-5px_rgba(15,23,42,0.08),0_10px_10px_-5px_rgba(15,23,42,0.03)]">
              <div className="border-b border-[#E2E8F0] px-4 py-3">
                <h3 className="text-sm font-semibold text-[#0F172A]">Notifications</h3>
                <p className="text-xs text-[#64748B]">Informations recentes liees a votre espace.</p>
              </div>
              <div className="max-h-[320px] overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNotificationClick(item.id)}
                      className="w-full border-b border-[#F1F5F9] px-4 py-3 text-left transition hover:bg-[#F8FAFC]"
                    >
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-[#0F172A]">{item.titre}</p>
                        <span className="text-[11px] text-[#94A3B8]">{item.date}</span>
                      </div>
                      <p className="text-sm text-[#64748B]">{item.description}</p>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-6 text-center text-sm text-[#64748B]">
                    Aucune notification pour le moment.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </header>
    </div>
  );
}

export default Header;
