import getParseBlocks from '../../utils/get-parse-blocks';

export default function useVpfGalleryAttributes(galleryId) {
  const blocks = getParseBlocks('visual-portfolio/block');
  const findingBlock = blocks.find((el) => el.attributes.block_id === galleryId);
  return 'undefined' !== typeof findingBlock ? findingBlock.attributes : false;
}
