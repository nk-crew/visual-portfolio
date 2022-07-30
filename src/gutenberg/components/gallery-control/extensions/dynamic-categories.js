/**
 * Add list of all categories to gallery images.
 */
const { addFilter } = wp.hooks;

addFilter(
  'vpf.editor.controls-render-data',
  'vpf/editor/controls-render-data/images-categories-suggestions',
  (data) => {
    if ('images' === data.name) {
      const categories = [];

      // find all used categories.
      if (data.attributes.images && data.attributes.images.length) {
        data.attributes.images.forEach((image) => {
          if (image.categories && image.categories.length) {
            image.categories.forEach((cat) => {
              if (-1 === categories.indexOf(cat)) {
                categories.push(cat);
              }
            });
          }
        });
      }

      if (
        categories.length &&
        data.image_controls &&
        data.image_controls.categories &&
        data.image_controls.categories.options
      ) {
        data.image_controls.categories.options = categories.map((val) => ({
          label: val,
          value: val,
        }));
      }
    }

    return data;
  }
);
