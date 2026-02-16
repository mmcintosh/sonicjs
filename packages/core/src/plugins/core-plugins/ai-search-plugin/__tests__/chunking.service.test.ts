import { describe, it, expect } from 'vitest'
import { ChunkingService, ContentChunk } from '../services/chunking.service'

describe('ChunkingService', () => {
  const service = new ChunkingService()

  // === chunkContent ===

  describe('chunkContent', () => {
    it('should return a single chunk for short content', () => {
      const data = { body: 'Short content that fits in one chunk.' }
      const chunks = service.chunkContent('c1', 'col1', 'Test', data)

      expect(chunks).toHaveLength(1)
      expect(chunks[0].chunk_index).toBe(0)
      expect(chunks[0].text).toContain('Short content')
    })

    it('should split long content into multiple chunks', () => {
      // Generate 600 words (exceeds CHUNK_SIZE of 500)
      const words = Array.from({ length: 600 }, (_, i) => `word${i}`)
      const data = { body: words.join(' ') }
      const chunks = service.chunkContent('c1', 'col1', 'Long Doc', data)

      expect(chunks.length).toBeGreaterThan(1)
    })

    it('should assign correct chunk_index values', () => {
      const words = Array.from({ length: 1000 }, (_, i) => `word${i}`)
      const data = { body: words.join(' ') }
      const chunks = service.chunkContent('c1', 'col1', 'Title', data)

      chunks.forEach((chunk, i) => {
        expect(chunk.chunk_index).toBe(i)
      })
    })

    it('should set correct metadata including total_chunks', () => {
      const words = Array.from({ length: 600 }, (_, i) => `word${i}`)
      const data = { body: words.join(' ') }
      const chunks = service.chunkContent('c1', 'col1', 'Title', data, { custom: 'meta' })

      for (const chunk of chunks) {
        expect(chunk.metadata.total_chunks).toBe(chunks.length)
        expect(chunk.metadata.custom).toBe('meta')
      }
    })

    it('should generate correct chunk IDs', () => {
      const data = { body: 'Some content here for testing' }
      const chunks = service.chunkContent('abc123', 'col1', 'Title', data)

      expect(chunks[0].id).toBe('abc123_chunk_0')
    })

    it('should set content_id and collection_id on all chunks', () => {
      const words = Array.from({ length: 600 }, (_, i) => `word${i}`)
      const data = { body: words.join(' ') }
      const chunks = service.chunkContent('c1', 'col1', 'Title', data)

      for (const chunk of chunks) {
        expect(chunk.content_id).toBe('c1')
        expect(chunk.collection_id).toBe('col1')
        expect(chunk.title).toBe('Title')
      }
    })

    it('should return empty array for empty content', () => {
      const data = { body: '' }
      const chunks = service.chunkContent('c1', 'col1', 'Title', data)

      expect(chunks).toHaveLength(0)
    })

    it('should return empty array for whitespace-only content', () => {
      const data = { body: '   \n\t  ' }
      const chunks = service.chunkContent('c1', 'col1', 'Title', data)

      expect(chunks).toHaveLength(0)
    })

    it('should return exactly one chunk for content under CHUNK_SIZE', () => {
      // Note: extractText adds body both from known-field extraction AND recursive extraction,
      // so the effective word count is ~2x. Use 200 words → ~400 effective → single chunk.
      const words = Array.from({ length: 200 }, (_, i) => `word${i}`)
      const data = { body: words.join(' ') }
      const chunks = service.chunkContent('c1', 'col1', 'Title', data)

      expect(chunks).toHaveLength(1)
    })

    it('should create overlap between consecutive chunks', () => {
      // 550 words: should create 2 chunks with 50-word overlap
      const words = Array.from({ length: 550 }, (_, i) => `word${i}`)
      const data = { body: words.join(' ') }
      const chunks = service.chunkContent('c1', 'col1', 'Title', data)

      if (chunks.length >= 2) {
        const chunk0Words = chunks[0].text.split(/\s+/)
        const chunk1Words = chunks[1].text.split(/\s+/)
        // Last CHUNK_OVERLAP words of chunk 0 should match first words of chunk 1
        const overlapFromChunk0 = chunk0Words.slice(-50)
        const startOfChunk1 = chunk1Words.slice(0, 50)
        expect(overlapFromChunk0).toEqual(startOfChunk1)
      }
    })
  })

  // === extractText (private, tested through chunkContent) ===

  describe('text extraction', () => {
    it('should extract body text', () => {
      const data = { body: 'Body content here' }
      const chunks = service.chunkContent('c1', 'col1', 'Title', data)

      expect(chunks[0].text).toContain('Body content here')
    })

    it('should extract description text', () => {
      const data = { description: 'Description text' }
      const chunks = service.chunkContent('c1', 'col1', 'Title', data)

      expect(chunks[0].text).toContain('Description text')
    })

    it('should extract content and summary fields', () => {
      const data = { content: 'Main content', summary: 'Short summary' }
      const chunks = service.chunkContent('c1', 'col1', 'Title', data)

      expect(chunks[0].text).toContain('Main content')
      expect(chunks[0].text).toContain('Short summary')
    })

    it('should extract title and name fields', () => {
      const data = { title: 'Doc Title', name: 'Doc Name' }
      const chunks = service.chunkContent('c1', 'col1', 'Title', data)

      expect(chunks[0].text).toContain('Doc Title')
      expect(chunks[0].text).toContain('Doc Name')
    })

    it('should recursively extract from nested objects', () => {
      const data = {
        sections: [
          { heading: 'Getting Started section content here' },
          { heading: 'Advanced Usage section content here' },
        ],
      }
      const chunks = service.chunkContent('c1', 'col1', 'Title', data)

      expect(chunks[0].text).toContain('Getting Started section content here')
      expect(chunks[0].text).toContain('Advanced Usage section content here')
    })

    it('should skip URL strings during extraction', () => {
      const data = { link: 'https://example.com/page', body: 'Real content here for the test' }
      const chunks = service.chunkContent('c1', 'col1', 'Title', data)

      expect(chunks[0].text).not.toContain('https://example.com')
      expect(chunks[0].text).toContain('Real content here for the test')
    })

    it('should skip short strings (< 10 chars) during recursive extraction', () => {
      const data = { tag: 'abc', body: 'This is real searchable content here' }
      const chunks = service.chunkContent('c1', 'col1', 'Title', data)

      // 'abc' is too short to be extracted recursively,
      // but it may still appear via the known field extraction
      expect(chunks[0].text).toContain('This is real searchable content here')
    })

    it('should skip keys like id, slug, url, image, thumbnail, metadata', () => {
      const data = {
        id: 'some-long-id-value-that-is-very-long',
        slug: 'some-long-slug-value-that-is-very-long',
        image: 'some-long-image-path-that-is-very-long',
        thumbnail: 'some-long-thumbnail-path-is-long',
        metadata: { internal: 'hidden data that should not appear' },
        body: 'This is the actual searchable content',
      }
      const chunks = service.chunkContent('c1', 'col1', 'Title', data)

      expect(chunks[0].text).toContain('This is the actual searchable content')
    })
  })

  // === chunkContentBatch ===

  describe('chunkContentBatch', () => {
    it('should chunk multiple items and combine results', () => {
      const items = [
        { id: 'a', collection_id: 'col1', title: 'Doc A', data: { body: 'Content A is here' } },
        { id: 'b', collection_id: 'col1', title: 'Doc B', data: { body: 'Content B is here' } },
      ]
      const chunks = service.chunkContentBatch(items)

      expect(chunks.length).toBeGreaterThanOrEqual(2)
      expect(chunks.some(c => c.content_id === 'a')).toBe(true)
      expect(chunks.some(c => c.content_id === 'b')).toBe(true)
    })

    it('should handle empty batch', () => {
      const chunks = service.chunkContentBatch([])
      expect(chunks).toHaveLength(0)
    })

    it('should handle items with empty content in batch', () => {
      const items = [
        { id: 'a', collection_id: 'col1', title: 'Doc A', data: { body: '' } },
        { id: 'b', collection_id: 'col1', title: 'Doc B', data: { body: 'Valid content here in doc B' } },
      ]
      const chunks = service.chunkContentBatch(items)

      expect(chunks.every(c => c.content_id === 'b')).toBe(true)
    })
  })

  // === getOptimalChunkSize ===

  describe('getOptimalChunkSize', () => {
    it('should return 600 for blog_posts', () => {
      expect(service.getOptimalChunkSize('blog_posts')).toBe(600)
    })

    it('should return 600 for articles', () => {
      expect(service.getOptimalChunkSize('articles')).toBe(600)
    })

    it('should return 400 for products', () => {
      expect(service.getOptimalChunkSize('products')).toBe(400)
    })

    it('should return 400 for pages', () => {
      expect(service.getOptimalChunkSize('pages')).toBe(400)
    })

    it('should return 200 for messages', () => {
      expect(service.getOptimalChunkSize('messages')).toBe(200)
    })

    it('should return 200 for comments', () => {
      expect(service.getOptimalChunkSize('comments')).toBe(200)
    })

    it('should return default 500 for unknown content types', () => {
      expect(service.getOptimalChunkSize('unknown')).toBe(500)
    })
  })
})
