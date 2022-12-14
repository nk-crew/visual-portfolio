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

function getBlocks(select) {
  const widgetAreas = select('core/block-editor').getBlocks();
  const blocks = widgetAreas.map((widgetArea) => {
    const innerBlocks = select('core/block-editor').getBlocks(widgetArea.clientId);
    return {
      ...widgetArea,
      innerBlocks,
    };
  });
  return blocks;
}

export default function getParseBlocks(blockNames) {
  const { findingBlocks } = wp.data.useSelect((select) => {
    const blocks = getBlocks(select);
    const postBlocks = getParseInnerBlocks(blocks, blockNames);
    return {
      findingBlocks: postBlocks,
    };
  });

  return findingBlocks;
}
