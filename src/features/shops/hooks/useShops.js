import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  subscribeShop,
  subscribeShopsByGallery,
  subscribeShopsByIds,
} from '../services/shopsService';

export function useShop(shopId) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!shopId) return undefined;
    const unsub = subscribeShop(shopId, (s) => qc.setQueryData(['shop', shopId], s));
    return unsub;
  }, [qc, shopId]);
  return useQuery({
    queryKey: ['shop', shopId],
    queryFn: () => Promise.resolve(null),
    enabled: !!shopId,
    staleTime: Infinity,
  });
}

export function useShopsByGallery(galleryId, filters = {}) {
  const qc = useQueryClient();
  const key = ['shops', 'byGallery', galleryId, filters];
  useEffect(() => {
    if (!galleryId) return undefined;
    const unsub = subscribeShopsByGallery(galleryId, filters, (items) => {
      qc.setQueryData(key, items);
    });
    return unsub;
  }, [qc, galleryId, JSON.stringify(filters)]);
  return useQuery({
    queryKey: key,
    queryFn: () => Promise.resolve([]),
    enabled: !!galleryId,
    staleTime: Infinity,
  });
}

export function useShopsByIds(shopIds) {
  const qc = useQueryClient();
  const key = ['shops', 'byIds', shopIds];
  useEffect(() => {
    if (!shopIds?.length) return undefined;
    const unsub = subscribeShopsByIds(shopIds, (items) => qc.setQueryData(key, items));
    return unsub;
  }, [qc, JSON.stringify(shopIds)]);
  return useQuery({
    queryKey: key,
    queryFn: () => Promise.resolve([]),
    enabled: !!shopIds?.length,
    staleTime: Infinity,
  });
}