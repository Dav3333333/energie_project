import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let testEnv;
beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'gem-rules-incidents-test',
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
    await setDoc(doc(db, 'users/tech1'), { uid: 'tech1', role: 'TECHNICIAN', status: 'ACTIVE', galleryIds: ['g1'], shopIds: [] });
    await setDoc(doc(db, 'incidents/inc1'), { galleryId: 'g1', shopId: null, status: 'OPEN' });
  });
});
function asUser(uid) { return testEnv.authenticatedContext(uid).firestore(); }

describe('incidents — lecture par technicien de sa galerie', () => {
  it('TECHNICIAN lit', async () => {
    await assertSucceeds(getDoc(doc(asUser('tech1'), 'incidents/inc1')));
  });
  it('écriture client refusée', async () => {
    await assertFails(
      setDoc(doc(asUser('tech1'), 'incidents/new'), { galleryId: 'g1', status: 'OPEN' }),
    );
  });
});