/**
 * Internal dependencies
 */
import useVpfGalleryAttributes from '../../hooks/use-gallery-attributes';
import useVpfGalleryLayoutAttributes from '../../hooks/use-gallery-layout-attributes';
import useVpfGalleryPaginationAttributes from '../../hooks/use-gallery-pagination-attributes';

export function get() {
  return {
    useVpfGalleryLayoutAttributes,
    useVpfGalleryAttributes,
    useVpfGalleryPaginationAttributes,
  };
}
