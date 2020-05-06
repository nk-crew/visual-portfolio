/**
 * External dependencies
 */
import * as clipboard from 'clipboard-polyfill';

/**
 * WordPress dependencies
 */
const {
    Component,
    Fragment,
} = wp.element;

// generate dom tree.
function getNodeTree( node ) {
    if ( node && node.hasChildNodes() ) {
        const children = [];

        for ( let j = 0; j < node.childNodes.length; j += 1 ) {
            children.push( getNodeTree( node.childNodes[ j ] ) );
        }

        return {
            classList: node.classList,
            nodeName: node.nodeName,
            children,
        };
    }

    return false;
}

/**
 * Component Class
 */
export default class ClassesTree extends Component {
    constructor( ...args ) {
        super( ...args );

        this.state = {
            nodes: false,
        };

        this.onFrameLoad = this.onFrameLoad.bind( this );
        this.maybeFindIframe = this.maybeFindIframe.bind( this );
        this.updateTreeData = this.updateTreeData.bind( this );
    }

    componentDidMount() {
        this.maybeFindIframe();
    }

    componentDidUpdate() {
        this.maybeFindIframe();
    }

    componentWillUnmount() {
        if ( ! this.iframePreview ) {
            return;
        }

        this.iframePreview.removeEventListener( 'load', this.onFrameLoad );
    }

    /**
     * On frame load event.
     */
    onFrameLoad() {
        if ( ! this.iframePreview.contentWindow ) {
            return;
        }

        this.frameWindow = this.iframePreview.contentWindow;
        this.frameJQuery = this.iframePreview.contentWindow.jQuery;
        this.$framePortfolio = this.frameJQuery( '.vp-portfolio' );

        this.updateTreeData();
    }

    maybeFindIframe() {
        if ( this.iframePreview ) {
            return;
        }

        const {
            clientId,
        } = this.props;

        const iframePreview = document.getElementById( `vpf-preview-${ clientId }` );

        if ( iframePreview ) {
            this.iframePreview = iframePreview;
            this.iframePreview.addEventListener( 'load', this.onFrameLoad );
            this.onFrameLoad();
        }
    }

    updateTreeData() {
        if ( this.$framePortfolio ) {
            this.setState( {
                nodes: getNodeTree( this.$framePortfolio[ 0 ] ),
            } );
        }
    }

    render() {
        if ( ! this.iframePreview ) {
            return '';
        }

        return (
            <div className="vpf-component-classes-tree">
                <ClassesTree.TreeItem
                    node={ this.state.nodes }
                    skipNodeByClass={ /vp-portfolio__item-popup/ }
                    collapseByClass={ /^(vp-portfolio__preloader-wrap|vp-portfolio__filter-wrap|vp-portfolio__sort-wrap|vp-portfolio__items-wrap|vp-portfolio__pagination-wrap)$/ }
                    skipClass={ /vp-uid-/ }
                />
            </div>
        );
    }
}

ClassesTree.TreeItem = class TreeItem extends Component {
    constructor( ...args ) {
        super( ...args );

        this.state = {
            isCollapsed: null,
        };

        this.isCollapsed = this.isCollapsed.bind( this );
    }

    isCollapsed() {
        const {
            node,
            collapseByClass,
        } = this.props;

        let {
            isCollapsed,
        } = this.state;

        // check if collapsed by default.
        if ( null === isCollapsed && node && node.classList && node.classList.length ) {
            node.classList.forEach( ( className ) => {
                if ( collapseByClass && collapseByClass.test( className ) ) {
                    isCollapsed = true;
                }
            } );
        }

        return isCollapsed;
    }

    render() {
        const {
            node,
            skipNodeByClass,
            skipClass,
        } = this.props;


        if ( ! node || ! node.children.length ) {
            return '';
        }

        const classes = [];
        let skip = false;

        // Classes.
        if ( node.classList && node.classList.length ) {
            node.classList.forEach( ( className ) => {
                if ( ! skipClass || ! skipClass.test( className ) ) {
                    classes.push( className );
                }

                // Skip?
                if ( skipNodeByClass && skipNodeByClass.test( className ) ) {
                    skip = true;
                }
            } );
        }

        if ( skip ) {
            return '';
        }

        return (
            <ul>
                <li className={ `vpf-component-classes-tree-node ${ this.isCollapsed() ? '' : 'is-collapsed' }` }>
                    <div>
                        { node.children.length ? (
                            // eslint-disable-next-line jsx-a11y/control-has-associated-label
                            <button
                                type="button"
                                className="vpf-component-classes-tree-node-collapse"
                                onClick={ () => this.setState( { isCollapsed: ! this.isCollapsed() } ) }
                            />
                        ) : '' }
                        &lt;
                        { node.nodeName.toLowerCase() }
                        { /* eslint-disable-next-line react/no-danger */ }
                        { classes.length ? (
                            <Fragment>
                                { ' class="' }
                                { classes.map( ( className ) => (
                                    <button
                                        key={ className }
                                        type="button"
                                        className="vpf-component-classes-tree-node-class"
                                        onClick={ () => {
                                            clipboard.writeText( className );
                                        } }
                                    >
                                        { className }
                                    </button>
                                ) ) }
                                { '"' }
                            </Fragment>
                        ) : '' }
                        &gt;
                    </div>
                </li>
                { node.children.length && this.isCollapsed() ? (
                    node.children.map( ( childNode ) => {
                        if ( childNode ) {
                            return (
                                <li className="vpf-component-classes-tree-child">
                                    <ClassesTree.TreeItem
                                        { ...this.props }
                                        node={ childNode }
                                    />
                                </li>
                            );
                        }
                        return '';
                    } )
                ) : '' }
            </ul>
        );
    }
};
