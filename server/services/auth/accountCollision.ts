export function normalizeAuthEmail(email: string) {
  return email.trim().toLocaleLowerCase('en-US')
}

export function accountCollisionMessage(existingUserId: string) {
  if (existingUserId.startsWith('google-oauth2|')) {
    return 'This email already belongs to an account that uses Google. Choose “Use another account” below, then continue with Google.'
  }
  if (existingUserId.startsWith('auth0|')) {
    return 'This email already belongs to an account that uses email and password. Choose “Use another account” below, then sign in with your email and password.'
  }
  return 'This email already belongs to an account using another sign-in method. Choose “Use another account” below and use the method you originally chose.'
}

export function isUniqueConstraintViolation(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505'
}
