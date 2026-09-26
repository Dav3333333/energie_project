import {
  acknowledgeAlert,
  archiveGallery,
  archiveManagedUser,
  archiveMeter,
  archiveShop,
  cancelEnergyPurchase,
  createEnergyPurchase,
  createGallery,
  createIncident,
  createManualPowerEvent,
  createManualReading,
  createMeter,
  createShop,
  generateInvoice,
  resolveAlert,
  updateGallery,
  updateIncidentStatus,
  updateManagedUser,
  updateMeter,
  updateShop,
} from './directOperations';
import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions';
import { app } from './firebase';
import env from '@/config/env';

const functions = getFunctions(app, 'us-central1');
if (env.useEmulators) {
  connectFunctionsEmulator(functions, ...env.emulators.functionsHost.split(':'));
}

const callFunction = (name) => async (payload = {}) => httpsCallable(functions, name)(payload);

export const callables = {
  createManagedUser: callFunction('createManagedUser'),
  updateManagedUser,
  archiveManagedUser,
  listUsersByGallery: callFunction('listUsersByGallery'),
  createGallery,
  updateGallery,
  archiveGallery,
  createShop,
  updateShop,
  archiveShop,
  createMeter,
  updateMeter,
  archiveMeter,
  createManualReading,
  createEnergyPurchase,
  cancelEnergyPurchase,
  createManualPowerEvent,
  createIncident,
  updateIncidentStatus,
  acknowledgeAlert,
  resolveAlert,
  generateInvoice,
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