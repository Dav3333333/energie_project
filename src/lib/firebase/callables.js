import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

export const callables = {
  createManagedUser: httpsCallable(functions, 'createManagedUser'),
  updateManagedUser: httpsCallable(functions, 'updateManagedUser'),
  archiveManagedUser: httpsCallable(functions, 'archiveManagedUser'),
  listUsersByGallery: httpsCallable(functions, 'listUsersByGallery'),

  createGallery: httpsCallable(functions, 'createGallery'),
  updateGallery: httpsCallable(functions, 'updateGallery'),
  archiveGallery: httpsCallable(functions, 'archiveGallery'),

  createShop: httpsCallable(functions, 'createShop'),
  updateShop: httpsCallable(functions, 'updateShop'),
  archiveShop: httpsCallable(functions, 'archiveShop'),

  createMeter: httpsCallable(functions, 'createMeter'),
  updateMeter: httpsCallable(functions, 'updateMeter'),
  archiveMeter: httpsCallable(functions, 'archiveMeter'),

  createManualReading: httpsCallable(functions, 'createManualReading'),
};

/**
 * Normalise une erreur callable en { code, message }.
 */
export function callableError(err) {
  return {
    code: err?.code ?? 'unknown',
    message: err?.message ?? 'Une erreur est survenue.',
    details: err?.details ?? null,
  };
}