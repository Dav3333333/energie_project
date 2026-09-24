import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  initializeTestEnvironment, assertSucceeds, assertFails,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let testEnv;
const PROJECT_ID = 'gem-rules-readings-test';

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
afterAll(async () => { await testEnv?.cleanup(); });

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users/admin1'), {
      uid: 'admin1', role: 'GALLERY_ADMIN', status: 'ACTIVE',
      galleryIds: ['g1'], shopIds: [],
    });
    await setDoc(doc(db, 'users/tech1'), {
      uid: 'tech1', role: 'TECHNICIAN', status: 'ACTIVE',
      galleryIds: ['g1'], shopIds: [],
    });
    await setDoc(doc(db, 'users/worker1'), {
      uid: 'worker1', role: 'SHOP_WORKER', status: 'ACTIVE',
      galleryIds: ['g1'], shopIds: ['s1'],
    });
    await setDoc(doc(db, 'readings/r1'), {
      galleryId: 'g1', shopId: 's1', meterId: 'm1',
      totalKwh: 100, consumptionKwh: 10, status: 'VALID',
      readingDate: new Date(),
    });
  });
});

function asUser(uid) { return testEnv.authenticatedContext(uid).firestore(); }

describe('readings — lecture', () => {
  it('GALLERY_ADMIN lit un relevé de sa galerie', async () => {
    const db = asUser('admin1');
    await assertSucceeds(getDoc(doc(db, 'readings/r1')));
  });
  it('SHOP_WORKER lit un relevé de sa boutique', async () => {
    const db = asUser('worker1');
    await assertSucceeds(getDoc(doc(db, 'readings/r1')));
  });
});

describe('readings — écriture interdite au client', () => {
  it('création refusée même pour GALLERY_ADMIN', async () => {
    const db = asUser('admin1');
    await assertFails(
      setDoc(doc(db, 'readings/r2'), {
        galleryId: 'g1', shopId: 's1', meterId: 'm1', totalKwh: 200,
      }),
    );
  });
  it('update refusé même pour TECHNICIAN', async () => {
    const { updateDoc } = await import('firebase/firestore');
    const db = asUser('tech1');
    await assertFails(updateDoc(doc(db, 'readings/r1'), { status: 'INVALID' }));
  });
});