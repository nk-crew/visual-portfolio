/**
 * WordPress dependencies
 */
const {
    Component,
} = wp.element;

const {
    Toolbar,
} = wp.components;

const hAlign = {
    left: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" clipRule="evenodd" d="M19 4H1V5.22222H19V4ZM11.2857 8.88889H1V10.1111H11.2857V8.88889ZM1 13.7778H13.8571V15H1V13.7778Z" fill="currentColor" />
        </svg>
    ),
    center: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" clipRule="evenodd" d="M3.57286 13.7778H16.43V15H3.57286V13.7778Z" fill="currentColor" />
            <path fillRule="evenodd" clipRule="evenodd" d="M15.14 8.88889H4.85429V10.1111H15.14V8.88889Z" fill="currentColor" />
            <path d="M1 4H19V5.22222H1V4Z" fill="currentColor" />
        </svg>
    ),
    right: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" clipRule="evenodd" d="M1 4H19V5.22222H1V4ZM8.71429 8.88889H19V10.1111H8.71429V8.88889ZM19 13.7778H6.14286V15H19V13.7778Z" fill="currentColor" />
        </svg>
    ),
};
const vAlign = {
    top: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" clipRule="evenodd" d="M10.4046 6.087L10 5.67517L9.59543 6.087L6.16686 9.587L6.976 10.413L9.42857 7.90817V17H10.5714V7.90817L13.024 10.413L13.8331 9.587L10.4046 6.087V6.087ZM18 4.16667V3H2V4.16667H18Z" fill="currentColor" />
        </svg>
    ),
    center: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" clipRule="evenodd" d="M10 7.98287L10.4046 7.58575L12.6903 5.33575L11.8811 4.53925L10.5714 5.82963V1H9.42857V5.82963L8.11886 4.53925L7.30971 5.33575L9.59543 7.58575L10 7.98287ZM10 12.0171L10.4046 12.4142L12.6903 14.6642L11.8811 15.4608L10.5714 14.1704V19H9.42857V14.1704L8.11886 15.4608L7.30971 14.6642L9.59543 12.4142L10 12.0171ZM2 10.5625H18V9.4375H2V10.5625Z" fill="currentColor" />
        </svg>
    ),
    bottom: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" clipRule="evenodd" d="M10.4046 13.913L10 14.3248L9.59543 13.913L6.16686 10.413L6.976 9.587L9.42857 12.0918V3H10.5714V12.0918L13.024 9.587L13.8331 10.413L10.4046 13.913V13.913ZM18 15.8333V17H2V15.8333H18Z" fill="currentColor" />
        </svg>
    ),
};

/**
 * Component Class
 */
export default class IconsSelector extends Component {
    constructor( ...args ) {
        super( ...args );

        this.getAlignObject = this.getAlignObject.bind( this );
        this.getAlignString = this.getAlignString.bind( this );
    }

    getAlignObject() {
        const {
            value,
        } = this.props;

        let horizontal = 'center';
        let vertical = 'center';

        const values = value.split( '-' );

        if ( ! values[ 1 ] ) {
            if ( values[ 0 ] ) {
                // eslint-disable-next-line prefer-destructuring
                horizontal = values[ 0 ];
            }
        } else {
            if ( values[ 0 ] ) {
                // eslint-disable-next-line prefer-destructuring
                vertical = values[ 0 ];
            }
            if ( values[ 1 ] ) {
                // eslint-disable-next-line prefer-destructuring
                horizontal = values[ 1 ];
            }
        }

        return {
            h: horizontal,
            v: vertical,
        };
    }

    getAlignString( horizontal, vertical ) {
        const {
            extended,
        } = this.props;

        if ( extended ) {
            return `${ vertical && 'center' !== vertical ? `${ vertical }-` : '' }${ horizontal }`;
        }

        return horizontal;
    }

    render() {
        const {
            extended,
            onChange,
        } = this.props;

        const value = this.getAlignObject();
        const controls = [];

        Object.keys( hAlign ).forEach( ( val ) => {
            controls.push( {
                icon: hAlign[ val ],
                title: `${ extended ? 'Horizontal ' : '' }${ val.charAt( 0 ).toUpperCase() + val.slice( 1 ) }`,
                onClick: () => onChange( this.getAlignString( val, value.v ) ),
                isActive: value.h === val,
            } );
        } );

        if ( extended ) {
            controls.push( {
                className: 'vpf-component-align-control-separator',
            } );
            Object.keys( vAlign ).forEach( ( val ) => {
                controls.push( {
                    icon: vAlign[ val ],
                    title: `Vertical ${ val.charAt( 0 ).toUpperCase() + val.slice( 1 ) }`,
                    onClick: () => onChange( this.getAlignString( value.h, val ) ),
                    isActive: value.v === val,
                } );
            } );
        }

        return (
            <div className="vpf-component-align-control">
                <Toolbar controls={ controls } />
            </div>
        );
    }
}
