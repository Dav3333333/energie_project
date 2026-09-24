import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  subscribePurchase,
  subscribePurchasesByShop,
  subscribePurchasesByGallery,
} from '../services/purchasesService';

export function usePurchase(id) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!id) return undefined;
    return subscribePurchase(id, (item) => qc.setQueryData(['purchase', id], item));
  }, [qc, id]);
  return useQuery({
    queryKey: ['purchase', id],
    queryFn: () => Promise.resolve(null),
    enabled: !!id,
    staleTime: Infinity,
  });
}

export function usePurchasesByShop(shopId, opts = {}) {
  const qc = useQueryClient();
  const key = ['purchases', 'byShop', shopId, opts];
  useEffect(() => {
    if (!shopId) return undefined;
    return subscribePurchasesByShop(shopId, opts, (items) => qc.setQueryData(key, items));
  }, [qc, shopId, JSON.stringify(opts)]);
  return useQuery({
    queryKey: key,
    queryFn: () => Promise.resolve([]),
    enabled: !!shopId,
    staleTime: Infinity,
  });
}

export function usePurchasesByGallery(galleryId, opts = {}) {
  const qc = useQueryClient();
  const key = ['purchases', 'byGallery', galleryId, opts];
  useEffect(() => {
    if (!galleryId) return undefined;
    return subscribePurchasesByGallery(galleryId, opts, (items) => qc.setQueryData(key, items));
  }, [qc, galleryId, JSON.stringify(opts)]);
  return useQuery({
    queryKey: key,
    queryFn: () => Promise.resolve([]),
    enabled: !!galleryId,
    staleTime: Infinity,
  });
}