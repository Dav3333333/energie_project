// Users
const { createManagedUser } = require('./callable/createManagedUser');
const { updateManagedUser } = require('./callable/updateManagedUser');
const { archiveManagedUser } = require('./callable/archiveManagedUser');
const { listUsersByGallery } = require('./callable/listUsersByGallery');

// Galeries / boutiques / compteurs
const galleryCallables = require('./callable/gallery');
const shopCallables = require('./callable/shop');
const meterCallables = require('./callable/meter');

// Relevés
const { createManualReading } = require('./callable/createManualReading');

// Achats kWh
const { createEnergyPurchase } = require('./callable/createEnergyPurchase');
const { cancelEnergyPurchase } = require('./callable/cancelEnergyPurchase');

// Alertes
const alertActions = require('./callable/alertActions');

// Power events
const { createManualPowerEvent } = require('./callable/createManualPowerEvent');

// Incidents
const incidentCallables = require('./callable/incident');

// Factures
const { generateInvoice } = require('./callable/generateInvoice');

// Scheduled
const { checkLowCredits } = require('./scheduled/checkLowCredits');

// -------------------- Exports ----------------------------------------------
exports.createManagedUser = createManagedUser;
exports.updateManagedUser = updateManagedUser;
exports.archiveManagedUser = archiveManagedUser;
exports.listUsersByGallery = listUsersByGallery;

exports.createGallery = galleryCallables.createGallery;
exports.updateGallery = galleryCallables.updateGallery;
exports.archiveGallery = galleryCallables.archiveGallery;

exports.createShop = shopCallables.createShop;
exports.updateShop = shopCallables.updateShop;
exports.archiveShop = shopCallables.archiveShop;

exports.createMeter = meterCallables.createMeter;
exports.updateMeter = meterCallables.updateMeter;
exports.archiveMeter = meterCallables.archiveMeter;

exports.createManualReading = createManualReading;

exports.createEnergyPurchase = createEnergyPurchase;
exports.cancelEnergyPurchase = cancelEnergyPurchase;

exports.acknowledgeAlert = alertActions.acknowledgeAlert;
exports.resolveAlert = alertActions.resolveAlert;

exports.createManualPowerEvent = createManualPowerEvent;

exports.createIncident = incidentCallables.createIncident;
exports.updateIncidentStatus = incidentCallables.updateIncidentStatus;

exports.generateInvoice = generateInvoice;

exports.checkLowCredits = checkLowCredits;