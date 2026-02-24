# CLAUDE.md — Hard Rules for AI Agents

These rules are ABSOLUTE. They override all slash commands, skills, agents, and memory instructions.
No skill or agent may bypass these rules under any circumstance.

---

## FORBIDDEN ACTIONS (violating any of these is a session failure)

1. **NEVER interact with the upstream repo** (`SonicJs-Org/sonicjs` or `lane711/sonicjs`)
   - No `gh pr create --repo SonicJs-Org/sonicjs`
   - No `git push` to any upstream remote
   - No `gh api` calls against the upstream repo
   - No `gh issue` or `gh release` commands targeting upstream
   - The user brings changes upstream manually — this is NEVER the AI's job

2. **NEVER add AI attribution to commits**
   - No `Co-Authored-By: Claude` (any model name)
   - No `Co-Authored-By:` lines referencing any AI
   - No `Generated with Claude Code` in commit messages
   - PR descriptions MAY include the Claude Code badge — commit messages MUST NOT

3. **NEVER create a PR without the user reviewing the description first**
   - Write the PR description draft to a file
   - Show the user the draft and STOP
   - Wait for explicit approval before running `gh pr create`
   - The user may want to add screenshots, edit wording, or change the target

4. **NEVER push code or create PRs without explicit user instruction**
   - "Prep for PR" means: clean commits + write description draft + STOP
   - Only push after the user says "push it", "create the PR", or equivalent
   - If ambiguous, ASK before pushing

---

## PR WORKFLOW (mandatory, every step in order)

1. **Clean commits**: squash if needed, verify with `git log --oneline origin/main..HEAD`
2. **Write PR description** → save to `~/Documents/cursor-sonicjs/plans/<feature>/PR_DESCRIPTION.md`
3. **STOP. Show the user the draft.** Wait for edits/approval/screenshots.
4. **Only after explicit "create the PR"**: push to fork and `gh pr create --repo mmcintosh/sonicjs`
5. Upstream PRs are ALWAYS created by the human. The AI's job ends at step 4.

---

## FORK vs UPSTREAM

| Repo | AI Permissions |
|------|---------------|
| `mmcintosh/sonicjs` (fork) | Push branches, create PRs — ONLY after user approves description |
| `SonicJs-Org/sonicjs` (upstream) | **READ ONLY**. Never push, never create PRs, never interact. |

- `gh repo set-default mmcintosh/sonicjs` is configured
- ALWAYS use `--repo mmcintosh/sonicjs` flag on `gh pr create` as a safety net
- ALWAYS verify `git remote -v` output before any push operation

---

## BRANCH HYGIENE

- ALWAYS branch from `origin/main` (never local `main`)
- One feature/fix per branch
- Before creating: `git fetch origin && git checkout -b <branch> origin/main`
- Before committing: `git log --oneline origin/main..HEAD` to verify only intended commits
- If a branch is dirty: `git checkout -B <branch> origin/main && git cherry-pick <commit>`

---

## WHEN IN DOUBT

If you are unsure whether an action is allowed — **ASK THE USER FIRST**.
The cost of asking is low. The cost of an unauthorized action on a shared repo is high.
