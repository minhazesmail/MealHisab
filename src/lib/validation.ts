import { z } from 'zod'

export const inviteCodeSchema = z.object({
  code: z.string().trim().toUpperCase().min(6).max(12),
})

export const paymentRequestSchema = z.object({
  paymentMethod: z.enum(['bkash', 'nagad', 'rocket', 'cash']),
  senderNumber: z.string().trim().min(11).max(20),
  transactionId: z.string().trim().min(6).max(100),
  note: z.string().trim().max(500).optional(),
})

export const flatIdSchema = z.string().uuid()

export const ttlDaysSchema = z.number().int().min(1).max(30).default(7)
