import React, { useEffect, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import Header from '../../components/Header';
import TabBarEtudiant from '../../components/TabBarEtudiant';
import PageLayout from '../../components/PageLayout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { getStudentNotifications, markStudentNotificationAsRead } from '../../api/student';
import { getApiErrorMessage } from '../../utils/api';

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadNotifications() {
      setLoading(true);
      setError('');

      try {
        const data = await getStudentNotifications();
        if (!isMounted) return;
        setNotifications(Array.isArray(data) ? data : []);
      } catch (requestError) {
        if (!isMounted) return;
        setError(getApiErrorMessage(requestError, 'Impossible de charger les notifications.'));
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadNotifications();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleMarkAsRead = async (notificationId) => {
    setUpdatingId(notificationId);
    setError('');

    try {
      await markStudentNotificationAsRead(notificationId);
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === notificationId
            ? { ...notification, read: true }
            : notification
        )
      );
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Impossible de mettre la notification a jour.'));
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <>
      <Header titre="Notifications" showBack />
      <PageLayout>
        {error && (
          <Card className="border border-[#FECACA] bg-[#FEF2F2] p-4">
            <p className="text-sm text-[#B91C1C]">{error}</p>
          </Card>
        )}

        <section>
          <Card className="p-4 md:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E0F2FE]">
                <Bell className="h-5 w-5 text-[#0C4A6E]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[#0F172A]">Centre de notifications</h2>
                <p className="text-sm text-[#64748B]">
                  Suivez vos rappels de cours, alertes d&apos;assiduite et mises a jour importantes.
                </p>
              </div>
            </div>
          </Card>
        </section>

        <section>
          <div className="space-y-3">
            {loading ? (
              <Card className="p-6 text-center text-sm text-[#64748B]">
                Chargement des notifications...
              </Card>
            ) : notifications.length > 0 ? (
              notifications.map((notification) => (
                <Card key={notification.id} className="p-4 md:p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-[#0F172A]">{notification.titre}</p>
                        {!notification.read && (
                          <span className="rounded-full bg-[#DBEAFE] px-2.5 py-1 text-[11px] font-semibold text-[#1D4ED8]">
                            Nouveau
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[#64748B]">{notification.description}</p>
                      <p className="mt-2 text-xs text-[#94A3B8]">{notification.date}</p>
                    </div>
                    <Button
                      variant="secondary"
                      size="small"
                      icon={CheckCheck}
                      disabled={notification.read || updatingId === notification.id}
                      onClick={() => handleMarkAsRead(notification.id)}
                    >
                      {notification.read ? 'Lue' : updatingId === notification.id ? 'Mise a jour...' : 'Marquer comme lue'}
                    </Button>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="p-6 text-center text-sm text-[#64748B]">
                Aucune notification disponible.
              </Card>
            )}
          </div>
        </section>
      </PageLayout>
      <TabBarEtudiant />
    </>
  );
}

export default Notifications;
