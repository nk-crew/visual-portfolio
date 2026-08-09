# AGENTS

Short context for coding agents. **Avoid duplicating full docs here.**

## Product

WordPress plugin: portfolio / gallery layouts and Gutenberg integration. PHP backend + React editor assets.

## Stack

- PHP (project minimum in `composer.json` / readme), WPCS
- JS/React (Gutenberg), SCSS, `@wordpress/scripts`
- Sources: `assets/`, `gutenberg/`, `classes/`; compiled assets in `build/`

## Rules

- Minimal diffs; follow existing file layout and prefixes (`Visual_Portfolio_*`).
- WordPress: sanitize/escape; AJAX with nonces; capability checks.
- `build/` is generated — edit sources, never the bundles.
- Do not run packaging/release commands (`build:prod`, `zip`, `bump:*`) unless the user asks.

## Commands

| Task | Command |
|------|---------|
| Watch build | `npm run dev` |
| One-off build | `npm run build` |
| Lint JS + CSS | `npm run lint` |
| Lint PHP | `npm run lint:php` |
| PHP unit tests | `npm run test:unit:php` |
| E2E tests | `npm run test:e2e` |
| Start local WordPress | `npm run env:start` |

Anything else lives in `package.json` — use those exact names, do not invent scripts.

## Local environment

`wp-env` (Docker) is the environment tests run against. `npm run env:start` brings up a
development site and a tests site; `npm run env:ports` prints their URLs.

The plugin is mounted via `mappings` in `.wp-env.json`, so it always lands in
`wp-content/plugins/visual-portfolio` regardless of the directory the repository is
checked out into. Keep it that way — scripts and E2E specs depend on that path.

For a quick look without Docker, `npm run play` boots the plugin in WordPress
Playground (WebAssembly, ~10s). It uses SQLite and cannot run the PHP unit suite.

## Worktrees

Parallel work happens in `git worktree` checkouts. Run `./scripts/worktree-setup.sh`
once in a fresh worktree; it installs dependencies and starts an isolated environment.

`wp-env` already gives every checkout its own containers and database. Ports are the
only thing that would collide, so linked worktrees automatically get their own pair
(the main checkout keeps 8888/8889). Never hardcode a port — read it from
`scripts/env-ports.js` or `npm run env:ports`.
