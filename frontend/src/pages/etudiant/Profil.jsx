import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Phone, BookOpen, LogOut } from 'lucide-react';
import Header from '../../components/Header';
import TabBarEtudiant from '../../components/TabBarEtudiant';
import PageLayout from '../../components/PageLayout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { useAuth } from '../../contexts/AuthContext';
import { buildDisplayName } from '../responsable/gestion/helpers';
import { getPhotoUrl } from '../../utils/api';

function Profil() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <>
      <Header titre="Profil" />
      <PageLayout>
        <section>
          <Card className="p-4 md:p-6 text-center">
            <div className="mx-auto mb-4 h-20 w-20 overflow-hidden rounded-full bg-[#0C4A6E] flex items-center justify-center text-white text-2xl font-bold">
              {user?.photo_url ? (
                <img src={getPhotoUrl(user.photo_url)} alt="" className="h-full w-full object-cover" />
              ) : (
                user?.prenom?.charAt(0) || user?.nom?.charAt(0) || 'E'
              )}
            </div>
            <h2 className="text-xl font-bold text-[#0F172A] mb-1">{buildDisplayName(user)}</h2>
            <p className="text-sm text-[#64748B] mb-1">{user?.email}</p>
            <p className="text-sm font-medium text-[#0C4A6E]">{user?.niveau || 'Promotion non renseignee'}</p>
          </Card>
        </section>

        <section>
          <h3 className="text-lg font-semibold text-[#0F172A] mb-3">Informations personnelles</h3>
          <Card className="overflow-hidden">
            <div className="divide-y divide-[#E2E8F0]">
              <div className="flex items-center gap-3 py-3.5 px-4">
                <div className="w-10 h-10 rounded-xl bg-[#E0F2FE] flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-[#0C4A6E]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-[#64748B]">Email</div>
                  <div className="text-sm text-[#0F172A] truncate">{user?.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 py-3.5 px-4">
                <div className="w-10 h-10 rounded-xl bg-[#E0F2FE] flex items-center justify-center flex-shrink-0">
                  <Phone className="w-5 h-5 text-[#0C4A6E]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-[#64748B]">Téléphone</div>
                  <div className="text-sm text-[#0F172A]">{user?.telephone || 'Non renseigné'}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 py-3.5 px-4">
                <div className="w-10 h-10 rounded-xl bg-[#E0F2FE] flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-5 h-5 text-[#0C4A6E]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-[#64748B]">Filière</div>
                  <div className="text-sm text-[#0F172A]">{user?.filiere || 'Non renseignée'}</div>
                </div>
              </div>
            </div>
          </Card>
        </section>

        <section>
          <Button variant="secondary" className="w-full" icon={LogOut} onClick={handleLogout}>
            Se déconnecter
          </Button>
        </section>
      </PageLayout>
      <TabBarEtudiant />
    </>
  );
}

export default Profil;
