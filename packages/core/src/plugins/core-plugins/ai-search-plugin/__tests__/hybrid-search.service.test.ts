import { describe, it, expect, vi, beforeEach } from 'vitest'
import { HybridSearchService } from '../services/hybrid-search.service'
import type { SearchQuery, SearchResponse, SearchResult, AISearchSettings } from '../types'

/** Helper to create a mock SearchResult */
function mockResult(id: string, overrides: Partial<SearchResult> = {}): SearchResult {
  return {
    id,
    title: `Title ${id}`,
    slug: `slug-${id}`,
    collection_id: 'col1',
    collection_name: 'Posts',
    status: 'published',
    created_at: Date.now(),
    updated_at: Date.now(),
    ...overrides,
  }
}

function mockResponse(results: SearchResult[], total?: number): SearchResponse {
  return {
    results,
    total: total ?? results.length,
    query_time_ms: 10,
    mode: 'fts5',
  }
}

const defaultQuery: SearchQuery = {
  query: 'test',
  mode: 'hybrid',
  limit: 20,
}

const defaultSettings: AISearchSettings = {
  enabled: true,
  ai_mode_enabled: true,
  selected_collections: ['col1'],
  dismissed_collections: [],
  autocomplete_enabled: false,
  cache_duration: 1,
  results_limit: 20,
  index_media: false,
}

describe('HybridSearchService', () => {
  let mockFts5: any
  let mockRag: any

  beforeEach(() => {
    mockFts5 = {
      search: vi.fn(),
    }
    mockRag = {
      search: vi.fn(),
      isAvailable: vi.fn().mockReturnValue(true),
    }
  })

  // === Single-system fallback ===

  describe('single-system fallback (FTS5 only)', () => {
    it('should return FTS5 results when RAG is unavailable', async () => {
      mockRag.isAvailable.mockReturnValue(false)
      const fts5Results = [mockResult('a'), mockResult('b')]
      mockFts5.search.mockResolvedValue(mockResponse(fts5Results))

      const service = new HybridSearchService(mockFts5, mockRag)
      const result = await service.search(defaultQuery, defaultSettings)

      expect(result.mode).toBe('hybrid')
      expect(result.results).toHaveLength(2)
      expect(result.results[0].id).toBe('a')
    })

    it('should return FTS5 results when no RAG service is provided', async () => {
      const fts5Results = [mockResult('a')]
      mockFts5.search.mockResolvedValue(mockResponse(fts5Results))

      const service = new HybridSearchService(mockFts5)
      const result = await service.search(defaultQuery, defaultSettings)

      expect(result.mode).toBe('hybrid')
      expect(result.results).toHaveLength(1)
    })

    it('should return empty when both legs fail', async () => {
      mockFts5.search.mockRejectedValue(new Error('FTS5 fail'))
      mockRag.search.mockRejectedValue(new Error('RAG fail'))

      const service = new HybridSearchService(mockFts5, mockRag)
      const result = await service.search(defaultQuery, defaultSettings)

      expect(result.results).toHaveLength(0)
      expect(result.total).toBe(0)
      expect(result.mode).toBe('hybrid')
    })

    it('should use FTS5 when RAG fails (partial failure tolerance)', async () => {
      const fts5Results = [mockResult('a')]
      mockFts5.search.mockResolvedValue(mockResponse(fts5Results))
      mockRag.search.mockRejectedValue(new Error('RAG fail'))

      const service = new HybridSearchService(mockFts5, mockRag)
      const result = await service.search(defaultQuery, defaultSettings)

      expect(result.results).toHaveLength(1)
      expect(result.results[0].id).toBe('a')
    })
  })

  // === RRF Fusion ===

  describe('Reciprocal Rank Fusion', () => {
    it('should boost items found by both systems', async () => {
      // 'shared' appears in both FTS5 and AI; 'fts-only' and 'ai-only' in one each
      const fts5Results = [mockResult('shared'), mockResult('fts-only')]
      const aiResults = [mockResult('ai-only'), mockResult('shared')]

      mockFts5.search.mockResolvedValue(mockResponse(fts5Results))
      mockRag.search.mockResolvedValue(mockResponse(aiResults))

      const service = new HybridSearchService(mockFts5, mockRag)
      const result = await service.search(defaultQuery, defaultSettings)

      // 'shared' should rank first because it gets two RRF contributions
      expect(result.results[0].id).toBe('shared')
      expect(result.results[0].relevance_score).toBeGreaterThan(
        result.results[1].relevance_score!
      )
    })

    it('should calculate correct RRF score for rank 1: 1/(60+1)', async () => {
      const fts5Results = [mockResult('a')]
      const aiResults = [mockResult('b')]

      mockFts5.search.mockResolvedValue(mockResponse(fts5Results))
      mockRag.search.mockResolvedValue(mockResponse(aiResults))

      const service = new HybridSearchService(mockFts5, mockRag)
      const result = await service.search(defaultQuery, defaultSettings)

      // Both items at rank 1 in their respective systems: 1/(60+1) ≈ 0.01639
      const expectedScore = 1 / (60 + 1)
      expect(result.results[0].relevance_score).toBeCloseTo(expectedScore, 5)
    })

    it('should calculate correct RRF score for item in both systems', async () => {
      // 'shared' is rank 1 in FTS5 and rank 2 in AI
      const fts5Results = [mockResult('shared')]
      const aiResults = [mockResult('other'), mockResult('shared')]

      mockFts5.search.mockResolvedValue(mockResponse(fts5Results))
      mockRag.search.mockResolvedValue(mockResponse(aiResults))

      const service = new HybridSearchService(mockFts5, mockRag)
      const result = await service.search(defaultQuery, defaultSettings)

      const sharedResult = result.results.find(r => r.id === 'shared')
      // RRF = 1/(60+1) [FTS5 rank 1] + 1/(60+2) [AI rank 2]
      const expected = 1 / 61 + 1 / 62
      expect(sharedResult!.relevance_score).toBeCloseTo(expected, 5)
    })

    it('should merge highlights from FTS5 when item exists in both systems', async () => {
      const fts5Results = [
        mockResult('shared', {
          highlights: { title: '<mark>test</mark> title' },
          bm25_score: 5.2,
        }),
      ]
      const aiResults = [mockResult('shared', { relevance_score: 0.85 })]

      mockFts5.search.mockResolvedValue(mockResponse(fts5Results))
      mockRag.search.mockResolvedValue(mockResponse(aiResults))

      const service = new HybridSearchService(mockFts5, mockRag)
      const result = await service.search(defaultQuery, defaultSettings)

      const shared = result.results.find(r => r.id === 'shared')
      expect(shared!.highlights?.title).toBe('<mark>test</mark> title')
      expect(shared!.bm25_score).toBe(5.2)
    })

    it('should sort by RRF score descending', async () => {
      // Rank ordering in FTS5: a=1, b=2, c=3
      // Rank ordering in AI: c=1, b=2, a=3
      // RRF scores:
      //   a: 1/61 + 1/63 = 0.01639 + 0.01587 = 0.03226
      //   b: 1/62 + 1/62 = 0.01613 + 0.01613 = 0.03226
      //   c: 1/63 + 1/61 = 0.01587 + 0.01639 = 0.03226
      // All equal! But in practice, Map iteration + sorting may vary.
      // Use different overlap patterns for a deterministic test:
      const fts5Results = [mockResult('a'), mockResult('b')]
      const aiResults = [mockResult('a'), mockResult('c')]

      mockFts5.search.mockResolvedValue(mockResponse(fts5Results))
      mockRag.search.mockResolvedValue(mockResponse(aiResults))

      const service = new HybridSearchService(mockFts5, mockRag)
      const result = await service.search(defaultQuery, defaultSettings)

      // 'a' appears in both (rank 1 in each): highest RRF
      expect(result.results[0].id).toBe('a')

      // Verify descending order
      for (let i = 1; i < result.results.length; i++) {
        expect(result.results[i - 1].relevance_score).toBeGreaterThanOrEqual(
          result.results[i].relevance_score!
        )
      }
    })

    it('should respect limit parameter', async () => {
      const fts5Results = Array.from({ length: 10 }, (_, i) => mockResult(`fts-${i}`))
      const aiResults = Array.from({ length: 10 }, (_, i) => mockResult(`ai-${i}`))

      mockFts5.search.mockResolvedValue(mockResponse(fts5Results))
      mockRag.search.mockResolvedValue(mockResponse(aiResults))

      const service = new HybridSearchService(mockFts5, mockRag)
      const query: SearchQuery = { ...defaultQuery, limit: 5 }
      const result = await service.search(query, defaultSettings)

      expect(result.results).toHaveLength(5)
    })

    it('should use settings.results_limit when query.limit is not set', async () => {
      const fts5Results = Array.from({ length: 30 }, (_, i) => mockResult(`fts-${i}`))
      const aiResults = Array.from({ length: 30 }, (_, i) => mockResult(`ai-${i}`))

      mockFts5.search.mockResolvedValue(mockResponse(fts5Results))
      mockRag.search.mockResolvedValue(mockResponse(aiResults))

      const service = new HybridSearchService(mockFts5, mockRag)
      const query: SearchQuery = { query: 'test', mode: 'hybrid' }
      const settings = { ...defaultSettings, results_limit: 10 }
      const result = await service.search(query, settings)

      expect(result.results).toHaveLength(10)
    })

    it('should return total count of unique documents across both systems', async () => {
      const fts5Results = [mockResult('a'), mockResult('b'), mockResult('shared')]
      const aiResults = [mockResult('shared'), mockResult('c')]

      mockFts5.search.mockResolvedValue(mockResponse(fts5Results))
      mockRag.search.mockResolvedValue(mockResponse(aiResults))

      const service = new HybridSearchService(mockFts5, mockRag)
      const result = await service.search(defaultQuery, defaultSettings)

      // a, b, shared, c = 4 unique docs
      expect(result.total).toBe(4)
    })

    it('should handle empty FTS5 results with non-empty AI results', async () => {
      mockFts5.search.mockResolvedValue(mockResponse([]))
      mockRag.search.mockResolvedValue(mockResponse([mockResult('a')]))

      const service = new HybridSearchService(mockFts5, mockRag)
      const result = await service.search(defaultQuery, defaultSettings)

      expect(result.results).toHaveLength(1)
      expect(result.results[0].id).toBe('a')
    })

    it('should handle empty AI results with non-empty FTS5 results', async () => {
      mockFts5.search.mockResolvedValue(mockResponse([mockResult('a')]))
      mockRag.search.mockResolvedValue(mockResponse([]))

      const service = new HybridSearchService(mockFts5, mockRag)
      const result = await service.search(defaultQuery, defaultSettings)

      expect(result.results).toHaveLength(1)
      expect(result.results[0].id).toBe('a')
    })

    it('should handle both systems returning empty results', async () => {
      mockFts5.search.mockResolvedValue(mockResponse([]))
      mockRag.search.mockResolvedValue(mockResponse([]))

      const service = new HybridSearchService(mockFts5, mockRag)
      const result = await service.search(defaultQuery, defaultSettings)

      expect(result.results).toHaveLength(0)
      expect(result.total).toBe(0)
    })
  })

  // === Candidate pool expansion ===

  describe('candidate pool expansion', () => {
    it('should request 3x the final limit from each sub-search', async () => {
      mockFts5.search.mockResolvedValue(mockResponse([]))
      mockRag.search.mockResolvedValue(mockResponse([]))

      const service = new HybridSearchService(mockFts5, mockRag)
      await service.search({ ...defaultQuery, limit: 10 }, defaultSettings)

      // FTS5 should be called with limit: 30 (3x10)
      const fts5Call = mockFts5.search.mock.calls[0]
      expect(fts5Call[0].limit).toBe(30)

      // RAG should also be called with limit: 30
      const ragCall = mockRag.search.mock.calls[0]
      expect(ragCall[0].limit).toBe(30)
    })
  })
})
