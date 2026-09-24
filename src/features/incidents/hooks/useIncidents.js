import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { subscribeIncident, subscribeIncidentsByGallery } from '../services/incidentsService';

export function useIncident(id) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!id) return undefined;
    return subscribeIncident(id, (item) => qc.setQueryData(['incident', id], item));
  }, [qc, id]);
  return useQuery({
    queryKey: ['incident', id],
    queryFn: () => Promise.resolve(null),
    enabled: !!id,
    staleTime: Infinity,
  });
}

export function useIncidentsByGallery(galleryId, opts = {}) {
  const qc = useQueryClient();
  const key = ['incidents', 'byGallery', galleryId, opts];
  useEffect(() => {
    if (!galleryId) return undefined;
    return subscribeIncidentsByGallery(galleryId, opts, (items) => qc.setQueryData(key, items));
  }, [qc, galleryId, JSON.stringify(opts)]);
  return useQuery({
    queryKey: key,
    queryFn: () => Promise.resolve([]),
    enabled: !!galleryId,
    staleTime: Infinity,
  });
}