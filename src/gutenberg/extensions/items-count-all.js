/**
 * External dependencies
 */
import classnames from 'classnames/dedupe';
import { debounce } from 'throttle-debounce';

/**
 * Internal dependencies
 */
import Notice from '../components/notice';
import controlGetValue from '../utils/control-get-value';

/**
 * WordPress dependencies
 */
const { __, sprintf } = wp.i18n;

const { addFilter } = wp.hooks;

const { useSelect } = wp.data;

const { RawHTML, useState } = wp.element;

const { BaseControl, ButtonGroup, Button, TextControl } = wp.components;

const { apiFetch } = wp;

const { VPGutenbergVariables } = window;

const NOTICE_LIMIT = parseInt(VPGutenbergVariables.items_count_notice_limit, 10);
const DISPLAY_NOTICE_AFTER = NOTICE_LIMIT + 5;

function getNoticeState() {
  return VPGutenbergVariables.items_count_notice;
}

const maybeUpdateNoticeStateMeta = debounce(3000, (postId) => {
  apiFetch({
    path: '/visual-portfolio/v1/update_gallery_items_count_notice_state',
    method: 'POST',
    data: {
      notice_state: getNoticeState(),
      post_id: postId,
    },
  });
});

function updateNoticeState(postId) {
  const newState = 'hide' === getNoticeState() ? 'show' : 'hide';

  VPGutenbergVariables.items_count_notice = newState;

  maybeUpdateNoticeStateMeta(postId);
}

function CountNotice(props) {
  const { onToggle, postId } = props;

  return (
    <Notice status="warning" isDismissible={false}>
      <p
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: __(
            'Using large galleries may <u>decrease page loading speed</u>. We recommend you add these improvements:',
            '@@text_domain'
          ),
        }}
      />
      <ol className="ol-decimal">
        <li
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: sprintf(
              __('Set the items per page to <u>less than %d</u>', '@@text_domain'),
              NOTICE_LIMIT
            ),
          }}
        />
        <li
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: __(
              'Add <em>`Load More`</em> or <em>`Infinite Scroll`</em> pagination for best results.',
              '@@text_domain'
            ),
          }}
        />
      </ol>
      <p>
        <Button
          isLink
          onClick={() => {
            updateNoticeState(postId);
            onToggle();
          }}
        >
          {__('Ok, I understand', '@@text_domain')}
        </Button>
      </p>
    </Notice>
  );
}

function shouldDisplayNotice(count, attributes) {
  let display = false;

  // When selected images number is lower, then needed, don't display notice, even is count is large.
  if ('images' === attributes.content_source) {
    display =
      attributes?.images?.length > DISPLAY_NOTICE_AFTER &&
      (count > DISPLAY_NOTICE_AFTER || -1 === count);
  } else {
    display = count > DISPLAY_NOTICE_AFTER || -1 === count;
  }

  return display;
}

function ItemsCountControl({ data }) {
  const { description, attributes, onChange } = data;

  const [maybeReRender, setMaybeReRender] = useState(1);

  const { postId } = useSelect(
    (select) => ({
      postId: select('core/editor').getCurrentPostId(),
    }),
    []
  );

  const renderControlHelp = description ? <RawHTML>{description}</RawHTML> : false;
  const renderControlClassName = classnames('vpf-control-wrap', `vpf-control-wrap-${data.type}`);
  const controlVal = parseInt(controlGetValue(data.name, attributes), 10);

  return (
    <BaseControl
      label={
        <>
          {data.label}
          {'hide' === getNoticeState() && shouldDisplayNotice(controlVal, attributes) ? (
            <Button
              onClick={() => {
                updateNoticeState(postId);
                setMaybeReRender(maybeReRender + 1);
              }}
              isSmall
              style={{
                position: 'absolute',
                marginTop: '-5px',
                padding: '0 4px',
                color: '#cd7a0f',
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                height="16"
                width="16"
                viewBox="0 0 24 24"
                fill="red"
              >
                <path
                  d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
                  fill="currentColor"
                />
              </svg>
            </Button>
          ) : null}
        </>
      }
      help={renderControlHelp}
      className={renderControlClassName}
    >
      <div>
        <ButtonGroup>
          <Button
            isSmall
            isPrimary={-1 !== controlVal}
            isPressed={-1 !== controlVal}
            onClick={() => {
              if (-1 === controlVal) {
                onChange(parseFloat(data.default || 6));
              }
            }}
          >
            {__('Custom Count', '@@text_domain')}
          </Button>
          <Button
            isSmall
            isPrimary={-1 === controlVal}
            isPressed={-1 === controlVal}
            onClick={() => {
              if (
                -1 !== controlVal &&
                // eslint-disable-next-line no-alert
                window.confirm(
                  __(
                    'Be careful, the output of all your items can adversely affect the performance of your site, this option may be helpful for image galleries.',
                    '@@text_domain'
                  )
                )
              ) {
                onChange(-1);
              }
            }}
          >
            {__('All Items', '@@text_domain')}
          </Button>
        </ButtonGroup>
      </div>
      {-1 !== controlVal ? (
        <>
          <br />
          <TextControl
            type="number"
            min={data.min}
            max={data.max}
            step={data.step}
            value={controlVal}
            onChange={(val) => onChange(parseFloat(val))}
          />
        </>
      ) : null}
      {'show' === getNoticeState() && shouldDisplayNotice(controlVal, attributes) ? (
        <div>
          <CountNotice
            postId={postId}
            onToggle={() => {
              setMaybeReRender(maybeReRender + 1);
            }}
          />
        </div>
      ) : null}
    </BaseControl>
  );
}

// Items count with "All Items" button.
addFilter(
  'vpf.editor.controls-render',
  'vpf/editor/controls-render/customize-controls',
  (render, data) => {
    if ('items_count' !== data.name) {
      return render;
    }

    return (
      <ItemsCountControl
        // we should use key prop, since `vpf.editor.controls-render` will use the result in array.
        key={`control-${data.name}-${data.label}`}
        data={data}
      />
    );
  }
);
