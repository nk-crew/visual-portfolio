import { URLPopover } from '@wordpress/block-editor';
import {
	Button,
	__experimentalInputControl as InputControl,
	__experimentalInputControlSuffixWrapper as InputControlSuffixWrapper,
} from '@wordpress/components';
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { keyboardReturn, link } from '@wordpress/icons';

/**
 * The Insert from URL button of the gallery, beside Add media.
 *
 * The one core's media placeholder shows, which the gallery drops once it holds
 * an image: a button that opens a popover with a URL field.
 *
 * @param {Object}   props             - component props.
 * @param {Function} props.onSelectURL - called with the URL typed in.
 * @return {Element} component.
 */
export default function InsertFromUrl({ onSelectURL }) {
	const [anchor, setAnchor] = useState(null);
	const [isOpen, setIsOpen] = useState(false);
	const [url, setUrl] = useState('');

	const close = () => {
		setIsOpen(false);
		anchor?.focus();
	};

	return (
		<>
			<Button
				ref={setAnchor}
				className="vpf-gallery-manager__add"
				icon={link}
				aria-haspopup="dialog"
				isPressed={isOpen}
				onClick={() => setIsOpen(true)}
			>
				{__('Insert from URL', 'visual-portfolio')}
			</Button>

			{isOpen ? (
				<URLPopover anchor={anchor} onClose={close}>
					<form
						className="block-editor-media-placeholder__url-input-form"
						onSubmit={(event) => {
							event.preventDefault();

							if (url) {
								onSelectURL(url);
								setUrl('');
								close();
							}
						}}
					>
						<InputControl
							__next40pxDefaultSize
							label={__('URL', 'visual-portfolio')}
							hideLabelFromVision
							placeholder={__(
								'Paste or type URL',
								'visual-portfolio'
							)}
							value={url}
							onChange={(value) => setUrl(value || '')}
							suffix={
								<InputControlSuffixWrapper variant="control">
									<Button
										size="small"
										icon={keyboardReturn}
										label={__('Apply', 'visual-portfolio')}
										type="submit"
									/>
								</InputControlSuffixWrapper>
							}
						/>
					</form>
				</URLPopover>
			) : null}
		</>
	);
}
