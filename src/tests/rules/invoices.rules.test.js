import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let testEnv;
beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'gem-rules-invoices-test',
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
    await setDoc(doc(db, 'users/admin1'), { uid: 'admin1', role: 'GALLERY_ADMIN', status: 'ACTIVE', galleryIds: ['g1'], shopIds: [] });
    await setDoc(doc(db, 'users/owner1'), { uid: 'owner1', role: 'SHOP_OWNER', status: 'ACTIVE', galleryIds: ['g1'], shopIds: ['s1'] });
    await setDoc(doc(db, 'users/worker1'), { uid: 'worker1', role: 'SHOP_WORKER', status: 'ACTIVE', galleryIds: ['g1'], shopIds: ['s1'] });
    await setDoc(doc(db, 'invoices/i1'), {
      galleryId: 'g1', shopId: 's1', status: 'ISSUED', invoiceNumber: 'FAC-X-202509-00001',
    });
  });
});
function asUser(uid) { return testEnv.authenticatedContext(uid).firestore(); }

describe('invoices — lecture', () => {
  it('GALLERY_ADMIN lit', async () => {
    await assertSucceeds(getDoc(doc(asUser('admin1'), 'invoices/i1')));
  });
  it('SHOP_OWNER lit sa facture', async () => {
    await assertSucceeds(getDoc(doc(asUser('owner1'), 'invoices/i1')));
  });
  it('SHOP_WORKER ne lit PAS', async () => {
    await assertFails(getDoc(doc(asUser('worker1'), 'invoices/i1')));
  });
});

describe('invoices — écriture interdite au client', () => {
  it('création refusée', async () => {
    await assertFails(
      setDoc(doc(asUser('admin1'), 'invoices/new'), {
        galleryId: 'g1', shopId: 's1', invoiceNumber: 'X',
      }),
    );
  });
});