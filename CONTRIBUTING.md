# Contributing to SonicJS

Thank you for your interest in contributing to SonicJS!

## Quick Links

- **[Full Contributing Guide](https://sonicjs.com/contributing)** - Detailed guide on how to contribute
- **[Good First Issues](https://github.com/lane711/sonicjs/labels/good%20first%20issue)** - Great starting points for new contributors
- **[Help Wanted](https://github.com/lane711/sonicjs/labels/help%20wanted)** - Issues where we need community help

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/sonicjs.git
   cd sonicjs
   ```
3. **Add upstream remote:**
   ```bash
   git remote add upstream https://github.com/lane711/sonicjs.git
   git remote -v  # Verify remotes
   ```
4. **Install dependencies:**
   ```bash
   npm install
   ```
5. **Start development:**
   ```bash
   npm run dev
   ```

## ⚠️ Important: Fork-Based Workflow

**Always work through your fork - never push directly to `lane711/sonicjs`**

### Correct Workflow:
```bash
# ✅ Create feature branch
git checkout -b feature/my-feature

# ✅ Make changes and commit
git add .
git commit -m "feat: my feature"

# ✅ Push to YOUR fork (origin)
git push origin feature/my-feature

# ✅ Create PR from your fork to upstream
# Go to GitHub and create PR from YOUR_USERNAME:feature/my-feature → lane711:main
```

### What NOT to do:
```bash
# ❌ NEVER push directly to upstream
git push upstream feature/my-feature  # DON'T DO THIS

# ❌ NEVER work directly on main branch
git checkout main
# make changes...  # DON'T DO THIS
```

### For AI Agents:
If you're an AI coding agent, **READ** `docs/ai/NO_PUSH_PROTOCOL.md` for strict rules about repository operations. Violation of the protocol is considered a critical error.

## Before You Start

We appreciate every developer who wants to contribute. To ensure the best experience for both contributors and maintainers:

- **Start with code, not meetings** - Submit at least one meaningful pull request before requesting deeper involvement
- **Find an issue** - Check our [issue tracker](https://github.com/lane711/sonicjs/issues) for something to work on
- **Claim the issue** - Comment on the issue to indicate you're working on it

## What Counts as a Meaningful Contribution?

- 🐛 **Bug Fixes** - Fix a bug with a well-tested solution
- ✨ **New Features** - Implement a feature that has been discussed and approved
- 📝 **Documentation** - Significantly improve or add documentation
- 🧪 **Test Coverage** - Add meaningful tests for untested functionality

## Code Standards

- **TypeScript**: All code must be in TypeScript with proper types
- **Testing**: New features must include tests
- **Documentation**: Public APIs must be documented
- **Formatting**: Use Prettier (runs automatically on commit)
- **Linting**: ESLint rules must pass (runs automatically on commit)
- **Naming Conventions**: See our [Coding Standards Guide](https://sonicjs.com/coding-standards) for detailed naming conventions and code style guidelines

### Running Lint

```bash
# Lint the core package
npm run lint --workspace=@sonicjs-cms/core

# Auto-fix lint issues
npm run lint:fix --workspace=@sonicjs-cms/core
```

## Pull Request Checklist

Before submitting a PR:

- [ ] All tests pass (`npm test`)
- [ ] Linting passes (`npm run lint --workspace=@sonicjs-cms/core`)
- [ ] Changes are documented if needed
- [ ] PR description explains the changes
- [ ] Related issue is referenced

## Questions?

- Check [existing issues](https://github.com/lane711/sonicjs/issues) - your question may already be answered
- Ask in [GitHub Discussions](https://github.com/lane711/sonicjs/discussions) - for general questions
- Join our [Discord](https://discord.gg/8bMy6bv3sZ) - for real-time chat

We look forward to your contributions!
