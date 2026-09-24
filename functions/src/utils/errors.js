const { HttpsError } = require('firebase-functions/v2/https');

class AppError extends Error {
  constructor(code, message, details = null) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

function toHttpsError(err) {
  if (err instanceof HttpsError) return err;
  if (err instanceof AppError) {
    return new HttpsError(err.code, err.message, err.details);
  }
  // Erreur inattendue : on ne divulgue pas de détails techniques.
  console.error('[UnhandledError]', err);
  return new HttpsError('internal', 'Une erreur interne est survenue.');
}

const ERROR_CODES = Object.freeze({
  UNAUTHENTICATED: 'unauthenticated',
  PERMISSION_DENIED: 'permission-denied',
  INVALID_ARGUMENT: 'invalid-argument',
  NOT_FOUND: 'not-found',
  ALREADY_EXISTS: 'already-exists',
  FAILED_PRECONDITION: 'failed-precondition',
  INTERNAL: 'internal',
});

module.exports = { AppError, toHttpsError, ERROR_CODES };