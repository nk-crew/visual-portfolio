# Test Plan: LFI Path Traversal Vulnerability

This document describes the tests to be written **before** the fix (TDD approach). Tests should **fail** initially, then **pass** after the fix is applied.

---

## 1. PHPUnit Tests

### File: `tests/phpunit/unit/test-class-security-lfi.php`

#### Test 1.1: `test_sanitize_attributes_rejects_path_traversal_in_icons_selector`

**Purpose:** Verify that `sanitize_attributes()` rejects `../` sequences in `icons_selector` type controls.

**Setup:**

-   Register an `icons_selector` control with known valid options (e.g., `fade`, `fly`, `emerge`).
-   Call `Visual_Portfolio_Security::sanitize_attributes()` with `items_style` set to `../../wp-includes`.

**Assertion:**

-   The sanitized value should NOT contain `../`.
-   The sanitized value should be reset to the default value (`fade`).

```php
public function test_sanitize_attributes_rejects_path_traversal_in_icons_selector() {
    $input = array( 'items_style' => '../../../../../../wp-includes' );
    $result = Visual_Portfolio_Security::sanitize_attributes( $input );

    $this->assertStringNotContainsString( '..', $result['items_style'] );
}
```

#### Test 1.2: `test_sanitize_attributes_allows_valid_icons_selector_values`

**Purpose:** Verify that valid known values pass sanitization unchanged.

**Setup:**

-   Register valid options.
-   Call `sanitize_attributes()` with valid `items_style` values (`fade`, `fly`, `emerge`, `default`).

**Assertion:**

-   Each valid value should remain unchanged after sanitization.

```php
public function test_sanitize_attributes_allows_valid_icons_selector_values() {
    $valid_values = array( 'fade', 'default' );
    foreach ( $valid_values as $value ) {
        $input  = array( 'items_style' => $value );
        $result = Visual_Portfolio_Security::sanitize_attributes( $input );
        $this->assertEquals( $value, $result['items_style'] );
    }
}
```

#### Test 1.3: `test_sanitize_attributes_rejects_dot_dot_slash_in_filter`

**Purpose:** Same check for the `filter` option.

```php
public function test_sanitize_attributes_rejects_path_traversal_in_filter() {
    $input = array( 'filter' => '../../../etc' );
    $result = Visual_Portfolio_Security::sanitize_attributes( $input );

    $this->assertStringNotContainsString( '..', $result['filter'] );
}
```

#### Test 1.4: `test_sanitize_attributes_rejects_dot_dot_slash_in_sort`

**Purpose:** Same check for the `sort` option.

#### Test 1.5: `test_sanitize_attributes_rejects_dot_dot_slash_in_pagination_style`

**Purpose:** Same check for the `pagination_style` option.

### File: `tests/phpunit/unit/test-class-templates-lfi.php`

#### Test 1.6: `test_include_template_rejects_path_traversal`

**Purpose:** Verify that `include_template()` does not include files when the template name contains `../`.

**Setup:**

-   Call `Visual_Portfolio_Templates::include_template()` with a path traversal template name like `../../wp-includes/version`.
-   Capture output buffering.

**Assertion:**

-   No output should be produced (the template should NOT be included).
-   No fatal error should occur.

```php
public function test_include_template_rejects_path_traversal() {
    ob_start();
    Visual_Portfolio_Templates::include_template( '../../wp-includes/version' );
    $output = ob_get_clean();

    $this->assertEmpty( $output );
}
```

#### Test 1.7: `test_include_template_allows_valid_template_names`

**Purpose:** Verify that valid template names still work.

**Setup:**

-   Call `include_template()` with a valid template name like `items-list/items-style/image`.

**Assertion:**

-   The template should be included (output buffer should not be empty, or no error should occur).

```php
public function test_include_template_allows_valid_template_names() {
    // Valid template name should not be rejected by validation.
    $template_name = 'items-list/items-style/image';
    $result = validate_file( $template_name );
    $this->assertEquals( 0, $result );
}
```

#### Test 1.8: `test_include_template_rejects_various_traversal_patterns`

**Purpose:** Test multiple attack patterns.

**Test data:**

```
../../../etc/passwd
items-list/../../wp-config
..\..\..\wp-includes\version
items-list/items-style/../../../../wp-includes/meta
../wp-content/debug.log
```

**Assertion:**

-   All patterns should be rejected (no file inclusion).

#### Test 1.9: `test_find_template_styles_rejects_path_traversal`

**Purpose:** Verify that `find_template_styles()` also rejects traversal.

---

## 2. E2E Playwright Tests

### File: `tests/e2e/specs/security-lfi-path-traversal.spec.js`

#### Test 2.1: `preview frame rejects path traversal in items_style`

**Purpose:** Full integration test simulating the actual attack vector.

**Steps:**

1. Log in as a Contributor user.
2. Get a valid nonce via the WordPress REST API or admin page.
3. Send a POST request to `/?vp_preview=vp_preview&vp_preview_nonce=<nonce>` with:
    - `vp_preview_frame=true`
    - `vp_items_style=../../../../../../wp-includes`
4. Assert the response does NOT contain a 500 error.
5. Assert the response does NOT contain WordPress "critical error" content.

```javascript
test( 'preview frame rejects path traversal in items_style', async ( {
	page,
	request,
} ) => {
	// 1. Get nonce from admin page.
	await page.goto( '/wp-admin/' );
	const nonce = await page.evaluate(
		() => window.VPAdminVariables?.nonce || ''
	);

	// 2. Send malicious request.
	const response = await request.post(
		`/?vp_preview=vp_preview&vp_preview_nonce=${ nonce }`,
		{
			form: {
				vp_preview_frame: 'true',
				vp_items_style: '../../../../../../wp-includes',
			},
		}
	);

	// 3. Verify no 500 error (LFI should not trigger).
	expect( response.status() ).not.toBe( 500 );

	const body = await response.text();
	expect( body ).not.toContain( 'critical error' );
	expect( body ).not.toContain( 'Fatal error' );
} );
```

#### Test 2.2: `preview frame rejects path traversal in filter`

Same as 2.1 but with `vp_filter=../../../etc`.

#### Test 2.3: `preview frame rejects path traversal in sort`

Same as 2.1 but with `vp_sort=../../../etc`.

#### Test 2.4: `preview frame rejects path traversal in pagination_style`

Same as 2.1 but with `vp_pagination_style=../../../etc`.

#### Test 2.5: `preview frame works with valid items_style values`

**Purpose:** Regression test to ensure valid values still work.

**Steps:**

1. Log in as admin.
2. Send a preview request with `vp_items_style=fade`.
3. Assert the response is 200 OK and contains expected preview HTML.

#### Test 2.6: `preview frame rejects encoded path traversal`

**Purpose:** Test that URL-encoded traversal sequences are also rejected.

**Test data:**

-   `%2e%2e%2f` (URL-encoded `../`)
-   `..%2f` (mixed encoding)

---

## 3. Test Execution Order (TDD)

### Phase A — Write Tests (RED)

1. Create `tests/phpunit/unit/test-class-security-lfi.php` with tests 1.1–1.5
2. Create `tests/phpunit/unit/test-class-templates-lfi.php` with tests 1.6–1.9
3. Create `tests/e2e/specs/security-lfi-path-traversal.spec.js` with tests 2.1–2.6
4. Run tests — confirm they **fail** (vulnerability exists)

### Phase B — Implement Fix (GREEN)

1. Apply Layer 1 fix: `class-templates.php` — `validate_file()` guard
2. Apply Layer 2 fix: `class-security.php` — `icons_selector` allowlist validation
3. Apply Layer 3 fix: `class-templates.php` — `realpath()` inclusion guard
4. Run tests — confirm they all **pass**

### Phase C — Verify & Refactor

1. Run full PHPUnit suite: `npm run test:unit:php`
2. Run full E2E suite: `npm run test:e2e`
3. Run linters: `npm run lint:php && composer run-script lint`
4. Manual verification with reproduction steps from the vulnerability report

---

## 4. Test Coverage Matrix

| Attack Vector                 | PHPUnit     | E2E    | Layer Covered |
| ----------------------------- | ----------- | ------ | ------------- |
| `../` in `items_style`        | ✅ 1.1      | ✅ 2.1 | Layer 1 + 2   |
| `../` in `filter`             | ✅ 1.3      | ✅ 2.2 | Layer 1 + 2   |
| `../` in `sort`               | ✅ 1.4      | ✅ 2.3 | Layer 1 + 2   |
| `../` in `pagination_style`   | ✅ 1.5      | ✅ 2.4 | Layer 1 + 2   |
| Various traversal patterns    | ✅ 1.8      | ✅ 2.6 | Layer 1 + 3   |
| Template loader rejects `../` | ✅ 1.6      | —      | Layer 1       |
| Valid values still work       | ✅ 1.2, 1.7 | ✅ 2.5 | Regression    |
