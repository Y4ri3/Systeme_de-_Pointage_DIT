import React from 'react';
import { Mail, Phone, Calendar, UserCircle } from 'lucide-react';
import Header from '../../components/Header';
import TabBarProfesseur from '../../components/TabBarProfesseur';
import PageLayout from '../../components/PageLayout';
import Card from '../../components/Card';
import { useAuth } from '../../contexts/AuthContext';
import { buildDisplayName } from '../responsable/gestion/helpers';

function Profil() {
  const { user } = useAuth();

  return (
    <>
      <Header titre="Profil" />
      <PageLayout>
        <section>
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-[#0C4A6E] to-[#0369A1] p-6 text-white md:p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full bg-white/15 text-2xl font-bold ring-4 ring-white/10">
                    {user?.prenom?.charAt(0) || user?.nom?.charAt(0) || 'P'}
                  </div>
                  <div className="min-w-0">
                    <p className="mb-1 text-sm font-medium text-[#E0F2FE]">Espace enseignant</p>
                    <h2 className="truncate text-2xl font-bold">{buildDisplayName(user)}</h2>
                    <p className="mt-1 text-sm text-[#E0F2FE]">Professeur et gestionnaire de présence</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm">
                    <p className="text-xs uppercase tracking-[0.12em] text-[#BAE6FD]">Statut</p>
                    <p className="mt-1 text-sm font-semibold">
                      {user?.statut ? user.statut.charAt(0).toUpperCase() + user.statut.slice(1) : 'Actif'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm">
                    <p className="text-xs uppercase tracking-[0.12em] text-[#BAE6FD]">Accès</p>
                    <p className="mt-1 text-sm font-semibold">Professeur</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="grid gap-3 border-t border-[#E2E8F0] p-4 sm:grid-cols-2 md:p-6 xl:grid-cols-3">
              <div className="rounded-xl bg-[#F8FAFC] p-4">
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-[#E0F2FE]">
                  <Mail className="h-5 w-5 text-[#0C4A6E]" />
                </div>
                <p className="text-xs text-[#64748B]">Adresse e-mail</p>
                <p className="mt-1 truncate text-sm font-medium text-[#0F172A]">{user?.email}</p>
              </div>
              <div className="rounded-xl bg-[#F8FAFC] p-4">
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-[#E0F2FE]">
                  <Phone className="h-5 w-5 text-[#0C4A6E]" />
                </div>
                <p className="text-xs text-[#64748B]">Téléphone</p>
                <p className="mt-1 text-sm font-medium text-[#0F172A]">{user?.telephone || 'Non renseigné'}</p>
              </div>
              <div className="rounded-xl bg-[#F8FAFC] p-4 sm:col-span-2 xl:col-span-1">
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-[#E0F2FE]">
                  <UserCircle className="h-5 w-5 text-[#0C4A6E]" />
                </div>
                <p className="text-xs text-[#64748B]">Rôle</p>
                <p className="mt-1 text-sm font-medium text-[#0F172A]">Professeur</p>
              </div>
            </div>
          </Card>
        </section>

        <section>
          <Card className="p-4 md:p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E0F2FE]">
                <Calendar className="h-5 w-5 text-[#0C4A6E]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#0F172A]">Organisation du compte</h3>
                <p className="text-sm text-[#64748B]">Les notifications et la déconnexion restent accessibles dans le topbar.</p>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-[#E2E8F0] p-4">
                <p className="text-sm font-semibold text-[#0F172A]">Suivi de présence</p>
                <p className="mt-1 text-sm text-[#64748B]">Suivez en direct les pointages effectués à la borne sécurisée et consultez vos feuilles de présence depuis le menu de gauche.</p>
              </div>
              <div className="rounded-xl border border-[#E2E8F0] p-4">
                <p className="text-sm font-semibold text-[#0F172A]">Navigation desktop</p>
                <p className="mt-1 text-sm text-[#64748B]">Le contenu est maintenant recentré avec la sidebar active, sans décalage ni ascenseur horizontal.</p>
              </div>
            </div>
          </Card>
        </section>

        <section>
          <Card className="overflow-hidden">
            <div className="divide-y divide-[#E2E8F0]">
              <div className="flex items-center gap-3 px-4 py-3.5">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#E0F2FE]">
                  <Mail className="h-5 w-5 text-[#0C4A6E]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-[#64748B]">Email institutionnel</div>
                  <div className="truncate text-sm text-[#0F172A]">{user?.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 px-4 py-3.5">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#E0F2FE]">
                  <Phone className="h-5 w-5 text-[#0C4A6E]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-[#64748B]">Contact</div>
                  <div className="text-sm text-[#0F172A]">{user?.telephone || 'Non renseigné'}</div>
                </div>
              </div>
            </div>
          </Card>
        </section>
      </PageLayout>
      <TabBarProfesseur />
    </>
  );
}

export default Profil;
