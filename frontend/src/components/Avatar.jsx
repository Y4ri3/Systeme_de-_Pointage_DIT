import { getPhotoUrl } from '../utils/api';

const SIZES = {
  sm: 'h-9 w-9 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-16 w-16 text-xl',
  xl: 'h-20 w-20 text-2xl'
};

function Avatar({ user, size = 'md', className = '' }) {
  const initial = user?.prenom?.charAt(0) || user?.nom?.charAt(0) || 'U';
  const photoUrl = user?.photo_url || user?.photoUrl;

  return (
    <div
      className={`flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#0C4A6E] font-semibold text-white ${SIZES[size]} ${className}`}
    >
      {photoUrl ? (
        <img src={getPhotoUrl(photoUrl)} alt="" className="h-full w-full object-cover" />
      ) : (
        initial.toUpperCase()
      )}
    </div>
  );
}

export default Avatar;
