const USERNAME_REGEX = /^[a-z0-9._]{3,30}$/;

export function normalizeUsername(input) {
  return String(input ?? '').trim().toLowerCase();
}

export function isValidUsername(username) {
  return USERNAME_REGEX.test(username);
}

export function isEmailInput(value) {
  const v = String(value ?? '').trim();
  return v.includes('@');
}