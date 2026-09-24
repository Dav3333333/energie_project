import { describe, it, expect } from 'vitest';
import {
  hasRole,
  isSuperAdmin,
  hasGalleryAccess,
  hasShopAccess,
  getAllowedNavigationForRole,
} from './index';
import { ROLES } from '@/constants/roles';

const superAdmin = { role: ROLES.SUPER_ADMIN, status: 'ACTIVE', galleryIds: [], shopIds: [] };
const galleryAdmin = {
  role: ROLES.GALLERY_ADMIN,
  status: 'ACTIVE',
  galleryIds: ['g1'],
  shopIds: [],
};
const owner = {
  role: ROLES.SHOP_OWNER,
  status: 'ACTIVE',
  galleryIds: ['g1'],
  shopIds: ['s1', 's2'],
};
const worker = { role: ROLES.SHOP_WORKER, status: 'ACTIVE', galleryIds: ['g1'], shopIds: ['s1'] };
const suspended = { role: ROLES.SHOP_OWNER, status: 'SUSPENDED', galleryIds: ['g1'], shopIds: ['s1'] };

describe('permissions — hasRole / isSuperAdmin', () => {
  it('détecte le rôle correspondant', () => {
    expect(hasRole(superAdmin, ROLES.SUPER_ADMIN)).toBe(true);
    expect(hasRole(galleryAdmin, ROLES.SUPER_ADMIN)).toBe(false);
    expect(hasRole(galleryAdmin, [ROLES.GALLERY_ADMIN, ROLES.SUPER_ADMIN])).toBe(true);
  });

  it('isSuperAdmin uniquement pour SUPER_ADMIN', () => {
    expect(isSuperAdmin(superAdmin)).toBe(true);
    expect(isSuperAdmin(galleryAdmin)).toBe(false);
    expect(isSuperAdmin(null)).toBe(false);
  });
});

describe('permissions — hasGalleryAccess', () => {
  it('SUPER_ADMIN accède à toutes les galeries', () => {
    expect(hasGalleryAccess(superAdmin, 'g-inconnue')).toBe(true);
  });
  it('GALLERY_ADMIN accède uniquement à ses galeries', () => {
    expect(hasGalleryAccess(galleryAdmin, 'g1')).toBe(true);
    expect(hasGalleryAccess(galleryAdmin, 'g2')).toBe(false);
  });
  it('compte non ACTIVE refusé', () => {
    expect(hasGalleryAccess(suspended, 'g1')).toBe(false);
  });
});

describe('permissions — hasShopAccess', () => {
  it('SUPER_ADMIN accède à toutes les boutiques', () => {
    expect(hasShopAccess(superAdmin, 's-inconnue')).toBe(true);
  });
  it('SHOP_OWNER accède à ses boutiques', () => {
    expect(hasShopAccess(owner, 's1')).toBe(true);
    expect(hasShopAccess(owner, 's2')).toBe(true);
    expect(hasShopAccess(owner, 's3')).toBe(false);
  });
  it('SHOP_WORKER accède à sa boutique uniquement', () => {
    expect(hasShopAccess(worker, 's1')).toBe(true);
    expect(hasShopAccess(worker, 's2')).toBe(false);
  });
});

describe('permissions — navigation par rôle', () => {
  it('retourne une navigation cohérente', () => {
    expect(getAllowedNavigationForRole(ROLES.SHOP_WORKER)).toHaveLength(3);
    expect(getAllowedNavigationForRole(ROLES.SUPER_ADMIN)).toHaveLength(5);
  });
  it('fallback neutre pour rôle inconnu', () => {
    const nav = getAllowedNavigationForRole('INCONNU');
    expect(nav.length).toBeGreaterThan(0);
  });
});