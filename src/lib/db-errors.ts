type DatabaseError = {
  code?: string | null
  message?: string | null
  details?: string | null
  hint?: string | null
}

const FRIENDLY_DB_MESSAGES: Record<string, string> = {
  '23503': 'This action refers to data that no longer exists. Please refresh and try again.',
  '23514': 'Some of the values are not allowed. Please review your input and try again.',
  '22P02': 'Some of the values are invalid. Please review your input and try again.',
  '42501': 'You do not have permission to perform this action.',
}

export function extractDbError(error: unknown, context: string): Error {
  const dbError = isDatabaseError(error) ? error : undefined
  const code = dbError?.code ?? 'UNKNOWN'
  const rawMessage = dbError?.message ?? (error instanceof Error ? error.message : String(error))
  const rawDetails = dbError?.details ?? ''

  console.error('[MealHisab][database-error]', {
    context,
    code,
    message: rawMessage,
    details: dbError?.details ?? undefined,
    hint: dbError?.hint ?? undefined,
  })

  const outstandingBalanceMatch = /^member_has_outstanding_balance:([0-9]+(?:\.[0-9]{1,2})?)$/i.exec(rawMessage.trim())

  const friendlyMessage =
    outstandingBalanceMatch
      ? `You must settle your outstanding balance of ৳${Number(outstandingBalanceMatch[1]).toFixed(2)} before leaving the mess.`
      : rawMessage.trim() === 'manager_plan_required'
        ? 'An active Manager Plan (৳99/month) is required to create or manage a flat.'
        : rawMessage.trim() === 'manager_flat_limit_reached'
          ? 'You can create only one flat with your Manager Plan.'
          : rawMessage.trim() === 'monthly_invite_code_limit_reached'
            ? 'You have reached the limit of 10 invite codes for this calendar month.'
            : code === '23505' && /meal_logs.*flat_id_user_id_date_meal_type_key/i.test(`${rawMessage} ${rawDetails}`)
              ? 'You have already recorded a meal for this time.'
              : rawMessage.trim() === 'partial_payment_not_allowed'
                ? 'Partial payments are disabled for this mess. Please pay the full remaining amount.'
                : rawMessage.trim() === 'payment_exceeds_outstanding_balance'
                  ? 'That payment is greater than the remaining settlement amount.'
                  : FRIENDLY_DB_MESSAGES[code] ??
                    'Something went wrong while saving your changes. Please try again.'

  return new Error(friendlyMessage)
}

function isDatabaseError(error: unknown): error is DatabaseError {
  return typeof error === 'object' && error !== null && ('code' in error || 'message' in error)
}
