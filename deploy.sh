#!/bin/bash
set -e

BRANCH="gh-pages"
WORKTREE_DIR=".gh-pages-worktree"

# Get the main git directory (works from worktrees too)
MAIN_GIT_DIR=$(git rev-parse --git-common-dir)
MAIN_REPO_DIR=$(dirname "$MAIN_GIT_DIR")

# Ensure we have an initial commit on main
if ! git rev-parse HEAD &>/dev/null; then
  echo "Creating initial commit on main..."
  git add -A
  git commit -m "Initial commit"
fi

# Set version to build timestamp
VERSION_FILE="public/version.json"
BUILD_TIME=$(date '+%Y%m%d%H%M%S')
echo "{\"version\": \"$BUILD_TIME\"}" > $VERSION_FILE
echo "Version: $BUILD_TIME"

# Build the project
echo "Building..."
bun run build

# Create orphan gh-pages branch if it doesn't exist
if ! git show-ref --verify --quiet refs/heads/$BRANCH; then
  echo "Creating orphan $BRANCH branch..."
  git checkout --orphan $BRANCH
  git reset --hard
  git commit --allow-empty -m "Initial gh-pages commit"
  git checkout main
fi

# Use the main repo's gh-pages worktree location
GH_PAGES_WORKTREE="$MAIN_REPO_DIR/$WORKTREE_DIR"

# Set up worktree if not already present (in main repo)
if [ ! -d "$GH_PAGES_WORKTREE" ]; then
  echo "Setting up worktree at $GH_PAGES_WORKTREE..."
  git worktree add "$GH_PAGES_WORKTREE" $BRANCH
fi

# Clean worktree and copy build output
echo "Copying build to $GH_PAGES_WORKTREE..."
rm -rf "$GH_PAGES_WORKTREE"/*
cp -r dist/* "$GH_PAGES_WORKTREE"/

# Commit and push
cd "$GH_PAGES_WORKTREE"
git add -A
if git diff --cached --quiet; then
  echo "No changes to deploy."
else
  git commit -m "Deploy $(date '+%Y-%m-%d %H:%M:%S')"
  git push origin $BRANCH
  echo "Deployed! 🚀"
fi
