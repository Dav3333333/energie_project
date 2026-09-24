import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { subscribeGalleries, subscribeGallery } from '../services/galleriesService';

export function useGalleries({ status, pageSize } = {}) {
  const qc = useQueryClient();
  useEffect(() => {
    const unsub = subscribeGalleries({ status, pageSize }, (items) => {
      qc.setQueryData(['galleries', { status, pageSize }], items);
    });
    return unsub;
  }, [qc, status, pageSize]);

  return useQuery({
    queryKey: ['galleries', { status, pageSize }],
    queryFn: () => Promise.resolve([]), // rempli par onSnapshot
    staleTime: Infinity,
  });
}

export function useGallery(galleryId) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!galleryId) return undefined;
    const unsub = subscribeGallery(galleryId, (item) => {
      qc.setQueryData(['gallery', galleryId], item);
    });
    return unsub;
  }, [qc, galleryId]);

  return useQuery({
    queryKey: ['gallery', galleryId],
    queryFn: () => Promise.resolve(null),
    enabled: !!galleryId,
    staleTime: Infinity,
  });
}