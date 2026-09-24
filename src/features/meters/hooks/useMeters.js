import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  subscribeMeter,
  subscribeMetersByShop,
  subscribeMetersByGallery,
} from '../services/metersService';

export function useMeter(meterId) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!meterId) return undefined;
    return subscribeMeter(meterId, (m) => qc.setQueryData(['meter', meterId], m));
  }, [qc, meterId]);
  return useQuery({
    queryKey: ['meter', meterId],
    queryFn: () => Promise.resolve(null),
    enabled: !!meterId,
    staleTime: Infinity,
  });
}

export function useMetersByShop(shopId) {
  const qc = useQueryClient();
  const key = ['meters', 'byShop', shopId];
  useEffect(() => {
    if (!shopId) return undefined;
    return subscribeMetersByShop(shopId, (items) => qc.setQueryData(key, items));
  }, [qc, shopId]);
  return useQuery({
    queryKey: key,
    queryFn: () => Promise.resolve([]),
    enabled: !!shopId,
    staleTime: Infinity,
  });
}

export function useMetersByGallery(galleryId, filters = {}) {
  const qc = useQueryClient();
  const key = ['meters', 'byGallery', galleryId, filters];
  useEffect(() => {
    if (!galleryId) return undefined;
    return subscribeMetersByGallery(galleryId, filters, (items) => qc.setQueryData(key, items));
  }, [qc, galleryId, JSON.stringify(filters)]);
  return useQuery({
    queryKey: key,
    queryFn: () => Promise.resolve([]),
    enabled: !!galleryId,
    staleTime: Infinity,
  });
}