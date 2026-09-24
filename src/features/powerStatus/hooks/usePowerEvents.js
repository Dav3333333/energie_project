import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { subscribePowerEventsByGallery } from '../services/powerEventsService';

export function usePowerEvents(galleryId, opts = {}) {
  const qc = useQueryClient();
  const key = ['powerEvents', galleryId, opts];
  useEffect(() => {
    if (!galleryId) return undefined;
    return subscribePowerEventsByGallery(galleryId, opts, (items) => qc.setQueryData(key, items));
  }, [qc, galleryId, JSON.stringify(opts)]);
  return useQuery({
    queryKey: key,
    queryFn: () => Promise.resolve([]),
    enabled: !!galleryId,
    staleTime: Infinity,
  });
}