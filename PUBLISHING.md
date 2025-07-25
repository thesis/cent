# Publishing Guide for @thesis-co/cent

## Overview

This package uses an automated publishing process through GitHub Actions with the following workflows:

## Quick Start

### 1. Set up NPM Token
Add `NPM_TOKEN` to your GitHub repository secrets:
1. Go to GitHub repository → Settings → Secrets and variables → Actions
2. Add new repository secret named `NPM_TOKEN`
3. Value should be your NPM access token with publish permissions for @thesis-co scope

### 2. Publishing Process

#### Option A: Manual Version Bump (Recommended)
1. Go to Actions tab → "Version Bump" workflow → "Run workflow"
2. Select version bump type (patch/minor/major)
3. Review and merge the created PR
4. Create a GitHub release with the new version tag
5. Package publishes automatically when release is created

#### Option B: Manual Release
1. Manually bump version in `package.json`
2. Create PR and merge
3. Create GitHub release with matching tag
4. Package publishes automatically

## 🔄 Workflows

### CI Workflow (`.github/workflows/ci.yml`)
- **Trigger**: Push to main, PRs to main
- **Actions**: Lint, test, build
- **Purpose**: Ensure code quality on all changes

### Publish Workflow (`.github/workflows/publish.yml`)
- **Trigger**: GitHub release published
- **Actions**: Full CI pipeline + NPM publish
- **Features**:
  - NPM provenance for security
  - Public access for scoped package

### Version Bump Workflow (`.github/workflows/version-bump.yml`)
- **Trigger**: Manual workflow dispatch
- **Actions**: Creates PR with version bump
- **Options**: patch, minor, major semver increments

## 📋 Review Process

### Branch Protection (Recommended Settings)
Configure these branch protection rules for `main`:

1. **Require pull request reviews before merging**
   - Required approving reviews: 1
   - Dismiss stale reviews when new commits are pushed

2. **Require status checks to pass before merging**
   - Require branches to be up to date before merging
   - Required status checks: `lint-and-test`

3. **Restrict pushes that create files**
   - Restrict pushes to admins only

### PR Review Checklist
- [ ] CI passes (lint, test, build)
- [ ] Code follows project conventions
- [ ] Tests added/updated for new functionality
- [ ] Breaking changes documented
- [ ] Version bump is appropriate for changes

## 🏷️ Versioning Strategy

Follow [Semantic Versioning](https://semver.org/):

- **PATCH** (0.0.X): Bug fixes, documentation updates
- **MINOR** (0.X.0): New features, backwards compatible
- **MAJOR** (X.0.0): Breaking changes

## 📦 Package Configuration

Key `package.json` fields for publishing:
- `"files": ["dist"]` - Only publish built files
- `"prepublishOnly"` - Runs full CI before publishing
- `"publishConfig": {"access": "public"}` - Required for scoped packages

## 🛠️ Development Workflow

1. Create feature branch from `main`
2. Make changes, add tests
3. Create PR to `main`
4. Code review and CI checks
5. Merge PR
6. Use version bump workflow when ready to publish
7. Create GitHub release to trigger publish

## 🔍 Troubleshooting

### Publishing fails
- Check NPM_TOKEN is valid and has correct permissions
- Ensure version in package.json doesn't already exist on NPM
- Verify CI passes completely

### Version bump workflow fails
- Check GitHub Actions has write permissions to repository
- Ensure no conflicting branches exist

### CI fails
- Run `pnpm run lint`, `pnpm run test`, `pnpm run build` locally
- Fix any issues and push changes
