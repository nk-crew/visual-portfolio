// eslint-disable-next-line import/no-extraneous-dependencies
const micromatch = require('micromatch');

function excludeVendor(lint) {
  return (filenames) => {
    const files = micromatch(filenames, '!**/vendor/**/*');

    if (files && files.length) {
      return `${lint} ${files.join(' ')}`;
    }

    return [];
  };
}

module.exports = {
  'src/**/*.php': excludeVendor('composer run-script lint'),
  'src/**/*.css': excludeVendor('stylelint'),
  'src/**/*.scss': excludeVendor('stylelint --custom-syntax postcss-scss'),
  'src/**/*.js': excludeVendor('eslint'),
};
