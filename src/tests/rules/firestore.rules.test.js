import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let testEnv;
const PROJECT_ID = 'gem-rules-test';

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(resolve(__dirname, '../../../firestore.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();

  // Seed via contexte "admin" (règles ignorées).
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users/super1'), {
      uid: 'super1', email: 'super@test', username: 'super', usernameNormalized: 'super',
      role: 'SUPER_ADMIN', status: 'ACTIVE', galleryIds: [], shopIds: [],
      firstName: 'S', lastName: 'A', fullName: 'S A',
    });
    await setDoc(doc(db, 'users/admin1'), {
      uid: 'admin1', email: 'admin@test', username: 'admin', usernameNormalized: 'admin',
      role: 'GALLERY_ADMIN', status: 'ACTIVE', galleryIds: ['g1'], shopIds: [],
      firstName: 'A', lastName: 'B', fullName: 'A B',
    });
    await setDoc(doc(db, 'users/owner1'), {
      uid: 'owner1', email: 'owner@test', username: 'owner', usernameNormalized: 'owner',
      role: 'SHOP_OWNER', status: 'ACTIVE', galleryIds: ['g1'], shopIds: ['s1'],
      firstName: 'O', lastName: 'W', fullName: 'O W',
    });
    await setDoc(doc(db, 'users/worker1'), {
      uid: 'worker1', email: 'worker@test', username: 'worker', usernameNormalized: 'worker',
      role: 'SHOP_WORKER', status: 'ACTIVE', galleryIds: ['g1'], shopIds: ['s1'],
      firstName: 'W', lastName: 'K', fullName: 'W K',
    });

    await setDoc(doc(db, 'galleries/g1'), {
      name: 'Galerie 1', code: 'G1', status: 'ACTIVE', currency: 'USD',
    });
    await setDoc(doc(db, 'shops/s1'), {
      galleryId: 'g1', name: 'Boutique 1', code: 'S1', status: 'ACTIVE',
      totalPurchasedKwh: 0, totalConsumedKwh: 0, remainingKwh: 0, remainingAmount: 0,
      balanceStatus: 'NORMAL', ownerIds: ['owner1'], workerIds: ['worker1'], meterIds: [],
    });
    await setDoc(doc(db, 'usernames/super'), {
      uid: 'super1', email: 'super@test',
    });
  });
});

function asUser(uid) {
  return testEnv.authenticatedContext(uid).firestore();
}

describe('usernames — accès public', () => {
  it('lecture unitaire autorisée même non authentifié', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(db, 'usernames/super')));
  });

  it('list interdit', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDocs(collection(db, 'usernames')));
  });

  it('écriture interdite', async () => {
    const db = asUser('super1');
    await assertFails(setDoc(doc(db, 'usernames/newname'), { uid: 'x', email: 'x@x' }));
  });
});

describe('users — accès', () => {
  it('un utilisateur lit son propre profil', async () => {
    const db = asUser('owner1');
    await assertSucceeds(getDoc(doc(db, 'users/owner1')));
  });

  it('un utilisateur ne lit pas le profil d\'un autre', async () => {
    const db = asUser('owner1');
    await assertFails(getDoc(doc(db, 'users/admin1')));
  });

  it('SUPER_ADMIN lit n\'importe quel profil', async () => {
    const db = asUser('super1');
    await assertSucceeds(getDoc(doc(db, 'users/owner1')));
  });

  it('un utilisateur ne peut pas modifier son rôle', async () => {
    const db = asUser('owner1');
    await assertFails(updateDoc(doc(db, 'users/owner1'), { role: 'SUPER_ADMIN' }));
  });

  it('un utilisateur peut modifier son téléphone', async () => {
    const db = asUser('owner1');
    await assertSucceeds(updateDoc(doc(db, 'users/owner1'), { phone: '+243...' }));
  });

  it('aucun client ne peut créer un utilisateur', async () => {
    const db = asUser('super1');
    await assertFails(setDoc(doc(db, 'users/new1'), { uid: 'new1', role: 'SUPER_ADMIN' }));
  });
});

describe('shops — accès', () => {
  it('GALLERY_ADMIN lit une boutique de sa galerie', async () => {
    const db = asUser('admin1');
    await assertSucceeds(getDoc(doc(db, 'shops/s1')));
  });

  it('SHOP_WORKER lit sa boutique', async () => {
    const db = asUser('worker1');
    await assertSucceeds(getDoc(doc(db, 'shops/s1')));
  });

  it('un client ne peut pas modifier les champs calculés', async () => {
    const db = asUser('admin1');
    await assertFails(updateDoc(doc(db, 'shops/s1'), { remainingKwh: 9999 }));
  });

  it('GALLERY_ADMIN peut modifier un champ non calculé', async () => {
    const db = asUser('admin1');
    await assertSucceeds(updateDoc(doc(db, 'shops/s1'), { name: 'Boutique 1 (modifiée)' }));
  });
});

describe('energyPurchases — écrire est interdit au client', () => {
  it('création refusée', async () => {
    const db = asUser('admin1');
    await assertFails(
      setDoc(doc(db, 'energyPurchases/p1'), {
        galleryId: 'g1', shopId: 's1', purchasedKwh: 100,
      }),
    );
  });
});

describe('auditLogs — écriture interdite au client', () => {
  it('création refusée', async () => {
    const db = asUser('super1');
    await assertFails(setDoc(doc(db, 'auditLogs/x1'), { action: 'FAKE' }));
  });
});

describe('alerts — workflow limité', () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'alerts/a1'), {
        galleryId: 'g1', shopId: 's1', type: 'LOW_CREDIT', severity: 'WARNING',
        title: 'Alerte', message: 'Test', status: 'OPEN',
      });
    });
  });

  it('GALLERY_ADMIN peut accuser réception', async () => {
    const db = asUser('admin1');
    await assertSucceeds(
      updateDoc(doc(db, 'alerts/a1'), { status: 'ACKNOWLEDGED' }),
    );
  });

  it('GALLERY_ADMIN ne peut pas modifier un champ arbitraire', async () => {
    const db = asUser('admin1');
    await assertFails(updateDoc(doc(db, 'alerts/a1'), { severity: 'INFO' }));
  });
});