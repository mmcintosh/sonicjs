# Quick Pre-PR Checklist

Before creating ANY PR to lane711/sonicjs, verify:

## 1. Wrangler.toml Check ⚠️ CRITICAL

```bash
grep -A3 "database_id\|kv_namespaces\|r2_buckets" my-sonicjs-app/wrangler.toml
```

**Must show UPSTREAM IDs:**
```toml
database_id = "a16f8246fc294d809c90b0fb2df6d363"  # Lead's D1
id = "b03d586f143e40c8b9da02fb54b2d557"         # Lead's KV
bucket_name = "sonicjs-prod-media"               # Lead's R2
```

**If it shows YOUR IDs:**
```toml
database_id = "c08ab78f-a017-4ce8-b3b7-5e6e154e0215"  # ❌ Your D1
id = "f0814f19589a484da200cc3c3ba4d717"              # ❌ Your KV
bucket_name = "my-sonicjs-app"                        # ❌ Your R2
```

**Fix it:**
```bash
cd my-sonicjs-app
# Copy the upstream version
git checkout upstream/main -- wrangler.toml
# Or manually edit to use upstream IDs
git add wrangler.toml
git commit -m "chore: use upstream Cloudflare resources for CI"
git push origin [your-branch]
```

## 2. Local Tests ✅

```bash
npm ci
npm run type-check
npm test
npm run build
```

All must pass!

## 3. Branch Status ✅

```bash
git fetch upstream
git log --oneline HEAD..upstream/main
# Should be empty or show only expected differences
```

## 4. Commit Quality ✅

- [ ] Descriptive commit message
- [ ] Follows convention: `refactor(types): description`
- [ ] Includes only relevant changes
- [ ] No debugging code left behind

## Common Mistakes to Avoid

❌ Forgetting to update wrangler.toml (Cloudflare resource mismatch)  
❌ Creating PR before local tests pass  
❌ Branch out of sync with upstream/main  
❌ Having both fork PR and upstream PR (duplicate CI runs)  

## If You Get It Wrong

Don't panic! You can:
1. Update the file on the branch
2. Commit and force push
3. Ask lead to re-run CI

The PRs aren't merged yet, so you can always fix issues!
