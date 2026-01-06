# Custom RAG Implementation Plan

## Goal: Build RAG Entirely in Plugin (No Dashboard Setup)

**User wants**: Click "Enable AI Search" → Everything works automatically

## Architecture: Custom RAG with Cloudflare Vectorize

### Components:

1. **Vectorize** (Vector Database) - Can create via Wrangler ✅
2. **Workers AI** (Embeddings) - Already available ✅
3. **D1** (Metadata) - Already have ✅
4. **Custom RAG Logic** - We build this ✅

### No Dashboard Setup Required! 🎉

## Implementation Steps

### Step 1: Create Vectorize Index (Automated)

```typescript
// packages/core/src/plugins/core-plugins/ai-search-plugin/setup/vectorize-setup.ts

export async function ensureVectorizeIndex(env: any) {
  // Check if index exists
  try {
    await env.VECTORIZE.describe()
    console.log('Vectorize index already exists')
    return true
  } catch {
    console.log('Vectorize index does not exist, creating...')
    
    // Create via Wrangler programmatically
    // Note: This requires running wrangler command
    // We'll provide a setup script
    return false
  }
}
```

### Step 2: Generate Embeddings

```typescript
// packages/core/src/plugins/core-plugins/ai-search-plugin/services/embeddings.ts

export class EmbeddingService {
  constructor(private ai: any) {}
  
  async generateEmbedding(text: string): Promise<number[]> {
    // Use Cloudflare Workers AI
    const response = await this.ai.run('@cf/baai/bge-base-en-v1.5', {
      text: text
    })
    
    return response.data[0] // 768-dimensional vector
  }
  
  async generateBatch(texts: string[]): Promise<number[][]> {
    // Batch processing for efficiency
    const embeddings = await Promise.all(
      texts.map(text => this.generateEmbedding(text))
    )
    return embeddings
  }
}
```

### Step 3: Index Content

```typescript
// packages/core/src/plugins/core-plugins/ai-search-plugin/services/custom-rag.ts

export class CustomRAGService {
  constructor(
    private db: D1Database,
    private ai: any,
    private vectorize: any
  ) {}
  
  async indexContent(collectionId: string) {
    // 1. Get all content from collection
    const content = await this.db
      .prepare('SELECT * FROM content WHERE collection_id = ? AND status = ?')
      .bind(collectionId, 'published')
      .all()
    
    // 2. Chunk content into smaller pieces
    const chunks = this.chunkContent(content.results)
    
    // 3. Generate embeddings
    const embeddings = await this.generateEmbeddings(chunks)
    
    // 4. Store in Vectorize
    await this.vectorize.upsert(
      chunks.map((chunk, i) => ({
        id: chunk.id,
        values: embeddings[i],
        metadata: {
          content_id: chunk.content_id,
          collection_id: collectionId,
          title: chunk.title,
          text: chunk.text,
          chunk_index: chunk.index
        }
      }))
    )
    
    console.log(`Indexed ${chunks.length} chunks from collection ${collectionId}`)
  }
  
  private chunkContent(content: any[]): Chunk[] {
    const chunks: Chunk[] = []
    
    for (const item of content) {
      // Parse content data
      const data = JSON.parse(item.data)
      const text = this.extractText(data)
      
      // Split into ~500 token chunks
      const textChunks = this.splitIntoChunks(text, 500)
      
      textChunks.forEach((chunkText, index) => {
        chunks.push({
          id: `${item.id}_chunk_${index}`,
          content_id: item.id,
          collection_id: item.collection_id,
          title: item.title,
          text: chunkText,
          index
        })
      })
    }
    
    return chunks
  }
  
  private extractText(data: any): string {
    // Extract all text from content data
    const parts: string[] = []
    
    if (data.title) parts.push(data.title)
    if (data.description) parts.push(data.description)
    if (data.content) parts.push(data.content)
    if (data.body) parts.push(data.body)
    
    // Recursively extract from nested objects
    const extract = (obj: any) => {
      if (typeof obj === 'string') {
        parts.push(obj)
      } else if (Array.isArray(obj)) {
        obj.forEach(extract)
      } else if (obj && typeof obj === 'object') {
        Object.values(obj).forEach(extract)
      }
    }
    
    extract(data)
    
    return parts.join(' ')
  }
  
  private splitIntoChunks(text: string, maxTokens: number): string[] {
    // Simple chunking by words (rough token estimate)
    const words = text.split(/\s+/)
    const chunks: string[] = []
    
    for (let i = 0; i < words.length; i += maxTokens) {
      chunks.push(words.slice(i, i + maxTokens).join(' '))
    }
    
    return chunks
  }
  
  private async generateEmbeddings(chunks: Chunk[]): Promise<number[][]> {
    const embeddingService = new EmbeddingService(this.ai)
    const texts = chunks.map(c => c.text)
    return embeddingService.generateBatch(texts)
  }
}

interface Chunk {
  id: string
  content_id: string
  collection_id: string
  title: string
  text: string
  index: number
}
```

### Step 4: Search with RAG

```typescript
// packages/core/src/plugins/core-plugins/ai-search-plugin/services/custom-rag.ts

export class CustomRAGService {
  // ... (previous methods)
  
  async search(query: string, options: SearchOptions): Promise<SearchResult[]> {
    // 1. Generate query embedding
    const embeddingService = new EmbeddingService(this.ai)
    const queryEmbedding = await embeddingService.generateEmbedding(query)
    
    // 2. Search Vectorize for similar chunks
    const vectorResults = await this.vectorize.query(queryEmbedding, {
      topK: options.limit || 20,
      filter: options.collectionIds 
        ? { collection_id: { $in: options.collectionIds } }
        : undefined
    })
    
    // 3. Get full content from D1
    const contentIds = [...new Set(
      vectorResults.matches.map(m => m.metadata.content_id)
    )]
    
    const content = await this.db
      .prepare(`
        SELECT c.*, col.display_name as collection_name
        FROM content c
        JOIN collections col ON c.collection_id = col.id
        WHERE c.id IN (${contentIds.map(() => '?').join(',')})
      `)
      .bind(...contentIds)
      .all()
    
    // 4. Map results with relevance scores
    return content.results.map(item => ({
      id: item.id,
      title: item.title,
      slug: item.slug,
      collection_id: item.collection_id,
      collection_name: item.collection_name,
      snippet: this.generateSnippet(item, query),
      relevance_score: this.getRelevanceScore(item.id, vectorResults),
      status: item.status,
      created_at: item.created_at,
      updated_at: item.updated_at
    }))
  }
  
  private getRelevanceScore(contentId: string, vectorResults: any): number {
    // Find the highest score for this content
    const matches = vectorResults.matches.filter(
      m => m.metadata.content_id === contentId
    )
    
    if (matches.length === 0) return 0
    
    return Math.max(...matches.map(m => m.score))
  }
  
  private generateSnippet(content: any, query: string): string {
    const data = JSON.parse(content.data)
    const text = this.extractText(data)
    
    // Find query terms in text
    const queryLower = query.toLowerCase()
    const textLower = text.toLowerCase()
    const index = textLower.indexOf(queryLower)
    
    if (index === -1) {
      // Return first 200 chars
      return text.substring(0, 200) + '...'
    }
    
    // Return context around match
    const start = Math.max(0, index - 100)
    const end = Math.min(text.length, index + query.length + 100)
    return '...' + text.substring(start, end) + '...'
  }
}

interface SearchOptions {
  limit?: number
  collectionIds?: string[]
}
```

### Step 5: Setup Script

```bash
# packages/core/src/plugins/core-plugins/ai-search-plugin/setup.sh

#!/bin/bash

echo "Setting up AI Search with Vectorize..."

# Create Vectorize index
npx wrangler vectorize create sonicjs-search \
  --dimensions=768 \
  --metric=cosine

echo "✅ Vectorize index created: sonicjs-search"

# Add binding to wrangler.toml
echo "
[[vectorize]]
binding = \"VECTORIZE\"
index_name = \"sonicjs-search\"
" >> my-sonicjs-app/wrangler.toml

echo "✅ Added Vectorize binding to wrangler.toml"
echo ""
echo "🎉 Setup complete! Restart your dev server."
```

### Step 6: Update wrangler.toml

```toml
# my-sonicjs-app/wrangler.toml

# Workers AI (for embeddings)
[ai]
binding = "AI"

# Vectorize (for vector search)
[[vectorize]]
binding = "VECTORIZE"
index_name = "sonicjs-search"
```

### Step 7: Update Plugin Settings UI

```typescript
// No "instance name" field needed!
// Just enable/disable AI mode

interface AISearchSettings {
  enabled: boolean
  ai_mode_enabled: boolean  // Toggle between keyword and AI
  selected_collections: string[]
  // ... other settings
}
```

## User Experience

### First Time Setup:

1. **User installs plugin** → Active
2. **User goes to settings** → Sees collections
3. **User checks collections** → Click "Save"
4. **Plugin runs setup**:
   - Creates Vectorize index (if needed)
   - Indexes selected collections
   - Shows progress bar
5. **Done!** → AI search works

### No Dashboard Required! 🎉

## Comparison

### Cloudflare AI Search (Option 1):
```
❌ Manual dashboard setup
✅ Managed service
✅ Less code
❌ Less control
```

### Custom RAG with Vectorize (Option 2):
```
✅ Fully automated
✅ No dashboard setup
✅ Full control
✅ Learn RAG internals
❌ More code (but we write it once)
```

## Cost Comparison

### Cloudflare AI Search:
- Free: 50 docs, 1000 queries/month
- Paid: $5/mo for 5000 docs

### Custom RAG (Vectorize + Workers AI):
- **Vectorize**: Free tier 5M queries/month, 10M dimensions
- **Workers AI**: Free tier 10k neurons/day
- **Total**: Likely FREE for most sites!

## Recommendation

**Build Custom RAG with Vectorize!**

**Why:**
1. ✅ No manual setup required
2. ✅ Fully automated in plugin
3. ✅ More control
4. ✅ Likely cheaper (free tier)
5. ✅ Better learning experience
6. ✅ Can optimize for SonicJS specifically

**Trade-off:**
- More code to write (but we do it once)
- More maintenance (but we control it)

## Implementation Timeline

### Week 1: Core RAG
- [ ] EmbeddingService
- [ ] CustomRAGService (indexing)
- [ ] Vectorize setup script
- [ ] Test with one collection

### Week 2: Search & UI
- [ ] Search implementation
- [ ] Chunking strategy
- [ ] Settings UI updates
- [ ] Progress indicators

### Week 3: Polish
- [ ] Batch processing
- [ ] Error handling
- [ ] Performance optimization
- [ ] Documentation

## Next Steps

**Should we build Custom RAG?**

If yes:
1. Create Vectorize index setup
2. Implement EmbeddingService
3. Implement CustomRAGService
4. Update settings UI
5. Test and deploy

**This gives users true AI search without any manual setup!** 🚀
