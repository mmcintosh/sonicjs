# Cloudflare AI Search (AutoRAG) Setup for SonicJS

## What You Need to Do in Cloudflare Dashboard

### Step 1: Create AI Search Instance

1. **Go to**: https://dash.cloudflare.com/YOUR_ACCOUNT_ID/ai/ai-search/instance/create
2. **Click**: "Create" button
3. **Name**: `sonicjs-search` (or your preferred name)
4. **Choose Data Source**:

#### Option A: R2 Bucket (Recommended) ✅
- **Best for**: Dynamic content from SonicJS
- **Setup**:
  1. Create a new R2 bucket (or use existing `MEDIA_BUCKET`)
  2. Point AI Search to this bucket
  3. SonicJS will export content as JSON/text files to this bucket
  4. AI Search automatically indexes and updates

#### Option B: Website Crawler
- **Best for**: Static/public content
- **Setup**:
  1. Enter your site URL: `https://your-site.com`
  2. AI Search crawls and indexes pages
  3. Limited to public pages only

#### Option C: Manual Upload
- **Best for**: One-time/testing
- **Setup**:
  1. Export content as files
  2. Upload manually
  3. Not recommended for production

### Step 2: Get Instance Name

After creating, you'll have an instance name like:
- `sonicjs-search`
- `my-autorag-instance`
- etc.

Save this name - you'll need it in code!

### Step 3: Add to Plugin Settings

We need to add a settings field for the AI Search instance name:

```typescript
// In plugin settings
{
  ai_search_instance_name: "sonicjs-search",
  ai_mode_enabled: true,
  // ... other settings
}
```

### Step 4: Update Code to Use AI Search

Current code needs to be updated from:
```typescript
// ❌ Wrong - this is just Workers AI
const results = await env.AI.run(...)
```

To:
```typescript
// ✅ Correct - this is AI Search (AutoRAG)
const answer = await env.AI.autorag("sonicjs-search").aiSearch({
  query: "blog posts about security",
  max_num_results: 20,
  rewrite_query: true,
  ranking_options: {
    score_threshold: 0.3
  }
})
```

## Implementation Plan

### Phase 1: R2 Content Export (New Feature Needed)
```typescript
// Create service to export content to R2
class ContentExporter {
  async exportToR2(collectionId: string) {
    // 1. Get all content items from collection
    // 2. Format as text/JSON
    // 3. Upload to R2 bucket
    // 4. AI Search auto-indexes
  }
}
```

### Phase 2: Update AI Search Service
```typescript
// Update searchAI method
private async searchAI(query: SearchQuery, settings: AISearchSettings): Promise<SearchResponse> {
  const instanceName = settings.ai_search_instance_name
  
  if (!instanceName) {
    throw new Error('AI Search instance name not configured')
  }
  
  const answer = await this.aiSearch.autorag(instanceName).aiSearch({
    query: query.query,
    max_num_results: query.limit || settings.results_limit,
    rewrite_query: true,
    ranking_options: {
      score_threshold: 0.3
    }
  })
  
  // Transform AI Search response to our SearchResult format
  return this.transformAISearchResponse(answer)
}
```

### Phase 3: Index Management
```typescript
// When collections are selected for indexing:
async indexCollection(collectionId: string) {
  // 1. Get all content from collection
  // 2. Export to R2 bucket in correct format
  // 3. AI Search automatically picks up and indexes
  // 4. Track status via our index_status table
}
```

## Required Settings Schema Update

```json
{
  "ai_search_instance_name": {
    "type": "string",
    "label": "AI Search Instance Name",
    "description": "The name of your Cloudflare AI Search instance (from dashboard)",
    "required": true,
    "placeholder": "e.g., sonicjs-search"
  },
  "ai_search_r2_bucket": {
    "type": "string", 
    "label": "R2 Export Bucket",
    "description": "R2 bucket where content is exported for AI Search indexing",
    "default": "sonicjs-ai-search-content"
  }
}
```

## Required Bindings

### In wrangler.toml:
```toml
# Workers AI binding (for AI Search)
[ai]
binding = "AI"

# R2 bucket for content export
[[r2_buckets]]
binding = "AI_SEARCH_BUCKET"
bucket_name = "sonicjs-ai-search-content"
```

## Pricing Considerations

### Cloudflare AI Search
- **Free Tier**: 50 documents, 1000 queries/month
- **Paid**: Starting at $5/month for 5,000 documents
- See: https://developers.cloudflare.com/ai-search/platform/pricing/

### R2 Storage (for content export)
- **Free Tier**: 10 GB storage
- **Paid**: $0.015 per GB/month
- See: https://developers.cloudflare.com/r2/pricing/

### Workers AI (for embeddings)
- Included with AI Search
- No additional charge

## Step-by-Step User Flow

### For Site Admin:

1. **Create AI Search in Cloudflare Dashboard**
   - Go to AI → AI Search → Create
   - Choose R2 bucket data source
   - Note the instance name

2. **Configure Plugin**
   - Go to `/admin/plugins/ai-search`
   - Enter AI Search instance name
   - Select R2 bucket for export
   - Click "Save"

3. **Select Collections**
   - Check collections to index
   - Click "Save Settings"
   - Plugin exports content to R2
   - AI Search auto-indexes

4. **Enable AI Mode**
   - Check "Enable AI/Semantic Search"
   - Click "Save"
   - Search now uses AI Search!

## Testing

### Verify AI Search is Working:
```bash
# Check AI Search status
curl https://api.cloudflare.com/client/v4/accounts/{account_id}/ai-search/instances/{instance_name} \
  -H "Authorization: Bearer {api_token}"

# Test search directly
await env.AI.autorag("sonicjs-search").search({
  query: "test query"
})
```

## Fallback Strategy

If AI Search fails:
1. Log warning
2. Fallback to keyword search (SQL LIKE)
3. Return results anyway
4. User never sees error

## Current State vs Goal

### Current (Incomplete):
```typescript
// ❌ Just has binding, no actual AI Search usage
const aiSearch = c.env.AI
```

### Goal:
```typescript
// ✅ Uses actual AI Search instance
const answer = await c.env.AI.autorag("sonicjs-search").aiSearch({
  query: query.query
})
```

## Next Steps

1. **You**: Create AI Search instance in dashboard
2. **We**: Add instance name field to settings UI
3. **We**: Implement R2 content export service
4. **We**: Update searchAI() to use autorag() API
5. **We**: Test and deploy
6. **Profit**: AI-powered search! 🎉

## Resources

- [AI Search Docs](https://developers.cloudflare.com/ai-search/)
- [Workers Binding](https://developers.cloudflare.com/ai-search/usage/workers-binding/)
- [R2 Setup](https://developers.cloudflare.com/r2/get-started/)
- [SonicJS AI Search Plugin](./README.md)
