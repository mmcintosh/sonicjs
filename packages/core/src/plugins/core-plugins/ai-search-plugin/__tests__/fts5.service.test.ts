import { describe, it, expect, vi } from 'vitest'
import { FTS5Service } from '../services/fts5.service'

/**
 * Tests for FTS5Service query sanitization logic.
 * Only tests pure functions (sanitizeFTS5Query, extractSearchableText).
 * Database-dependent methods (search, indexContent, etc.) are covered by E2E tests.
 */
describe('FTS5Service — sanitizeFTS5Query', () => {
  // Create a service with a mock DB (not used for sanitization tests)
  const mockDb = {} as any
  const service = new FTS5Service(mockDb)
  // Access private method for testing
  const sanitize = (q: string) => (service as any).sanitizeFTS5Query(q)

  // === Basic sanitization ===

  it('should return prefix query for single valid term', () => {
    expect(sanitize('laptop')).toBe('laptop*')
  })

  it('should join multiple terms with OR for BM25 ranking', () => {
    expect(sanitize('best laptop deals')).toBe('best OR laptop OR deals')
  })

  it('should lowercase all terms', () => {
    expect(sanitize('Laptop')).toBe('laptop*')
    expect(sanitize('Best LAPTOP Deals')).toBe('best OR laptop OR deals')
  })

  // === FTS5 operator stripping ===

  it('should strip asterisks', () => {
    expect(sanitize('test*')).toBe('test*') // single term gets prefix added anyway
    expect(sanitize('te*st')).toBe('test*')
  })

  it('should strip double quotes', () => {
    expect(sanitize('"exact phrase"')).toBe('exact OR phrase')
  })

  it('should strip parentheses', () => {
    expect(sanitize('(grouped terms)')).toBe('grouped OR terms')
  })

  it('should strip colons (FTS5 column filter syntax)', () => {
    expect(sanitize('title:search')).toBe('titlesearch*')
  })

  it('should strip carets', () => {
    expect(sanitize('term^2')).toBe('term2*')
  })

  // === Stop word filtering ===

  it('should filter out stop words', () => {
    // 'to' and 'for' are stop words; 'how' is not in the stop list
    expect(sanitize('how to search for items')).toBe('how OR search OR items')
  })

  it('should filter out FTS5 operator keywords (AND, OR, NOT, NEAR)', () => {
    expect(sanitize('cats AND dogs')).toBe('cats OR dogs')
    expect(sanitize('cats OR dogs')).toBe('cats OR dogs')
    expect(sanitize('cats NOT dogs')).toBe('cats OR dogs')
    expect(sanitize('cats NEAR dogs')).toBe('cats OR dogs')
  })

  it('should filter out single-character terms', () => {
    expect(sanitize('a b c real')).toBe('real*')
  })

  // === Hyphens ===

  it('should convert hyphens to spaces', () => {
    expect(sanitize('e-commerce')).toBe('commerce*')
    // 'e' is a single char and gets filtered
  })

  it('should handle multiple hyphens', () => {
    expect(sanitize('state-of-the-art design')).toBe('state OR art OR design')
  })

  // === Special characters ===

  it('should strip all punctuation and special characters', () => {
    expect(sanitize('hello! @world #test $100')).toBe('hello OR world OR test OR 100')
  })

  it('should handle unicode characters', () => {
    // Non-ASCII letters are stripped by the [^a-zA-Z0-9\s] regex
    const result = sanitize('café')
    expect(result).toBe('caf*')
  })

  // === Edge cases ===

  it('should return empty quotes for empty string', () => {
    expect(sanitize('')).toBe('""')
  })

  it('should return empty quotes for null/undefined', () => {
    expect(sanitize(null as any)).toBe('""')
    expect(sanitize(undefined as any)).toBe('""')
  })

  it('should return empty quotes for all-stop-words query', () => {
    expect(sanitize('the a an is')).toBe('""')
  })

  it('should return empty quotes for all-special-character query', () => {
    expect(sanitize('!@#$%^&*()')).toBe('""')
  })

  it('should return empty quotes for whitespace-only input', () => {
    expect(sanitize('   ')).toBe('""')
  })

  it('should return empty quotes for single character input', () => {
    expect(sanitize('a')).toBe('""')
  })

  it('should collapse multiple spaces', () => {
    expect(sanitize('search    query    terms')).toBe('search OR query OR terms')
  })

  it('should handle already-clean queries without changes', () => {
    expect(sanitize('laptop')).toBe('laptop*')
    expect(sanitize('search query')).toBe('search OR query')
  })

  it('should handle numeric-only queries', () => {
    expect(sanitize('12345')).toBe('12345*')
  })

  it('should handle mixed alphanumeric terms', () => {
    expect(sanitize('iphone 15 pro max')).toBe('iphone OR 15 OR pro OR max')
  })
})

describe('FTS5Service — extractSearchableText', () => {
  const mockDb = {} as any
  const service = new FTS5Service(mockDb)
  const extract = (data: any) => (service as any).extractSearchableText(
    typeof data === 'string' ? data : JSON.stringify(data)
  )

  it('should extract common text fields in priority order', () => {
    const text = extract({
      description: 'A description',
      body: 'Body text',
      content: 'Content field',
    })
    expect(text).toContain('A description')
    expect(text).toContain('Body text')
    expect(text).toContain('Content field')
  })

  it('should extract text, summary, and excerpt fields', () => {
    const text = extract({
      text: 'Some text content here long enough',
      summary: 'A summary content here long enough',
      excerpt: 'An excerpt content here long enough',
    })
    expect(text).toContain('Some text content here long enough')
    expect(text).toContain('A summary content here long enough')
    expect(text).toContain('An excerpt content here long enough')
  })

  it('should skip URL strings during recursive extraction', () => {
    const text = extract({
      link: 'https://example.com/some-very-long-url-path',
      body: 'Real content',
    })
    expect(text).not.toContain('https://example.com')
    expect(text).toContain('Real content')
  })

  it('should skip UUID-like strings during recursive extraction', () => {
    const text = extract({
      ref: '550e8400-e29b-41d4-a716-446655440000',
      body: 'Real content',
    })
    expect(text).not.toContain('550e8400')
    expect(text).toContain('Real content')
  })

  it('should skip keys like id, slug, url, image, metadata', () => {
    const text = extract({
      id: 'some-long-id-should-be-skipped-here',
      slug: 'some-long-slug-should-be-skipped',
      url: 'some-long-url-should-be-skipped-here',
      image: 'some-long-image-should-be-skipped',
      thumbnail: 'long-thumbnail-path-skipped-here',
      metadata: { deep: 'nested hidden data should not appear here' },
      body: 'Actual content',
    })
    expect(text).toContain('Actual content')
  })

  it('should limit recursion depth to 5', () => {
    const deep: any = { level1: { level2: { level3: { level4: { level5: { level6: { text: 'Too deep to find this text' } } } } } } }
    const text = extract(deep)
    expect(text).not.toContain('Too deep to find this text')
  })

  it('should handle string input (JSON parse)', () => {
    const text = extract('{"body":"Hello from JSON string"}')
    expect(text).toContain('Hello from JSON string')
  })

  it('should return empty string for invalid JSON', () => {
    const text = extract('not json {{{')
    expect(text).toBe('')
  })

  it('should return empty string for empty object', () => {
    const text = extract({})
    expect(text).toBe('')
  })

  it('should collapse excessive whitespace', () => {
    const text = extract({ body: 'word1   word2\n\n\nword3' })
    expect(text).not.toContain('  ') // no double spaces
  })

  it('should recursively extract from arrays', () => {
    const text = extract({
      items: ['This is a long enough string to be included', 'Another long enough string to be included too'],
    })
    expect(text).toContain('This is a long enough string to be included')
    expect(text).toContain('Another long enough string to be included too')
  })
})
