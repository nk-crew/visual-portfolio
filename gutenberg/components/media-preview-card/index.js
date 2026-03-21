import './style.scss';

import classnames from 'classnames/dedupe';

import { MediaUpload } from '@wordpress/block-editor';
import { Button } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

export default function MediaPreviewCard( {
	children,
	className,
	title,
	onSelect,
	allowedTypes,
	value,
	onRemove,
	replaceLabel = __( 'Replace', 'visual-portfolio' ),
	removeLabel = __( 'Remove', 'visual-portfolio' ),
	renderActions,
} ) {
	const hasDefaultActions = onSelect || onRemove;

	return (
		<div
			className={ classnames(
				'vpf-component-media-preview-card',
				className
			) }
		>
			<div className="vpf-component-media-preview-card-media">
				{ children }
			</div>
			{ renderActions ? renderActions() : null }
			{ ! renderActions && hasDefaultActions ? (
				<div className="vpf-component-media-preview-card-actions">
					{ onSelect ? (
						<MediaUpload
							title={ title }
							onSelect={ onSelect }
							allowedTypes={ allowedTypes }
							value={ value }
							render={ ( { open } ) => (
								<Button
									onClick={ open }
									className="vpf-component-media-preview-card-action"
								>
									{ replaceLabel }
								</Button>
							) }
						/>
					) : null }
					{ onRemove ? (
						<Button
							onClick={ onRemove }
							className="vpf-component-media-preview-card-action"
						>
							{ removeLabel }
						</Button>
					) : null }
				</div>
			) : null }
		</div>
	);
}
