# 🧪 Local Testing Checklist

**Run these tests BEFORE creating a PR or pushing code.**

---

## ✅ Required Tests (Must Pass)

Run these in order:

### 1. Clean Install
```bash
npm ci
```
- ✅ Ensures dependencies match package-lock.json exactly
- ✅ Same as what CI uses (more reliable than `npm install`)
- ⏱️ Takes ~45 seconds

**Expected**: No errors, successful install

---

### 2. TypeScript Type Check
```bash
npm run type-check
```
- ✅ Verifies all TypeScript types are correct
- ✅ Catches type errors before runtime
- ⏱️ Takes ~15 seconds

**Expected**: No errors

---

### 3. Unit Tests
```bash
npm test
```
- ✅ Runs all unit tests
- ✅ Tests business logic without database
- ⏱️ Takes ~10 seconds

**Expected**: All tests passing (currently 856/856)

---

### 4. Build
```bash
npm run build
```
or for just core:
```bash
npm run build:core
```
- ✅ Compiles TypeScript to JavaScript
- ✅ Generates distribution files
- ✅ Validates code can be bundled
- ⏱️ Takes ~30 seconds

**Expected**: No errors, dist files generated

---

## 🔄 Optional Tests (CI Will Run)

These tests require special setup or take longer:

### 5. E2E Tests (Optional - Requires Playwright)
```bash
# First time only: Install browsers
npx playwright install

# Then run tests
npm run e2e:smoke    # Smoke tests (~5 min)
npm run e2e          # Full suite (~15 min)
```
**Note**: CI always runs E2E tests, so you can skip locally if:
- You don't have Playwright installed
- You haven't changed UI/integration code
- You're in a hurry

---

### 6. Database Migrations (Optional - Requires Cloudflare)
```bash
cd my-sonicjs-app
npm run setup:db
```
**Note**: CI always tests migrations, so you can skip locally if:
- You haven't changed migration files
- Wrangler isn't authenticated locally

---

## 📋 Quick Test Script

Copy this to test everything quickly:

```bash
#!/bin/bash
# Quick test script

echo "🧪 Running local tests..."
echo ""

echo "1️⃣ Clean install..."
npm ci && echo "✅ npm ci passed" || exit 1

echo ""
echo "2️⃣ Type check..."
npm run type-check && echo "✅ Type check passed" || exit 1

echo ""
echo "3️⃣ Unit tests..."
npm test && echo "✅ Unit tests passed" || exit 1

echo ""
echo "4️⃣ Build..."
npm run build:core && echo "✅ Build passed" || exit 1

echo ""
echo "🎉 All local tests passed!"
echo "✅ Ready to commit and push"
```

Save as `scripts/test-local.sh` and run with `bash scripts/test-local.sh`

---

## 🚫 Common Mistakes

### ❌ DON'T: Only run some tests
```bash
# Bad - skipping tests
npm test  # Only unit tests, missing type-check!
```

### ✅ DO: Run the full suite
```bash
# Good - complete testing
npm ci
npm run type-check
npm test
npm run build:core
```

---

### ❌ DON'T: Use `npm install` before committing
```bash
# Bad - can introduce dependency mismatches
npm install
git commit
```

### ✅ DO: Use `npm ci` to verify clean install
```bash
# Good - ensures CI will work
npm ci
npm run type-check
npm test
git commit
```

---

## 📊 Expected Results Summary

| Test | Command | Duration | Expected Result |
|------|---------|----------|-----------------|
| **Clean Install** | `npm ci` | ~45s | No errors, 1613 packages |
| **Type Check** | `npm run type-check` | ~15s | No errors |
| **Unit Tests** | `npm test` | ~10s | 856/856 passing |
| **Build** | `npm run build:core` | ~30s | No errors, dist/ created |
| **E2E (Optional)** | `npm run e2e:smoke` | ~5min | Tests passing |
| **Total (Required)** | All above | **~2 min** | All passing ✅ |

---

## 🎯 When to Run

### Before Every Commit
```bash
npm ci && npm run type-check && npm test
```
⏱️ Takes ~1 minute

### Before Every Push
```bash
npm ci && npm run type-check && npm test && npm run build:core
```
⏱️ Takes ~2 minutes

### Before Creating PR
```bash
npm ci
npm run type-check
npm test
npm run build:core
npm run e2e:smoke  # If you have Playwright
```
⏱️ Takes ~7 minutes (with E2E)

---

## 🔧 Troubleshooting

### `npm ci` fails
```bash
# Clear npm cache and try again
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
npm ci
```

### Type check fails
```bash
# Usually means you have a type error
# Read the error message and fix the code
npm run type-check
```

### Tests fail
```bash
# Run tests in watch mode to debug
npm run test:watch

# Run specific test file
npm test -- src/path/to/test.test.ts
```

### Build fails
```bash
# Check for syntax errors first
npm run type-check

# Clear build cache
rm -rf packages/*/dist
npm run build:core
```

---

## 📝 Adding to Your Workflow

1. **Git Hook** (Automatic)
   - Husky is already configured
   - Tests run automatically on commit/push
   - Add to `.husky/pre-commit` for stricter checks

2. **IDE Integration**
   - VSCode: Install "Jest" extension for test running
   - TypeScript checks run automatically in IDE

3. **CI/CD**
   - GitHub Actions runs these + E2E + migrations
   - Always check CI results even if local tests pass

---

## ✅ Checklist Template

Copy this for your PR description:

```markdown
## 🧪 Local Testing Completed

- [x] `npm ci` - Clean install passed
- [x] `npm run type-check` - No type errors
- [x] `npm test` - 856/856 unit tests passing
- [x] `npm run build:core` - Build successful
- [ ] `npm run e2e:smoke` - Skipped (CI will run)
- [ ] Database migrations - Skipped (CI will run)

All required local tests passing ✅
```

---

**Last Updated**: January 26, 2026  
**Maintained By**: SonicJS Team
