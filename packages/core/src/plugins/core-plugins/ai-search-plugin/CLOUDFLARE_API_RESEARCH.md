# Cloudflare AI Search API Research

## Question: Can We Create RAG Instance Programmatically?

**User wants**: Create AI Search (RAG) instance from within the plugin, not manually via dashboard.

## Research Findings

### Cloudflare AI Search API

According to [Cloudflare AI Search documentation](https://developers.cloudflare.com/ai-search/):

1. **AI Search instances** are created and managed through the Cloudflare Dashboard
2. **No public REST API** for creating instances (as of Jan 2025)
3. **Workers binding** only accesses existing instances

### What IS Available:

#### 1. Workers Binding (Read-Only Access to Existing Instance)
```typescript
// Access existing instance via Workers
const answer = await env.AI.autorag("instance-name").aiSearch({
  query: "search query"
})
```

#### 2. Wrangler CLI (Manual Setup)
```bash
# No command to create AI Search instance
# Must use dashboard: https://dash.cloudflare.com/ai/ai-search
```

#### 3. Cloudflare API (Limited)
```bash
# Can list instances
curl https://api.cloudflare.com/client/v4/accounts/{account_id}/ai-search/instances \
  -H "Authorization: Bearer {api_token}"

# Can update instance settings
curl -X PATCH https://api.cloudflare.com/client/v4/accounts/{account_id}/ai-search/instances/{instance_id} \
  -H "Authorization: Bearer {api_token}" \
  -d '{"settings": {...}}'

# ❌ Cannot CREATE new instances via API (must use dashboard)
```

### What This Means:

**Current Limitation**: 
- ✅ Can query existing instances
- ✅ Can update instance settings
- ✅ Can upload data to instances
- ❌ **CANNOT create new instances via API**

**Workaround Options**:

1. **Hybrid Approach** (Recommended)
   - User creates instance via dashboard once
   - Plugin manages everything else (data upload, indexing, search)
   - Settings UI has "Instance Name" field

2. **Cloudflare API Token Approach** (Advanced)
   - Store Cloudflare API token in plugin settings
   - Use unofficial/internal API endpoints (risky)
   - May break with Cloudflare updates

3. **Skip AI Search, Use Vectorize Directly** (Alternative)
   - Create Vectorize index via Wrangler
   - Use Workers AI for embeddings
   - Implement our own RAG logic
   - More control, more complexity

## Recommended Architecture

### Phase 1: Manual Instance Setup (Current Best Practice)

#### Step 1: User Creates Instance (One-Time, Dashboard)
```
1. Go to Cloudflare Dashboard → AI Search
2. Click "Create"
3. Name: "sonicjs-search"
4. Data source: R2 bucket
5. Click "Create"
```

#### Step 2: Plugin Configuration (In SonicJS)
```typescript
// Settings UI in plugin
interface AISearchSettings {
  // User enters this after creating instance
  ai_search_instance_name: string  // "sonicjs-search"
  
  // Plugin manages these
  selected_collections: string[]
  ai_mode_enabled: boolean
  // ...
}
```

#### Step 3: Plugin Manages Everything Else
- ✅ Content export to R2
- ✅ Index management
- ✅ Search queries
- ✅ Analytics

### Phase 2: Future Enhancement (If API Becomes Available)

```typescript
// Hypothetical future API
class CloudflareAISearchManager {
  async createInstance(name: string, config: InstanceConfig) {
    // Would use official Cloudflare API
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai-search/instances`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          data_source: config.dataSource,
          // ...
        })
      }
    )
    return response.json()
  }
}
```

## Alternative: Build Our Own RAG

If we don't want to depend on AI Search dashboard setup, we can build RAG ourselves:

### Components Needed:

1. **Vectorize** (Vector Database)
   - Can be created via Wrangler CLI ✅
   ```bash
   npx wrangler vectorize create sonicjs-search \
     --dimensions=768 \
     --metric=cosine
   ```

2. **Workers AI** (Embeddings)
   - Already available via `env.AI` ✅
   ```typescript
   const embedding = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
     text: content
   })
   ```

3. **Custom RAG Logic**
   ```typescript
   class CustomRAG {
     async indexContent(content: Content) {
       // Generate embedding
       const embedding = await this.generateEmbedding(content.text)
       
       // Store in Vectorize
       await env.VECTORIZE.insert([{
         id: content.id,
         values: embedding,
         metadata: { title: content.title, ... }
       }])
     }
     
     async search(query: string) {
       // Generate query embedding
       const queryEmbedding = await this.generateEmbedding(query)
       
       // Search Vectorize
       const results = await env.VECTORIZE.query(queryEmbedding, {
         topK: 20
       })
       
       // Return results
       return results
     }
   }
   ```

### Pros of Custom RAG:
- ✅ Full control over RAG logic
- ✅ No manual dashboard setup
- ✅ Can create Vectorize index programmatically
- ✅ More flexible
- ✅ Learn RAG internals

### Cons of Custom RAG:
- ❌ More code to maintain
- ❌ Have to implement chunking, retrieval, reranking
- ❌ No built-in optimizations from Cloudflare
- ❌ More complex

## Recommendation

### For Production (Now):

**Use Cloudflare AI Search with Manual Setup**

**Why:**
1. Managed service (less maintenance)
2. Optimized by Cloudflare
3. Simple integration
4. One-time dashboard setup is acceptable

**Setup Flow:**
```
1. User creates AI Search instance (dashboard, once)
2. User enters instance name in plugin settings
3. Plugin handles everything else automatically
```

### For Future:

**Monitor Cloudflare for API Support**

Watch for:
- Official API announcement
- Wrangler CLI support for creating instances
- IaC (Terraform/Pulumi) support

When available, we can add:
```typescript
// Future feature: Auto-create instance
async function setupAISearch(siteName: string) {
  const instanceName = `${siteName}-search`
  await cloudflare.aiSearch.create(instanceName, {
    dataSource: 'r2',
    bucket: `${siteName}-content`
  })
  return instanceName
}
```

## Settings UI Design

### Current Approach:

```html
<!-- AI Search Settings -->
<div class="space-y-4">
  <h3>AI Search Configuration</h3>
  
  <div class="alert alert-info">
    <p>⚠️ First-time setup required:</p>
    <ol>
      <li>Go to <a href="https://dash.cloudflare.com/ai/ai-search">Cloudflare Dashboard</a></li>
      <li>Create a new AI Search instance</li>
      <li>Enter the instance name below</li>
    </ol>
  </div>
  
  <div>
    <label>AI Search Instance Name</label>
    <input type="text" name="ai_search_instance_name" 
           placeholder="e.g., sonicjs-search" />
    <button onclick="testConnection()">Test Connection</button>
  </div>
  
  <div id="connection-status"></div>
</div>
```

### With Auto-Setup (Future):

```html
<!-- AI Search Settings -->
<div class="space-y-4">
  <h3>AI Search Configuration</h3>
  
  <div>
    <label>AI Search Instance</label>
    <select name="instance_setup">
      <option value="existing">Use existing instance</option>
      <option value="create">Create new instance</option>
    </select>
  </div>
  
  <div id="existing-instance">
    <input type="text" name="ai_search_instance_name" />
  </div>
  
  <div id="create-instance" class="hidden">
    <input type="text" name="new_instance_name" placeholder="sonicjs-search" />
    <button onclick="createInstance()">Create Instance</button>
  </div>
</div>
```

## Bottom Line

**As of January 2025:**

❌ **Cannot create AI Search instances via API**
✅ **Can create Vectorize indexes via Wrangler**
✅ **Can implement custom RAG ourselves**

**Best approach for SonicJS:**

1. **Now**: Require manual instance creation (one-time, acceptable)
2. **Plugin**: Manages all data, indexing, search automatically
3. **Future**: Auto-create when API available

**Alternative**: Build custom RAG with Vectorize (more work, more control)

## Implementation Choice

### Option A: Cloudflare AI Search (Recommended)
- ✅ Simpler
- ✅ Managed service
- ❌ Manual setup required once

### Option B: Custom RAG with Vectorize
- ✅ Fully automated
- ✅ More control
- ❌ More code
- ❌ More maintenance

**Which should we build?**
