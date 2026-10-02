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

export function usePurchasesAcrossScope(galleryIds, opts = {}) {
  const qc = useQueryClient();
  const key = ['purchases', 'scope', galleryIds, opts];
  const scopeKey = galleryIds === null ? 'all' : [...(galleryIds ?? [])].sort().join(',');

  useEffect(() => {
    if (galleryIds !== null && !galleryIds?.length) return undefined;
    if (galleryIds === null) {
      return subscribePurchasesByGallery(null, opts, (items) => qc.setQueryData(key, items), (error) => {
        console.error('[purchases] Impossible de charger les achats:', error);
      });
    }

    const byGallery = new Map();
    const unsubscribe = galleryIds.map((galleryId) => subscribePurchasesByGallery(galleryId, opts, (items) => {
      byGallery.set(galleryId, items);
      qc.setQueryData(key, [...byGallery.values()].flat()
        .sort((a, b) => (b.purchaseDate?.toMillis?.() ?? 0) - (a.purchaseDate?.toMillis?.() ?? 0)));
    }, (error) => console.error(`[purchases] Galerie ${galleryId}:`, error)));
    return () => unsubscribe.forEach((stop) => stop());
  }, [qc, scopeKey, JSON.stringify(opts)]);

  return useQuery({
    queryKey: key,
    queryFn: () => Promise.resolve([]),
    enabled: galleryIds === null || !!galleryIds?.length,
    staleTime: Infinity,
  });
}

export function usePurchasesAcrossShops(shopIds, opts = {}) {
  const qc = useQueryClient();
  const normalizedIds = [...new Set(shopIds ?? [])].sort();
  const scopeKey = normalizedIds.join(',');
  const key = ['purchases', 'shops', scopeKey, opts];

  useEffect(() => {
    if (!normalizedIds.length) return undefined;
    const byShop = new Map();
    const stops = normalizedIds.map((shopId) => subscribePurchasesByShop(shopId, opts, (items) => {
      byShop.set(shopId, items);
      qc.setQueryData(key, [...byShop.values()].flat()
        .sort((a, b) => (b.purchaseDate?.toMillis?.() ?? 0) - (a.purchaseDate?.toMillis?.() ?? 0)));
    }, (error) => console.error(`[purchases] Boutique ${shopId}:`, error)));
    return () => stops.forEach((stop) => stop());
  }, [qc, scopeKey, JSON.stringify(opts)]);

  return useQuery({
    queryKey: key,
    queryFn: () => Promise.resolve([]),
    enabled: normalizedIds.length > 0,
    staleTime: Infinity,
  });
}
