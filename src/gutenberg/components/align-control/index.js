/**
 * External dependencies
 */
import classnames from 'classnames/dedupe';

/**
 * WordPress dependencies
 */
const { Button, Tooltip } = wp.components;

/**
 * Component Class
 */
export default function IconsSelector(props) {
  const { extended, value, onChange } = props;

  let controlsArray = ['left', 'center', 'right'];
  if (extended) {
    controlsArray = [
      'top-left',
      'top-center',
      'top-right',
      ...controlsArray,
      'bottom-left',
      'bottom-center',
      'bottom-right',
    ];
  }

  return (
    <div className="vpf-component-align-control">
      {controlsArray.map((align) => {
        const alignTitle = align
          .split('-')
          .map((word) => {
            return word.slice(0, 1).toUpperCase() + word.slice(1);
          })
          .join(' ');

        return (
          <Tooltip key={`align-${align}`} text={alignTitle}>
            <Button
              className={classnames(
                `vpf-component-align-control-${align}`,
                value === align ? 'vpf-component-align-control-active' : ''
              )}
              onClick={() => {
                onChange(align);
              }}
            >
              <span />
              <span />
              <span />
            </Button>
          </Tooltip>
        );
      })}
    </div>
  );
}
