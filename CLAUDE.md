# Visual Portfolio - WordPress Gallery Plugin

🚨 **CRITICAL INSTRUCTIONS FOR AI LANGUAGE MODELS** 🚨

You are an expert developer in PHP, WordPress plugin development, JavaScript ES6+, React, SCSS, and WordPress Gutenberg blocks.

## ✅ SCRIPT EXECUTION RULES

**NEVER** run `npm run build:prod` - only when explicitly requested.  
**ALWAYS** run `npm run lint:php` and `composer run-script lint` after PHP changes.

## Essential Tech Stack

- **Backend**: PHP 7.2+, WordPress 6.2+, WordPress Coding Standards (WPCS)
- **Frontend**: JavaScript ES6+, React (Gutenberg), SCSS, Webpack
- **Architecture**: Single plugin system (WordPress.org free version)
- **Build**: @wordpress/scripts, npm for package management

## Critical Development Rules

### WordPress Security
```php
// ALWAYS sanitize input and escape output
$value = sanitize_text_field( $_POST['field'] );
echo esc_html( $user_data );

// ALWAYS verify nonces and capabilities
check_ajax_referer( 'vp-ajax-nonce', 'nonce' );
if ( ! current_user_can( 'manage_options' ) ) wp_die( 'Unauthorized' );
```

### Plugin Architecture
- **Core Integration**: Single plugin architecture with modular class system
- **Module Loading**: Individual classes in `/classes/` loaded via main plugin file
- **Namespace**: All classes prefixed with `Visual_Portfolio_`
- **Hooks**: Use WordPress action/filter system exclusively

### Key File Paths
- `class-visual-portfolio.php` - Main plugin bootstrap
- `classes/` - Core plugin classes (25+ classes)
- `assets/` - Source SCSS/JS files  
- `build/` - Compiled assets (webpack output)
- `templates/` - PHP template files for layouts and components
- `gutenberg/` - React components and Gutenberg blocks
- `languages/` - Translation files

## Development Commands

```bash
# Build
npm run dev          # Development with watcher
npm run build        # Development build

# Quality Checks  
npm run lint:php     # PHP CodeSniffer (WPCS)
npm run lint:js      # ESLint JavaScript
npm run lint:css     # Stylelint SCSS
npm run lint         # Lint JS & CSS together

# WordPress Environment
npm run env:start    # Start WordPress dev environment
npm run env:stop     # Stop WordPress dev environment

# Testing
npm run test         # Run all tests
npm run test:unit:php # PHP unit tests
npm run test:e2e     # Playwright E2E tests
```

## WordPress Patterns

```php
// Custom Post Type: Portfolio items stored as 'vp_lists'
$portfolio = get_post_meta( $post_id, 'vp_settings', true );

// AJAX Handlers
add_action( 'wp_ajax_vp_action', 'callback_function' );
function callback_function() {
    check_ajax_referer( 'vp-ajax-nonce', 'nonce' );
    wp_send_json_success( $data );
}

// Transient Caching
set_transient( 'cache_key', $data, HOUR_IN_SECONDS );

// Gutenberg Block Registration
register_block_type( 'visual-portfolio/block', array(
    'editor_script' => 'visual-portfolio-gutenberg',
    'render_callback' => array( $this, 'render_callback' ),
) );
```

## Key Features & Architecture

### Core Classes (`classes/`)
- **Main Plugin**: `class-visual-portfolio.php`
- **Assets Management**: `class-assets.php` - Enqueue scripts/styles
- **Custom Post Type**: `class-custom-post-type.php` - Portfolio post type
- **Gutenberg**: `class-gutenberg.php` - Block editor integration
- **Templates**: `class-templates.php` - Template loading system
- **REST API**: `class-rest.php` - API endpoints
- **Security**: `class-security.php` - Security measures

### Template System (`templates/`)
- **Layouts**: Grid, Masonry, Slider, Justified, Tiles
- **Item Styles**: Classic, Fade, Fly, Emerge
- **Components**: Filter, Sort, Pagination
- **Popups**: PhotoSwipe, Fancybox integration

### Gutenberg Integration (`gutenberg/`)
- **React Components**: 20+ reusable components
- **Block Editor**: Visual portfolio builder
- **Store**: Redux-like state management
- **Controls**: Custom form controls for settings

### Asset Management (`assets/`)
- **JavaScript**: Modular ES6+ files for each feature
- **SCSS**: Component-based styling with variables
- **Vendor**: Third-party library integrations
- **Admin**: Backend-specific assets

## Build Configuration

- **Webpack**: @wordpress/scripts configuration
- **SCSS Processing**: PostCSS with autoprefixer
- **JS Compilation**: Babel for ES6+ support
- **Asset Optimization**: Minification and source maps
- **RTL Support**: Automatic RTL CSS generation

## Testing & Quality

- **PHP Standards**: WordPress Coding Standards (WPCS)
- **JavaScript**: ESLint with WordPress configuration
- **CSS**: Stylelint for SCSS files
- **Unit Tests**: PHPUnit for PHP code
- **E2E Tests**: Playwright for browser testing
- **WordPress Environment**: wp-env for local testing

## WordPress Integration Points

- **Custom Post Meta**: Portfolio settings via meta boxes
- **Shortcodes**: Legacy shortcode support
- **Gutenberg Blocks**: Modern block editor integration
- **REST API**: Custom endpoints for AJAX functionality
- **Theme Support**: Compatibility with major themes
- **SEO Optimization**: Schema markup and meta tags

---

**Note**: This is the free WordPress.org plugin version. Always ensure compatibility with WordPress core updates and follow WordPress.org guidelines for plugin development.

**WordPress.org Plugin**: https://wordpress.org/plugins/visual-portfolio/