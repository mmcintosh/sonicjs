# 🚨 ANY Type PRs Failing - Fix Required

## Problem

All `any` type fix PRs are failing with:
```
KV namespace 'f0814f19589a484da200cc3c3ba4d717' not found. [code: 10041]
```

## Root Cause

The branches have **YOUR** `wrangler.toml` resource IDs:
- Your KV: `f0814f19589a484da200cc3c3ba4d717`
- Your R2: `sonicjs-ci-media`

But the lead's CI needs **HIS** resource IDs:
- His KV: `a16f8246fc294d809c90b0fb2df6d363`
- His R2: `my-sonicjs-app-media`

## Fix for Each PR

### Option 1: Update wrangler.toml on each branch

For each failing branch:

```bash
# Checkout the branch
git checkout refactor/types-easy-mdx-plugin

# Update wrangler.toml to upstream IDs
cat > my-sonicjs-app/wrangler.toml <<'EOF'
[[r2_buckets]]
binding = "MEDIA_BUCKET"
bucket_name = "my-sonicjs-app-media"

[[kv_namespaces]]
binding = "CACHE_KV"
id = "a16f8246fc294d809c90b0fb2df6d363"
preview_id = "25360861fb2745fab3b1ef2f0f13ffc8"
EOF

# Commit and force push
git add my-sonicjs-app/wrangler.toml
git commit -m "fix: restore upstream wrangler.toml resource IDs for CI compatibility"
git push --force-with-lease origin refactor/types-easy-mdx-plugin
```

Repeat for all failing branches.

### Option 2: Close PRs and recreate from fresh upstream main

This is cleaner but more work:

1. Close all failing `any` type PRs
2. Fetch latest upstream main
3. Create new branches from upstream main
4. Cherry-pick only the TypeScript changes (not wrangler.toml)
5. Create new PRs

## Affected Branches (likely)

Based on previous work:
- ✅ `refactor/types-app` (PR #489)
- ✅ `refactor/types-plugin-middleware` (PR #490)
- ✅ `refactor/types-tinymce-plugin` (PR #491)
- ❌ `refactor/types-easy-mdx-plugin` (PR #492) - **CONFIRMED FAILING**
- ❌ `refactor/types-sanitize` (PR #493) - **LIKELY FAILING**

Plus any from Batch 2-3 if you created PRs for those.

## Why This Happened

When you synced your fork with upstream, the `wrangler.toml` on your `main` had YOUR resource IDs (from when we set up CI on your fork). When you created feature branches, they inherited those IDs.

## Prevention for Future

### Before creating ANY PR to upstream:

1. Check `my-sonicjs-app/wrangler.toml`
2. Ensure it has UPSTREAM IDs, not yours
3. Or don't commit `wrangler.toml` changes at all (it's not needed for type fixes)

### Your wrangler.toml should match upstream:

```toml
[[r2_buckets]]
binding = "MEDIA_BUCKET"
bucket_name = "my-sonicjs-app-media"  # ← Upstream value

[[kv_namespaces]]
binding = "CACHE_KV"
id = "a16f8246fc294d809c90b0fb2df6d363"  # ← Upstream value
preview_id = "25360861fb2745fab3b1ef2f0f13ffc8"  # ← Upstream value
```

## Immediate Action

**Check ALL your open PRs** on upstream and see which ones have this issue:

```bash
# List all open PRs
gh pr list --repo lane711/sonicjs --author mmcintosh --state open
```

Then for each failing one, either:
- Update wrangler.toml to upstream IDs
- Or close and recreate

---

**Status:** All `any` type PRs blocked until `wrangler.toml` is fixed on each branch.
