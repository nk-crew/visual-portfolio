function getParseInnerBlocks(blocks, blockNames) {
  let allBlocks = [];
  blocks.forEach((item) => {
    if (blockNames === item.name || (0 < blockNames.length && blockNames.includes(item.name))) {
      allBlocks.push(item);
    } else if (0 < item.innerBlocks.length) {
      allBlocks = allBlocks.concat(getParseInnerBlocks(item.innerBlocks, blockNames));
    }
  });
  return allBlocks;
}

export default function getParseBlocks(blockNames) {
  const { findingBlocks } = wp.data.useSelect((select) => {
    const blocks = select('core/block-editor').getBlocks();
    const postBlocks = getParseInnerBlocks(blocks, blockNames);
    return {
      findingBlocks: postBlocks,
    };
  });

  return findingBlocks;
}
