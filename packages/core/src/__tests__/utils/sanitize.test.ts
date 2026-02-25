import { describe, it, expect } from 'vitest'
import { escapeHtml, sanitizeInput, sanitizeObject, sanitizeDeep } from '../../utils/sanitize'

describe('escapeHtml', () => {
  it('should escape HTML special characters', () => {
    expect(escapeHtml('<script>alert("xss")</script>'))
      .toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;')
  })

  it('should escape ampersands', () => {
    expect(escapeHtml('foo & bar')).toBe('foo &amp; bar')
  })

  it('should escape single quotes', () => {
    expect(escapeHtml("it's")).toBe('it&#039;s')
  })

  it('should handle empty strings', () => {
    expect(escapeHtml('')).toBe('')
  })

  it('should handle strings without special characters', () => {
    expect(escapeHtml('hello world')).toBe('hello world')
  })

  it('should return empty string for non-string input', () => {
    expect(escapeHtml(123 as any)).toBe('')
    expect(escapeHtml(null as any)).toBe('')
    expect(escapeHtml(undefined as any)).toBe('')
  })
})

describe('sanitizeInput', () => {
  it('should escape HTML in strings', () => {
    const input = '<script>alert("xss")</script>'
    expect(sanitizeInput(input)).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;')
  })

  it('should trim whitespace', () => {
    expect(sanitizeInput('  hello  ')).toBe('hello')
    expect(sanitizeInput('  <b>test</b>  ')).toBe('&lt;b&gt;test&lt;/b&gt;')
  })

  it('should return empty string for null', () => {
    expect(sanitizeInput(null)).toBe('')
  })

  it('should return empty string for undefined', () => {
    expect(sanitizeInput(undefined)).toBe('')
  })

  it('should handle empty strings', () => {
    expect(sanitizeInput('')).toBe('')
  })

  it('should escape all special characters', () => {
    expect(sanitizeInput('<>"\'&')).toBe('&lt;&gt;&quot;&#039;&amp;')
  })
})

describe('sanitizeObject', () => {
  it('should sanitize specified string fields in object', () => {
    const input = {
      title: '<script>alert()</script>',
      count: 42,
      active: true,
    }
    const result = sanitizeObject(input, ['title'])
    expect(result).toEqual({
      title: '&lt;script&gt;alert()&lt;/script&gt;',
      count: 42,
      active: true,
    })
  })

  it('should only sanitize specified fields', () => {
    const input = {
      name: '<b>Admin</b>',
      email: '<script>xss</script>',
      bio: '<i>hello</i>',
    }
    const result = sanitizeObject(input, ['name', 'bio'])
    expect(result.name).toBe('&lt;b&gt;Admin&lt;/b&gt;')
    expect(result.email).toBe('<script>xss</script>') // Not sanitized
    expect(result.bio).toBe('&lt;i&gt;hello&lt;/i&gt;')
  })

  it('should handle empty field list', () => {
    const input = {
      name: '<script>',
      email: 'test@example.com',
    }
    const result = sanitizeObject(input, [])
    expect(result).toEqual(input) // No fields sanitized
  })

  it('should handle non-string fields gracefully', () => {
    const input = {
      count: 42,
      active: true,
      data: null,
    }
    const result = sanitizeObject(input, ['count', 'active', 'data'])
    expect(result).toEqual(input) // Non-string fields unchanged
  })

  it('should create new object without mutating original', () => {
    const input = {
      title: '<script>',
      description: '<b>test</b>',
    }
    const result = sanitizeObject(input, ['title'])
    expect(result).not.toBe(input) // Different object reference
    expect(input.title).toBe('<script>') // Original unchanged
  })

  it('should handle empty objects', () => {
    const result = sanitizeObject({}, [])
    expect(result).toEqual({})
  })
})

describe('sanitizeDeep', () => {
  it('should sanitize strings', () => {
    expect(sanitizeDeep('<script>alert(1)</script>'))
      .toBe('&lt;script&gt;alert(1)&lt;/script&gt;')
  })

  it('should sanitize strings in flat objects', () => {
    const result = sanitizeDeep({
      name: '<b>Bold</b>',
      email: 'test@example.com',
    })
    expect(result).toEqual({
      name: '&lt;b&gt;Bold&lt;/b&gt;',
      email: 'test@example.com',
    })
  })

  it('should sanitize nested objects', () => {
    const result = sanitizeDeep({
      user: {
        name: '<script>xss</script>',
        profile: {
          bio: '<img onerror=alert(1)>',
        },
      },
    })
    expect(result).toEqual({
      user: {
        name: '&lt;script&gt;xss&lt;/script&gt;',
        profile: {
          bio: '&lt;img onerror=alert(1)&gt;',
        },
      },
    })
  })

  it('should sanitize arrays of strings', () => {
    const result = sanitizeDeep(['<b>one</b>', '<i>two</i>'])
    expect(result).toEqual(['&lt;b&gt;one&lt;/b&gt;', '&lt;i&gt;two&lt;/i&gt;'])
  })

  it('should sanitize arrays of objects', () => {
    const result = sanitizeDeep([
      { name: '<script>a</script>' },
      { name: '<script>b</script>' },
    ])
    expect(result).toEqual([
      { name: '&lt;script&gt;a&lt;/script&gt;' },
      { name: '&lt;script&gt;b&lt;/script&gt;' },
    ])
  })

  it('should pass through numbers, booleans, and null', () => {
    expect(sanitizeDeep(42)).toBe(42)
    expect(sanitizeDeep(true)).toBe(true)
    expect(sanitizeDeep(false)).toBe(false)
    expect(sanitizeDeep(null)).toBe(null)
  })

  it('should handle mixed-type objects', () => {
    const result = sanitizeDeep({
      name: '<b>test</b>',
      count: 5,
      active: true,
      tags: ['<i>tag1</i>', 'tag2'],
      metadata: null,
    })
    expect(result).toEqual({
      name: '&lt;b&gt;test&lt;/b&gt;',
      count: 5,
      active: true,
      tags: ['&lt;i&gt;tag1&lt;/i&gt;', 'tag2'],
      metadata: null,
    })
  })

  it('should trim strings like sanitizeInput', () => {
    expect(sanitizeDeep('  hello  ')).toBe('hello')
  })

  it('should handle empty objects and arrays', () => {
    expect(sanitizeDeep({})).toEqual({})
    expect(sanitizeDeep([])).toEqual([])
  })
})
