import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { subscribeAlertsByGallery, subscribeAlertsByShop } from '../services/alertsService';

export function useAlertsByGallery(galleryId, opts = {}) {
  const qc = useQueryClient();
  const key = ['alerts', 'byGallery', galleryId, opts];
  useEffect(() => {
    if (!galleryId) return undefined;
    return subscribeAlertsByGallery(galleryId, opts, (items) => qc.setQueryData(key, items));
  }, [qc, galleryId, JSON.stringify(opts)]);
  return useQuery({
    queryKey: key,
    queryFn: () => Promise.resolve([]),
    enabled: !!galleryId,
    staleTime: Infinity,
  });
}

export function useAlertsByShop(shopId, opts = {}) {
  const qc = useQueryClient();
  const key = ['alerts', 'byShop', shopId, opts];
  useEffect(() => {
    if (!shopId) return undefined;
    return subscribeAlertsByShop(shopId, opts, (items) => qc.setQueryData(key, items));
  }, [qc, shopId, JSON.stringify(opts)]);
  return useQuery({
    queryKey: key,
    queryFn: () => Promise.resolve([]),
    enabled: !!shopId,
    staleTime: Infinity,
  });
}