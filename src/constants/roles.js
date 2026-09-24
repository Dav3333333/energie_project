export const ROLES = Object.freeze({
  SUPER_ADMIN: 'SUPER_ADMIN',
  GALLERY_ADMIN: 'GALLERY_ADMIN',
  TECHNICIAN: 'TECHNICIAN',
  SHOP_OWNER: 'SHOP_OWNER',
  SHOP_WORKER: 'SHOP_WORKER',
});

export const ROLE_LABELS_FR = Object.freeze({
  SUPER_ADMIN: 'Super administrateur',
  GALLERY_ADMIN: 'Administrateur de galerie',
  TECHNICIAN: 'Technicien',
  SHOP_OWNER: 'Propriétaire de boutique',
  SHOP_WORKER: 'Travailleur de boutique',
});

export const ALL_ROLES = Object.freeze(Object.values(ROLES));