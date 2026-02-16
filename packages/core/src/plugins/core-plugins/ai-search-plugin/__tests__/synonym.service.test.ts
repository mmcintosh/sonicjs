import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SynonymService } from '../services/synonym.service'

/**
 * Tests for SynonymService pure logic: sanitizeTerms and expandQuery.
 * CRUD methods (getAll, create, update, delete) require D1 and are covered by E2E tests.
 * expandQuery is tested by mocking the internal getEnabled() call.
 */
describe('SynonymService', () => {
  let mockDb: any
  let service: SynonymService

  beforeEach(() => {
    mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({ results: [] }),
          first: vi.fn().mockResolvedValue(null),
          run: vi.fn().mockResolvedValue({ meta: { changes: 0 } }),
        }),
        all: vi.fn().mockResolvedValue({ results: [] }),
        first: vi.fn().mockResolvedValue(null),
        run: vi.fn().mockResolvedValue({ meta: { changes: 0 } }),
      }),
    }
    service = new SynonymService(mockDb)
  })

  // === sanitizeTerms (private, tested via create/update validation) ===

  describe('sanitizeTerms', () => {
    const sanitize = (terms: string[]) => (service as any).sanitizeTerms(terms)

    it('should trim whitespace from terms', () => {
      expect(sanitize(['  laptop  ', '  notebook  '])).toEqual(['laptop', 'notebook'])
    })

    it('should lowercase all terms', () => {
      expect(sanitize(['Laptop', 'NOTEBOOK'])).toEqual(['laptop', 'notebook'])
    })

    it('should deduplicate terms', () => {
      expect(sanitize(['laptop', 'Laptop', 'LAPTOP'])).toEqual(['laptop'])
    })

    it('should remove empty strings', () => {
      expect(sanitize(['laptop', '', '  ', 'notebook'])).toEqual(['laptop', 'notebook'])
    })

    it('should preserve order of first occurrence', () => {
      expect(sanitize(['notebook', 'laptop', 'computer'])).toEqual([
        'notebook',
        'laptop',
        'computer',
      ])
    })

    it('should handle empty array', () => {
      expect(sanitize([])).toEqual([])
    })

    it('should handle all-empty strings', () => {
      expect(sanitize(['', '  ', '\t'])).toEqual([])
    })

    it('should handle single term', () => {
      expect(sanitize(['laptop'])).toEqual(['laptop'])
    })

    it('should handle multi-word terms', () => {
      expect(sanitize(['artificial intelligence', 'machine learning'])).toEqual([
        'artificial intelligence',
        'machine learning',
      ])
    })
  })

  // === expandQuery ===

  describe('expandQuery', () => {
    /** Helper: mock getEnabled to return specific synonym groups */
    function mockGetEnabled(groups: Array<{ terms: string[]; enabled: boolean }>) {
      const enabledGroups = groups
        .filter(g => g.enabled)
        .map((g, i) => ({
          id: `syn-${i}`,
          terms: g.terms,
          enabled: true,
          created_at: Date.now(),
          updated_at: Date.now(),
        }))

      // Mock the DB call that getEnabled makes
      mockDb.prepare.mockReturnValue({
        all: vi.fn().mockResolvedValue({
          results: enabledGroups.map(g => ({
            id: g.id,
            terms: JSON.stringify(g.terms),
            enabled: 1,
            created_at: g.created_at,
            updated_at: g.updated_at,
          })),
        }),
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({
            results: enabledGroups.map(g => ({
              id: g.id,
              terms: JSON.stringify(g.terms),
              enabled: 1,
              created_at: g.created_at,
              updated_at: g.updated_at,
            })),
          }),
        }),
      })
    }

    it('should expand a term using its synonym group', async () => {
      mockGetEnabled([{ terms: ['laptop', 'notebook', 'computer'], enabled: true }])

      const expanded = await service.expandQuery(['laptop'])
      expect(expanded).toContain('laptop')
      expect(expanded).toContain('notebook')
      expect(expanded).toContain('computer')
    })

    it('should be bidirectional (any term in group expands to all)', async () => {
      mockGetEnabled([{ terms: ['laptop', 'notebook', 'computer'], enabled: true }])

      const expanded = await service.expandQuery(['notebook'])
      expect(expanded).toContain('laptop')
      expect(expanded).toContain('notebook')
      expect(expanded).toContain('computer')
    })

    it('should return original terms when no synonym groups exist', async () => {
      mockGetEnabled([])

      const expanded = await service.expandQuery(['laptop'])
      expect(expanded).toEqual(['laptop'])
    })

    it('should return original terms when no match is found', async () => {
      mockGetEnabled([{ terms: ['cat', 'feline', 'kitty'], enabled: true }])

      const expanded = await service.expandQuery(['laptop'])
      expect(expanded).toEqual(['laptop'])
    })

    it('should handle case-insensitive matching', async () => {
      mockGetEnabled([{ terms: ['laptop', 'notebook'], enabled: true }])

      const expanded = await service.expandQuery(['Laptop'])
      // expandQuery lowercases input
      expect(expanded).toContain('laptop')
      expect(expanded).toContain('notebook')
    })

    it('should expand multiple input terms from different groups', async () => {
      mockGetEnabled([
        { terms: ['laptop', 'notebook'], enabled: true },
        { terms: ['phone', 'mobile', 'cell'], enabled: true },
      ])

      const expanded = await service.expandQuery(['laptop', 'phone'])
      expect(expanded).toContain('laptop')
      expect(expanded).toContain('notebook')
      expect(expanded).toContain('phone')
      expect(expanded).toContain('mobile')
      expect(expanded).toContain('cell')
    })

    it('should deduplicate expanded terms', async () => {
      mockGetEnabled([{ terms: ['laptop', 'notebook'], enabled: true }])

      const expanded = await service.expandQuery(['laptop', 'notebook'])
      const uniqueSet = new Set(expanded)
      expect(expanded.length).toBe(uniqueSet.size)
    })

    it('should handle empty input terms', async () => {
      mockGetEnabled([{ terms: ['laptop', 'notebook'], enabled: true }])

      const expanded = await service.expandQuery([])
      expect(expanded).toEqual([])
    })
  })

  // === create validation ===

  describe('create validation', () => {
    it('should reject groups with fewer than 2 terms after sanitization', async () => {
      await expect(service.create(['laptop'])).rejects.toThrow(
        'A synonym group must have at least 2 terms'
      )
    })

    it('should reject groups where all terms deduplicate to fewer than 2', async () => {
      await expect(service.create(['laptop', 'Laptop', 'LAPTOP'])).rejects.toThrow(
        'A synonym group must have at least 2 terms'
      )
    })

    it('should reject empty terms array', async () => {
      await expect(service.create([])).rejects.toThrow(
        'A synonym group must have at least 2 terms'
      )
    })
  })
})
