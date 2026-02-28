# Contributing to Project Nomad

## Branch Structure

Project Nomad uses a three-tier release pipeline:

```
feature branches → dev (unstable) → main (stable) → lts
```

| Branch | Purpose | Releases |
|--------|---------|----------|
| `dev` | Active development. All feature branches merge here. | Unstable pre-releases (automatic) |
| `main` | Stable releases. Only `dev` can merge here. | Stable releases (automatic) |
| `lts` | Long-term support. Only `main` can merge here. | LTS patch releases (automatic) |

## How to Contribute

### 1. Open an Issue First

**Features require an issue.** Before starting work on a new feature, open a feature request issue. This is how the automation knows what kind of version bump to apply.

Bug fixes can be submitted without a pre-existing issue, but referencing one is still recommended.

| Issue Type | Label Applied | Version Effect |
|------------|---------------|----------------|
| Bug report | `bug` | Patch bump |
| Feature request | `feature` | Minor bump |
| Simple task | `task` | Patch bump |

### 2. Create a Branch from `dev`

```bash
git checkout dev
git pull origin dev
git checkout -b your-branch-name
```

Name your branch anything descriptive: `fix-map-zoom`, `feature-kml-export`, `issue-42`, etc.

### 3. Make Your Changes and Commit

Reference the issue number in your commit messages:

```bash
git commit -m "fix: correct timezone offset in weather display (#47)"
git commit -m "feat: add KML export to model results (#88)"
```

Commit message prefixes are optional but encouraged:

| Prefix | Use for |
|--------|---------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `docs:` | Documentation only |
| `chore:` | Maintenance, tooling |

### 4. Open a Pull Request to `dev`

Push your branch and open a PR targeting `dev`:

```bash
git push origin your-branch-name
```

Then create a PR on GitHub targeting the `dev` branch.

### 5. What Happens After Merge

When your PR is merged into `dev`, an **unstable pre-release** is automatically built and published to GitHub Releases. These are tagged like `v0.3.0-dev.47` and marked as pre-releases.

## How Releases Work

### Unstable (dev)

Every merge to `dev` triggers an automatic pre-release build. No version bump occurs in `package.json` — the artifact is tagged with a build number (`v0.3.0-dev.47`). These builds are for testing and are not intended for production.

### Stable (main)

When the maintainer is ready to cut a stable release, they open a PR from `dev` to `main`. On merge, the CI automation:

1. Scans all commits in the PR for issue references (`#NNN`)
2. Checks the labels on each referenced issue via the GitHub API
3. Determines the version bump:
   - Any issue labeled `feature` or `enhancement` → **minor** bump
   - Only `bug`/`task` labels or no issue references → **patch** bump
   - PR labeled `release:major` → **major** bump (manual override)
4. Bumps the version in `frontend/package.json`
5. Creates a git tag and GitHub Release with the built tarball

### LTS (lts)

When a stable release is designated for long-term support, the maintainer merges `main` into `lts`. This always applies a **patch** bump and creates an LTS-tagged release.

## Branch Rules

These rules are enforced by CI:

- **PRs to `main`** must come from `dev` — no other branch is accepted
- **PRs to `lts`** must come from `main` — no other branch is accepted
- **PRs to `dev`** can come from any feature branch

## Summary

1. Open an issue (required for features, recommended for bugs)
2. Branch from `dev`
3. Reference issues in commits (`#NNN`)
4. PR to `dev`
5. Automation handles versioning and releases from there
