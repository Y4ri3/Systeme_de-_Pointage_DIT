import promoImage from '../assets/promo-admission-big-data.jpg';

/**
 * Habillage commun des pages d'authentification (connexion, mot de passe oublie,
 * reinitialisation, changement de mot de passe) : visuel promotionnel DIT en
 * arriere-plan flou, contenu (logo/titre + carte) centre par-dessus. scale-110
 * evite les bords transparents que le flou laisse apparaitre sur les cotes de l'image.
 */
function AuthLayout({ children, maxWidth = 'max-w-md' }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden p-4 py-10">
      <div
        className="absolute inset-0 scale-110 bg-cover bg-center blur-md md:blur-lg"
        style={{ backgroundImage: `url(${promoImage})` }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-gradient-to-b from-[#0F172A]/75 via-[#0F172A]/65 to-[#0F172A]/80"
        aria-hidden="true"
      />
      <div className={`relative z-10 w-full ${maxWidth} space-y-6`}>{children}</div>
    </div>
  );
}

export default AuthLayout;
