# CI Workflow Issue - Resolution

**Date**: January 10, 2026  
**Issue**: Unnecessary CI runs triggered on main branch pushes

---

## 🔴 Problem Identified

After resetting main to upstream, two CI workflows ran unexpectedly:
1. https://github.com/mmcintosh/sonicjs/actions/runs/20855658784 (pr-tests - FAILED)
2. https://github.com/mmcintosh/sonicjs/actions/runs/20855658762 (deploy-www - SUCCESS)

### Root Cause

The `pr-tests.yml` workflow was configured with both triggers:
```yaml
on:
  pull_request_target:
    branches: [main]
  push:              # ← Problem: unnecessary trigger
    branches: [main]
```

This means EVERY push to main (including force pushes, syncs, merges) triggers the full test suite with:
- Cloudflare Workers deployment
- D1 database creation
- E2E tests
- etc.

---

## ✅ Current Status

### Fork's Main (origin/main):
**Already Fixed!** ✅  
Our fork's main no longer has the push trigger. When we reset to upstream, we must have gotten a version that was already updated.

```yaml
# Current state in mmcintosh/sonicjs:main
on:
  pull_request_target:
    branches: [main]
  # No push trigger ✅
```

### Upstream (lane711/sonicjs:main):
**Still Has Problem!** ⚠️  
Upstream still has the push trigger:

```yaml
# Current state in lane711/sonicjs:main
on:
  pull_request_target:
    branches: [main]
  push:              # ← Still present
    branches: [main]
```

---

## 🎯 Resolution Strategy

### Option 1: Do Nothing (RECOMMENDED for now)
- Our fork's main is already fixed
- Future pushes to our fork's main won't trigger pr-tests
- Those two runs were from the force-push that reset main
- No more unnecessary runs will occur going forward

### Option 2: Create PR to Upstream (Optional)
- Create a fix branch from main
- Remove push trigger
- PR to upstream to fix it there too
- Benefits the entire project

---

## 📋 Why Each Workflow Behaves Differently

### pr-tests.yml (Unnecessary on push)
- **Purpose**: Test pull requests in preview environment
- **Should trigger on**: pull_request_target only
- **Should NOT trigger on**: push to main
- **Reason**: Main pushes are either:
  - Merges from upstream (already tested)
  - Force pushes for maintenance (no code changes)
  - Syncs (no testing needed)

### deploy-www.yml (Correct on push) ✅
- **Purpose**: Deploy marketing website
- **Should trigger on**: push to main (when www/ changes)
- **Reason**: Website needs to be deployed when docs/site content changes
- **Status**: Correctly configured with path filter

---

## 🔧 For Future Reference

### Preventing Unwanted CI Runs:

**When pushing to main** (which should be rare!):
```bash
# If you absolutely must push to main and want to skip CI:
git push origin main --no-verify  # Skips pre-push hooks
# But still triggers GitHub Actions on push!

# Better: Don't push to main, only sync from upstream
git pull upstream main
git push origin main  # This will trigger deploy-www if www/ changed
```

**When syncing from upstream**:
```bash
# This is fine - only deploy-www runs (if www/ changed)
git pull upstream main
git push origin main
```

### Workflow Trigger Best Practices:

```yaml
# For PR testing workflows:
on:
  pull_request_target:  # ✅ Only PRs
    branches: [main]

# For deployment workflows:
on:
  push:  # ✅ Only deploy on push
    branches: [main]
    paths: ['www/**']  # ✅ Only when relevant files change

# For feature testing (in fork):
on:
  pull_request:  # ✅ Use for feature branch testing
    branches: [feature/*]
```

---

## ✅ Immediate Action: None Required

Our fork is already in good shape:
- ✅ pr-tests.yml: No push trigger
- ✅ deploy-www.yml: Has push trigger (correct)
- ✅ Main is clean and synced
- ✅ Future main updates won't trigger pr-tests

The two runs we saw were a one-time occurrence from the force-push. Going forward, only:
1. PRs will trigger pr-tests
2. Pushes to main with www/ changes will trigger deploy-www

---

## 📊 Summary

| Workflow | Trigger | Status | Action Needed |
|----------|---------|--------|---------------|
| pr-tests.yml (fork) | pull_request_target only | ✅ Correct | None |
| pr-tests.yml (upstream) | PR + push | ⚠️ Has issue | Optional: Create upstream PR |
| deploy-www.yml (fork) | push (www/ paths) | ✅ Correct | None |
| deploy-www.yml (upstream) | push (www/ paths) | ✅ Correct | None |

---

**Conclusion**: Issue identified and already resolved in our fork. No action required unless we want to help upstream by creating a PR to fix it there too.

**Updated**: January 10, 2026
