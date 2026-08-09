#!/usr/bin/env bash
#
# Prepares a fresh checkout — normally a `git worktree` — for development.
#
# A linked worktree starts with no node_modules, no composer vendor directory and,
# in repositories that have them, no submodule contents. This installs all of it and
# brings up an isolated WordPress environment on ports that do not clash with any
# other checkout.
#
# Usage:  ./scripts/worktree-setup.sh [--no-env]

set -euo pipefail

cd "$(dirname "$0")/.."

START_ENV=1
for arg in "$@"; do
	case "$arg" in
		--no-env) START_ENV=0 ;;
		*)
			echo "Unknown option: $arg" >&2
			echo "Usage: $0 [--no-env]" >&2
			exit 1
			;;
	esac
done

step() {
	printf '\n\033[1m==> %s\033[0m\n' "$1"
}

if [ -f .gitmodules ]; then
	step 'Initialising submodules'
	git submodule update --init --recursive
fi

step 'Installing npm dependencies'
if [ -f package-lock.json ]; then
	npm ci
else
	npm install
fi

# `postinstall` already runs composer, but not every checkout gets there cleanly.
if [ ! -d vendor ]; then
	step 'Installing composer dependencies'
	composer install --no-interaction
fi

if [ "$START_ENV" -eq 1 ]; then
	step 'Starting WordPress'
	npm run env:start

	step 'Ready'
	npm run env:ports
else
	step 'Ready (environment not started)'
	echo 'Run "npm run env:start" when you need WordPress.'
fi
