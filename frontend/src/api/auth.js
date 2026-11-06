import { apiFetch, getStoredAuth, withMockFallback } from './client';
import { mockEtudiant, mockProfesseur, mockResponsable } from '../data/mockData';

const mockUsers = {
  etudiant: {
    ...mockEtudiant,
    role: 'etudiant',
    email: 'etudiant@universite.edu',
    password: 'etudiant123'
  },
  professeur: {
    ...mockProfesseur,
    role: 'professeur',
    email: 'professeur@universite.edu',
    password: 'professeur123'
  },
  responsable: {
    ...mockResponsable,
    role: 'responsable',
    email: 'responsable@universite.edu',
    password: 'responsable123'
  }
};

export function loginRequest(email, password) {
  return withMockFallback(
    () =>
      apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      }),
    async () => {
      const foundUser = Object.values(mockUsers).find(
        (user) => user.email === email && user.password === password
      );

      if (!foundUser) {
        const error = new Error('Identifiants incorrects');
        error.status = 401;
        throw error;
      }

      return {
        access_token: `mock-token-${foundUser.role}`,
        token_type: 'bearer',
        role: foundUser.role,
        user_id: foundUser.id,
        must_change_password: false
      };
    }
  );
}

export function getCurrentUser() {
  return withMockFallback(
    () => apiFetch('/auth/me'),
    async () => {
      const authState = getStoredAuth();
      const user = authState?.role ? mockUsers[authState.role] : null;

      if (!user) {
        const error = new Error('Session introuvable');
        error.status = 401;
        throw error;
      }

      const { password, ...profile } = user;
      return profile;
    }
  );
}

export function changePasswordRequest(currentPassword, newPassword) {
  return withMockFallback(
    () =>
      apiFetch('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword
        })
      }),
    async () => ({
      success: true,
      message: 'Mot de passe modifie avec succes.'
    })
  );
}

export function forgotPasswordRequest(email) {
  return withMockFallback(
    () =>
      apiFetch('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email })
      }),
    async () => ({
      message: 'Si un compte existe avec cet email, un lien de reinitialisation a ete envoye.'
    })
  );
}

export function resetPasswordRequest(token, newPassword) {
  return withMockFallback(
    () =>
      apiFetch('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, new_password: newPassword })
      }),
    async () => {
      if (!token) {
        const error = new Error('Lien de reinitialisation invalide.');
        error.status = 400;
        error.data = { code: 'token_invalide' };
        throw error;
      }

      return { message: 'Mot de passe reinitialise avec succes.' };
    }
  );
}

export function quickMockLogin(role) {
  const foundUser = mockUsers[role];
  if (!foundUser) {
    throw new Error('Role mock inconnu');
  }

  return {
    access_token: `mock-token-${foundUser.role}`,
    token_type: 'bearer',
    role: foundUser.role,
    user_id: foundUser.id,
    must_change_password: false
  };
}
