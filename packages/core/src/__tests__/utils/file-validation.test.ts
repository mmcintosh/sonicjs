import { describe, it, expect } from 'vitest'
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  MIME_TO_EXTENSIONS,
  normalizeMimeType,
  validateFileExtension,
  validateFolder,
  validateMagicBytes,
  validateUploadedFile,
  fileValidationSchema,
  getContentDisposition,
} from '../../utils/file-validation'

// Helper: create an ArrayBuffer from byte values, optionally zero-padded to a target size
function createBuffer(bytes: number[], totalSize?: number): ArrayBuffer {
  const size = totalSize ?? bytes.length
  const buffer = new ArrayBuffer(size)
  const view = new Uint8Array(buffer)
  for (let i = 0; i < bytes.length; i++) {
    view[i] = bytes[i]!
  }
  return buffer
}

// --- ALLOWED_MIME_TYPES ---

describe('ALLOWED_MIME_TYPES', () => {
  it('contains expected image types', () => {
    expect(ALLOWED_MIME_TYPES).toContain('image/jpeg')
    expect(ALLOWED_MIME_TYPES).toContain('image/png')
    expect(ALLOWED_MIME_TYPES).toContain('image/gif')
    expect(ALLOWED_MIME_TYPES).toContain('image/webp')
    expect(ALLOWED_MIME_TYPES).toContain('image/svg+xml')
  })

  it('does not contain non-standard image/jpg alias', () => {
    expect(ALLOWED_MIME_TYPES).not.toContain('image/jpg')
  })

  it('has exactly 20 types', () => {
    expect(ALLOWED_MIME_TYPES).toHaveLength(20)
  })
})

// --- normalizeMimeType ---

describe('normalizeMimeType', () => {
  it('maps image/jpg to image/jpeg', () => {
    expect(normalizeMimeType('image/jpg')).toBe('image/jpeg')
  })

  it('maps audio/mp3 to audio/mpeg', () => {
    expect(normalizeMimeType('audio/mp3')).toBe('audio/mpeg')
  })

  it('maps audio/m4a to audio/mp4', () => {
    expect(normalizeMimeType('audio/m4a')).toBe('audio/mp4')
  })

  it('maps video/mov to video/quicktime', () => {
    expect(normalizeMimeType('video/mov')).toBe('video/quicktime')
  })

  it('passes through canonical MIME types unchanged', () => {
    expect(normalizeMimeType('image/jpeg')).toBe('image/jpeg')
    expect(normalizeMimeType('application/pdf')).toBe('application/pdf')
  })

  it('passes through unknown MIME types unchanged', () => {
    expect(normalizeMimeType('application/octet-stream')).toBe('application/octet-stream')
  })
})

// --- validateFileExtension ---

describe('validateFileExtension', () => {
  it('accepts .jpg for image/jpeg', () => {
    expect(validateFileExtension('photo.jpg', 'image/jpeg')).toBe(true)
  })

  it('accepts .jpeg for image/jpeg', () => {
    expect(validateFileExtension('photo.jpeg', 'image/jpeg')).toBe(true)
  })

  it('rejects .png for image/jpeg', () => {
    expect(validateFileExtension('photo.png', 'image/jpeg')).toBe(false)
  })

  it('accepts .pdf for application/pdf', () => {
    expect(validateFileExtension('document.pdf', 'application/pdf')).toBe(true)
  })

  it('rejects .exe for application/pdf', () => {
    expect(validateFileExtension('virus.exe', 'application/pdf')).toBe(false)
  })

  it('handles case-insensitive extensions', () => {
    expect(validateFileExtension('photo.JPG', 'image/jpeg')).toBe(true)
    expect(validateFileExtension('photo.Png', 'image/png')).toBe(true)
  })

  it('rejects files without an extension', () => {
    expect(validateFileExtension('noextension', 'image/jpeg')).toBe(false)
  })

  it('accepts extension for MIME alias (image/jpg → image/jpeg)', () => {
    expect(validateFileExtension('photo.jpg', 'image/jpg')).toBe(true)
  })

  it('returns true for unknown MIME type (cannot validate)', () => {
    expect(validateFileExtension('file.bin', 'application/octet-stream')).toBe(true)
  })

  it('accepts .docx for OOXML word document', () => {
    expect(validateFileExtension('report.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe(true)
  })

  it('accepts .mp3 for audio/mpeg', () => {
    expect(validateFileExtension('song.mp3', 'audio/mpeg')).toBe(true)
  })

  it('accepts .mov for video/quicktime', () => {
    expect(validateFileExtension('clip.mov', 'video/quicktime')).toBe(true)
  })
})

// --- validateFolder ---

describe('validateFolder', () => {
  it('returns true for undefined (root-level upload)', () => {
    expect(validateFolder(undefined)).toBe(true)
  })

  it('returns true for null (root-level upload)', () => {
    expect(validateFolder(null)).toBe(true)
  })

  it('returns true for empty string (root-level upload)', () => {
    expect(validateFolder('')).toBe(true)
  })

  it('accepts valid folder names', () => {
    expect(validateFolder('uploads')).toBe(true)
    expect(validateFolder('my-folder')).toBe(true)
    expect(validateFolder('folder_name')).toBe(true)
    expect(validateFolder('a123')).toBe(true)
  })

  it('rejects path traversal (..)', () => {
    expect(validateFolder('..')).toBe(false)
    expect(validateFolder('../etc')).toBe(false)
    expect(validateFolder('foo/..')).toBe(false)
  })

  it('rejects forward slashes', () => {
    expect(validateFolder('foo/bar')).toBe(false)
  })

  it('rejects backslashes', () => {
    expect(validateFolder('foo\\bar')).toBe(false)
  })

  it('rejects names starting with non-alphanumeric', () => {
    expect(validateFolder('-folder')).toBe(false)
    expect(validateFolder('_folder')).toBe(false)
    expect(validateFolder('.hidden')).toBe(false)
  })

  it('rejects uppercase letters', () => {
    expect(validateFolder('MyFolder')).toBe(false)
  })

  it('rejects names longer than 64 characters', () => {
    expect(validateFolder('a'.repeat(65))).toBe(false)
  })

  it('accepts names exactly 64 characters', () => {
    expect(validateFolder('a'.repeat(64))).toBe(true)
  })

  it('rejects special characters', () => {
    expect(validateFolder('folder name')).toBe(false)
    expect(validateFolder('folder@name')).toBe(false)
    expect(validateFolder('folder.name')).toBe(false)
  })
})

// --- validateMagicBytes ---

describe('validateMagicBytes', () => {
  it('validates JPEG (FF D8 FF)', () => {
    const buf = createBuffer([0xFF, 0xD8, 0xFF, 0xE0], 100)
    expect(validateMagicBytes(buf, 'image/jpeg').valid).toBe(true)
  })

  it('validates PNG', () => {
    const buf = createBuffer([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], 100)
    expect(validateMagicBytes(buf, 'image/png').valid).toBe(true)
  })

  it('validates GIF87a', () => {
    const buf = createBuffer([0x47, 0x49, 0x46, 0x38, 0x37, 0x61], 100)
    expect(validateMagicBytes(buf, 'image/gif').valid).toBe(true)
  })

  it('validates GIF89a', () => {
    const buf = createBuffer([0x47, 0x49, 0x46, 0x38, 0x39, 0x61], 100)
    expect(validateMagicBytes(buf, 'image/gif').valid).toBe(true)
  })

  it('validates WebP (RIFF + WEBP)', () => {
    const bytes = new Array(12).fill(0)
    // RIFF
    bytes[0] = 0x52; bytes[1] = 0x49; bytes[2] = 0x46; bytes[3] = 0x46
    // WEBP at offset 8
    bytes[8] = 0x57; bytes[9] = 0x45; bytes[10] = 0x42; bytes[11] = 0x50
    const buf = createBuffer(bytes, 100)
    expect(validateMagicBytes(buf, 'image/webp').valid).toBe(true)
  })

  it('validates PDF (%PDF-)', () => {
    const buf = createBuffer([0x25, 0x50, 0x44, 0x46, 0x2D], 100)
    expect(validateMagicBytes(buf, 'application/pdf').valid).toBe(true)
  })

  it('validates DOC (OLE2 compound)', () => {
    const buf = createBuffer([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1], 100)
    expect(validateMagicBytes(buf, 'application/msword').valid).toBe(true)
  })

  it('validates DOCX (PK/ZIP)', () => {
    const buf = createBuffer([0x50, 0x4B, 0x03, 0x04], 100)
    expect(validateMagicBytes(buf, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document').valid).toBe(true)
  })

  it('validates XLSX (PK/ZIP)', () => {
    const buf = createBuffer([0x50, 0x4B, 0x03, 0x04], 100)
    expect(validateMagicBytes(buf, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').valid).toBe(true)
  })

  it('validates PPTX (PK/ZIP)', () => {
    const buf = createBuffer([0x50, 0x4B, 0x03, 0x04], 100)
    expect(validateMagicBytes(buf, 'application/vnd.openxmlformats-officedocument.presentationml.presentation').valid).toBe(true)
  })

  it('validates MP4 (ftyp at offset 4)', () => {
    const bytes = new Array(12).fill(0)
    bytes[4] = 0x66; bytes[5] = 0x74; bytes[6] = 0x79; bytes[7] = 0x70
    const buf = createBuffer(bytes, 100)
    expect(validateMagicBytes(buf, 'video/mp4').valid).toBe(true)
  })

  it('validates M4A (ftyp at offset 4)', () => {
    const bytes = new Array(12).fill(0)
    bytes[4] = 0x66; bytes[5] = 0x74; bytes[6] = 0x79; bytes[7] = 0x70
    const buf = createBuffer(bytes, 100)
    expect(validateMagicBytes(buf, 'audio/mp4').valid).toBe(true)
  })

  it('validates MOV (ftyp at offset 4)', () => {
    const bytes = new Array(12).fill(0)
    bytes[4] = 0x66; bytes[5] = 0x74; bytes[6] = 0x79; bytes[7] = 0x70
    const buf = createBuffer(bytes, 100)
    expect(validateMagicBytes(buf, 'video/quicktime').valid).toBe(true)
  })

  it('validates WebM (EBML header)', () => {
    const buf = createBuffer([0x1A, 0x45, 0xDF, 0xA3], 100)
    expect(validateMagicBytes(buf, 'video/webm').valid).toBe(true)
  })

  it('validates Ogg video', () => {
    const buf = createBuffer([0x4F, 0x67, 0x67, 0x53], 100)
    expect(validateMagicBytes(buf, 'video/ogg').valid).toBe(true)
  })

  it('validates Ogg audio', () => {
    const buf = createBuffer([0x4F, 0x67, 0x67, 0x53], 100)
    expect(validateMagicBytes(buf, 'audio/ogg').valid).toBe(true)
  })

  it('validates AVI (RIFF + AVI )', () => {
    const bytes = new Array(12).fill(0)
    bytes[0] = 0x52; bytes[1] = 0x49; bytes[2] = 0x46; bytes[3] = 0x46
    bytes[8] = 0x41; bytes[9] = 0x56; bytes[10] = 0x49; bytes[11] = 0x20
    const buf = createBuffer(bytes, 100)
    expect(validateMagicBytes(buf, 'video/avi').valid).toBe(true)
  })

  it('validates WAV (RIFF + WAVE)', () => {
    const bytes = new Array(12).fill(0)
    bytes[0] = 0x52; bytes[1] = 0x49; bytes[2] = 0x46; bytes[3] = 0x46
    bytes[8] = 0x57; bytes[9] = 0x41; bytes[10] = 0x56; bytes[11] = 0x45
    const buf = createBuffer(bytes, 100)
    expect(validateMagicBytes(buf, 'audio/wav').valid).toBe(true)
  })

  it('validates MP3 (FF FB sync)', () => {
    const buf = createBuffer([0xFF, 0xFB], 100)
    expect(validateMagicBytes(buf, 'audio/mpeg').valid).toBe(true)
  })

  it('validates MP3 (ID3 tag)', () => {
    const buf = createBuffer([0x49, 0x44, 0x33], 100)
    expect(validateMagicBytes(buf, 'audio/mpeg').valid).toBe(true)
  })

  it('validates MP3 with audio/mp3 alias', () => {
    const buf = createBuffer([0xFF, 0xFB], 100)
    expect(validateMagicBytes(buf, 'audio/mp3').valid).toBe(true)
  })

  it('validates SVG (starts with <svg)', () => {
    const encoder = new TextEncoder()
    const buf = encoder.encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>').buffer
    expect(validateMagicBytes(buf, 'image/svg+xml').valid).toBe(true)
  })

  it('validates SVG (starts with <?xml)', () => {
    const encoder = new TextEncoder()
    const buf = encoder.encode('<?xml version="1.0"?><svg></svg>').buffer
    expect(validateMagicBytes(buf, 'image/svg+xml').valid).toBe(true)
  })

  it('validates SVG with BOM', () => {
    const bom = [0xEF, 0xBB, 0xBF]
    const svgBytes = new TextEncoder().encode('<svg></svg>')
    const combined = new Uint8Array(bom.length + svgBytes.length)
    combined.set(bom)
    combined.set(svgBytes, bom.length)
    expect(validateMagicBytes(combined.buffer, 'image/svg+xml').valid).toBe(true)
  })

  it('rejects SVG claim for binary content', () => {
    const buf = createBuffer([0xFF, 0xD8, 0xFF, 0xE0], 100)
    expect(validateMagicBytes(buf, 'image/svg+xml').valid).toBe(false)
  })

  it('validates text/plain (no null bytes)', () => {
    const encoder = new TextEncoder()
    const buf = encoder.encode('Hello, this is plain text content.').buffer
    expect(validateMagicBytes(buf, 'text/plain').valid).toBe(true)
  })

  it('rejects text/plain with null bytes', () => {
    const buf = createBuffer([0x48, 0x65, 0x6C, 0x00, 0x6F], 10)
    expect(validateMagicBytes(buf, 'text/plain').valid).toBe(false)
  })

  it('rejects JPEG claim for PNG bytes', () => {
    const buf = createBuffer([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], 100)
    const result = validateMagicBytes(buf, 'image/jpeg')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Magic bytes do not match')
  })

  it('rejects PNG claim for JPEG bytes', () => {
    const buf = createBuffer([0xFF, 0xD8, 0xFF, 0xE0], 100)
    const result = validateMagicBytes(buf, 'image/png')
    expect(result.valid).toBe(false)
  })

  it('returns error for empty buffer', () => {
    const buf = new ArrayBuffer(0)
    const result = validateMagicBytes(buf, 'image/jpeg')
    expect(result.valid).toBe(false)
    expect(result.error).toBe('File is empty')
  })

  it('rejects WebP when RIFF header but wrong sub-type', () => {
    const bytes = new Array(12).fill(0)
    bytes[0] = 0x52; bytes[1] = 0x49; bytes[2] = 0x46; bytes[3] = 0x46
    bytes[8] = 0x41; bytes[9] = 0x56; bytes[10] = 0x49; bytes[11] = 0x20 // AVI, not WEBP
    const buf = createBuffer(bytes, 100)
    expect(validateMagicBytes(buf, 'image/webp').valid).toBe(false)
  })
})

// --- validateUploadedFile ---

describe('validateUploadedFile', () => {
  it('passes for a valid JPEG upload', () => {
    const buf = createBuffer([0xFF, 0xD8, 0xFF, 0xE0], 1000)
    const result = validateUploadedFile(
      { name: 'photo.jpg', type: 'image/jpeg', size: 1000 },
      buf
    )
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
    expect(result.normalizedMimeType).toBe('image/jpeg')
  })

  it('normalizes image/jpg to image/jpeg', () => {
    const buf = createBuffer([0xFF, 0xD8, 0xFF, 0xE0], 1000)
    const result = validateUploadedFile(
      { name: 'photo.jpg', type: 'image/jpg', size: 1000 },
      buf
    )
    expect(result.valid).toBe(true)
    expect(result.normalizedMimeType).toBe('image/jpeg')
  })

  it('collects multiple errors', () => {
    // PNG bytes but claiming JPEG, with wrong extension
    const buf = createBuffer([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], 1000)
    const result = validateUploadedFile(
      { name: 'photo.png', type: 'image/jpeg', size: 1000 },
      buf
    )
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThanOrEqual(2) // magic bytes + extension mismatch
  })

  it('rejects oversized files', () => {
    const buf = createBuffer([0xFF, 0xD8, 0xFF, 0xE0], 100)
    const result = validateUploadedFile(
      { name: 'photo.jpg', type: 'image/jpeg', size: 60 * 1024 * 1024 },
      buf
    )
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('50MB'))).toBe(true)
  })

  it('rejects unsupported MIME type', () => {
    const buf = createBuffer([0x00], 100)
    const result = validateUploadedFile(
      { name: 'file.exe', type: 'application/x-executable', size: 100 },
      buf
    )
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('Unsupported file type'))).toBe(true)
  })

  it('rejects invalid folder', () => {
    const buf = createBuffer([0xFF, 0xD8, 0xFF, 0xE0], 1000)
    const result = validateUploadedFile(
      { name: 'photo.jpg', type: 'image/jpeg', size: 1000 },
      buf,
      '../etc'
    )
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('folder'))).toBe(true)
  })

  it('allows undefined folder', () => {
    const buf = createBuffer([0xFF, 0xD8, 0xFF, 0xE0], 1000)
    const result = validateUploadedFile(
      { name: 'photo.jpg', type: 'image/jpeg', size: 1000 },
      buf,
      undefined
    )
    expect(result.valid).toBe(true)
  })

  it('validates PDF correctly', () => {
    const buf = createBuffer([0x25, 0x50, 0x44, 0x46, 0x2D], 5000)
    const result = validateUploadedFile(
      { name: 'document.pdf', type: 'application/pdf', size: 5000 },
      buf
    )
    expect(result.valid).toBe(true)
  })
})

// --- fileValidationSchema ---

describe('fileValidationSchema', () => {
  it('accepts valid input', () => {
    const result = fileValidationSchema.safeParse({
      name: 'photo.jpg',
      type: 'image/jpeg',
      size: 1024
    })
    expect(result.success).toBe(true)
  })

  it('accepts image/jpg alias', () => {
    const result = fileValidationSchema.safeParse({
      name: 'photo.jpg',
      type: 'image/jpg',
      size: 1024
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty filename', () => {
    const result = fileValidationSchema.safeParse({
      name: '',
      type: 'image/jpeg',
      size: 1024
    })
    expect(result.success).toBe(false)
  })

  it('rejects filename longer than 255 characters', () => {
    const result = fileValidationSchema.safeParse({
      name: 'a'.repeat(256),
      type: 'image/jpeg',
      size: 1024
    })
    expect(result.success).toBe(false)
  })

  it('rejects unsupported MIME type', () => {
    const result = fileValidationSchema.safeParse({
      name: 'file.exe',
      type: 'application/x-executable',
      size: 1024
    })
    expect(result.success).toBe(false)
  })

  it('rejects file exceeding 50MB', () => {
    const result = fileValidationSchema.safeParse({
      name: 'big.jpg',
      type: 'image/jpeg',
      size: 51 * 1024 * 1024
    })
    expect(result.success).toBe(false)
  })
})

// --- getContentDisposition ---

describe('getContentDisposition', () => {
  it('returns attachment for SVG', () => {
    expect(getContentDisposition('image/svg+xml')).toBe('attachment')
  })

  it('returns inline for image/jpeg', () => {
    expect(getContentDisposition('image/jpeg')).toBe('inline')
  })

  it('returns inline for application/pdf', () => {
    expect(getContentDisposition('application/pdf')).toBe('inline')
  })

  it('returns attachment for unknown types', () => {
    expect(getContentDisposition('application/octet-stream')).toBe('attachment')
  })

  it('handles MIME aliases (image/jpg)', () => {
    expect(getContentDisposition('image/jpg')).toBe('inline')
  })
})
