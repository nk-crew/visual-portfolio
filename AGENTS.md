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
- Do not run packaging/release commands (`build:prod`, zip) unless the user asks—confirm `package.json` script names before running.

## Commands

All scripts live in `package.json` (`npm run dev`, `npm run build`, linters, `wp-env`, tests). Prefer reading `package.json` over guessing names.
