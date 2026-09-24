import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  initializeTestEnvironment, assertSucceeds, assertFails,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let testEnv;
beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'gem-rules-purchases-test',
    firestore: {
      rules: readFileSync(resolve(__dirname, '../../../firestore.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});
afterAll(async () => { await testEnv?.cleanup(); });

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users/admin1'), {
      uid: 'admin1', role: 'GALLERY_ADMIN', status: 'ACTIVE',
      galleryIds: ['g1'], shopIds: [],
    });
    await setDoc(doc(db, 'users/owner1'), {
      uid: 'owner1', role: 'SHOP_OWNER', status: 'ACTIVE',
      galleryIds: ['g1'], shopIds: ['s1'],
    });
    await setDoc(doc(db, 'users/worker1'), {
      uid: 'worker1', role: 'SHOP_WORKER', status: 'ACTIVE',
      galleryIds: ['g1'], shopIds: ['s1'],
    });
    await setDoc(doc(db, 'energyPurchases/p1'), {
      galleryId: 'g1', shopId: 's1', status: 'VALID',
      purchasedKwh: 100, totalAmount: 30, currency: 'USD',
      receiptNumber: 'RC-G1-202509-00001',
    });
  });
});

function asUser(uid) { return testEnv.authenticatedContext(uid).firestore(); }

describe('energyPurchases — lecture', () => {
  it('GALLERY_ADMIN lit', async () => {
    await assertSucceeds(getDoc(doc(asUser('admin1'), 'energyPurchases/p1')));
  });
  it('SHOP_OWNER lit', async () => {
    await assertSucceeds(getDoc(doc(asUser('owner1'), 'energyPurchases/p1')));
  });
  it('SHOP_WORKER ne lit pas', async () => {
    await assertFails(getDoc(doc(asUser('worker1'), 'energyPurchases/p1')));
  });
});

describe('energyPurchases — écriture interdite au client', () => {
  it('création refusée', async () => {
    await assertFails(
      setDoc(doc(asUser('admin1'), 'energyPurchases/new'), {
        galleryId: 'g1', shopId: 's1', purchasedKwh: 999, status: 'VALID',
      }),
    );
  });
  it('modification refusée', async () => {
    await assertFails(
      updateDoc(doc(asUser('admin1'), 'energyPurchases/p1'), { status: 'CANCELLED' }),
    );
  });
});