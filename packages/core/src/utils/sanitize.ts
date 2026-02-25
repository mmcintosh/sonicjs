/**
 * HTML sanitization utilities for preventing XSS attacks
 */

/**
 * Escapes HTML special characters to prevent XSS attacks
 * @param text - The text to escape
 * @returns The escaped text safe for HTML output
 */
export function escapeHtml(text: string): string {
  if (typeof text !== 'string') {
    return ''
  }

  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }

  return text.replace(/[&<>"']/g, (char) => map[char] || char)
}

/**
 * Sanitizes user input by escaping HTML special characters
 * This should be used for all user-provided text fields to prevent XSS
 * @param input - The input string to sanitize
 * @returns The sanitized string
 */
export function sanitizeInput(input: string | null | undefined): string {
  if (!input) {
    return ''
  }
  return escapeHtml(String(input).trim())
}

/**
 * Sanitizes an object's string properties
 * @param obj - Object with string properties to sanitize
 * @param fields - Array of field names to sanitize
 * @returns New object with sanitized fields
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[]
): T {
  const sanitized = { ...obj }

  for (const field of fields) {
    if (typeof obj[field] === 'string') {
      sanitized[field] = sanitizeInput(obj[field]) as T[keyof T]
    }
  }

  return sanitized
}

/**
 * Recursively sanitize all string values in arbitrary JSON data.
 * HTML-encodes entities (e.g., < becomes &lt;) to prevent stored XSS
 * when data is rendered in templates.
 * @param value - The value to sanitize (string, array, object, or primitive)
 * @returns The sanitized value with all strings HTML-escaped
 */
export function sanitizeDeep(value: unknown): unknown {
  if (typeof value === 'string') {
    return sanitizeInput(value)
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeDeep)
  }
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) {
      result[k] = sanitizeDeep(v)
    }
    return result
  }
  return value // numbers, booleans, null pass through
}
