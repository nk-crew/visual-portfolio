# Security Fix Plan: Local File Inclusion via Path Traversal (CVE CVSS 7.5)

## 1. Vulnerability Summary

| Field                 | Value                                                             |
| --------------------- | ----------------------------------------------------------------- |
| **Severity**          | CVSS 7.5 (High)                                                   |
| **Type**              | Local File Inclusion (LFI) via Path Traversal                     |
| **Affected versions** | <= 3.5.1                                                          |
| **Authentication**    | Authenticated (Contributor+)                                      |
| **Affected endpoint** | Preview frame: `/?vp_preview=vp_preview&vp_preview_nonce=<nonce>` |

An authenticated user (Contributor role or above) can inject `../` sequences into the `vp_items_style` POST parameter to traverse out of the plugin templates directory and force inclusion of arbitrary local PHP files. This leads to DoS (fatal errors) and can potentially be chained with writable PHP files to achieve Remote Code Execution.

---

## 2. Root Cause Analysis (Source → Check → Sink)

### 2.1 Source: User-Controlled Options

**File:** [classes/class-preview.php](../classes/class-preview.php) (lines ~277–295)

```php
// Copies all POST keys prefixed with vp_ into $options without validation.
$options = array();
if ( isset( $_POST ) && ! empty( $_POST ) ) {
    foreach ( $_POST as $name => $val ) {
        if ( strpos( $name, 'vp_' ) === 0 ) {
            $options[ preg_replace( '/^vp_/', '', $name ) ] = $val;
        }
    }
}
$options = Visual_Portfolio_Security::sanitize_attributes( $options );
```

All POST keys prefixed with `vp_` are blindly collected into `$options`. The data is then passed to `sanitize_attributes()`, but the sanitization is insufficient (see 2.2).

### 2.2 Insufficient Sanitization

**File:** [classes/class-security.php](../classes/class-security.php) (lines ~470–482)

```php
case 'icons_selector':
case 'text':
case 'radio':
case 'align':
case 'buttons':
    $attributes[ $key ] = sanitize_text_field( wp_unslash( $attribute ) );
    break;
```

The `items_style` control is registered as type `icons_selector`. The sanitization for this type is `sanitize_text_field()`, which:

-   ✅ Strips HTML tags
-   ✅ Removes extra whitespace
-   ❌ **Does NOT strip path traversal sequences** (`../`, `..\\`)
-   ❌ **Does NOT validate against an allowlist** of known option values

Note: The `select` type uses `sanitize_selector()` which validates against allowed options, but `icons_selector` doesn't use this validation.

### 2.3 Sink: Unvalidated Template Path Construction

**File:** [classes/class-get-portfolio.php](../classes/class-get-portfolio.php) (lines ~2383–2388)

```php
$items_style_pref = '';
if ( 'default' !== $args['vp_opts']['items_style'] ) {
    $items_style_pref = '/' . $args['vp_opts']['items_style'];
}
visual_portfolio()->include_template( 'items-list/items-style' . $items_style_pref . '/image', $args );
visual_portfolio()->include_template( 'items-list/items-style' . $items_style_pref . '/meta', $args );
```

### 2.4 Sink: No Path Validation in Template Loader

**File:** [classes/class-templates.php](../classes/class-templates.php) (lines ~27–45)

```php
// Default template path — NO validate_file() / realpath() check.
if ( ! $template ) {
    $template = visual_portfolio()->plugin_path . 'templates/' . $template_name . '.php';
}

if ( file_exists( $template ) ) {
    include $template;
}
```

The template loader performs `include $template;` without any path normalization (`realpath()`) or WordPress validation (`validate_file()`).

---

## 3. Scope of Impact — All Affected Options

The same vulnerability pattern affects **all `icons_selector`-type controls** that are used in template path construction:

| Option             | Control Type     | Template Path Pattern                  | File/Line                    |
| ------------------ | ---------------- | -------------------------------------- | ---------------------------- |
| `items_style`      | `icons_selector` | `items-list/items-style/{value}/image` | class-get-portfolio.php:2387 |
| `items_style`      | `icons_selector` | `items-list/items-style/{value}/meta`  | class-get-portfolio.php:2388 |
| `filter`           | `icons_selector` | `items-list/filter/{value}/filter`     | class-get-portfolio.php:1919 |
| `sort`             | `icons_selector` | `items-list/sort/{value}/sort`         | class-get-portfolio.php:2217 |
| `pagination_style` | `icons_selector` | `items-list/pagination/{value}/...`    | class-get-portfolio.php:2646 |

Additionally, the `pagination` option value is also used in template path: `class-get-portfolio.php:2646`.

---

## 4. Fix Plan (Defense-in-Depth, 3 Layers)

### Layer 1: Template Loader Hardening (class-templates.php) — PRIMARY FIX

Add path traversal validation in `include_template()` before including any file. This is the strongest defense because it protects **all** template inclusions regardless of how the template name is constructed.

**Changes in `include_template()` method:**

```php
public static function include_template( $template_name, $args = array() ) {
    // NEW: Reject template names containing path traversal sequences.
    if ( validate_file( $template_name ) !== 0 ) {
        return;
    }

    // ... existing code ...
}
```

WordPress's `validate_file()` returns:

-   `0` — valid file path
-   `1` — contains `../` (directory traversal)
-   `2` — contains `:` (Windows drive paths)
-   `3` — starts with `./`

Similarly, add validation to `find_template_styles()`.

### Layer 2: Sanitize `icons_selector` with Allowlist Validation (class-security.php)

Change `icons_selector` sanitization from plain `sanitize_text_field()` to use `sanitize_selector()` which validates against the registered allowed options. This is the same validation already used for `select` type controls.

**Changes in `sanitize_attributes()` method:**

```php
case 'icons_selector':
    // Validate against allowed options (same as 'select' type).
    $attributes[ $key ] = self::sanitize_selector( $attributes[ $key ], $controls[ $key ] );
    break;
```

This makes sure only registered, known values (e.g., `fade`, `fly`, `emerge`) pass through.

### Layer 3: Template Path Normalization (class-templates.php) — ADDITIONAL HARDENING

After constructing the full template path, verify it resolves to an expected directory using `realpath()`:

```php
if ( file_exists( $template ) ) {
    $real_path = realpath( $template );
    $allowed_dirs = array(
        realpath( visual_portfolio()->plugin_path . 'templates/' ),
        realpath( get_stylesheet_directory() . '/visual-portfolio/' ),
        realpath( get_template_directory() . '/visual-portfolio/' ),
    );

    if ( visual_portfolio()->pro_plugin_path ) {
        $allowed_dirs[] = realpath( visual_portfolio()->pro_plugin_path . 'templates/' );
    }

    $allowed_dirs = array_filter( $allowed_dirs );

    $is_allowed = false;
    foreach( $allowed_dirs as $dir ) {
        if ( strpos( $real_path, $dir ) === 0 ) {
            $is_allowed = true;
            break;
        }
    }

    if ( $is_allowed ) {
        include $template;
    }
}
```

---

## 5. Implementation Order (TDD)

Follow Test-Driven Development approach:

1. **Write PHPUnit tests** for the vulnerability (these tests should FAIL initially)
2. **Write E2E Playwright tests** for the vulnerability (these tests should FAIL initially)
3. **Implement Layer 1**: Template loader path validation (`class-templates.php`)
4. **Implement Layer 2**: `icons_selector` allowlist sanitization (`class-security.php`)
5. **Implement Layer 3**: `realpath()` validation in template loader
6. **Re-run all tests** — they should now PASS
7. **Run existing test suite** to ensure no regression

---

## 6. Files to Modify

| File                          | Change                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------ |
| `classes/class-templates.php` | Add `validate_file()` check + `realpath()` inclusion guard                     |
| `classes/class-security.php`  | Change `icons_selector` case to use `sanitize_selector()` allowlist validation |

---

## 7. Reproduction Steps (for manual verification)

1. Activate the plugin
2. Log in as a Contributor user
3. Open `/wp-admin/profile.php` and extract `VPAdminVariables.nonce`
4. Send a POST request:

    ```
    POST /?vp_preview=vp_preview&vp_preview_nonce=<nonce>
    Content-Type: application/x-www-form-urlencoded

    vp_preview_frame=true&vp_items_style=../../../../../../wp-includes
    ```

5. **Before fix:** HTTP 500 with WordPress critical error (LFI triggered)
6. **After fix:** The traversal value is rejected; no file inclusion occurs

---

## 8. Verification Checklist

-   [ ] `validate_file()` rejects `../` in template names
-   [ ] `icons_selector` values are validated against registered options
-   [ ] `realpath()` guard prevents inclusion of files outside template directories
-   [ ] Existing items styles (`default`, `fade`, `fly`, `emerge`) still work correctly
-   [ ] Filter, sort, and pagination template loading work correctly
-   [ ] Preview frame renders correctly with valid options
-   [ ] PHPUnit tests pass
-   [ ] E2E tests pass
-   [ ] `npm run lint:php` passes
-   [ ] `composer run-script lint` passes
