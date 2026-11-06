import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { changePasswordRequest, getCurrentUser, loginRequest, quickMockLogin } from '../api/auth';
import { clearStoredAuth, getStoredAuth, setStoredAuth, shouldUseMockApi } from '../api/client';
import { toast } from '../utils/toast';

const AuthContext = createContext();

const roleRoutes = {
  etudiant: '/etudiant/dashboard',
  professeur: '/professeur/cours',
  responsable: '/responsable/dashboard',
  admin: '/responsable/dashboard'
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const sessionExpiredHandledRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      const storedAuth = getStoredAuth();

      if (!storedAuth?.accessToken && !storedAuth?.role) {
        if (isMounted) {
          setIsInitializing(false);
        }
        return;
      }

      try {
        if (storedAuth.user) {
          if (!isMounted) return;
          setUser(storedAuth.user);
          setMustChangePassword(Boolean(storedAuth.mustChangePassword));
        } else {
          const profile = await getCurrentUser();
          if (!isMounted) return;

          const nextUser = {
            ...profile,
            role: profile.role || storedAuth.role
          };

          setUser(nextUser);
          setMustChangePassword(Boolean(storedAuth.mustChangePassword));
          setStoredAuth({
            ...storedAuth,
            role: nextUser.role,
            user: nextUser
          });
        }
      } catch (error) {
        clearStoredAuth();
        if (!isMounted) return;
        setUser(null);
        setMustChangePassword(false);
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  // Declenche par client.js sur un 401 alors qu'un token etait present : la
  // session a expire/ete revoquee cote backend. On deconnecte proprement plutot
  // que de laisser chaque page echouer silencieusement, et on previent
  // l'utilisateur (ProtectedRoute se charge ensuite de rediriger vers /login
  // puisque isAuthenticated devient false).
  useEffect(() => {
    const handleSessionExpired = (event) => {
      if (sessionExpiredHandledRef.current) return;
      sessionExpiredHandledRef.current = true;

      setUser(null);
      setMustChangePassword(false);
      toast.error(
        event?.detail?.reason === 'role_mismatch'
          ? "Ce compte n'a pas les droits pour cette section. Veuillez vous reconnecter."
          : 'Votre session a expiré. Veuillez vous reconnecter.'
      );
    };

    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () => window.removeEventListener('auth:session-expired', handleSessionExpired);
  }, []);

  const login = useCallback((email, password) => {
    setIsLoading(true);
    return loginRequest(email, password)
      .then(async (authData) => {
        sessionExpiredHandledRef.current = false;
        setStoredAuth({
          accessToken: authData.access_token,
          tokenType: authData.token_type,
          role: authData.role,
          userId: authData.user_id,
          mustChangePassword: Boolean(authData.must_change_password)
        });

        const profile = await getCurrentUser();
        const nextUser = {
          ...profile,
          role: profile.role || authData.role
        };

        setStoredAuth({
          accessToken: authData.access_token,
          tokenType: authData.token_type,
          role: nextUser.role,
          userId: authData.user_id,
          mustChangePassword: Boolean(authData.must_change_password),
          user: nextUser
        });

        setUser(nextUser);
        setMustChangePassword(Boolean(authData.must_change_password));

        return {
          ...nextUser,
          mustChangePassword: Boolean(authData.must_change_password)
        };
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const quickLogin = useCallback((role) => {
    if (!shouldUseMockApi()) {
      return Promise.reject(new Error('Le quick login est reserve au mode mock.'));
    }

    setIsLoading(true);

    return Promise.resolve()
      .then(async () => {
        const authData = quickMockLogin(role);

        sessionExpiredHandledRef.current = false;
        setStoredAuth({
          accessToken: authData.access_token,
          tokenType: authData.token_type,
          role: authData.role,
          userId: authData.user_id,
          mustChangePassword: Boolean(authData.must_change_password)
        });

        const profile = await getCurrentUser();
        const nextUser = {
          ...profile,
          role: profile.role || authData.role
        };

        setStoredAuth({
          accessToken: authData.access_token,
          tokenType: authData.token_type,
          role: nextUser.role,
          userId: authData.user_id,
          mustChangePassword: Boolean(authData.must_change_password),
          user: nextUser
        });

        setUser(nextUser);
        setMustChangePassword(Boolean(authData.must_change_password));

        return nextUser;
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const logout = useCallback(() => {
    clearStoredAuth();
    setUser(null);
    setMustChangePassword(false);
    // Une requete en vol au moment du logout peut encore renvoyer un 401 avec
    // l'ancien token juste apres : on marque le guard comme "deja gere" pour que
    // ce 401 tardif ne declenche pas un toast "session expiree" confus juste
    // apres une deconnexion volontaire (login/quickLogin le remettent a false).
    sessionExpiredHandledRef.current = true;
  }, []);

  const getHomeRoute = useCallback((userRole) => {
    return roleRoutes[userRole] || '/';
  }, []);

  const refreshUser = useCallback(async () => {
    const profile = await getCurrentUser();
    const storedAuth = getStoredAuth() || {};
    const nextUser = {
      ...profile,
      role: profile.role || storedAuth.role
    };

    setUser(nextUser);
    setStoredAuth({
      ...storedAuth,
      role: nextUser.role,
      user: nextUser
    });

    return nextUser;
  }, []);

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    setIsLoading(true);

    try {
      const result = await changePasswordRequest(currentPassword, newPassword);
      const storedAuth = getStoredAuth() || {};

      setMustChangePassword(false);
      setStoredAuth({
        ...storedAuth,
        // Le backend emet un nouveau JWT dont la claim must_change_password est a jour
        // (JWT_TOKEN.md / decorators.py lisent cette claim, pas la colonne DB en direct) :
        // sans le persister ici, l'ancien jeton reste utilise pour chaque appel suivant
        // et continue de bloquer l'acces malgre le changement de mot de passe reussi.
        accessToken: result?.access_token || storedAuth.accessToken,
        tokenType: result?.token_type || storedAuth.tokenType,
        mustChangePassword: false
      });

      return result;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isInitializing,
        mustChangePassword,
        login,
        quickLogin,
        changePassword,
        logout,
        refreshUser,
        getHomeRoute,
        isAuthenticated: !!user
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
