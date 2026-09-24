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
  createManagedUser,
  createManualPowerEvent,
  createManualReading,
  createMeter,
  createShop,
  generateInvoice,
  listUsersByGallery,
  resolveAlert,
  updateGallery,
  updateIncidentStatus,
  updateManagedUser,
  updateMeter,
  updateShop,
} from './directOperations';

export const callables = {
  createManagedUser,
  updateManagedUser,
  archiveManagedUser,
  listUsersByGallery,
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