<?php
/**
 * Block Filter by Category.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Visual Portfolio Filter by Category block.
 */
class Visual_Portfolio_Block_Loop_Filter {
	/**
	 * Constructor.
	 */
	public function __construct() {
		add_action( 'init', array( $this, 'register_block' ), 11 );
	}

	/**
	 * Register Block.
	 */
	public function register_block() {
		Visual_Portfolio_Assets::register_style( 'visual-portfolio-block-loop-filter', 'build/gutenberg/blocks/loop-filter/style' );
		wp_style_add_data( 'visual-portfolio-block-loop-filter', 'rtl', 'replace' );

		register_block_type_from_metadata(
			visual_portfolio()->plugin_path . 'gutenberg/blocks/loop-filter',
			array(
				'render_callback'   => array( $this, 'block_render' ),
				// The items are rendered by the callback, against the terms the
				// gallery has now rather than the ones saved with it.
				'skip_inner_blocks' => true,
			)
		);
	}

	/**
	 * Items of the filter, the saved ones merged with the terms of the gallery.
	 *
	 * A saved item keeps its place, its label and its style, and is left out
	 * while its term has nothing in the gallery. A term without an item follows
	 * the saved ones, styled like the first saved term item, else like "All".
	 *
	 * @param array $saved    - parsed filter item blocks, as saved.
	 * @param array $terms    - terms of the gallery.
	 * @param bool  $show_all - whether the list starts with "All".
	 *
	 * @return array Parsed filter item blocks to render.
	 */
	public static function get_items( $saved, $terms, $show_all ) {
		$by_key   = array_column( $terms, null, 'key' );
		$items    = array();
		$used     = array();
		$template = null;
		$all      = null;

		foreach ( $saved as $item ) {
			$attributes = $item['attrs'] ?? array();

			if ( '*' === ( $attributes['filter'] ?? '*' ) ) {
				$all     = $all ?? $item;
				$items[] = $item;
				continue;
			}

			$template = $template ?? $item;
			$key      = Visual_Portfolio_Filter_Terms::get_key( self::get_translated_term_id( (int) ( $attributes['taxonomyId'] ?? 0 ) ), $attributes['filter'] );

			if ( ! isset( $by_key[ $key ] ) || isset( $used[ $key ] ) ) {
				continue;
			}

			$used[ $key ]                = true;
			$item['attrs']['count']      = $by_key[ $key ]['count'];
			$item['attrs']['taxonomyId'] = $by_key[ $key ]['id'];
			$items[]                     = $item;
		}

		if ( $show_all && ! $all ) {
			array_unshift( $items, self::get_item_block( array( 'text' => __( 'All', 'visual-portfolio' ) ) ) );
		}

		// Everything but what names the term is the style new items take.
		$style = array_diff_key(
			( $template ?? $all )['attrs'] ?? array(),
			array_flip( array( 'text', 'filter', 'taxonomyId', 'count', 'anchor', 'metadata', 'lock' ) )
		);

		foreach ( $terms as $term ) {
			if ( isset( $used[ $term['key'] ] ) ) {
				continue;
			}

			$items[] = self::get_item_block(
				array_merge(
					$style,
					array(
						'text'       => $term['label'],
						'filter'     => $term['filter'],
						'taxonomyId' => $term['id'],
						'count'      => $term['count'],
					)
				)
			);
		}

		return $items;
	}

	/**
	 * Items in the order the block asks for.
	 *
	 * "All" leads whatever the order. `name` sorts by the label shown, `count`
	 * by the items each term holds, most first, and `manual` keeps the saved
	 * order followed by the new terms.
	 *
	 * @param array  $items - parsed filter item blocks.
	 * @param string $order - `manual`, `name` or `count`.
	 *
	 * @return array
	 */
	public static function sort_items( $items, $order ) {
		if ( 'name' !== $order && 'count' !== $order ) {
			return $items;
		}

		$all   = array();
		$terms = array();

		foreach ( $items as $item ) {
			if ( '*' === ( $item['attrs']['filter'] ?? '*' ) ) {
				$all[] = $item;
			} else {
				$terms[] = $item;
			}
		}

		usort(
			$terms,
			static function ( $a, $b ) use ( $order ) {
				if ( 'count' === $order ) {
					$by_count = (int) ( $b['attrs']['count'] ?? 0 ) <=> (int) ( $a['attrs']['count'] ?? 0 );

					if ( 0 !== $by_count ) {
						return $by_count;
					}
				}

				return self::compare_labels( wp_strip_all_tags( (string) ( $a['attrs']['text'] ?? '' ) ), wp_strip_all_tags( (string) ( $b['attrs']['text'] ?? '' ) ) );
			}
		);

		return array_merge( $all, $terms );
	}

	/**
	 * Order of two labels the way the editor sorts them: letters before case
	 * and accents, digits by their value.
	 *
	 * @param string $a - label.
	 * @param string $b - label.
	 *
	 * @return int
	 */
	public static function compare_labels( $a, $b ) {
		static $collator = null;

		if ( null === $collator && class_exists( 'Collator' ) ) {
			$collator = new Collator( get_locale() );
			$collator->setStrength( Collator::PRIMARY );
			$collator->setAttribute( Collator::NUMERIC_COLLATION, Collator::ON );
		}

		if ( $collator ) {
			return (int) $collator->compare( $a, $b );
		}

		// Without the intl extension, case and accents are folded by hand, and
		// without mbstring only the ASCII case.
		$lower = function_exists( 'mb_strtolower' ) ? 'mb_strtolower' : 'strtolower';

		return strnatcmp( remove_accents( $lower( $a ) ), remove_accents( $lower( $b ) ) );
	}

	/**
	 * The term a saved item points at, in the language of the page.
	 *
	 * A translated page keeps the term ids saved in the original, while its
	 * gallery lists the terms of its own language.
	 *
	 * @param int $id - saved term id, 0 for an image category.
	 *
	 * @return int
	 */
	private static function get_translated_term_id( $id ) {
		if ( ! $id || ! has_filter( 'wpml_object_id' ) ) {
			return $id;
		}

		$term = get_term( $id );

		if ( ! $term || is_wp_error( $term ) ) {
			return $id;
		}

		// phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound
		return (int) apply_filters( 'wpml_object_id', $id, $term->taxonomy, true );
	}

	/**
	 * A parsed filter item block.
	 *
	 * @param array $attributes - block attributes.
	 *
	 * @return array
	 */
	private static function get_item_block( $attributes ) {
		return array(
			'blockName'    => 'visual-portfolio/loop-filter-item',
			'attrs'        => $attributes,
			'innerBlocks'  => array(),
			'innerHTML'    => '',
			'innerContent' => array(),
		);
	}

	/**
	 * Block output
	 *
	 * @param array    $attributes - block attributes.
	 * @param string   $content - block content, empty: the items are rendered here.
	 * @param WP_Block $block - block instance.
	 *
	 * @return string
	 */
	public function block_render( $attributes, $content, $block ) {
		if ( ! Visual_Portfolio_Get::loop_source_supports( $block->context['vp/queryType'] ?? '', 'filter' ) ) {
			return '';
		}

		$options = Visual_Portfolio_Gutenberg::transform_context_to_attributes( $block->context );
		$terms   = $options ? Visual_Portfolio_Filter_Terms::get( $options, Visual_Portfolio_Block_Loop::get_query_id( $block->context ) ) : array();

		// A gallery with nothing to filter by gets no filter, as the classic
		// block does.
		if ( empty( $terms ) ) {
			return '';
		}

		$as_dropdown = ! empty( $attributes['displayAsDropdown'] );
		$items       = self::sort_items( self::get_items( $block->parsed_block['innerBlocks'] ?? array(), $terms, ! empty( $attributes['showAllItem'] ) ), $attributes['order'] ?? 'manual' );
		$label       = trim( (string) ( $attributes['label'] ?? '' ) );
		$content     = '';
		$context     = array_merge(
			$block->context,
			array(
				'vp/showCount'         => ! empty( $attributes['showCount'] ),
				'vp/displayAsDropdown' => $as_dropdown,
			)
		);

		// The way `WP_Block::render()` renders inner blocks, so the filters
		// that give a child its parent's layout still see this block.
		foreach ( $items as $item ) {
			/** This filter is documented in wp-includes/blocks.php */
			$pre_render = apply_filters( 'pre_render_block', null, $item, $block ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- core's filter.

			if ( null !== $pre_render ) {
				$content .= $pre_render;
				continue;
			}

			/** This filter is documented in wp-includes/blocks.php */
			$item = apply_filters( 'render_block_data', $item, $item, $block ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- core's filter.

			/** This filter is documented in wp-includes/blocks.php */
			$item_context = apply_filters( 'render_block_context', $context, $item, $block ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- core's filter.

			$content .= ( new WP_Block( $item, $item_context ) )->render();
		}

		if ( '' === trim( $content ) ) {
			return '';
		}

		// Each item rendered itself as an option.
		if ( $as_dropdown ) {
			return sprintf(
				'<div %1$s>%2$s</div>',
				get_block_wrapper_attributes(
					array(
						'class' => 'vp-block-loop-filter',
					)
				),
				Visual_Portfolio_Block_Loop::get_select_form(
					'filter',
					$content,
					array(
						'label'  => '' !== $label ? $label : __( 'Category filter', 'visual-portfolio' ),
						'prompt' => '' !== $label ? $label : __( 'Select category', 'visual-portfolio' ),
						'submit' => __( 'Filter', 'visual-portfolio' ),
					),
					'vp-block-loop-filter',
					$block->context
				)
			);
		}

		$wrapper_attributes = get_block_wrapper_attributes(
			array(
				'class'      => 'vp-block-loop-filter',
				// `get_block_wrapper_attributes()` escapes the values itself.
				'aria-label' => '' !== $label ? $label : __( 'Category filter', 'visual-portfolio' ),
			)
		);

		return sprintf(
			'<nav %1$s>%2$s</nav>',
			$wrapper_attributes,
			$content
		);
	}
}
new Visual_Portfolio_Block_Loop_Filter();
