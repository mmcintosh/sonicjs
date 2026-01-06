# Cloudflare AI Search Setup Guide

## Overview

The AI Search plugin can work in two modes:

1. **Keyword Search Only** (Default, works immediately)
   - Traditional SQL LIKE queries
   - No additional setup required
   - Fast and reliable

2. **AI/Semantic Search** (Optional, requires Cloudflare setup)
   - Natural language queries
   - Semantic understanding
   - Requires Cloudflare Workers AI binding

## Quick Start (Keyword Search Only)

✅ **Already configured!** The plugin works out of the box with keyword search.

1. Go to `/admin/plugins/ai-search`
2. Select collections to index
3. Click "Save Settings"
4. Use the search - it will use keyword matching

## Enable AI/Semantic Search

### Step 1: Add Cloudflare Workers AI Binding

The binding is already added to `wrangler.toml`:

```toml
[ai]
binding = "AI"
```

### Step 2: Deploy to Cloudflare

```bash
cd my-sonicjs-app
npm run deploy
```

Or use Wrangler directly:
```bash
npx wrangler deploy
```

### Step 3: Verify Binding

After deployment, the `c.env.AI` binding will be available to your Worker.

### Step 4: Enable AI Mode

1. Go to `/admin/plugins/ai-search`
2. Check **"Enable AI/Semantic Search"**
3. Click "Save Settings"

### Step 5: Test AI Search

Try natural language queries like:
- "show me blog posts about security from last month"
- "find articles related to Cloudflare workers"
- "what content mentions authentication"

## Configuration Options

### In `wrangler.toml`:

```toml
# Cloudflare Workers AI (built-in models)
[ai]
binding = "AI"

# Optional: Vectorize for better semantic search
[[vectorize]]
binding = "VECTORIZE"
index_name = "sonicjs-search-index"
```

### In Plugin Settings UI:

- **Enable AI Search**: Master on/off switch
- **Enable AI/Semantic Search**: Toggle between keyword and AI mode
- **AI Provider**: Currently supports "cloudflare" or "keyword-only"
- **Collections to Index**: Which content types to make searchable
- **Autocomplete**: Show search suggestions
- **Cache Duration**: How long to cache results
- **Results Per Page**: Pagination size

## How It Works

### Keyword Search (Default)

```typescript
SELECT * FROM content 
WHERE (title LIKE '%query%' OR data LIKE '%query%')
  AND collection_id IN (selected_collections)
  AND status = 'published'
```

### AI/Semantic Search (Optional)

```typescript
// 1. Generate embedding for search query
const embedding = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
  text: query
})

// 2. Search Vectorize index
const matches = await env.VECTORIZE.query(embedding, {
  topK: 20,
  filter: { collection_id: selected_collections }
})

// 3. Fetch and return matching content
```

## Pricing

### Keyword Search
- **Free** - Uses your existing D1 database
- No additional Cloudflare charges

### AI/Semantic Search
- **Cloudflare Workers AI**: Pay as you go
  - Free tier: 10,000 neurons/day
  - After free tier: $0.011 per 1,000 neurons
  - See: https://developers.cloudflare.com/workers-ai/platform/pricing/

### Vectorize (Optional)
- **Free tier**: 5M queries/month, 10M stored dimensions
- **Paid**: $0.04 per million dimensions stored/month
- See: https://developers.cloudflare.com/vectorize/platform/pricing/

## Troubleshooting

### "AI Search not working"

1. **Check plugin is enabled**
   - Go to `/admin/plugins/ai-search`
   - Ensure "Enable AI Search" is checked

2. **Verify Cloudflare binding** (for AI mode)
   ```bash
   npx wrangler tail
   # Then search and look for errors like:
   # "env.AI is undefined"
   ```

3. **Check deployment**
   - Ensure you've deployed after adding the binding
   - Local dev (`npm run dev`) won't have AI binding unless you have it locally

4. **Verify Vectorize index** (if using)
   ```bash
   npx wrangler vectorize list
   # Should show: sonicjs-search-index
   ```

### "Getting keyword search even though AI is enabled"

This is intentional - the plugin **gracefully falls back** to keyword search if:
- AI binding is not available
- AI query fails
- You're in local development

Check console logs for:
```
[AI Search] AI binding not available, falling back to keyword search
```

### "How do I create a Vectorize index?"

```bash
# Create index
npx wrangler vectorize create sonicjs-search-index \
  --dimensions=768 \
  --metric=cosine

# Update wrangler.toml
[[vectorize]]
binding = "VECTORIZE"
index_name = "sonicjs-search-index"

# Deploy
npm run deploy
```

## Local Development

### Option 1: Keyword Search Only (Recommended)
- Works immediately in `npm run dev`
- No additional setup needed

### Option 2: Test with AI Locally
```bash
# Install Wrangler locally
npm install -g wrangler

# Run with remote AI binding
npx wrangler dev --remote

# Or use local AI emulation (experimental)
npx wrangler dev --ai-bindings
```

## Migration Path

**Phase 1: Start with Keyword Search** ← You are here
- Plugin works immediately
- No Cloudflare configuration needed
- Good for testing and small sites

**Phase 2: Add AI Search**
- Add `[ai]` binding to wrangler.toml
- Deploy to Cloudflare
- Enable AI mode in settings
- Better search quality, natural language

**Phase 3: Add Vectorize** (Optional)
- Create Vectorize index
- Add `[[vectorize]]` binding
- Better semantic search, more scalable
- Best for large content sites

## Resources

- [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/)
- [Cloudflare Vectorize](https://developers.cloudflare.com/vectorize/)
- [Cloudflare AI Models](https://developers.cloudflare.com/workers-ai/models/)
- [SonicJS AI Search Plugin Docs](./README.md)

## FAQ

**Q: Do I need an OpenAI API key?**
A: No! Cloudflare Workers AI has built-in models. No external API keys needed.

**Q: Will this work on my local development server?**
A: Yes, but only keyword search. AI search requires deployment to Cloudflare.

**Q: How much does this cost?**
A: Keyword search is free. AI search has a generous free tier (10k queries/day), then $0.011 per 1,000 neurons.

**Q: Can I use my own AI models?**
A: Not currently, but we can add support for AI Gateway + external providers (OpenAI, Anthropic) if needed.

**Q: Does this work with existing search?**
A: Yes! This is an "Advanced Search" feature. The existing search on the content page still works.

**Q: What happens if AI search fails?**
A: The plugin automatically falls back to keyword search. Your search always works!
