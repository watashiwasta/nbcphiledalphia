/*
The AdLayersDFPAPI class implements functionality specific to DFP For the AdLayersAPI.
*/
AdLayersDFPAPI = function() {}

// Refreshes a specific ad unit
AdLayersDFPAPI.prototype.refresh = function( ad_unit ) {
	if ( 'undefined' !== typeof dfpAdUnits[ ad_unit ] ) {
		googletag.pubads().refresh( [ dfpAdUnits[ ad_unit ] ] );
	}
}

// Refreshes all ad units
AdLayersDFPAPI.prototype.refreshAll = function(type) {
	if (dfpAdUnits && Object.keys(dfpAdUnits).length) {
		// DFP needs a numerical indexed array
		var unitsToRefresh = new Array;
		for ( var adUnit in dfpAdUnits ) {
			unitsToRefresh.push( dfpAdUnits[ adUnit ] );
		}
		// Set targeting that indicates the type of refresh
		if (type) {
			googletag.pubads().setTargeting('refresh', type);
		}
		googletag.pubads().refresh( unitsToRefresh );
	}
}

const magnitePrebid = function( slotName ) {
	if ('undefined' === typeof pbjs) return;

	pbjs.que.push(function() {
		pbjs.rp.requestBids({
			callback: () => {
				if (pbjs.adserverRequestSent) return;
				pbjs.adserverRequestSent = true;
			},
			gptSlotObjects: 'undefined' !== typeof slotName ? [ dfpAdUnits[ slotName ] ] : null,
		})
	})
};

AdLayersDFPAPI.prototype.buildAd = function( slotName, path, sizes, targets, sizeMapping ) {
	if ('function' === typeof URLSearchParams) {
		let params = new URLSearchParams( window.location ); // phpcs:ignore WordPressVIPMinimum.JS.Window.location
		if (
			'1' === params.get('disableHeader')
			&& '1' === params.get('disableFooter')
		) {
			path = path.replace('_mobileweb', '_app');
		}
	}

	return googletag.cmd.push( function() {
		var key, value, divId;
		divId = adLayersDFP.adUnitPrefix + slotName;
		dfpAdUnits = dfpAdUnits || {};
		dfpAdUnits[ slotName ] = googletag.defineSlot( path, sizes, divId );

		if ( targets ) {
			for ( key in targets ) {
				value = targets[ key ];
				dfpAdUnits[ slotName ].setTargeting( key, value );
			}
		}

		if ( sizeMapping ) {
			dfpAdUnits[ slotName ].defineSizeMapping( sizeMapping );
		}

		// Prevent CLS issues by not collapsing banner ads at top of page.
		if ( - 1 !== slotName.indexOf('topbanner') ) {
			dfpAdUnits[ slotName ].setCollapseEmptyDiv(false);
		}

		magnitePrebid( slotName );

		dfpAdUnits[ slotName ].addService( googletag.pubads() );
		googletag.display( divId );
	} );
};

AdLayersDFPAPI.prototype.lazyLoadAd = function( args ) {
	if ( ! args.slotName ) {
		return;
	}

	if (document.getElementById('div-gpt-ad-' + args.slotName).style.visibility === 'hidden' && -1 === args.slotName.indexOf('topbanner') && 'LX' !== nbc.callLetters) {
		return;
	}

	if ( args.format ) {
		if ( ! ( dfpAdDetails && dfpAdDetails[ args.format ] ) ) {
			return;
		}
		if ( ! args.path ) {
			args.path = dfpAdDetails[ args.format ].path;
		}
		if ( ! args.sizes ) {
			args.sizes = dfpAdDetails[ args.format ].sizes;
		}
		if ( ! args.targeting ) {
			args.targeting = dfpAdDetails[ args.format ].targeting;
		}
		if ( ! args.sizeMapping ) {
			if ( dfpBuiltMappings && dfpBuiltMappings[ args.format ] ) {
				args.sizeMapping = dfpBuiltMappings[ args.format ];
			} else {
				args.sizeMapping = null;
			}
		}
	}
	return this.buildAd( args.slotName, args.path, args.sizes, args.targeting, args.sizeMapping );
};

document.addEventListener('DOMContentLoaded', function() {
	if ( document.body.classList.contains('tve-landing-page') && ('production' === nbc.env || 'stage' === nbc.env) ) {
		if (typeof adInstance === 'undefined') {
			adInstance = new AdLayersAPI();
		}
		setInterval(function(){
			magnitePrebid();
			adInstance.refreshAll('time');
		}, 120000);
	}
});

window.addEventListener('focus', function() {
	if ( 'undefined' !== typeof(adInstance) && ! document.body.classList.contains('tve-landing-page') && ('production' === nbc.env || 'stage' === nbc.env) ) {
		magnitePrebid();
		adInstance.refreshAll('focus');
	}
});
