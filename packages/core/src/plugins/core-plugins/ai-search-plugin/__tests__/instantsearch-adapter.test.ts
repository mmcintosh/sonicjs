import { describe, it, expect, vi } from 'vitest'
import { InstantSearchAdapter } from '../services/instantsearch-adapter'
import type { SearchResponse, SearchResult, InstantSearchRequest } from '../types'

/** Helper to create a mock SearchResult */
function mockResult(id: string, overrides: Partial<SearchResult> = {}): SearchResult {
  return {
    id,
    title: `Title ${id}`,
    slug: `slug-${id}`,
    collection_id: 'col1',
    collection_name: 'Posts',
    status: 'published',
    created_at: 1700000000,
    updated_at: 1700000000,
    ...overrides,
  }
}

describe('InstantSearchAdapter', () => {
  const mockDb = {
    prepare: vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue(null),
      }),
    }),
  } as any

  const adapter = new InstantSearchAdapter(mockDb)

  // === toInstantSearchResult ===

  describe('toInstantSearchResult', () => {
    const baseRequest: InstantSearchRequest = {
      indexName: 'all',
      params: { query: 'test', page: 0, hitsPerPage: 20 },
    }

    it('should map results to Algolia-compatible format', () => {
      const response: SearchResponse = {
        results: [mockResult('abc')],
        total: 1,
        query_time_ms: 42,
        mode: 'fts5',
      }

      const result = adapter.toInstantSearchResult(response, baseRequest, 42)

      expect(result.hits).toHaveLength(1)
      expect(result.hits[0].objectID).toBe('abc')
      expect(result.hits[0].title).toBe('Title abc')
      expect(result.hits[0].slug).toBe('slug-abc')
      expect(result.nbHits).toBe(1)
      expect(result.page).toBe(0)
      expect(result.processingTimeMS).toBe(42)
      expect(result.query).toBe('test')
      expect(result.exhaustiveNbHits).toBe(true)
    })

    it('should calculate nbPages correctly', () => {
      const response: SearchResponse = {
        results: Array.from({ length: 20 }, (_, i) => mockResult(`r${i}`)),
        total: 55,
        query_time_ms: 10,
        mode: 'fts5',
      }
      const request: InstantSearchRequest = {
        indexName: 'all',
        params: { query: 'test', page: 0, hitsPerPage: 20 },
      }

      const result = adapter.toInstantSearchResult(response, request, 10)

      expect(result.nbPages).toBe(3) // ceil(55/20) = 3
    })

    it('should handle zero total results', () => {
      const response: SearchResponse = {
        results: [],
        total: 0,
        query_time_ms: 5,
        mode: 'fts5',
      }

      const result = adapter.toInstantSearchResult(response, baseRequest, 5)

      expect(result.hits).toHaveLength(0)
      expect(result.nbHits).toBe(0)
      expect(result.nbPages).toBe(0)
    })

    it('should set correct page from request params', () => {
      const response: SearchResponse = {
        results: [],
        total: 0,
        query_time_ms: 5,
        mode: 'fts5',
      }
      const request: InstantSearchRequest = {
        indexName: 'all',
        params: { query: 'test', page: 3, hitsPerPage: 10 },
      }

      const result = adapter.toInstantSearchResult(response, request, 5)

      expect(result.page).toBe(3)
    })

    it('should default page to 0 when not specified', () => {
      const response: SearchResponse = {
        results: [],
        total: 0,
        query_time_ms: 5,
        mode: 'fts5',
      }
      const request: InstantSearchRequest = {
        indexName: 'all',
        params: { query: 'test' },
      }

      const result = adapter.toInstantSearchResult(response, request, 5)

      expect(result.page).toBe(0)
      expect(result.hitsPerPage).toBe(20)
    })

    it('should cap hitsPerPage at 200', () => {
      const response: SearchResponse = {
        results: [],
        total: 1000,
        query_time_ms: 5,
        mode: 'fts5',
      }
      const request: InstantSearchRequest = {
        indexName: 'all',
        params: { query: 'test', hitsPerPage: 500 },
      }

      const result = adapter.toInstantSearchResult(response, request, 5)

      expect(result.hitsPerPage).toBe(200)
      expect(result.nbPages).toBe(5) // ceil(1000/200)
    })

    it('should include index name in result', () => {
      const response: SearchResponse = {
        results: [],
        total: 0,
        query_time_ms: 5,
        mode: 'fts5',
      }
      const request: InstantSearchRequest = {
        indexName: 'blog_posts',
        params: { query: 'test' },
      }

      const result = adapter.toInstantSearchResult(response, request, 5)

      expect(result.index).toBe('blog_posts')
    })
  })

  // === Hit mapping (toHit) ===

  describe('hit mapping', () => {
    const baseRequest: InstantSearchRequest = {
      indexName: 'all',
      params: { query: 'test' },
    }

    it('should map objectID from result id', () => {
      const response: SearchResponse = {
        results: [mockResult('my-id-123')],
        total: 1,
        query_time_ms: 5,
        mode: 'fts5',
      }

      const result = adapter.toInstantSearchResult(response, baseRequest, 5)

      expect(result.hits[0].objectID).toBe('my-id-123')
    })

    it('should include optional fields when present', () => {
      const response: SearchResponse = {
        results: [
          mockResult('a', {
            author_name: 'John',
            url: '/posts/a',
            relevance_score: 0.95,
          }),
        ],
        total: 1,
        query_time_ms: 5,
        mode: 'fts5',
      }

      const result = adapter.toInstantSearchResult(response, baseRequest, 5)
      const hit = result.hits[0]

      expect(hit.author_name).toBe('John')
      expect(hit.url).toBe('/posts/a')
      expect(hit.relevance_score).toBe(0.95)
    })

    it('should omit optional fields when not present', () => {
      const response: SearchResponse = {
        results: [mockResult('a')],
        total: 1,
        query_time_ms: 5,
        mode: 'fts5',
      }

      const result = adapter.toInstantSearchResult(response, baseRequest, 5)
      const hit = result.hits[0]

      expect(hit.author_name).toBeUndefined()
      expect(hit.url).toBeUndefined()
    })
  })

  // === Highlight conversion ===

  describe('highlight conversion', () => {
    it('should generate _highlightResult from highlights', () => {
      const response: SearchResponse = {
        results: [
          mockResult('a', {
            highlights: {
              title: 'A <mark>test</mark> title',
              body: 'Some <mark>test</mark> content',
            },
          }),
        ],
        total: 1,
        query_time_ms: 5,
        mode: 'fts5',
      }
      const request: InstantSearchRequest = {
        indexName: 'all',
        params: { query: 'test' },
      }

      const result = adapter.toInstantSearchResult(response, request, 5)
      const hit = result.hits[0]

      expect(hit._highlightResult).toBeDefined()
      expect(hit._highlightResult!.title.value).toBe('A <em>test</em> title')
      expect(hit._highlightResult!.body.value).toBe('Some <em>test</em> content')
    })

    it('should use custom highlight tags from request params', () => {
      const response: SearchResponse = {
        results: [
          mockResult('a', {
            highlights: {
              title: 'A <mark>test</mark> title',
            },
          }),
        ],
        total: 1,
        query_time_ms: 5,
        mode: 'fts5',
      }
      const request: InstantSearchRequest = {
        indexName: 'all',
        params: {
          query: 'test',
          highlightPreTag: '<strong>',
          highlightPostTag: '</strong>',
        },
      }

      const result = adapter.toInstantSearchResult(response, request, 5)

      expect(result.hits[0]._highlightResult!.title.value).toBe('A <strong>test</strong> title')
    })

    it('should set matchLevel to none when no mark tags present', () => {
      const response: SearchResponse = {
        results: [
          mockResult('a', {
            highlights: { title: 'No highlights here' },
          }),
        ],
        total: 1,
        query_time_ms: 5,
        mode: 'fts5',
      }
      const request: InstantSearchRequest = {
        indexName: 'all',
        params: { query: 'test' },
      }

      const result = adapter.toInstantSearchResult(response, request, 5)

      expect(result.hits[0]._highlightResult!.title.matchLevel).toBe('none')
    })

    it('should set matchLevel to partial when some text is highlighted', () => {
      const response: SearchResponse = {
        results: [
          mockResult('a', {
            highlights: { title: 'Some <mark>test</mark> title with more text' },
          }),
        ],
        total: 1,
        query_time_ms: 5,
        mode: 'fts5',
      }
      const request: InstantSearchRequest = {
        indexName: 'all',
        params: { query: 'test' },
      }

      const result = adapter.toInstantSearchResult(response, request, 5)

      expect(result.hits[0]._highlightResult!.title.matchLevel).toBe('partial')
    })

    it('should set matchLevel to full when most text is highlighted', () => {
      const response: SearchResponse = {
        results: [
          mockResult('a', {
            highlights: { title: '<mark>entire title highlighted</mark>' },
          }),
        ],
        total: 1,
        query_time_ms: 5,
        mode: 'fts5',
      }
      const request: InstantSearchRequest = {
        indexName: 'all',
        params: { query: 'test' },
      }

      const result = adapter.toInstantSearchResult(response, request, 5)

      expect(result.hits[0]._highlightResult!.title.matchLevel).toBe('full')
    })

    it('should not include _highlightResult when no highlights exist', () => {
      const response: SearchResponse = {
        results: [mockResult('a')],
        total: 1,
        query_time_ms: 5,
        mode: 'fts5',
      }
      const request: InstantSearchRequest = {
        indexName: 'all',
        params: { query: 'test' },
      }

      const result = adapter.toInstantSearchResult(response, request, 5)

      expect(result.hits[0]._highlightResult).toBeUndefined()
    })
  })

  // === Snippet result ===

  describe('snippet result', () => {
    it('should generate _snippetResult from snippet field', () => {
      const response: SearchResponse = {
        results: [
          mockResult('a', { snippet: 'A <mark>test</mark> snippet here' }),
        ],
        total: 1,
        query_time_ms: 5,
        mode: 'fts5',
      }
      const request: InstantSearchRequest = {
        indexName: 'all',
        params: { query: 'test' },
      }

      const result = adapter.toInstantSearchResult(response, request, 5)

      expect(result.hits[0]._snippetResult).toBeDefined()
      expect(result.hits[0]._snippetResult!.body.value).toBe('A <em>test</em> snippet here')
    })
  })

  // === Facets ===

  describe('facet computation', () => {
    it('should compute collection_name facet counts', () => {
      const response: SearchResponse = {
        results: [
          mockResult('a', { collection_name: 'Posts' }),
          mockResult('b', { collection_name: 'Posts' }),
          mockResult('c', { collection_name: 'News' }),
        ],
        total: 3,
        query_time_ms: 5,
        mode: 'fts5',
      }
      const request: InstantSearchRequest = {
        indexName: 'all',
        params: { query: 'test', facets: ['collection_name'] },
      }

      const result = adapter.toInstantSearchResult(response, request, 5)

      expect(result.facets).toBeDefined()
      expect(result.facets!.collection_name).toEqual({ Posts: 2, News: 1 })
    })

    it('should compute status facet counts', () => {
      const response: SearchResponse = {
        results: [
          mockResult('a', { status: 'published' }),
          mockResult('b', { status: 'published' }),
          mockResult('c', { status: 'draft' }),
        ],
        total: 3,
        query_time_ms: 5,
        mode: 'fts5',
      }
      const request: InstantSearchRequest = {
        indexName: 'all',
        params: { query: 'test', facets: ['status'] },
      }

      const result = adapter.toInstantSearchResult(response, request, 5)

      expect(result.facets!.status).toEqual({ published: 2, draft: 1 })
    })

    it('should compute both facets when both requested', () => {
      const response: SearchResponse = {
        results: [mockResult('a'), mockResult('b')],
        total: 2,
        query_time_ms: 5,
        mode: 'fts5',
      }
      const request: InstantSearchRequest = {
        indexName: 'all',
        params: { query: 'test', facets: ['collection_name', 'status'] },
      }

      const result = adapter.toInstantSearchResult(response, request, 5)

      expect(result.facets!.collection_name).toBeDefined()
      expect(result.facets!.status).toBeDefined()
    })

    it('should not include facets when none requested', () => {
      const response: SearchResponse = {
        results: [mockResult('a')],
        total: 1,
        query_time_ms: 5,
        mode: 'fts5',
      }
      const request: InstantSearchRequest = {
        indexName: 'all',
        params: { query: 'test' },
      }

      const result = adapter.toInstantSearchResult(response, request, 5)

      expect(result.facets).toBeUndefined()
    })

    it('should not include facets when empty array requested', () => {
      const response: SearchResponse = {
        results: [mockResult('a')],
        total: 1,
        query_time_ms: 5,
        mode: 'fts5',
      }
      const request: InstantSearchRequest = {
        indexName: 'all',
        params: { query: 'test', facets: [] },
      }

      const result = adapter.toInstantSearchResult(response, request, 5)

      expect(result.facets).toBeUndefined()
    })

    it('should ignore unsupported facet names', () => {
      const response: SearchResponse = {
        results: [mockResult('a')],
        total: 1,
        query_time_ms: 5,
        mode: 'fts5',
      }
      const request: InstantSearchRequest = {
        indexName: 'all',
        params: { query: 'test', facets: ['unsupported_field'] },
      }

      const result = adapter.toInstantSearchResult(response, request, 5)

      // facets object exists but is empty → omitted by the spread logic
      expect(result.facets).toBeUndefined()
    })
  })

  // === parseStatusFilter (private) ===

  describe('parseStatusFilter', () => {
    const parse = (f?: string) => (adapter as any).parseStatusFilter(f)

    it('should parse status:published', () => {
      expect(parse('status:published')).toEqual(['published'])
    })

    it('should parse with single quotes', () => {
      expect(parse("status:'draft'")).toEqual(['draft'])
    })

    it('should parse with double quotes', () => {
      expect(parse('status:"archived"')).toEqual(['archived'])
    })

    it('should be case-insensitive', () => {
      expect(parse('Status:Published')).toEqual(['Published'])
    })

    it('should handle spaces around colon', () => {
      expect(parse('status : published')).toEqual(['published'])
    })

    it('should return undefined for no filter', () => {
      expect(parse(undefined)).toBeUndefined()
    })

    it('should return undefined for empty string', () => {
      expect(parse('')).toBeUndefined()
    })

    it('should return undefined for non-status filters', () => {
      expect(parse('category:blog')).toBeUndefined()
    })
  })

  // === determineSearchMode (private) ===

  describe('determineSearchMode', () => {
    const determine = (settings: any) => (adapter as any).determineSearchMode(settings)

    it('should return hybrid when ai_mode_enabled is true', () => {
      expect(determine({ ai_mode_enabled: true })).toBe('hybrid')
    })

    it('should return fts5 when ai_mode_enabled is false', () => {
      expect(determine({ ai_mode_enabled: false })).toBe('fts5')
    })
  })

  // === buildParamsString (private) ===

  describe('buildParamsString', () => {
    const build = (params: any) => (adapter as any).buildParamsString(params)

    it('should build query string from params', () => {
      const result = build({ query: 'test', page: 0, hitsPerPage: 20 })
      expect(result).toContain('query=test')
      expect(result).toContain('page=0')
      expect(result).toContain('hitsPerPage=20')
    })

    it('should encode special characters in query', () => {
      const result = build({ query: 'hello world' })
      expect(result).toContain('query=hello%20world')
    })

    it('should include facets as JSON', () => {
      const result = build({ facets: ['collection_name', 'status'] })
      expect(result).toContain('facets=')
      expect(result).toContain(encodeURIComponent(JSON.stringify(['collection_name', 'status'])))
    })

    it('should include filters', () => {
      const result = build({ filters: 'status:published' })
      expect(result).toContain('filters=')
    })

    it('should return empty string for empty params', () => {
      expect(build({})).toBe('')
    })
  })

  // === convertTags (private) ===

  describe('convertTags', () => {
    const convert = (text: string, open: string, close: string) =>
      (adapter as any).convertTags(text, open, close)

    it('should replace <mark> with custom open tag', () => {
      expect(convert('<mark>test</mark>', '<em>', '</em>')).toBe('<em>test</em>')
    })

    it('should handle multiple mark tags', () => {
      expect(
        convert('hello <mark>world</mark> and <mark>foo</mark>', '<b>', '</b>')
      ).toBe('hello <b>world</b> and <b>foo</b>')
    })

    it('should handle text with no mark tags', () => {
      expect(convert('no tags here', '<em>', '</em>')).toBe('no tags here')
    })
  })

  // === matchLevel (private) ===

  describe('matchLevel', () => {
    const level = (text: string) => (adapter as any).matchLevel(text)

    it('should return none when no mark tags present', () => {
      expect(level('plain text')).toBe('none')
    })

    it('should return partial when some text is highlighted', () => {
      expect(level('some <mark>highlighted</mark> text here')).toBe('partial')
    })

    it('should return full when most text is highlighted', () => {
      expect(level('<mark>entirely highlighted</mark>')).toBe('full')
    })

    it('should handle multiple mark regions', () => {
      // More than 50% highlighted
      expect(level('<mark>one</mark> <mark>two</mark> x')).toBe('full')
    })
  })
})
