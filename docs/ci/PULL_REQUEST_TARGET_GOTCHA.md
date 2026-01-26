# Critical: pull_request_target Workflow Behavior

## The Problem

When debugging CI failures on PRs, you fix the workflow file in your PR branch and push, but **the fixes don't take effect**. The CI keeps running the old code and failing with the same errors.

## Why This Happens

The `.github/workflows/pr-tests.yml` workflow uses the `pull_request_target` event trigger:

```yaml
on:
  pull_request_target:
    types: [opened, synchronize, reopened]
```

**CRITICAL BEHAVIOR**: `pull_request_target` **always runs the workflow file from the BASE branch** (usually `main`), NOT from the PR branch.

This is a GitHub Actions security feature designed to:
- Prevent malicious PRs from modifying the workflow to access secrets
- Ensure consistent CI behavior across all PRs
- Protect repository secrets from untrusted code

## The Solution

**When you need to fix the workflow file:**

1. Make your changes to `.github/workflows/pr-tests.yml` on the PR branch
2. Commit and note the commit SHA
3. **Cherry-pick that commit to the `main` branch**
4. Push `main` to the fork
5. Then trigger the CI on the PR branch (empty commit or new push)

### Example Commands

```bash
# 1. Fix the workflow on PR branch and commit
git add .github/workflows/pr-tests.yml
git commit -m "fix: correct KV namespace parsing"
git push

# 2. Cherry-pick to main
COMMIT_SHA=$(git log --oneline -1 | awk '{print $1}')
git stash  # if needed
git checkout main
git cherry-pick $COMMIT_SHA
git push origin main

# 3. Return to PR branch and trigger CI
git checkout feature/your-branch
git stash pop  # if you stashed
git commit --allow-empty -m "chore: trigger CI with workflow fix"
git push
```

## Common Mistakes

❌ **WRONG**: Only pushing workflow changes to the PR branch and expecting them to work
❌ **WRONG**: Repeatedly debugging the same issue without updating `main`
❌ **WRONG**: Assuming CI failures mean your fix didn't work (it might not have run yet!)

✅ **RIGHT**: Always cherry-pick workflow changes to `main` immediately
✅ **RIGHT**: Verify the workflow file on `main` before debugging further
✅ **RIGHT**: Check GitHub Actions UI to see which commit the workflow is running from

## How to Verify

Before debugging CI failures, check:

1. **What workflow is actually running?**
   - In GitHub Actions UI, look at the workflow run details
   - Check the commit SHA it references
   - That SHA should be on the `main` branch, not your PR branch

2. **Is my fix on main?**
   ```bash
   git log origin/main -1 --oneline .github/workflows/pr-tests.yml
   ```

3. **Did I trigger CI after updating main?**
   - The CI must run AFTER you push to `main`
   - An empty commit on the PR branch will trigger a new run

## Related Issues

This same behavior affects ALL workflow files that use `pull_request_target`:
- `.github/workflows/pr-tests.yml` ← **This one!**
- Any other workflows using `pull_request_target`

Workflows using `pull_request` (without `_target`) DO use the PR branch version.

## Timeline Example from This Session

This exact issue caused ~8+ failed CI runs because we kept:
1. Fixing the KV namespace parsing logic on the PR branch
2. Pushing to the PR branch
3. Watching it fail with the OLD code from `main`
4. Debugging the "failure" when the new code never ran
5. Repeat...

The fix only worked once we cherry-picked to `main`.

## Quick Reference

```
PR Branch Change → CI Still Fails ❌
     ↓
Cherry-pick to main → Push main → Trigger PR → CI Uses New Code ✅
```

## For Future AI Agents

When debugging workflow failures on PRs:
1. **FIRST**: Check if workflow changes are on `main` branch
2. **SECOND**: Cherry-pick any workflow fixes to `main` immediately  
3. **THIRD**: Trigger new CI run on PR
4. **ONLY THEN**: Debug if it still fails

This will save hours of debugging cycles.
