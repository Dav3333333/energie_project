import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useGalleryStore = create(
  persist(
    (set) => ({
      activeGalleryId: null,
      setActiveGalleryId: (id) => set({ activeGalleryId: id }),
      clearActiveGallery: () => set({ activeGalleryId: null }),
    }),
    { name: 'gem.gallery' },
  ),
);