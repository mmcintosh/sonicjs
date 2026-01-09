# Two-Stage PR Testing Process

## The Problem We Discovered

We have **two different Cloudflare environments**:
1. **Your Fork (mmcintosh/sonicjs)** - Uses YOUR Cloudflare account/resources
2. **Upstream (lane711/sonicjs)** - Uses LEAD's Cloudflare account/resources

When CI runs, it needs the correct resource IDs for the account it's running in:
- Fork CI fails with lead's IDs (can't find resources in your account)
- Upstream CI fails with your IDs (can't find resources in lead's account)

## The Solution: Two-Stage Testing

### Stage 1: Test on Fork CI (Your Resources)

**Purpose:** Verify the code changes work before sending to upstream

**Steps:**
1. Make your code changes (e.g., fix `any` types)
2. Ensure `my-sonicjs-app/wrangler.toml` has YOUR Cloudflare IDs:
   ```toml
   database_id = "c08ab78f-a017-4ce8-b3b7-5e6e154e0215"  # YOUR D1
   
   [[kv_namespaces]]
   binding = "KV"
   id = "f0814f19589a484da200cc3c3ba4d717"  # YOUR KV
   preview_id = "f0814f19589a484da200cc3c3ba4d717"
   
   [[r2_buckets]]
   binding = "R2"
   bucket_name = "my-sonicjs-app"  # YOUR R2
   ```

3. Run local tests:
   ```bash
   npm ci
   npm run type-check
   npm test
   npm run build
   ```

4. Commit and push to your fork:
   ```bash
   git add .
   git commit -m "refactor(types): fix any types in [filename]"
   git push origin refactor/types-whatever
   ```

5. **Create a PR on YOUR FORK** (mmcintosh → mmcintosh):
   ```bash
   gh pr create --repo mmcintosh/sonicjs --base main --head refactor/types-whatever \
     --title "TEST: refactor(types): [description]" \
     --body "Testing changes before upstream PR"
   ```

6. **Wait for YOUR fork's CI to pass** ✅

7. **Verify the preview deployment works**

8. Once confident, **close the fork PR**:
   ```bash
   gh pr close [PR#] --repo mmcintosh/sonicjs --comment "Tests passed, moving to upstream PR"
   ```

### Stage 2: Create Upstream PR (Lead's Resources)

**Purpose:** Submit the verified changes to upstream

**Steps:**
1. Update `my-sonicjs-app/wrangler.toml` to UPSTREAM IDs:
   ```toml
   database_id = "a16f8246fc294d809c90b0fb2df6d363"  # LEAD's D1
   
   [[kv_namespaces]]
   binding = "KV"
   id = "b03d586f143e40c8b9da02fb54b2d557"  # LEAD's KV
   preview_id = "b03d586f143e40c8b9da02fb54b2d557"
   
   [[r2_buckets]]
   binding = "R2"
   bucket_name = "sonicjs-prod-media"  # LEAD's R2
   ```

2. **Important:** Also check `wrangler.toml.backup` to ensure consistency

3. Commit the wrangler change:
   ```bash
   git add my-sonicjs-app/wrangler.toml
   git commit -m "chore: update wrangler.toml for upstream CI"
   git push origin refactor/types-whatever
   ```

4. Create upstream PR:
   ```bash
   gh pr create --repo lane711/sonicjs --base main --head mmcintosh:refactor/types-whatever \
     --title "refactor(types): [description]" \
     --body "[Full PR description with testing details]"
   ```

5. **Wait for UPSTREAM CI to pass** (may need lead to approve/rerun)

6. Request review and merge

## Quick Reference: Cloudflare Resource IDs

### YOUR Resources (Fork CI)
```toml
database_id = "c08ab78f-a017-4ce8-b3b7-5e6e154e0215"
kv_id = "f0814f19589a484da200cc3c3ba4d717"
r2_bucket = "my-sonicjs-app"
```

### UPSTREAM Resources (Lead's CI)
```toml
database_id = "a16f8246fc294d809c90b0fb2df6d363"
kv_id = "b03d586f143e40c8b9da02fb54b2d557"
r2_bucket = "sonicjs-prod-media"
```

## When to Skip Stage 1

You can skip fork CI testing if:
- ✅ It's a trivial change (docs, comments, simple type fix)
- ✅ You've done 10+ successful PRs following this process
- ✅ You're highly confident in the change

**But always:**
- Run local tests first (`npm ci && npm run type-check && npm test`)
- Use upstream IDs when creating upstream PR

## Automation Consideration

In the future, we could:
1. Keep YOUR IDs in `main` branch
2. Use a script that automatically swaps to upstream IDs before creating PR
3. Or use environment detection in CI to pick the right IDs

For now, **manual two-stage process is safer** until we establish confidence.

## What Happened Today (Context)

1. We created 5 `any` type fix PRs
2. Pushed them to upstream with YOUR Cloudflare IDs still in wrangler.toml
3. Upstream CI failed: "KV namespace 'f0814f...' not found" (your ID doesn't exist in lead's account)
4. We ran `fix-wrangler-all-branches.sh` to update all branches to lead's IDs
5. Re-pushed to trigger upstream CI
6. But then YOUR fork's CI started running (duplicate PRs on fork)
7. Fork CI failed: "KV namespace 'a16f82...' not found" (lead's ID doesn't exist in your account)
8. **Solution:** Closed all fork PRs, only keep upstream PRs

**Lesson:** Test on fork first, then switch IDs for upstream!
