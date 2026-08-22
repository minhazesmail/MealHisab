type DatabaseError = {
  code?: string | null
  message?: string | null
  details?: string | null
  hint?: string | null
}

const FRIENDLY_DB_MESSAGES: Record<string, string> = {
  '23505': 'This record already exists. Please check the existing entry and try again.',
  '23503': 'This action refers to data that no longer exists. Please refresh and try again.',
  '23514': 'Some of the values are not allowed. Please review your input and try again.',
  '22P02': 'Some of the values are invalid. Please review your input and try again.',
  '42501': 'You do not have permission to perform this action.',
}

export function extractDbError(error: unknown, context: string): Error {
  const dbError = isDatabaseError(error) ? error : undefined
  const code = dbError?.code ?? 'UNKNOWN'
  const rawMessage = dbError?.message ?? (error instanceof Error ? error.message : String(error))

  console.error('[MealHisab][database-error]', {
    context,
    code,
    message: rawMessage,
    details: dbError?.details ?? undefined,
    hint: dbError?.hint ?? undefined,
  })

  return new Error(FRIENDLY_DB_MESSAGES[code] ?? 'Something went wrong while saving your changes. Please try again.')
}

function isDatabaseError(error: unknown): error is DatabaseError {
  return typeof error === 'object' && error !== null && ('code' in error || 'message' in error)
}
