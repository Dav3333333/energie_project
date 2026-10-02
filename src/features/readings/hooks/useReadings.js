import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  subscribeReadingsByMeter,
  subscribeReadingsByShop,
  subscribeReadingsByGallery,
} from '../services/readingsService';

function bindSubscription(key, subscribeFn, deps, qc) {
  useEffect(() => {
    if (!deps.id) return undefined;
    return subscribeFn((items) => qc.setQueryData(key, items));
  }, [qc, ...deps.deps]);
  return useQuery({
    queryKey: key,
    queryFn: () => Promise.resolve([]),
    enabled: !!deps.id,
    staleTime: Infinity,
  });
}

export function useReadingsByMeter(meterId, opts = {}) {
  const qc = useQueryClient();
  const key = ['readings', 'byMeter', meterId, opts];
  return bindSubscription(
    key,
    (cb) => subscribeReadingsByMeter(meterId, opts, cb),
    { id: meterId, deps: [meterId, JSON.stringify(opts)] },
    qc,
  );
}

export function useReadingsByShop(shopId, opts = {}) {
  const qc = useQueryClient();
  const key = ['readings', 'byShop', shopId, opts];
  return bindSubscription(
    key,
    (cb) => subscribeReadingsByShop(shopId, opts, cb),
    { id: shopId, deps: [shopId, JSON.stringify(opts)] },
    qc,
  );
}

export function useReadingsByGallery(galleryId, opts = {}) {
  const qc = useQueryClient();
  const key = ['readings', 'byGallery', galleryId, opts];
  return bindSubscription(
    key,
    (cb) => subscribeReadingsByGallery(galleryId, opts, cb),
    { id: galleryId, deps: [galleryId, JSON.stringify(opts)] },
    qc,
  );
}

export function useReadingsAcrossScope(galleryIds, opts = {}) {
  const qc = useQueryClient();
  const key = ['readings', 'scope', galleryIds, opts];
  const scopeKey = galleryIds === null ? 'all' : [...(galleryIds ?? [])].sort().join(',');
  useEffect(() => {
    if (galleryIds !== null && !galleryIds?.length) return undefined;
    if (galleryIds === null) {
      return subscribeReadingsByGallery(null, opts, (items) => qc.setQueryData(key, items), (error) => console.error('[readings] Impossible de charger les relevés:', error));
    }
    const byGallery = new Map();
    const stops = galleryIds.map((id) => subscribeReadingsByGallery(id, opts, (items) => {
      byGallery.set(id, items);
      qc.setQueryData(key, [...byGallery.values()].flat().sort((a, b) => readingTime(b.readingDate) - readingTime(a.readingDate)));
    }, (error) => console.error(`[readings] Galerie ${id}:`, error)));
    return () => stops.forEach((stop) => stop());
  }, [qc, scopeKey, JSON.stringify(opts)]);
  return useQuery({ queryKey: key, queryFn: () => Promise.resolve([]), enabled: galleryIds === null || !!galleryIds?.length, staleTime: Infinity });
}

function readingTime(value) {
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (value instanceof Date) return value.getTime();
  const parsed = Date.parse(value ?? '');
  return Number.isNaN(parsed) ? 0 : parsed;
}
