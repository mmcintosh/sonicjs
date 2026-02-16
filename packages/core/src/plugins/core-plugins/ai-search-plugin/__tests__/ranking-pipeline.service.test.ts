import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RankingPipelineService } from '../services/ranking-pipeline.service'
import type { SearchResult, SearchResponse, RankingStage } from '../types'
import { DEFAULT_RANKING_PIPELINE } from '../types'

/** Helper to create a mock SearchResult */
function mockResult(id: string, overrides: Partial<SearchResult> = {}): SearchResult {
  return {
    id,
    title: `Title ${id}`,
    slug: `slug-${id}`,
    collection_id: 'col1',
    collection_name: 'Posts',
    status: 'published',
    created_at: Date.now() / 1000, // Unix seconds
    updated_at: Date.now() / 1000,
    ...overrides,
  }
}

function mockResponse(results: SearchResult[]): SearchResponse {
  return {
    results,
    total: results.length,
    query_time_ms: 10,
    mode: 'fts5',
  }
}

describe('RankingPipelineService', () => {
  let mockDb: any
  let service: RankingPipelineService

  beforeEach(() => {
    mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null),
          all: vi.fn().mockResolvedValue({ results: [] }),
          run: vi.fn().mockResolvedValue({}),
        }),
        first: vi.fn().mockResolvedValue(null),
        all: vi.fn().mockResolvedValue({ results: [] }),
        run: vi.fn().mockResolvedValue({}),
      }),
    }
    service = new RankingPipelineService(mockDb)
  })

  // === clampWeight (module-level function) ===

  describe('clampWeight', () => {
    // Access the module-level function via validateStages behavior
    const clamp = (val: any, fallback: number) => {
      // We test clampWeight indirectly through validateStages
      const stages: RankingStage[] = [{ type: 'bm25', weight: val, enabled: true }]
      const validated = (service as any).validateStages(stages)
      return validated[0].weight
    }

    it('should pass through valid weights', () => {
      expect(clamp(5, 0)).toBe(5)
    })

    it('should clamp to 0 minimum', () => {
      expect(clamp(-1, 0)).toBe(0)
    })

    it('should clamp to 10 maximum', () => {
      expect(clamp(15, 0)).toBe(10)
    })

    it('should round to 1 decimal place', () => {
      expect(clamp(3.14159, 0)).toBe(3.1)
    })

    it('should use fallback for NaN', () => {
      expect(clamp('not-a-number', 0)).toBe(0)
    })

    it('should handle Infinity', () => {
      expect(clamp(Infinity, 0)).toBe(0)
    })

    it('should handle zero', () => {
      expect(clamp(0, 5)).toBe(0)
    })

    it('should handle string numbers', () => {
      expect(clamp('7.5', 0)).toBe(7.5)
    })
  })

  // === validateStages ===

  describe('validateStages', () => {
    const validate = (stages: any) => (service as any).validateStages(stages)

    it('should filter out invalid stage types', () => {
      const stages: any[] = [
        { type: 'bm25', weight: 5, enabled: true },
        { type: 'invalid', weight: 3, enabled: true },
        { type: 'semantic', weight: 2, enabled: true },
      ]

      const result = validate(stages)
      expect(result).toHaveLength(2)
      expect(result.map((s: any) => s.type)).toEqual(['bm25', 'semantic'])
    })

    it('should accept all valid stage types', () => {
      const validTypes = ['exactMatch', 'bm25', 'semantic', 'recency', 'popularity', 'custom']
      const stages = validTypes.map(type => ({ type, weight: 1, enabled: true }))

      const result = validate(stages)
      expect(result).toHaveLength(6)
    })

    it('should return default pipeline for non-array input', () => {
      expect(validate('not an array')).toEqual(DEFAULT_RANKING_PIPELINE)
      expect(validate(null)).toEqual(DEFAULT_RANKING_PIPELINE)
      expect(validate(undefined)).toEqual(DEFAULT_RANKING_PIPELINE)
    })

    it('should coerce enabled to boolean', () => {
      const stages = [{ type: 'bm25', weight: 5, enabled: 1 as any }]
      const result = validate(stages)
      expect(result[0].enabled).toBe(true)
    })

    it('should handle missing config gracefully', () => {
      const stages = [{ type: 'bm25', weight: 5, enabled: true }]
      const result = validate(stages)
      expect(result[0].config).toBeUndefined()
    })

    it('should preserve config when present', () => {
      const stages = [{ type: 'recency', weight: 1, enabled: true, config: { half_life_days: 14 } }]
      const result = validate(stages)
      expect(result[0].config).toEqual({ half_life_days: 14 })
    })
  })

  // === Scoring functions (private) ===

  describe('scoreExactMatch', () => {
    const score = (result: SearchResult, query: string) =>
      (service as any).scoreExactMatch(result, query)

    it('should return 1.0 when title contains query (case-insensitive)', () => {
      expect(score(mockResult('a', { title: 'How to Search Effectively' }), 'search')).toBe(1.0)
    })

    it('should return 0.0 when title does not contain query', () => {
      expect(score(mockResult('a', { title: 'Cooking Tips' }), 'search')).toBe(0.0)
    })

    it('should be case-insensitive', () => {
      expect(score(mockResult('a', { title: 'SEARCH Results' }), 'search')).toBe(1.0)
    })

    it('should return 0 for empty query', () => {
      expect(score(mockResult('a', { title: 'Some Title' }), '')).toBe(0)
    })

    it('should return 0 for missing title', () => {
      expect(score(mockResult('a', { title: '' }), 'search')).toBe(0)
    })
  })

  describe('scoreBM25', () => {
    const score = (result: SearchResult, min: number, max: number) =>
      (service as any).scoreBM25(result, min, max)

    it('should normalize BM25 score to [0, 1] range', () => {
      const result = mockResult('a', { bm25_score: 7.5 })
      expect(score(result, 5, 10)).toBe(0.5)
    })

    it('should return 1.0 for max score', () => {
      const result = mockResult('a', { bm25_score: 10 })
      expect(score(result, 5, 10)).toBe(1.0)
    })

    it('should return 0.0 for min score', () => {
      const result = mockResult('a', { bm25_score: 5 })
      expect(score(result, 5, 10)).toBe(0.0)
    })

    it('should return 1.0 when min equals max', () => {
      const result = mockResult('a', { bm25_score: 5 })
      expect(score(result, 5, 5)).toBe(1.0)
    })

    it('should return 0 when bm25_score is null', () => {
      const result = mockResult('a')
      expect(score(result, 0, 10)).toBe(0)
    })
  })

  describe('scoreSemantic', () => {
    const score = (result: SearchResult) => (service as any).scoreSemantic(result)

    it('should return relevance_score when present', () => {
      expect(score(mockResult('a', { relevance_score: 0.85 }))).toBe(0.85)
    })

    it('should return 0 when relevance_score is undefined', () => {
      expect(score(mockResult('a'))).toBe(0)
    })
  })

  describe('scoreRecency', () => {
    const scoreRecency = (result: SearchResult, halfLifeDays: number) =>
      (service as any).scoreRecency(result, halfLifeDays)

    it('should return 1.0 for brand new content', () => {
      const result = mockResult('a', { created_at: Date.now() / 1000 })
      const score = scoreRecency(result, 30)
      expect(score).toBeCloseTo(1.0, 1)
    })

    it('should return ~0.5 at exactly half-life days old', () => {
      const halfLifeDays = 30
      const thirtyDaysAgo = Date.now() / 1000 - (halfLifeDays * 86400)
      const result = mockResult('a', { created_at: thirtyDaysAgo })
      const score = scoreRecency(result, halfLifeDays)
      expect(score).toBeCloseTo(0.5, 1)
    })

    it('should return near 0 for very old content', () => {
      const yearAgo = Date.now() / 1000 - (365 * 86400)
      const result = mockResult('a', { created_at: yearAgo })
      const score = scoreRecency(result, 30)
      expect(score).toBeLessThan(0.01)
    })

    it('should return 0 when created_at is missing', () => {
      const result = mockResult('a', { created_at: 0 })
      expect(scoreRecency(result, 30)).toBe(0)
    })

    it('should return 0 when halfLifeDays is 0', () => {
      const result = mockResult('a', { created_at: Date.now() / 1000 - 86400 })
      expect(scoreRecency(result, 0)).toBe(0)
    })

    it('should handle millisecond timestamps (> 1e12)', () => {
      const result = mockResult('a', { created_at: Date.now() }) // ms timestamp
      const score = scoreRecency(result, 30)
      expect(score).toBeCloseTo(1.0, 1)
    })

    it('should return 1.0 for future timestamps', () => {
      const future = Date.now() / 1000 + 86400
      const result = mockResult('a', { created_at: future })
      expect(scoreRecency(result, 30)).toBe(1.0)
    })
  })

  // === normalizeScoresMinMax ===

  describe('normalizeScoresMinMax', () => {
    const normalize = (scores: Map<string, number>) =>
      (service as any).normalizeScoresMinMax(scores)

    it('should normalize scores to [0, 1]', () => {
      const scores = new Map([
        ['a', 10],
        ['b', 50],
        ['c', 100],
      ])
      normalize(scores)

      expect(scores.get('a')).toBe(0)
      expect(scores.get('b')).toBeCloseTo(0.4444, 3)
      expect(scores.get('c')).toBe(1)
    })

    it('should handle single-value map (all set to 1.0)', () => {
      const scores = new Map([['a', 5]])
      normalize(scores)

      expect(scores.get('a')).toBe(1.0)
    })

    it('should handle all-same values (all set to 1.0)', () => {
      const scores = new Map([
        ['a', 5],
        ['b', 5],
      ])
      normalize(scores)

      expect(scores.get('a')).toBe(1.0)
      expect(scores.get('b')).toBe(1.0)
    })

    it('should handle empty map', () => {
      const scores = new Map<string, number>()
      normalize(scores)
      expect(scores.size).toBe(0)
    })

    it('should handle zero values', () => {
      const scores = new Map([
        ['a', 0],
        ['b', 10],
      ])
      normalize(scores)

      expect(scores.get('a')).toBe(0)
      expect(scores.get('b')).toBe(1)
    })
  })

  // === apply (pipeline execution) ===

  describe('apply', () => {
    it('should return unchanged response for empty results', async () => {
      const response = mockResponse([])
      const result = await service.apply(response, 'test')
      expect(result.results).toHaveLength(0)
    })

    it('should return unchanged response when no active stages', async () => {
      // Mock getConfig to return all-disabled stages
      vi.spyOn(service, 'getConfig').mockResolvedValue([
        { type: 'bm25', weight: 5, enabled: false },
        { type: 'semantic', weight: 3, enabled: false },
      ])

      const response = mockResponse([mockResult('a'), mockResult('b')])
      const result = await service.apply(response, 'test')

      // Results unchanged (no pipeline_score assigned, no resorting)
      expect(result.results[0].pipeline_score).toBeUndefined()
    })

    it('should return unchanged response when all weights are zero', async () => {
      vi.spyOn(service, 'getConfig').mockResolvedValue([
        { type: 'bm25', weight: 0, enabled: true },
      ])

      const response = mockResponse([mockResult('a')])
      const result = await service.apply(response, 'test')

      expect(result.results[0].pipeline_score).toBeUndefined()
    })

    it('should assign pipeline_score based on exactMatch stage', async () => {
      vi.spyOn(service, 'getConfig').mockResolvedValue([
        { type: 'exactMatch', weight: 10, enabled: true },
      ])

      const response = mockResponse([
        mockResult('match', { title: 'test query result' }),
        mockResult('nomatch', { title: 'unrelated document' }),
      ])

      const result = await service.apply(response, 'test')

      const matchResult = result.results.find(r => r.id === 'match')
      const noMatchResult = result.results.find(r => r.id === 'nomatch')

      expect(matchResult!.pipeline_score).toBe(1.0) // title contains 'test'
      expect(noMatchResult!.pipeline_score).toBe(0.0) // title doesn't contain 'test'
    })

    it('should re-sort results by pipeline_score descending', async () => {
      vi.spyOn(service, 'getConfig').mockResolvedValue([
        { type: 'exactMatch', weight: 10, enabled: true },
      ])

      const response = mockResponse([
        mockResult('b', { title: 'unrelated' }),
        mockResult('a', { title: 'test match' }),
      ])

      const result = await service.apply(response, 'test')

      // 'a' has title containing 'test' → pipeline_score 1.0, should be first
      expect(result.results[0].id).toBe('a')
      expect(result.results[1].id).toBe('b')
    })

    it('should compute weighted sum across multiple stages', async () => {
      vi.spyOn(service, 'getConfig').mockResolvedValue([
        { type: 'exactMatch', weight: 10, enabled: true },
        { type: 'semantic', weight: 5, enabled: true },
      ])

      const response = mockResponse([
        mockResult('a', { title: 'test document', relevance_score: 0.8 }),
      ])

      const result = await service.apply(response, 'test')

      // exactMatch: 1.0 (title contains 'test'), weight 10
      // semantic: 0.8, weight 5
      // pipeline_score = (10*1.0 + 5*0.8) / 15 = (10+4)/15 = 14/15 ≈ 0.9333
      expect(result.results[0].pipeline_score).toBeCloseTo(14 / 15, 3)
    })

    it('should skip disabled stages in weighted sum', async () => {
      vi.spyOn(service, 'getConfig').mockResolvedValue([
        { type: 'exactMatch', weight: 10, enabled: true },
        { type: 'bm25', weight: 5, enabled: false },
        { type: 'semantic', weight: 3, enabled: true },
      ])

      const response = mockResponse([
        mockResult('a', {
          title: 'test',
          bm25_score: 10.0,
          relevance_score: 0.5,
        }),
      ])

      const result = await service.apply(response, 'test')

      // Only exactMatch (w=10) and semantic (w=3) are active
      // exactMatch: 1.0, semantic: 0.5
      // pipeline_score = (10*1.0 + 3*0.5) / 13 = 11.5/13 ≈ 0.8846
      expect(result.results[0].pipeline_score).toBeCloseTo(11.5 / 13, 3)
    })
  })

  // === getConfig (default pipeline) ===

  describe('getConfig', () => {
    it('should return default pipeline when no DB config exists', async () => {
      const config = await service.getConfig()
      expect(config).toEqual(DEFAULT_RANKING_PIPELINE)
    })
  })
})
