import { useAuth } from '@/features/auth/hooks/useAuth';
import { useGalleryStore } from '@/store/galleryStore';
import { ROLES } from '@/constants/roles';
import { ChevronDown } from 'lucide-react';

/**
 * Sélecteur de galerie active pour SUPER_ADMIN et GALLERY_ADMIN multi-galeries.
 * Affiche un libellé simple si une seule galerie.
 */
export default function GallerySelector({ galleries = [] }) {
  const { profile } = useAuth();
  const { activeGalleryId, setActiveGalleryId } = useGalleryStore();

  const canSwitch =
    profile?.role === ROLES.SUPER_ADMIN || (profile?.galleryIds?.length ?? 0) > 1;

  if (!canSwitch || galleries.length === 0) return null;

  return (
    <label className="relative inline-flex items-center gap-2 text-sm">
      <span className="text-[var(--c-text-muted)]">Galerie :</span>
      <select
        value={activeGalleryId ?? ''}
        onChange={(e) => setActiveGalleryId(e.target.value || null)}
        className="appearance-none pr-7 pl-2 py-1 rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] focus:outline-none focus:ring-2 focus:ring-brand-500/20"
      >
        <option value="">— Sélectionner —</option>
        {galleries.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </select>
      <ChevronDown size={14} className="absolute right-2 pointer-events-none" />
    </label>
  );
}