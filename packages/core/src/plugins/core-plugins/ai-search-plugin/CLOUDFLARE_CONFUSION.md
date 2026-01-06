# ⚠️ Important: Cloudflare AI vs AI Search

## TL;DR: We're using "Workers AI", NOT "AI Search"

You won't find anything in the **Cloudflare AI Search** dashboard because we're using a **different Cloudflare product**!

## Two Different Cloudflare Products

### 1. **Workers AI** (What we're using ✅)
- **What it is**: Built-in AI models you can call from Workers
- **Where to find it**: Your Worker automatically has access via `env.AI`
- **Dashboard**: No special dashboard needed
- **Setup**: Just add `[ai] binding = "AI"` to wrangler.toml (already done ✅)
- **Cost**: Free tier 10k queries/day, then $0.011 per 1k neurons
- **Documentation**: https://developers.cloudflare.com/workers-ai/

### 2. **AI Search** (What we're NOT using ❌)
- **What it is**: Managed search infrastructure service (like Algolia/Elasticsearch)
- **Where to find it**: Cloudflare Dashboard → AI Search
- **Dashboard**: Has its own management interface
- **Setup**: Requires creating search indexes through dashboard
- **Cost**: Different pricing model
- **Documentation**: https://developers.cloudflare.com/ai-search/

## Why the Confusion?

Our **plugin is called "AI Search"** but it uses **"Workers AI"** under the hood!

- **Plugin name**: "AI Search Plugin" (the feature we're building)
- **Cloudflare service**: "Workers AI" (the technology we're using)

Think of it like:
- **Plugin name**: "Smart Photo Gallery"
- **Cloud service**: AWS S3 (for storage)

## What You Should See

### ✅ In Wrangler Output (What you're already seeing):
```
env.AI                                                          AI                        remote
```
This is **Workers AI** - it's working perfectly!

### ❌ In Cloudflare Dashboard:
- You should NOT see anything under "AI Search"
- You should NOT need to create any indexes
- You should NOT configure anything in the dashboard

## How It Actually Works

### Current Setup (Keyword Search):
```
User Query → SQL LIKE query → D1 Database → Results
```

### With AI Enabled (After deployment):
```
User Query → Workers AI (env.AI) → Generate embedding → Search D1 → Results
```

### Optional Advanced Setup (Vectorize):
```
User Query → Workers AI → Generate embedding → Vectorize Index → Results
```

## Why Doesn't It Use Cloudflare's "AI Search"?

Good question! Here's why we chose Workers AI instead:

1. **Simpler**: No external index management
2. **Cost-effective**: Generous free tier
3. **Integrated**: Already in your Worker
4. **Flexible**: Works with your existing D1 database
5. **No vendor lock-in**: Can switch to other services easily

## When Should You Use "AI Search" Service?

Use the actual Cloudflare AI Search service if:
- You have millions of documents
- You need advanced search features (facets, autocomplete, etc.)
- You want Cloudflare to manage everything
- You're building a search-heavy application

For most SonicJS sites, **Workers AI is perfect** and much simpler!

## Troubleshooting

### "I don't see AI Search in my Cloudflare dashboard"
✅ **This is correct!** You're using Workers AI, not AI Search.

### "Is my AI binding working?"
Check your wrangler output. If you see:
```
env.AI                                                          AI                        remote
```
✅ **Yes, it's working!**

### "Do I need to create an index in Cloudflare?"
❌ **No!** The plugin manages indexing in your D1 database.

### "How do I know Workers AI is actually working?"
After deployment:
1. Go to Cloudflare Dashboard → Workers & Pages
2. Click your worker
3. Go to "Analytics" tab
4. You'll see AI requests if it's being used

### "What about the warning 'AI bindings always access remote resources'?"
✅ **Normal!** This means:
- In local dev, AI calls go to Cloudflare (not local)
- You might see small charges if you use AI mode heavily in dev
- Can be suppressed by adding `remote: true` to binding config

## Summary

✅ **You're all set!** The `env.AI` binding is working.
✅ **Don't look for "AI Search" in dashboard** - wrong product!
✅ **Workers AI is what you want** - simpler and cheaper.
✅ **After deployment, AI mode will work automatically**.

For now, just use **keyword search mode** (default) - it works great without any AI!
