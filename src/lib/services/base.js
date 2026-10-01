import { db } from '@/lib/firebase/firebase';
import {
  doc, getDoc, setDoc, updateDoc, addDoc, collection, serverTimestamp,
  runTransaction, Timestamp, query, where, getDocs, orderBy, limit,
} from 'firebase/firestore';

export class AppError extends Error {
  constructor(code, message, details = null) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

export const ERR = Object.freeze({
  UNAUTHENTICATED: 'unauthenticated',
  PERMISSION_DENIED: 'permission-denied',
  INVALID_ARGUMENT: 'invalid-argument',
  NOT_FOUND: 'not-found',
  ALREADY_EXISTS: 'already-exists',
  FAILED_PRECONDITION: 'failed-precondition',
  INTERNAL: 'internal',
});

export function toError(err) {
  if (err instanceof AppError) return err;
  const code = err?.code ?? 'internal';
  const message = err?.message ?? 'Une erreur est survenue.';
  return new AppError(code, message);
}

export function toMillis(v) {
  if (!v) return 0;
  if (typeof v.toMillis === 'function') return v.toMillis();
  if (typeof v.toDate === 'function') return v.toDate().getTime();
  return new Date(v).getTime();
}

export const fb = {
  db, doc, getDoc, setDoc, updateDoc, addDoc, collection,
  serverTimestamp, runTransaction, Timestamp,
  query, where, getDocs, orderBy, limit,
};