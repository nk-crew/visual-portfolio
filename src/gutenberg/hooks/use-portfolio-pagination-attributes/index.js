import usePortfolioLayoutAttributes from '../use-portfolio-layout-attributes';

export default function usePortfolioPaginationAttributes(galleryId) {
  const galleryLayoutAttributes = usePortfolioLayoutAttributes(galleryId);
  if (
    'fetched' === galleryLayoutAttributes.status &&
    'undefined' !== typeof galleryLayoutAttributes.data.pagination
  ) {
    return galleryLayoutAttributes.data.pagination;
  }
  return false;
}
