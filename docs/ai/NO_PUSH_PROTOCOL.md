# NO-PUSH PROTOCOL - CRITICAL AI AGENT INSTRUCTIONS

## 🚨 ABSOLUTE RULES - NEVER VIOLATE

This document outlines the strict protocol for Git operations when working on SonicJS. Violation of these rules can cause serious disruption to the project maintainer and upstream repository.

---

## Why This Protocol Exists

### Historical Context
In the past, AI agents created **bad pull requests** to the upstream repository (`lane711/sonicjs`) without explicit approval. This caused:
- Unwanted PRs cluttering the upstream repository
- Confusion for the lead developer (lane711)
- Extra work to close and clean up unauthorized PRs
- Disruption to the development workflow
- Loss of trust in automated contributions

### The Solution
All AI agents and contributors **MUST** follow the fork-based workflow with explicit approval gates before any upstream interaction.

---

## Git Remote Structure

```
LOCAL REPOSITORY
├── origin      → mmcintosh/sonicjs (FORK - PUSH HERE)
└── upstream    → lane711/sonicjs   (UPSTREAM - NEVER PUSH HERE)
```

### Remote Verification
Always verify remotes before any push operation:
```bash
git remote -v

# Expected output:
# origin    git@github.com:mmcintosh/sonicjs.git (fetch)
# origin    git@github.com:mmcintosh/sonicjs.git (push)
# upstream  https://github.com/lane711/sonicjs.git (fetch)
# upstream  https://github.com/lane711/sonicjs.git (push)
```

---

## THE NO-PUSH PROTOCOL (ALWAYS ACTIVE)

### ❌ NEVER DO THESE (Without Explicit Approval):

1. **NEVER push to `lane711/sonicjs` (upstream)**
   ```bash
   # ❌ FORBIDDEN - DO NOT RUN
   git push upstream <branch-name>
   ```

2. **NEVER create Pull Requests to `lane711/sonicjs`**
   ```bash
   # ❌ FORBIDDEN - DO NOT RUN
   gh pr create --repo lane711/sonicjs
   ```

3. **NEVER merge branches to upstream**
   - No direct merges
   - No fast-forwards
   - No force pushes

4. **NEVER tag releases without approval**
   - No version tags
   - No release creation

5. **NEVER modify upstream GitHub settings**
   - No repository settings changes
   - No webhook modifications
   - No branch protection changes

### ✅ ALWAYS DO THESE:

1. **ALWAYS push to `mmcintosh/sonicjs` (fork) ONLY**
   ```bash
   # ✅ CORRECT - Always use origin (fork)
   git push origin <branch-name>
   ```

2. **ALWAYS push to origin for CI testing**
   ```bash
   # ✅ CORRECT - Push to fork triggers CI
   git push origin feature/my-feature
   ```

3. **ALWAYS use `--force-with-lease` for amended commits**
   ```bash
   # ✅ CORRECT - Safer force push
   git push origin <branch-name> --force-with-lease
   ```

4. **ALWAYS verify branch is clean before pushing**
   ```bash
   # Check for junk files
   git status --short
   
   # Check for dist files, logs, etc.
   ls -la packages/core/dist/ | grep "\.map$\|\.js$"
   ```

5. **ALWAYS run full test suite before pushing**
   ```bash
   # Required test sequence (see below)
   npm ci
   npm run type-check
   npm test
   npm run e2e
   
   # Only push if all pass
   git push origin <branch-name>
   ```

6. **ALWAYS wait for explicit user approval before:**
   - Creating any PR
   - Pushing to upstream
   - Merging anything
   - Tagging releases
   - Interacting with lane711/sonicjs in any way

---

## Required Test Sequence Before ANY Push

```bash
# 1. Clean install (removes stale dependencies)
npm ci

# 2. Type check (catches TypeScript errors)
npm run type-check

# 3. Unit tests (validates logic)
npm test

# 4. E2E tests (validates integration)
npm run e2e

# 5. ONLY if ALL tests pass, push to FORK
git push origin <branch-name>
```

### Test Failure Response
- ❌ **DO NOT** push if any test fails
- 🔧 **FIX** the failing tests first
- ✅ **RE-RUN** the full sequence
- ⏳ **ONLY PUSH** when everything passes

---

## CI/CD Workflow

### Correct Workflow
```
1. Work locally on feature branch
   ↓
2. Run full test suite locally
   ↓
3. Push to mmcintosh/sonicjs (fork)
   ↓
4. CI runs automatically on fork
   ↓
5. Review CI results
   ↓
6. [WAIT FOR APPROVAL]
   ↓
7. Create PR to lane711/sonicjs (ONLY with explicit approval)
```

### CI Skip for Documentation Changes

Documentation-only commits don't need to waste CI resources:

#### Method 1: Path-Based Skipping (Automatic)
The workflow is configured to skip CI for:
- Changes to `docs/**`
- Changes to `*.md` files (README, CONTRIBUTING, etc.)
- Changes to www deployment workflow

#### Method 2: Commit Message Skip (Manual)
Add `[skip ci]` or `[ci skip]` to commit message:
```bash
git commit -m "docs: update API reference [skip ci]"
```

#### When to Skip CI:
- ✅ Documentation-only changes
- ✅ README updates
- ✅ Comment changes
- ✅ Markdown file edits
- ❌ **DO NOT SKIP** for code changes
- ❌ **DO NOT SKIP** for test changes
- ❌ **DO NOT SKIP** for config changes

### CI Monitoring
- Fork CI URL: `https://github.com/mmcintosh/sonicjs/actions`
- Check CI results after every push to fork
- DO NOT proceed if CI fails
- Fix issues and push again to fork

---

## Pull Request Creation Rules

### When PR Creation is FORBIDDEN:
- ❌ **NEVER** create PR automatically after pushing
- ❌ **NEVER** create PR without explicit user request
- ❌ **NEVER** create PR "to be helpful" or "proactively"
- ❌ **NEVER** create draft PRs without approval

### When PR Creation is ALLOWED:
- ✅ **ONLY** when user explicitly says: "create a PR"
- ✅ **ONLY** when user explicitly says: "make a pull request"
- ✅ **ONLY** after CI passes on fork
- ✅ **ONLY** with proper PR description and test results

### PR Creation Command (ONLY with approval):
```bash
# ONLY run this if user explicitly approves
gh pr create \
  --repo lane711/sonicjs \
  --base main \
  --head mmcintosh:feature/my-feature \
  --title "feat: descriptive title" \
  --body "$(cat <<'EOF'
## Summary
- Key changes

## Testing
- [x] Unit tests pass
- [x] E2E tests pass
- [x] CI passes on fork

## CI Results
Fork CI: https://github.com/mmcintosh/sonicjs/actions/runs/XXXXX

EOF
)"
```

---

## Emergency Procedures

### If You Accidentally Push to Upstream
1. **IMMEDIATELY STOP** all operations
2. **NOTIFY USER** of the mistake
3. **DO NOT** attempt to fix it yourself
4. **WAIT** for user instructions
5. User will handle cleanup with lead developer

### If You Accidentally Create a PR
1. **IMMEDIATELY STOP** all operations
2. **NOTIFY USER** of the PR creation
3. **DO NOT** close it yourself
4. **WAIT** for user instructions
5. User will close the PR with appropriate message

---

## Verification Checklist

Before EVERY push operation, verify:

- [ ] Working on correct branch (not main/master)
- [ ] Remote is `origin` (fork), not `upstream`
- [ ] All tests pass locally
- [ ] No junk files in git status
- [ ] Commit messages are clear and descriptive
- [ ] No secrets or credentials in code
- [ ] No hardcoded API keys or tokens
- [ ] No personal information or paths
- [ ] User has NOT requested PR creation
- [ ] Pushing to fork only

---

## Example Scenarios

### ✅ CORRECT: Feature Development Flow
```bash
# 1. Create feature branch
git checkout -b feature/new-feature

# 2. Make changes
# ... edit files ...

# 3. Run tests locally
npm ci && npm run type-check && npm test && npm run e2e

# 4. Commit changes
git add .
git commit -m "feat: add new feature"

# 5. Push to FORK (origin)
git push origin feature/new-feature

# 6. Monitor CI on fork
# Check: https://github.com/mmcintosh/sonicjs/actions

# 7. WAIT for user approval before creating PR
# User will explicitly say: "create a PR now"
```

### ❌ INCORRECT: Automatic PR Creation
```bash
# ❌ DO NOT DO THIS
git push origin feature/new-feature
gh pr create --repo lane711/sonicjs  # ← FORBIDDEN!
```

### ❌ INCORRECT: Push to Upstream
```bash
# ❌ DO NOT DO THIS
git push upstream feature/new-feature  # ← FORBIDDEN!
```

---

## Communication Protocol

### What to Say to User After Pushing:
```
✅ Pushed to fork (mmcintosh/sonicjs): branch-name
📊 CI running at: https://github.com/mmcintosh/sonicjs/actions

Waiting for CI results before any further action.
Would you like me to monitor the CI status?
```

### What NOT to Say:
```
❌ "I'll create a PR now"
❌ "Should I make a pull request?"
❌ "Creating draft PR for review"
❌ "Pushing to upstream for you"
```

---

## Repository Information

### Upstream (DO NOT PUSH)
- **Repository**: `lane711/sonicjs`
- **URL**: `https://github.com/lane711/sonicjs`
- **Owner**: Lane (lead developer)
- **Access**: Read-only via fetch

### Fork (PUSH HERE)
- **Repository**: `mmcintosh/sonicjs`
- **URL**: `https://github.com/mmcintosh/sonicjs`
- **Owner**: mmcintosh (authorized fork)
- **Access**: Full push access for CI testing

---

## Summary

### The Three Golden Rules:
1. 🔒 **NEVER** push to `lane711/sonicjs`
2. ✅ **ALWAYS** push to `mmcintosh/sonicjs`
3. ⏳ **WAIT** for explicit approval before PRs

### When in Doubt:
- **ASK** the user first
- **DO NOT** assume approval
- **DO NOT** be proactive with upstream
- **WAIT** for explicit instructions

---

## Enforcement

This protocol is **MANDATORY** for all:
- AI coding agents (Claude, GPT, etc.)
- Automated scripts
- CI/CD pipelines
- Any automated tooling

**Violation of this protocol is considered a critical error.**

---

## Questions or Issues?

If you're unsure about any operation:
1. **STOP** what you're doing
2. **ASK** the user for clarification
3. **WAIT** for explicit approval
4. **DOCUMENT** the decision for future reference

**When in doubt, DO NOT push or create PRs.**

---

*Last Updated: January 2026*  
*Version: 1.0*  
*Status: MANDATORY FOR ALL AI AGENTS*
