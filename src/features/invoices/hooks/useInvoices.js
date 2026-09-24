import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { subscribeInvoice, subscribeInvoicesByShop, subscribeInvoicesByGallery } from '../services/invoicesService';

export function useInvoice(id) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!id) return undefined;
    return subscribeInvoice(id, (item) => qc.setQueryData(['invoice', id], item));
  }, [qc, id]);
  return useQuery({
    queryKey: ['invoice', id],
    queryFn: () => Promise.resolve(null),
    enabled: !!id,
    staleTime: Infinity,
  });
}

export function useInvoicesByShop(shopId, opts = {}) {
  const qc = useQueryClient();
  const key = ['invoices', 'byShop', shopId, opts];
  useEffect(() => {
    if (!shopId) return undefined;
    return subscribeInvoicesByShop(shopId, opts, (items) => qc.setQueryData(key, items));
  }, [qc, shopId, JSON.stringify(opts)]);
  return useQuery({
    queryKey: key,
    queryFn: () => Promise.resolve([]),
    enabled: !!shopId,
    staleTime: Infinity,
  });
}

export function useInvoicesByGallery(galleryId, opts = {}) {
  const qc = useQueryClient();
  const key = ['invoices', 'byGallery', galleryId, opts];
  useEffect(() => {
    if (!galleryId) return undefined;
    return subscribeInvoicesByGallery(galleryId, opts, (items) => qc.setQueryData(key, items));
  }, [qc, galleryId, JSON.stringify(opts)]);
  return useQuery({
    queryKey: key,
    queryFn: () => Promise.resolve([]),
    enabled: !!galleryId,
    staleTime: Infinity,
  });
}