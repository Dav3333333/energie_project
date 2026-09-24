const { z } = require('zod');
const { AppError, ERROR_CODES } = require('./errors');

/**
 * Valide les données d'une callable avec un schéma Zod.
 * Retourne les données typées ou lance une AppError invalid-argument.
 */
function validate(data, schema) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues.map((i) => ({
      path: i.path.join('.'),
      message: i.message,
    }));
    throw new AppError(ERROR_CODES.INVALID_ARGUMENT, 'Données invalides.', { issues });
  }
  return result.data;
}

module.exports = { validate, z };