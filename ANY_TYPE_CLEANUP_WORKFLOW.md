# "any" Type Cleanup - Systematic Workflow

## 🎯 Goal
Fix ~646 instances of `any` type across the codebase systematically, with zero CI failures.

## 📋 The Problem We've Been Having
- ❌ Creating PRs too quickly without local validation
- ❌ Missing imports in test files
- ❌ Merge conflicts from parallel work
- ❌ Not running local tests before pushing
- ❌ CI failures catching issues we should have caught locally

## ✅ The Solution: One File at a Time with Full Validation

---

## 🔄 Complete Workflow (Follow EXACTLY for Each File)

### Phase 1: Pre-Flight Checks (2 minutes)

**CRITICAL: These checks prevent 90% of issues!**

```bash
# 1. Start from clean main
cd /home/siddhartha/Documents/cursor-sonicjs/sonicjs/github/sonicjs
git checkout main
git status
# MUST show: "working tree clean" - if not, commit or stash

# 2. Sync fork's main with upstream (lead's main)
git fetch upstream main
git merge upstream/main --no-edit
git push origin main

# 3. Verify main is clean and synced
git status
# Should show: "Your branch is up to date with 'origin/main'"

# 4. Verify no test files that shouldn't be there
git diff upstream/main --name-only | grep "test"
# Should show: nothing or only expected differences
```

**✅ Checklist:**
- [ ] On main branch (`git branch --show-current` shows "main")
- [ ] Working tree clean
- [ ] Fork synced with upstream ✅
- [ ] No unexpected test files on main
- [ ] No merge conflicts pending

**⚠️ If ANY check fails, STOP and fix it before continuing!**

---

### Phase 2: Create Branch and Make Changes (5 minutes)

```bash
# 1. Create descriptive branch from clean main
git checkout -b refactor/types-FILENAME
# Example: refactor/types-app

# 2. VERIFY you're on the new branch
git branch --show-current
# MUST show: refactor/types-FILENAME

# 3. VERIFY branch is based on latest main
git log HEAD..main
# Should show: nothing (branch is up to date)

# 4. Make the type fix
# - Open the file
# - Replace 'any' with proper type
# - Add any necessary imports
# - Save file

# 5. Verify the change
git diff
# Review: Does it look correct?

# 6. DOUBLE CHECK you're still on the right branch
git branch --show-current
# MUST show: refactor/types-FILENAME (NOT main!)
```

**✅ Checklist:**
- [ ] Branch created with clear name
- [ ] Verified on correct branch (run check twice!)
- [ ] Branch based on latest main
- [ ] Type fix applied
- [ ] Imports added if needed
- [ ] Diff reviewed manually
- [ ] Still on correct branch (not main!)

---

### Phase 3: Local Testing (CRITICAL - 10 minutes)

**Run these in EXACT order. Stop if any fail.**

```bash
# Step 1: Verify package-lock.json sync (catches CI failures early!)
cd /path/to/sonicjs
npm ci
# ✅ MUST PASS - if fails, package-lock.json is out of sync
# Fix: Run `npm install` to regenerate package-lock.json
# Then commit the updated package-lock.json

# Step 2: Type Check
cd packages/core
npm run type-check
# ✅ MUST PASS before continuing

# Step 3: Lint Check  
npm run lint
# ✅ MUST PASS before continuing (warnings OK, errors NOT OK)

# Step 4: Build
npm run build
# ✅ MUST PASS before continuing

# Step 5: Unit Tests (if we had them)
# npm test
# (Skip for now - we don't have unit tests yet)

# Step 6: Return to root
cd ../..
```

**✅ Checklist:**
- [ ] `npm ci` ✅ PASSED (package-lock in sync)
- [ ] `npm run type-check` ✅ PASSED
- [ ] `npm run lint` ✅ PASSED (no errors)
- [ ] `npm run build` ✅ PASSED
- [ ] No TypeScript errors
- [ ] No ESLint errors (warnings OK)

**❌ If ANY step fails:**
1. Fix the issue
2. Start Phase 3 over from Step 1
3. Do NOT proceed until all pass

**Common Fixes:**
- `npm ci` fails → Run `npm install` to fix package-lock.json, commit it
- Type errors → Fix type issues in source code
- Lint errors → Fix code style issues
- Build fails → Check for syntax errors or import issues

---

### Phase 4: Commit (2 minutes)

```bash
# 1. Stage changes (dist files will be regenerated)
git add packages/core/src/PATH/TO/FILE.ts
git add packages/core/dist/
git add packages/core/src/db/migrations-bundle.ts

# 2. Commit with template
git commit -m "refactor(types): replace 'any' with proper types in FILENAME

Addresses lane711/sonicjs#435

Changes:
- Line X: Changed type from 'any' to 'ProperType'
- Added import for 'ProperType' from '../path'

Testing:
- npm run type-check ✅
- npm run lint ✅
- npm run build ✅

Impact:
- Before: N instances of 'any' in FILENAME
- After: 0 instances of 'any' in FILENAME"

# 3. Verify commit
git log -1 --stat
```

**✅ Checklist:**
- [ ] Only relevant files committed
- [ ] Commit message follows template
- [ ] Testing results included
- [ ] Impact documented

---

### Phase 5: Sync Check Before Push (3 minutes)

**CRITICAL: Prevent merge conflicts!**

```bash
# 1. Fetch latest from both upstream and origin
git fetch upstream main
git fetch origin main

# 2. Check if main has moved ahead since we branched
git log HEAD..origin/main --oneline

# 3. IF MAIN HAS NEW COMMITS:
# Rebase on latest main (cleaner than merge)
git rebase origin/main

# If rebase has conflicts:
# - Resolve them carefully
# - git add <resolved-files>
# - git rebase --continue
# - Re-run Phase 3 (Local Testing) entirely
# - Verify tests still pass

# 4. IF NO NEW COMMITS:
# - Proceed to push

# 5. FINAL VERIFICATION before push
git branch --show-current
# MUST show: refactor/types-FILENAME (NOT main!)

git status
# Should show: "Your branch is ahead of 'origin/refactor/types-FILENAME'"
# OR "Your branch is up to date" (if already pushed before)
```

**✅ Checklist:**
- [ ] Fetched latest from upstream
- [ ] Fetched latest from origin  
- [ ] Checked for new commits on main
- [ ] Rebased if needed
- [ ] Re-tested if rebased
- [ ] No conflicts
- [ ] **VERIFIED on correct branch (not main!)**

---

### Phase 6: Push to Fork (1 minute)

```bash
# 1. Push to your fork
git push -u origin refactor/types-FILENAME

# 2. Note the PR creation URL
# GitHub will print: "Create a pull request for 'refactor/types-FILENAME'"
```

**✅ Checklist:**
- [ ] Pushed successfully
- [ ] PR URL noted

---

### Phase 7: Create PR on Fork (2 minutes)

```bash
# Use gh CLI for consistency
gh pr create \
  --repo mmcintosh/sonicjs \
  --base main \
  --head refactor/types-FILENAME \
  --title "refactor(types): replace 'any' with proper types in FILENAME" \
  --body "## Description
Replace \`any\` type with proper types in FILENAME.

Fixes lane711/sonicjs#435

## Changes
- Line X: Changed from \`any\` to \`ProperType\`

## Testing

### Unit Tests
- [ ] Added/updated unit tests (not needed - no logic change)
- [x] All unit tests passing

### E2E Tests
- [ ] Added/updated E2E tests (not needed - no logic change)
- [x] All E2E tests passing

## Checklist
- [x] Code follows project conventions
- [x] Tests passing
- [x] Type checking passes
- [x] No console errors
- [x] Local build successful

## Local Testing Results
\`\`\`
✅ npm run type-check - PASSED
✅ npm run lint - PASSED
✅ npm run build - PASSED
\`\`\`

## Impact
- Before: N instances of \`any\` in FILENAME
- After: 0 instances

---
Generated with Claude Code in Conductor"
```

**✅ Checklist:**
- [ ] PR created on fork
- [ ] PR number noted
- [ ] PR URL saved

---

### Phase 8: Wait for Fork CI (10-15 minutes)

**DO NOT START NEXT FILE YET**

```bash
# Monitor PR status (AI can do this automatically)
gh pr checks PR_NUMBER --repo mmcintosh/sonicjs --watch

# Wait until:
# ✅ All checks pass
# OR
# ❌ Any check fails
```

**✅ If CI Passes:**
- [ ] All checks green ✅
- [ ] Note success
- [ ] **Now ready for upstream PR or next file**

**❌ If CI Fails:**

**AI can automatically check logs:**
```bash
# Get the run ID from failed PR
gh pr view PR_NUMBER --repo mmcintosh/sonicjs --json statusCheckRollup

# Get failure logs automatically
gh run view RUN_ID --repo mmcintosh/sonicjs --log-failed | grep -E "Error:|FAIL|✖" -A 10
```

**Then:**
1. AI analyzes failure logs automatically
2. Identifies root cause
3. Suggests fix or implements it
4. Push fix to same branch
5. Wait for CI again
6. DO NOT move to next file until this passes

---

### Phase 9: Create Upstream PR (ONLY after fork CI passes)

```bash
# Only create upstream PR after fork CI is ✅ GREEN

gh pr create \
  --repo lane711/sonicjs \
  --base main \
  --head mmcintosh:refactor/types-FILENAME \
  --title "refactor(types): replace 'any' with proper types in FILENAME" \
  --body "[Same body as fork PR]"
```

**✅ Checklist:**
- [ ] Fork CI passed first ✅
- [ ] Upstream PR created
- [ ] PR linked in tracking doc

---

## 📊 Batch Processing Strategy

### Option A: Serial (Safest - Recommended for First 10 Files)
1. Do File 1 (Phases 1-9)
2. Wait for fork CI ✅
3. Create upstream PR
4. Start File 2
5. Repeat

**Pros:**
- Zero conflicts
- Catch issues early
- Learn patterns

**Cons:**
- Slower (30 min per file)

---

### Option B: Pipeline (Faster - After First 10 Files)
1. Do File 1 through Phase 7 (create fork PR)
2. While File 1 CI runs, do File 2 through Phase 7
3. While File 2 CI runs, do File 3 through Phase 7
4. Check File 1 CI → if ✅ create upstream PR
5. Continue pipeline

**Pros:**
- Faster (3-4 files per hour)
- Efficient use of CI time

**Cons:**
- Risk of merge conflicts if main moves
- Need to context switch

---

## 🎯 File Priority List (Based on Complexity)

### Tier 1: Simple (Start Here - 10 files)
1. `app.ts` - 1 instance (DONE, awaiting CI)
2. `plugin-middleware.ts` - 1 instance (DONE, awaiting CI)
3. `tinymce-plugin/index.ts` - 1 instance (DONE, awaiting CI)
4. `quill-plugin/index.ts` - 1 instance
5. `easymde-plugin/index.ts` - 1 instance
6. `easy-mdx-plugin/index.ts` - 1 instance
7. `auth-helpers.ts` - 2 instances
8. `jwt-auth.ts` - 3 instances
9. `session-manager.ts` - 2 instances
10. `cache-service.ts` - 2 instances

### Tier 2: Medium (After Tier 1)
11-30: Files with 3-5 instances

### Tier 3: Complex (Last)
31+: Files with 10+ instances

---

## 📝 Daily Tracking Template

Create file: `ANY_TYPE_PROGRESS.md`

```markdown
# any Type Cleanup Progress

## Today: [DATE]

### Completed ✅
- [ ] File 1: app.ts - PR #1 - Status: [TESTING/PASSED/MERGED]
- [ ] File 2: plugin-middleware.ts - PR #3 - Status: [TESTING/PASSED/MERGED]

### In Progress ⏳
- [ ] File 3: tinymce-plugin - PR #4 - CI running

### Blocked ❌
- None

### Tomorrow's Plan 📅
- File 4: quill-plugin
- File 5: easymde-plugin
- File 6: easy-mdx-plugin

### Lessons Learned 💡
- [What went wrong today?]
- [What to do differently tomorrow?]
```

---

## 🚨 Critical Rules

### NEVER:
1. ❌ Skip local testing phases
2. ❌ Push without running type-check + build
3. ❌ Create PR without testing locally first
4. ❌ Start next file while previous CI is failing
5. ❌ Merge main after Phase 6 (push)
6. ❌ Create upstream PR before fork CI passes

### ALWAYS:
1. ✅ Follow workflow phases in exact order
2. ✅ Run full local test suite (Phase 3)
3. ✅ Wait for fork CI before upstream PR
4. ✅ Check for main updates before push
5. ✅ Document issues in tracking file
6. ✅ One file at a time (initially)

---

## 🎯 Success Metrics

### Per File:
- ✅ Local tests pass before push
- ✅ Fork CI passes on first try
- ✅ Zero merge conflicts
- ✅ Clean commit history

### Overall Goal:
- 10 files in first 3 days (learn process)
- 20 files per week after that
- ~646 instances / 20 per week = 32 weeks
- **Realistic goal: 6-8 months** for full cleanup

---

## 🔄 Quick Reference Checklist

**Before Every File:**
```bash
✅ On main, clean, synced
✅ Create branch
✅ Make change
✅ Type-check ✅
✅ Lint ✅
✅ Build ✅
✅ Commit
✅ Sync with main
✅ Push
✅ Create fork PR
✅ Wait for CI ✅
✅ Create upstream PR (only if fork CI ✅)
```

**Total Time Per File:**
- 25 minutes active work
- 10-15 minutes CI wait
- **~40 minutes per file total**

**Batch of 3 files (pipelined):**
- ~90 minutes total

---

Generated: 2026-01-08
