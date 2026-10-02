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

export function useInvoicesAcrossScope(galleryIds, opts = {}) {
  const qc = useQueryClient();
  const key = ['invoices', 'scope', galleryIds, opts];
  const scopeKey = galleryIds === null ? 'all' : [...(galleryIds ?? [])].sort().join(',');
  useEffect(() => {
    if (galleryIds !== null && !galleryIds?.length) return undefined;
    if (galleryIds === null) return subscribeInvoicesByGallery(null, opts, (items) => qc.setQueryData(key, items), (error) => console.error('[invoices] Load failed:', error));
    const byGallery = new Map();
    const stops = galleryIds.map((id) => subscribeInvoicesByGallery(id, opts, (items) => {
      byGallery.set(id, items);
      qc.setQueryData(key, [...byGallery.values()].flat().sort((a, b) => invoiceTime(b.periodEnd) - invoiceTime(a.periodEnd)));
    }, (error) => console.error(`[invoices] Gallery ${id}:`, error)));
    return () => stops.forEach((stop) => stop());
  }, [qc, scopeKey, JSON.stringify(opts)]);
  return useQuery({ queryKey: key, queryFn: () => Promise.resolve([]), enabled: galleryIds === null || !!galleryIds?.length, staleTime: Infinity });
}

function invoiceTime(value) {
  if (typeof value?.toMillis === 'function') return value.toMillis();
  return value instanceof Date ? value.getTime() : (Date.parse(value ?? '') || 0);
}
