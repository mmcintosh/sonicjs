
## 🚫 Skipping CI for Documentation Changes

### When to Skip CI

Use `[skip ci]` in commit messages when changing ONLY documentation files:

**Files that don't need CI:**
- `*.md` files (README, docs, workflow guides)
- `*.sh` scripts (workflow automation - not part of package)
- Documentation in `docs/` folder

**Files that DO need CI:**
- Anything in `packages/core/src/`
- `package.json`, `package-lock.json`
- `wrangler.toml`
- Test files (`*.test.ts`, `*.spec.ts`)

### How to Skip CI

Add `[skip ci]` or `[ci skip]` anywhere in your commit message:

```bash
# Method 1: In commit message
git commit -m "docs: update workflow guide [skip ci]

Added section about build artifacts handling."

# Method 2: At the end of first line
git commit -m "docs: update ANY_TYPE_CLEANUP_WORKFLOW.md [skip ci]"

# Method 3: In commit body
git commit -m "docs: update workflow

[skip ci]

Added comprehensive build artifacts guide."
```

### Examples

**✅ SHOULD skip CI:**
```bash
git commit -m "docs: add build artifacts guide [skip ci]"
git commit -m "docs: update workflow checklist [skip ci]"
git commit -m "chore: update README [skip ci]"
```

**❌ Should NOT skip CI:**
```bash
git commit -m "fix: update package-lock.json"  # CI needed
git commit -m "feat: add new utility function"  # CI needed
git commit -m "refactor: change types in sanitize.ts"  # CI needed
```

### Benefits

- Saves CI minutes (faster feedback on real changes)
- Reduces unnecessary notifications
- Keeps CI runs focused on code changes
- Faster push/merge for docs

### CI Trigger Keywords

GitHub Actions recognizes these:
- `[skip ci]`
- `[ci skip]`
- `[no ci]`
- `[skip actions]`
- `[actions skip]`

All are equivalent - use whichever you prefer.

---

Last Updated: 2026-01-08 19:45 UTC

## 🗑️ CI Database Cleanup

### Why Cleanup is Needed

Each CI run creates a fresh D1 database with name like `sonicjs-pr-<branch-name>`.
These databases persist after CI completes and count against your Cloudflare limits.

**Free Tier Limit:** 10 D1 databases
**Impact:** After ~10 PRs, new CI runs will fail with "Failed to get database ID"

### Manual Cleanup (Run Periodically)

**List all D1 databases:**
```bash
npx wrangler d1 list
```

**Delete old PR databases:**
```bash
# Delete a specific database
npx wrangler d1 delete sonicjs-pr-refactor-types-app

# Or use the database ID
npx wrangler d1 delete <database-id>
```

**Clean up all PR databases at once:**
```bash
# List all PR databases and delete them
npx wrangler d1 list --json | \
  jq -r '.[] | select(.name | startswith("sonicjs-pr-")) | .uuid' | \
  xargs -I {} npx wrangler d1 delete {}
```

### Automated Cleanup Script

Create `scripts/cleanup-ci-databases.sh`:

```bash
#!/bin/bash
# cleanup-ci-databases.sh
# Cleans up old CI test databases from Cloudflare

echo "🗑️  Cleaning up old CI databases..."

# Get list of PR databases
DB_LIST=$(npx wrangler d1 list --json)

# Count total PR databases
PR_DB_COUNT=$(echo "$DB_LIST" | jq '[.[] | select(.name | startswith("sonicjs-pr-"))] | length')
echo "Found $PR_DB_COUNT PR test databases"

if [ "$PR_DB_COUNT" -eq 0 ]; then
  echo "✅ No PR databases to clean up"
  exit 0
fi

# Show databases to be deleted
echo ""
echo "Databases to delete:"
echo "$DB_LIST" | jq -r '.[] | select(.name | startswith("sonicjs-pr-")) | "  - \(.name) (ID: \(.uuid))"'

echo ""
read -p "Delete these databases? (y/N) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "$DB_LIST" | \
    jq -r '.[] | select(.name | startswith("sonicjs-pr-")) | .uuid' | \
    while read -r db_id; do
      echo "Deleting $db_id..."
      npx wrangler d1 delete "$db_id" --skip-confirmation
    done
  echo "✅ Cleanup complete!"
else
  echo "❌ Cleanup cancelled"
fi
```

**Usage:**
```bash
chmod +x scripts/cleanup-ci-databases.sh
./scripts/cleanup-ci-databases.sh
```

### When to Run Cleanup

**Recommended Schedule:**
- **Weekly:** After merging several PRs
- **Before big testing sessions:** Clear space for new test DBs
- **When hitting limits:** If CI fails with "Failed to get database ID"
- **After upgrading plan:** Less critical but still good hygiene

**Signs You Need Cleanup:**
- CI fails at "Create fresh D1 database" step
- `npx wrangler d1 list` shows 8+ databases
- You're on free tier with lots of open PRs

### Future: Auto-Cleanup in GitHub Actions

**Potential CI workflow addition:**
```yaml
- name: Cleanup old test databases (weekly)
  if: github.event.schedule == 'weekly'
  run: |
    # Delete databases older than 7 days
    npx wrangler d1 list --json | \
      jq -r '.[] | select(.name | startswith("sonicjs-pr-")) | .uuid' | \
      xargs -I {} npx wrangler d1 delete {} --skip-confirmation
```

**Note:** Not implemented yet - would need separate scheduled workflow.

### Cloudflare Paid Plan

With **Workers Paid ($5/mo)**:
- Unlimited D1 databases
- Cleanup less urgent (but still recommended for hygiene)
- Can keep test databases longer for debugging

---

Last Updated: 2026-01-08 20:00 UTC
