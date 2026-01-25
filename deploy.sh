#!/bin/bash
set -e

BRANCH="gh-pages"
WORKTREE_DIR=".gh-pages-worktree"

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

# Set up worktree if not already present
if [ ! -d "$WORKTREE_DIR" ]; then
  echo "Setting up worktree..."
  git worktree add $WORKTREE_DIR $BRANCH
fi

# Clean worktree and copy build output
echo "Copying build to worktree..."
rm -rf $WORKTREE_DIR/*
cp -r dist/* $WORKTREE_DIR/

# Commit and push
cd $WORKTREE_DIR
git add -A
if git diff --cached --quiet; then
  echo "No changes to deploy."
else
  git commit -m "Deploy $(date '+%Y-%m-%d %H:%M:%S')"
  git push origin $BRANCH
  echo "Deployed! 🚀"
fi
