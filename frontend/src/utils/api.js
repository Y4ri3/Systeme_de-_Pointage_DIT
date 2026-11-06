import { appConfig } from '../api/client';

function flattenValidationIssues(value) {
  if (!value) return '';

  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => flattenValidationIssues(item)).filter(Boolean).join(', ');
  }

  if (typeof value === 'object') {
    return Object.entries(value)
      .map(([key, entryValue]) => {
        const message = flattenValidationIssues(entryValue);
        return message ? `${key}: ${message}` : '';
      })
      .filter(Boolean)
      .join(' | ');
  }

  return String(value);
}

export function getApiErrorMessage(error, fallbackMessage = 'Une erreur est survenue.') {
  const validationMessage =
    flattenValidationIssues(error?.data?.errors) ||
    flattenValidationIssues(error?.data?.details?.errors) ||
    flattenValidationIssues(error?.data?.validation_errors);

  return error?.data?.message || error?.data?.detail || validationMessage || error?.message || fallbackMessage;
}

// Le champ transportant le code metier est `error` (confirme par
// guidefrontend.md section 5.6.2 : `err.data?.error`). On garde les autres
// noms en repli au cas ou un endpoint plus ancien utiliserait un autre champ.
export function getApiErrorCode(error) {
  return error?.data?.code || error?.data?.error_code || error?.data?.error || error?.data?.type;
}

const PASSWORD_RESET_ERROR_MESSAGES = {
  bad_request: 'Mot de passe invalide (8 caracteres minimum) ou lien incomplet.',
  token_invalide: 'Ce lien de reinitialisation est invalide. Redemandez un nouveau lien.',
  token_expire: 'Ce lien de reinitialisation a expire (validite 30 minutes). Redemandez un nouveau lien.',
  token_deja_utilise: 'Ce lien de reinitialisation a deja ete utilise. Redemandez un nouveau lien si necessaire.',
  account_disabled: 'Ce compte est desactive. Contactez votre etablissement.'
};

export function getPasswordResetErrorMessage(error) {
  const code = getApiErrorCode(error);
  if (code && PASSWORD_RESET_ERROR_MESSAGES[code]) {
    return PASSWORD_RESET_ERROR_MESSAGES[code];
  }

  return getApiErrorMessage(error, 'Impossible de reinitialiser le mot de passe.');
}

// Le pointage QR est desormais lui aussi soumis a la restriction reseau de la
// borne (guidefrontend.md section 6.5, mise a jour) : l'etudiant doit etre
// connecte au Wi-Fi dedie de l'etablissement, pas en 4G, meme si le QR est
// valide et son compte actif.
const WIFI_REQUIRED_MESSAGE =
  "Connectez-vous au Wi-Fi de l'etablissement pour pointer. Le pointage par QR ne fonctionne pas en 4G/donnees mobiles, meme si le QR est valide.";

const QR_CHECKIN_ERROR_MESSAGES = {
  bad_request: 'QR invalide.',
  kiosk_network_forbidden: WIFI_REQUIRED_MESSAGE,
  qr_invalide_ou_expire: 'Ce QR a expire ou est invalide. Relancez le scan.',
  hors_delai: "Le cours est termine, le pointage n'est plus possible.",
  cours_non_autorise: "Vous n'etes pas inscrit dans la promotion de ce cours.",
  compte_inactif: 'Votre compte est desactive. Contactez votre etablissement.',
  cours_introuvable: "Ce cours n'existe plus.",
  pointage_deja_enregistre: 'Un pointage existe deja pour ce cours.'
};

export function getQrCheckinErrorMessage(error) {
  const code = getApiErrorCode(error);
  if (code && QR_CHECKIN_ERROR_MESSAGES[code]) {
    return QR_CHECKIN_ERROR_MESSAGES[code];
  }

  return getApiErrorMessage(error, 'Le pointage par QR a echoue.');
}

export function isQrRetryableError(error) {
  return getApiErrorCode(error) === 'qr_invalide_ou_expire';
}

export function isKioskNetworkForbidden(error) {
  return getApiErrorCode(error) === 'kiosk_network_forbidden';
}

// 400 sur /attendance/kiosk/scan et /checkin peut signifier soit une requete
// invalide, soit un echec du test de vivacite ARSA Face (photo jugee non
// "vivante" - ecran, impression, mauvais eclairage...). Le backend ne renvoie
// pas toujours un code d'erreur dedie, on detecte donc aussi via des
// mots-cles dans le message pour proposer un conseil actionnable.
function isLivenessFailureMessage(message) {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return (
    normalized.includes('vivant') ||
    normalized.includes('vivacite') ||
    normalized.includes('liveness') ||
    (normalized.includes('visage') && normalized.includes('reel'))
  );
}

export function getKioskErrorMessage(error) {
  if (isKioskNetworkForbidden(error)) {
    return "Cette borne n'est pas connectee au reseau autorise pour le pointage. Contactez l'equipe technique pour rattacher cet appareil au reseau/VPN de l'etablissement (ce n'est pas un probleme de compte ou de mot de passe).";
  }

  const backendMessage = getApiErrorMessage(error);

  if (error?.status === 400 && isLivenessFailureMessage(backendMessage)) {
    return `${backendMessage} Astuce : placez-vous face a la camera, dans un endroit bien eclaire, sans lunettes de soleil ni reflet, et evitez de pointer avec une photo/un ecran plutot qu'un visage reel. Reessayez la capture.`;
  }

  return backendMessage;
}

// Garde-fous ajoutes a POST /admin/courses (et POST /professeur/courses/:id/reschedule) :
// rattachement professeur/matiere/promotion et detection de conflit d'horaire
// (guidefrontend.md section 9.3).
const COURSE_ERROR_MESSAGES = {
  professeur_matiere_non_associee:
    "Ce professeur n'enseigne pas cette matière. Rattachez-le à la matière depuis l'onglet Professeurs, ou choisissez un autre professeur.",
  professeur_promotion_non_associee:
    "Ce professeur n'est pas en charge de cette promotion. Rattachez-le à la promotion depuis l'onglet Professeurs, ou choisissez un autre professeur.",
  conflit_horaire: 'Ce créneau est déjà occupé par un autre cours (même professeur, salle ou promotion).'
};

export function getCourseErrorMessage(error) {
  const code = getApiErrorCode(error);
  if (code && COURSE_ERROR_MESSAGES[code]) {
    return COURSE_ERROR_MESSAGES[code];
  }

  return getApiErrorMessage(error, 'Impossible de créer le cours.');
}

export function getCourseScheduleConflicts(error) {
  if (getApiErrorCode(error) !== 'conflit_horaire') return [];
  const conflicts = error?.data?.details?.conflicts;
  return Array.isArray(conflicts) ? conflicts : [];
}

// photo_url renvoye par le backend est un chemin relatif (ex. "/uploads/users/
// etudiant/jane.jpg") : servi par le backend Flask, pas par le serveur Vite,
// il faut donc le prefixer avec l'origine du backend pour que <img> le charge.
export function getPhotoUrl(photoUrl) {
  if (!photoUrl) return '';
  if (/^(https?:|data:|blob:)/i.test(photoUrl)) return photoUrl;

  const base = appConfig.backendBaseUrl.replace(/\/+$/, '');
  const path = String(photoUrl).startsWith('/') ? photoUrl : `/${photoUrl}`;
  return `${base}${path}`;
}

export function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const link = window.document.createElement('a');

  link.href = url;
  link.download = filename;
  link.click();

  window.URL.revokeObjectURL(url);
}

export function formatBackendDate(value) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString('fr-FR');
}

// Le backend envoie course.date en YYYY-MM-DD local (Python date.isoformat(),
// pas de fuseau horaire). new Date().toISOString().slice(0, 10) renvoie la
// date UTC : pour tout utilisateur dans un fuseau en avance sur UTC (ex.
// UTC+1/+2, le cas de cette ecole), les quelques heures suivant minuit local
// donnent encore la veille en UTC, ce qui vide silencieusement les listes
// "cours du jour" jusqu'a ce qu'UTC rattrape minuit local.
export function getLocalDateIso(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatBackendTime(value) {
  if (!value) return '';

  if (/^\d{2}:\d{2}/.test(String(value))) {
    return String(value).slice(0, 5);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
