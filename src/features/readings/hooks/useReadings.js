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