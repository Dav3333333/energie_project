import {
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  sendPasswordResetEmail,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/firebase';
import { normalizeUsername, isEmailInput } from '@/lib/validators/username';

/**
 * Résout un identifiant (email ou username) en email Firebase.
 * Seul appel non authentifié de l'app (lecture usernames/{normalized}).
 */
async function resolveIdentifierToEmail(identifier) {
  const value = String(identifier ?? '').trim();
  if (!value) throw new Error('Identifiant requis.');
  if (isEmailInput(value)) return value.toLowerCase();

  const normalized = normalizeUsername(value);
  const ref = doc(db, 'usernames', normalized);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    // Message générique : ne pas divulguer l'existence d'un username.
    throw new Error('Identifiants incorrects.');
  }
  return snap.data().email;
}

export async function signInWithIdentifier(identifier, password) {
  const email = await resolveIdentifierToEmail(identifier);
  const credential = await signInWithEmailAndPassword(auth, email, password);
  // Mise à jour lastLoginAt (best effort, non bloquant).
  updateDoc(doc(db, 'users', credential.user.uid), {
    lastLoginAt: serverTimestamp(),
  }).catch(() => {});
  return credential.user;
}

export async function signOut() {
  await fbSignOut(auth);
}

export async function sendResetEmail(identifier) {
  const email = await resolveIdentifierToEmail(identifier);
  await sendPasswordResetEmail(auth, email);
}

export async function changePassword(currentPassword, newPassword) {
  const user = auth.currentUser;
  if (!user?.email) throw new Error('Utilisateur non connecté.');
  const cred = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, cred);
  await updatePassword(user, newPassword);
}

export function subscribeAuthState(callback) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Mappe les erreurs Firebase Auth vers des messages FR compréhensibles.
 * Ne divulgue pas si un email existe.
 */
export function mapAuthError(error) {
  const code = error?.code ?? '';
  switch (code) {
    case 'auth/invalid-email':
      return 'Adresse email invalide.';
    case 'auth/user-disabled':
      return 'Ce compte est désactivé. Contactez un administrateur.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Identifiants incorrects.';
    case 'auth/too-many-requests':
      return 'Trop de tentatives. Réessayez plus tard.';
    case 'auth/network-request-failed':
      return 'Connexion réseau indisponible.';
    case 'auth/requires-recent-login':
      return 'Veuillez vous reconnecter pour cette opération.';
    case 'auth/weak-password':
      return 'Mot de passe trop faible.';
    default:
      return error?.message ?? 'Une erreur est survenue.';
  }
}