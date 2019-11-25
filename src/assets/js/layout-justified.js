/*
 * Visual Portfolio layout Justified.
 */
const $ = window.jQuery;

// Init Options.
$( document ).on( 'initOptions.vpf', ( event, self ) => {
    if ( 'vpf' !== event.namespace ) {
        return;
    }

    self.defaults.justifiedRowHeight = 250;
    self.defaults.justifiedRowHeightTolerance = 0.25;

    if ( ! self.options.justifiedRowHeight ) {
        self.options.justifiedRowHeight = self.defaults.justifiedRowHeight;
    }
    if ( ! self.options.justifiedRowHeightTolerance ) {
        self.options.justifiedRowHeightTolerance = self.defaults.justifiedRowHeightTolerance;
    }
} );
