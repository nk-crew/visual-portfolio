---
paths:
  - "tests/e2e/**/*.{js,ts}"
---

# End-to-end tests

- Specs are Playwright + `@wordpress/e2e-test-utils-playwright`, one `*.spec.js` per
  behaviour, in `tests/e2e/specs/`.
- Reuse the helpers in `tests/e2e/utils/` rather than re-implementing setup. In
  particular use `getPluginSlug()` instead of hardcoding the plugin name.
- Shared reset work belongs in `tests/e2e/config/global-setup.js`, not in every spec.
- Never hardcode `http://localhost:8889`. The base URL comes from the Playwright config,
  which derives the port for the current checkout.
- Tag specs that only apply to one engine with `@webkit` / `@firefox`; the default
  project is chromium.

Run a single spec with:

```bash
npm run test:e2e -- tests/e2e/specs/<name>.spec.js
```
