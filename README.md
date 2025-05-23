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
- Node.js >= 18.0
- Composer >= 2.0

### Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

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

### Testing

We use WordPress's official testing environment powered by Docker and wp-env.

1. [Install Docker](https://www.docker.com/) on your machine
2. Start the server:
   ```bash
   npm run env:start
   ```
3. Run tests:
   ```bash
   # End-to-end tests (Playwright)
   npm run test:e2e

   # PHP Unit tests
   npm run test:unit:php
   ```

## License

This project is licensed under the GPL-2.0-or-later License - see the [LICENSE](LICENSE.txt) file for details.
