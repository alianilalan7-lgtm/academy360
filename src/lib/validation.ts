import { z } from 'zod'

export const UUID_LIKE_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function uuidLikeSchema(message = 'Invalid ID format') {
  return z.string().regex(UUID_LIKE_REGEX, message)
}
