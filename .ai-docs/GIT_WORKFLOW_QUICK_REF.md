# Git Workflow - Quick Reference

## 🎯 The Golden Rule

> **Fork's main branch is a READ-ONLY mirror of upstream/main**

Never commit to it. Never merge into it. Only sync from upstream.

---

## ✅ Proper Workflow

### Starting a New Feature

```bash
# 1. Ensure main is up to date
git checkout main
git pull upstream main
git push origin main

# 2. Create feature branch FROM main
git checkout -b feature/my-awesome-feature

# 3. Develop
# ... make changes, commit often ...

# 4. Push to your fork
git push origin feature/my-awesome-feature

# 5. Create PR to UPSTREAM (not to your fork!)
# Base: lane711/sonicjs:main
# Head: mmcintosh/sonicjs:feature/my-awesome-feature
```

### After Upstream Merges Your PR

```bash
# 1. Update main from upstream
git checkout main
git pull upstream main
git push origin main  # Your feature is now in main!

# 2. Delete the feature branch
git branch -d feature/my-awesome-feature
git push origin --delete feature/my-awesome-feature

# 3. Start next feature
git checkout -b feature/next-feature
```

### Testing in Fork Before Upstream PR (Optional)

```bash
# If you want to test CI in your fork first:

# 1. Push feature branch
git push origin feature/my-awesome-feature

# 2. Create PR IN YOUR FORK for testing
# Base: mmcintosh/sonicjs:feature/my-awesome-feature
# Head: mmcintosh/sonicjs:feature/my-awesome-feature
# Title: "TEST: My Awesome Feature"

# 3. Watch CI run
# ... fix issues, push more commits ...

# 4. When CI passes, create REAL PR to upstream
# Base: lane711/sonicjs:main
# Head: mmcintosh/sonicjs:feature/my-awesome-feature

# 5. Close the testing PR in your fork
```

---

## ❌ What NOT to Do

```bash
# ❌ DON'T commit to main
git checkout main
git add .
git commit -m "adding feature"  # WRONG!

# ❌ DON'T merge features into fork/main
git checkout main
git merge feature/my-feature  # WRONG!

# ❌ DON'T create PRs to your fork/main
# Base: mmcintosh/sonicjs:main  # WRONG!
# Head: mmcintosh/sonicjs:feature/my-feature

# ❌ DON'T develop on main
git checkout main
# ... editing files ...  # WRONG!
```

---

## 🔧 Fixing a Messy Main

If main has diverged:

```bash
# 1. Create backup
git branch backup-main-$(date +%F)
git push origin backup-main-$(date +%F)

# 2. Verify feature branches exist
git branch | grep feature

# 3. Reset main to upstream
git checkout main
git fetch upstream
git reset --hard upstream/main
git push origin main --force-with-lease

# 4. Verify feature branches still exist
git branch | grep feature
```

---

## 📊 Checking Branch Status

```bash
# How many commits is main ahead/behind upstream?
git fetch upstream
git log --oneline upstream/main..main  # Ahead (should be 0)
git log --oneline main..upstream/main  # Behind (update if > 0)

# List all feature branches
git branch | grep feature

# Check if a feature branch is up to date with main
git checkout feature/my-feature
git log --oneline main..HEAD  # Your new commits
git log --oneline HEAD..main  # Commits in main not in feature
```

---

## 🚨 If You Accidentally Committed to Main

```bash
# BEFORE pushing to origin:
git reset --soft HEAD~1  # Undo last commit, keep changes
git stash  # Save your changes
git checkout -b feature/my-feature  # Create feature branch
git stash pop  # Restore your changes
git add .
git commit -m "proper commit message"
git push origin feature/my-feature

# AFTER pushing to origin (harder):
# Follow "Fixing a Messy Main" steps above
```

---

## 🎯 Mental Model

```
upstream/main (lane711/sonicjs)
    ↓
  [SYNC ONLY - one way]
    ↓
  fork/main (mmcintosh/sonicjs) [READ ONLY]
    ↓
  [BRANCH OFF]
    ↓
  feature/my-feature
    ↓
  [DEVELOP & TEST]
    ↓
  PR to upstream/main
    ↓
  [AFTER MERGE]
    ↓
  Back to upstream/main ♻️
```

---

## 📋 Quick Checklist

Before starting work:
- [ ] On main branch
- [ ] Main is synced with upstream
- [ ] Created new feature branch
- [ ] NOT working on main directly

Before creating PR:
- [ ] All work is in feature branch
- [ ] Feature branch pushed to origin
- [ ] PR target is upstream/main (NOT fork/main)
- [ ] PR title is descriptive

After PR is merged:
- [ ] Synced main from upstream
- [ ] Deleted feature branch locally
- [ ] Deleted feature branch from origin
- [ ] Ready to start next feature

---

**Remember**: Main is sacred. Features are temporary. Upstream is truth.
