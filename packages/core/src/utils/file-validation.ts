import { z } from 'zod'

// --- Constants ---

export const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

export const ALLOWED_MIME_TYPES = [
  // Images
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  // Documents
  'application/pdf', 'text/plain', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Videos
  'video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/quicktime',
  // Audio
  'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4',
] as const

export type AllowedMimeType = typeof ALLOWED_MIME_TYPES[number]

export const MIME_TO_EXTENSIONS: Record<string, string[]> = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/gif': ['gif'],
  'image/webp': ['webp'],
  'image/svg+xml': ['svg'],
  'application/pdf': ['pdf'],
  'text/plain': ['txt', 'text', 'log', 'csv', 'md'],
  'application/msword': ['doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['pptx'],
  'video/mp4': ['mp4', 'm4v'],
  'video/webm': ['webm'],
  'video/ogg': ['ogv', 'ogg'],
  'video/avi': ['avi'],
  'video/quicktime': ['mov', 'qt'],
  'audio/mpeg': ['mp3'],
  'audio/wav': ['wav'],
  'audio/ogg': ['ogg', 'oga'],
  'audio/mp4': ['m4a', 'mp4'],
}

// --- MIME normalization ---

const MIME_ALIASES: Record<string, string> = {
  'image/jpg': 'image/jpeg',
  'audio/mp3': 'audio/mpeg',
  'audio/m4a': 'audio/mp4',
  'video/mov': 'video/quicktime',
}

export function normalizeMimeType(type: string): string {
  return MIME_ALIASES[type] || type
}

// --- Magic byte signatures ---

interface MagicSignature {
  bytes: number[]
  offset?: number
  /** For RIFF/ftyp containers: secondary pattern at a different offset */
  sub?: { bytes: number[]; offset: number }
}

/**
 * Maps MIME types to their magic byte signatures.
 * Some types share containers (RIFF, ftyp, PK, OggS) — we group them
 * and accept any type in the group when the container matches.
 */
const MAGIC_SIGNATURES: Record<string, MagicSignature[]> = {
  'image/jpeg': [
    { bytes: [0xFF, 0xD8, 0xFF] },
  ],
  'image/png': [
    { bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] },
  ],
  'image/gif': [
    { bytes: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61] }, // GIF87a
    { bytes: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61] }, // GIF89a
  ],
  'image/webp': [
    // RIFF....WEBP
    { bytes: [0x52, 0x49, 0x46, 0x46], sub: { bytes: [0x57, 0x45, 0x42, 0x50], offset: 8 } },
  ],
  'application/pdf': [
    { bytes: [0x25, 0x50, 0x44, 0x46, 0x2D] }, // %PDF-
  ],
  'application/msword': [
    { bytes: [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1] }, // OLE2 compound
  ],
  // Office Open XML — all are PK/ZIP
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
    { bytes: [0x50, 0x4B, 0x03, 0x04] },
  ],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
    { bytes: [0x50, 0x4B, 0x03, 0x04] },
  ],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': [
    { bytes: [0x50, 0x4B, 0x03, 0x04] },
  ],
  // ftyp container — shared by MP4, M4A, MOV
  'video/mp4': [
    { bytes: [0x66, 0x74, 0x79, 0x70], offset: 4 }, // ftyp at offset 4
  ],
  'audio/mp4': [
    { bytes: [0x66, 0x74, 0x79, 0x70], offset: 4 },
  ],
  'video/quicktime': [
    { bytes: [0x66, 0x74, 0x79, 0x70], offset: 4 },
  ],
  'video/webm': [
    { bytes: [0x1A, 0x45, 0xDF, 0xA3] }, // EBML header
  ],
  // OggS container — shared by audio/ogg and video/ogg
  'video/ogg': [
    { bytes: [0x4F, 0x67, 0x67, 0x53] }, // OggS
  ],
  'audio/ogg': [
    { bytes: [0x4F, 0x67, 0x67, 0x53] },
  ],
  'video/avi': [
    // RIFF....AVI
    { bytes: [0x52, 0x49, 0x46, 0x46], sub: { bytes: [0x41, 0x56, 0x49, 0x20], offset: 8 } },
  ],
  'audio/wav': [
    // RIFF....WAVE
    { bytes: [0x52, 0x49, 0x46, 0x46], sub: { bytes: [0x57, 0x41, 0x56, 0x45], offset: 8 } },
  ],
  'audio/mpeg': [
    { bytes: [0xFF, 0xFB] }, // MPEG Audio Layer 3 sync
    { bytes: [0xFF, 0xF3] },
    { bytes: [0xFF, 0xF2] },
    { bytes: [0x49, 0x44, 0x33] }, // ID3 tag
  ],
}

function matchesSignature(view: Uint8Array, sig: MagicSignature): boolean {
  const offset = sig.offset || 0
  if (view.length < offset + sig.bytes.length) return false

  for (let i = 0; i < sig.bytes.length; i++) {
    if (view[offset + i] !== sig.bytes[i]) return false
  }

  if (sig.sub) {
    if (view.length < sig.sub.offset + sig.sub.bytes.length) return false
    for (let i = 0; i < sig.sub.bytes.length; i++) {
      if (view[sig.sub.offset + i] !== sig.sub.bytes[i]) return false
    }
  }

  return true
}

// --- SVG heuristic ---

function looksLikeSvg(view: Uint8Array): boolean {
  // Decode the first 1KB as text, skip BOM
  const maxBytes = Math.min(view.length, 1024)
  let start = 0
  // UTF-8 BOM
  if (view.length >= 3 && view[0] === 0xEF && view[1] === 0xBB && view[2] === 0xBF) {
    start = 3
  }
  const decoder = new TextDecoder()
  const text = decoder.decode(view.slice(start, maxBytes)).trimStart()
  const lower = text.toLowerCase()
  return lower.startsWith('<svg') || lower.startsWith('<?xml')
}

// --- text/plain heuristic ---

function looksLikeText(view: Uint8Array): boolean {
  // No null bytes in the first 1KB
  const maxBytes = Math.min(view.length, 1024)
  for (let i = 0; i < maxBytes; i++) {
    if (view[i] === 0x00) return false
  }
  return true
}

// --- Public validation functions ---

export interface MagicByteResult {
  valid: boolean
  detectedType?: string
  error?: string
}

export function validateMagicBytes(buffer: ArrayBuffer, claimedType: string): MagicByteResult {
  const view = new Uint8Array(buffer)

  if (view.length === 0) {
    return { valid: false, error: 'File is empty' }
  }

  const normalized = normalizeMimeType(claimedType)

  // SVG: heuristic check
  if (normalized === 'image/svg+xml') {
    if (looksLikeSvg(view)) {
      return { valid: true, detectedType: 'image/svg+xml' }
    }
    return { valid: false, error: 'File content does not look like SVG' }
  }

  // text/plain: null-byte heuristic
  if (normalized === 'text/plain') {
    if (looksLikeText(view)) {
      return { valid: true, detectedType: 'text/plain' }
    }
    return { valid: false, error: 'File contains binary data, not plain text' }
  }

  // Look up signatures for the claimed type
  const signatures = MAGIC_SIGNATURES[normalized]
  if (!signatures) {
    // No signature defined for this type — skip magic byte check
    return { valid: true }
  }

  for (const sig of signatures) {
    if (matchesSignature(view, sig)) {
      return { valid: true, detectedType: normalized }
    }
  }

  return {
    valid: false,
    error: `Magic bytes do not match claimed type "${claimedType}"`
  }
}

export function validateFileExtension(filename: string, mimeType: string): boolean {
  const normalized = normalizeMimeType(mimeType)
  const extensions = MIME_TO_EXTENSIONS[normalized]
  if (!extensions) return true // unknown MIME — can't validate extension

  const ext = filename.split('.').pop()?.toLowerCase()
  if (!ext) return false // no extension

  return extensions.includes(ext)
}

const FOLDER_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/

export function validateFolder(folder: string | undefined | null): boolean {
  // Empty/undefined/null = root-level upload, always valid
  if (folder === undefined || folder === null || folder === '') return true

  // Reject path traversal
  if (folder.includes('..') || folder.includes('/') || folder.includes('\\')) return false

  return FOLDER_PATTERN.test(folder)
}

// --- Zod schema (single source of truth) ---

export const fileValidationSchema = z.object({
  name: z.string().min(1, 'Filename is required').max(255, 'Filename too long'),
  type: z.string().refine(
    (type) => {
      const normalized = normalizeMimeType(type)
      return (ALLOWED_MIME_TYPES as readonly string[]).includes(normalized)
    },
    { message: 'Unsupported file type' }
  ),
  size: z.number().min(1, 'File is empty').max(MAX_FILE_SIZE, 'File exceeds 50MB limit'),
})

// --- Content-Disposition helper ---

export function getContentDisposition(mimeType: string): 'attachment' | 'inline' {
  const normalized = normalizeMimeType(mimeType)
  if (normalized === 'image/svg+xml') return 'attachment'
  if ((ALLOWED_MIME_TYPES as readonly string[]).includes(normalized)) return 'inline'
  return 'attachment'
}

// --- Orchestrator ---

export interface FileValidationResult {
  valid: boolean
  errors: string[]
  normalizedMimeType: string
}

export function validateUploadedFile(
  file: { name: string; type: string; size: number },
  buffer: ArrayBuffer,
  folder?: string | null
): FileValidationResult {
  const errors: string[] = []
  const normalizedMimeType = normalizeMimeType(file.type)

  // 1. Schema validation (name, type allowlist, size)
  const schemaResult = fileValidationSchema.safeParse({
    name: file.name,
    type: file.type,
    size: file.size,
  })
  if (!schemaResult.success) {
    for (const issue of schemaResult.error.issues) {
      errors.push(issue.message)
    }
  }

  // 2. Magic bytes
  const magicResult = validateMagicBytes(buffer, file.type)
  if (!magicResult.valid && magicResult.error) {
    errors.push(magicResult.error)
  }

  // 3. Extension-MIME consistency
  if (!validateFileExtension(file.name, file.type)) {
    errors.push(`File extension does not match MIME type "${normalizedMimeType}"`)
  }

  // 4. Folder validation
  if (folder !== undefined && folder !== null && !validateFolder(folder)) {
    errors.push('Invalid folder name')
  }

  return {
    valid: errors.length === 0,
    errors,
    normalizedMimeType,
  }
}
