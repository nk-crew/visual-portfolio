import useVpfGalleryLayoutAttributes from '../use-gallery-layout-attributes';

export default function useVpfGalleryPaginationAttributes(galleryId) {
  const galleryLayoutAttributes = useVpfGalleryLayoutAttributes(galleryId);
  if (
    'fetched' === galleryLayoutAttributes.status &&
    'undefined' !== typeof galleryLayoutAttributes.data.pagination
  ) {
    return galleryLayoutAttributes.data.pagination;
  }
  return false;
}
