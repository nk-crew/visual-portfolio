/**
 * Internal dependencies
 */
import usePortfolioBlockAttributes from '../../hooks/use-portfolio-block-attributes';
import usePortfolioLayoutAttributes from '../../hooks/use-portfolio-layout-attributes';
import usePortfolioPaginationAttributes from '../../hooks/use-portfolio-pagination-attributes';

export function get() {
  return {
    usePortfolioLayoutAttributes,
    usePortfolioBlockAttributes,
    usePortfolioPaginationAttributes,
  };
}
