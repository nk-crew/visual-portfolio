---
paths:
  - "classes/**/*.php"
  - "templates/**/*.php"
  - "*.php"
---

# PHP conventions

- One class per file, named `class-<slug>.php`, class prefixed `Visual_Portfolio_`.
- Every file starts with a docblock carrying `@package visual-portfolio/<area>` and an
  `if ( ! defined( 'ABSPATH' ) ) { exit; }` guard.
- Hooks are registered from the constructor, grouped with a short lowercase comment.
- Public filters and actions are prefixed `vpf_`. Renaming or removing one is a breaking
  change — deprecate through `classes/class-deprecated.php` instead.

## Security baseline

- Escape on output (`esc_html`, `esc_attr`, `esc_url`, `wp_kses_post`), sanitize on input.
- AJAX and REST handlers verify a nonce **and** a capability. Never rely on the nonce alone.
- Build SQL with `$wpdb->prepare`. Never interpolate request data into a query.

## Before you finish

Run `npm run lint:php`. WPCS runs against PHP 7.2+ compatibility, so avoid syntax newer
than that in shipped code.
