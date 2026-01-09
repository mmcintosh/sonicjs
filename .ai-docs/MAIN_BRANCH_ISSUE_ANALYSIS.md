# Main Branch Issue - Analysis & Remediation Plan

**Date**: January 10, 2026  
**Issue**: Fork's main branch is 50 commits ahead and 4 commits behind upstream

---

## 🚨 Problem Summary

The fork's `main` branch has diverged significantly from upstream (`lane711/sonicjs:main`) with **50 commits ahead**. This violates the proper git workflow where:

1. ✅ Feature branches should be created from main
2. ✅ Features should be tested in their own branches
3. ❌ **Main should NOT contain unmerged features**
4. ✅ Features should only land in main AFTER upstream accepts them

---

## 🔍 Root Cause Analysis

### What Happened:

The Contact Form plugin development (PR #445 to upstream) was merged into the **fork's main branch** instead of staying isolated in `feature/contact-plugin-v1`. This caused a cascade of commits to land in main:

```
Contact Form Plugin commits in main (should be in feature branch):
- 134b0d6e feat: add modular contact form plugin
- 45e2d4ff feat: Add professional contact form plugin with Google Maps
- 81707a17 feat: Enhance contact form plugin with improved validation
- 67ca8eb6 feat: Update contact form plugin with enhanced validation
- 435e61ac fix: use any active admin user instead of hardcoded email
... and many more fixes/docs related to contact form
```

### Files Affected in Main (Shouldn't be there):
```
my-sonicjs-app/src/plugins/contact-form/
my-sonicjs-app/migrations/030_contact_form_plugin.sql
my-sonicjs-app/src/collections/contact-messages.collection.ts
tests/e2e/31-contact-form.spec.ts (removed later with commit 34fa291c)
```

---

## 📊 Current State

### Upstream PRs Still Open:
1. **PR #445** (Contact Form) - OPEN since Dec 20, 2025
2. **PR #466** (Turnstile) - OPEN since Jan 5, 2026
3. **PR #489-495** (Type refactoring) - OPEN

### Fork's Testing PRs:
- **PR #12** (Turnstile) - Testing in fork
- **PR #13** (Slug Generation) - Testing in fork

### Branch Status:
```bash
main: 50 commits ahead, 4 behind upstream/main
├── Contains: Contact Form plugin (unmerged upstream)
├── Contains: Various fixes/docs related to contact form
├── Missing: 4 commits from upstream (v2.4.0 related)
```

---

## 🎯 Recommended Solution

### Option 1: Hard Reset Main to Upstream (RECOMMENDED)

**Pros:**
- Clean slate, perfectly synced with upstream
- Proper git workflow going forward
- No merge conflicts or confusion

**Cons:**
- Loses work-in-progress commits in main
- But: All important work is already in feature branches or upstream PRs

**Steps:**
```bash
# 1. Ensure all feature work is in branches (already done)
git branch --list feature/*
# feature/turnstile-plugin ✅
# feature/slug-generation-with-duplicate-detection ✅
# feature/contact-plugin-v1 ✅ (if exists)

# 2. Create backup branch (safety)
git branch backup-main-2026-01-10 main

# 3. Reset main to upstream
git checkout main
git fetch upstream
git reset --hard upstream/main
git push origin main --force-with-lease

# 4. Verify feature branches still exist
git branch --list feature/*
```

### Option 2: Rebase Main onto Upstream (More Complex)

This preserves some commits but requires careful cherry-picking and conflict resolution. **Not recommended** given the messy history.

---

## ✅ Going Forward: Proper Workflow

### Feature Development:
```
1. Create feature branch from main
   git checkout main
   git pull upstream main
   git checkout -b feature/my-feature

2. Develop and test in feature branch
   - Make commits
   - Push to fork's feature branch
   - Create testing PR in fork (optional)

3. When ready, create PR to UPSTREAM
   - Base: lane711/sonicjs:main
   - Head: mmcintosh/sonicjs:feature/my-feature

4. After upstream merges:
   git checkout main
   git pull upstream main  # Contains your merged feature
   git push origin main    # Update fork's main
   git branch -d feature/my-feature  # Clean up
```

### Main Branch Rules:
- ❌ NEVER commit features directly to main
- ❌ NEVER merge feature branches into fork's main
- ✅ ONLY sync main from upstream
- ✅ Keep main as a mirror of upstream/main

---

## 🔧 Immediate Action Required

### What to do RIGHT NOW:

1. **Verify current feature branches exist:**
   ```bash
   git branch -a | grep feature
   ```

2. **Check if contact-plugin-v1 branch exists:**
   ```bash
   git show-ref --verify refs/heads/feature/contact-plugin-v1
   ```
   - If NO: Need to recreate from main's commits before reset
   - If YES: Safe to proceed

3. **Create safety backup:**
   ```bash
   git branch backup-main-2026-01-10 main
   git push origin backup-main-2026-01-10
   ```

4. **Reset main to upstream:**
   ```bash
   git checkout main
   git fetch upstream
   git reset --hard upstream/main
   git push origin main --force-with-lease
   ```

---

## 📋 Current Features Status

| Feature | Branch | Fork PR | Upstream PR | Status |
|---------|--------|---------|-------------|--------|
| Contact Form | feature/contact-plugin-v1 | - | #445 (OPEN) | Waiting upstream review |
| Turnstile | feature/turnstile-plugin | #12 | #466 (OPEN) | Testing in fork |
| Slug Generation | feature/slug-generation-* | #13 | None yet | Testing in fork |
| Type Refactors | various refactor/* | closed | #489-495 (OPEN) | Waiting upstream review |

---

## ⚠️ Important Notes

1. **Contact Form Plugin**: The code exists in main but shouldn't be there. It's also in upstream PR #445. After resetting main, all contact form work will only exist in:
   - Upstream PR #445 (for review)
   - feature/contact-plugin-v1 branch (if it exists)

2. **No Work Lost**: All important work is preserved in:
   - Feature branches
   - Upstream PRs
   - Backup branch (backup-main-2026-01-10)

3. **Current Testing**: The turnstile and slug generation testing we just did is in feature branches, so it's safe.

---

## 🎬 Execution Decision

**User should decide:**
- [ ] Option 1: Reset main to upstream (RECOMMENDED)
- [ ] Option 2: Keep current main and work around it (NOT RECOMMENDED)
- [ ] Option 3: Something else (please specify)

**Before executing, confirm:**
- [ ] feature/contact-plugin-v1 branch exists OR contact form code can be recovered
- [ ] feature/turnstile-plugin branch exists ✅ (we just worked on it)
- [ ] feature/slug-generation-with-duplicate-detection exists ✅ (we just worked on it)
- [ ] Backup branch created ✅

---

**Next Steps After User Decision**: 
- Execute chosen option
- Verify all feature branches intact
- Update PROJECT_STATE.md with new workflow rules
