<h1 align="center">
  <a href="https://www.visualportfolio.com/">
    <img src="https://www.visualportfolio.com/wp-content/uploads/2022/02/logo.svg" height="40" alt="Visual Portfolio - WordPress Gallery Plugin">
  </a>
</h1>

<p align="center">
  <a href="https://wordpress.org/plugins/visual-portfolio/"><img alt="WordPress Plugin Version" src="https://img.shields.io/wordpress/plugin/v/visual-portfolio"></a>
  <a href="https://wordpress.org/plugins/visual-portfolio/"><img alt="WordPress Plugin Rating" src="https://img.shields.io/wordpress/plugin/rating/visual-portfolio"></a>
  <a href="https://wordpress.org/plugins/visual-portfolio/"><img alt="WordPress Plugin Downloads" src="https://img.shields.io/wordpress/plugin/dt/visual-portfolio"></a>
  <a href="https://github.com/nk-crew/visual-portfolio/blob/master/LICENSE"><img alt="License" src="https://img.shields.io/github/license/nk-crew/visual-portfolio"></a>
</p>

<p align="center">Modern gallery and portfolio plugin with advanced layouts editor for WordPress.</p>

<p align="center">
  <a href="https://www.visualportfolio.com/">Website</a> &nbsp; <a href="https://www.visualportfolio.com/docs/getting-started/">Documentation</a> &nbsp; <a href="https://wordpress.org/plugins/visual-portfolio/">WordPress Plugin</a> &nbsp; <a href="https://www.visualportfolio.com/pricing/">Pro Version</a>
</p>

## Overview

Visual Portfolio provides powerful tools to showcase your works and photo galleries. Key features:

- 🎨 Visual Gallery Builder
- ⚡ Optimized Performance
- 📱 Responsive Layouts
- 🖼️ Modern Lightbox
- 🎯 SEO Friendly
- 🔄 AJAX Loading

## Development

### Prerequisites

- PHP >= 7.2
- Node.js >= 22.0
- Composer >= 2.0
- Docker (for the local WordPress environment)

### Getting Started

Clone the repository, then run:

```bash
./scripts/worktree-setup.sh
```

That installs dependencies and starts a local WordPress environment. The same script
prepares a fresh `git worktree`.

### Development Commands

```bash
# Start development
npm run dev

# Build for production
npm run build

# Create plugin zip
npm run build:prod
```

### Code Quality

We use automated tools to ensure code quality. Pre-commit and pre-push hooks are configured for:
- PHP CodeSniffer
- ESLint
- Stylelint

```bash
# Linting
npm run lint:php    # Check PHP code
npm run lint:js     # Check JavaScript code
npm run lint:css    # Check CSS code

# Auto-fixing
npm run format:php  # Fix PHP code
npm run format:js   # Fix JavaScript code
npm run format:css  # Fix CSS code
```

### Local WordPress

We use WordPress's official testing environment powered by Docker and wp-env.

```bash
npm run env:start    # Start the development and tests sites
npm run env:ports    # Print their URLs
npm run env:stop     # Stop them
npm run play         # Boot the plugin in WordPress Playground, no Docker needed
```

Every checkout gets its own containers and database. Linked worktrees also get their own
ports, so several branches can run at the same time; the main checkout keeps the usual
8888 and 8889.

### Testing

```bash
# End-to-end tests (Playwright)
npm run test:e2e

# PHP Unit tests
npm run test:unit:php
```

### Reference

- [Gallery Loop blocks](docs/gallery-loop-blocks.md) — the block-native gallery:
  anatomy, block context, hooks, content sources, bindings, Interactivity stores,
  and how its URLs behave behind a page cache.

## License

This project is licensed under the GPL-2.0-or-later License - see the [LICENSE](LICENSE.txt) file for details.
