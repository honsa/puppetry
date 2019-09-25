const bs = require( "./BrowserSession" ),
      { util, fetch, localStorage } = require( "./helpers" );

// Include resamble.js
require( "./bootstrap/cssRegression" )( bs, util );





/**
 * Extending Puppeteer
 */

/**
 * Evaluate the XPath expression and return the first ElementHandle
 *
 * @param {String} selector
 * @return {?ElementHandle}
 */
async function queryXpath( selector ) {
  const [ elh ] = await bs.page.$x( selector );
  return elh;
}

/**
 * Query for ElementHandle by selector or XPath
 *
 * @param {String} selector
 * @param {String} target
 * @return {?ElementHandle}
 */
bs.query = async function ( selector, target ) {
  const elh = ( selector.startsWith( "/" ) || selector.startsWith( "(.//" ) )
    ? await queryXpath( selector ) : await bs.page.$( selector );
  if ( !elh ) {
    throw new Error( "Cannot find target " + target + " (" + selector + ")" );
  }
  return elh;
};

createTargetHighlight = async ( elementHandleCb, targetName, fgColor = "red" ) => {
    const elementHandle = await elementHandleCb(),
          boundingBox = await elementHandle.boundingBox();
    if ( !boundingBox ) {
      return;
    }
    await bs.page.evaluate( ( box, targetName, fgColor ) => {
      const styles = [
        `position: absolute`,
        `z-index: 99998`,
        `left: ${ box.x }px`,
        `top: ${ box.y }px`,
        `width: ${ box.width }px`,
        `height: ${ box.height }px`,
        "overflow: hidden",
        `border: 1px dashed ${ fgColor }`,
        `outline: 1px dashed white`,
        `color: ${ fgColor }`,
        "font-size: 14px",
        "text-shadow: -1px -1px 0 #FFF, 1px -1px 0 #FFF, -1px 1px 0 #FFF, 1px 1px 0 #FFF"
      ];
      document.body.insertAdjacentHTML( "beforeend", `<div data-puppetry="__puppetry-highlight-target" `
        + `style="${ styles.join( "; " ) };">&nbsp;${ targetName }</div>` );
      return Promise.resolve();
    }, boundingBox, targetName, fgColor );
};

bs.tracePage = async ( stepId )  => {
  await bs.page.screenshot( util.tracePng( `${ stepId }` ) );
};

bs.traceTarget = async ( stepId, targetMap  )  => {
  try {
    for ( let pair of Object.entries( targetMap ) ) {
      await createTargetHighlight( pair[ 1 ], pair[ 0 ] );
    }
    await bs.page.screenshot( util.tracePng( `${ stepId }` ) );
    await bs.page.evaluate( () => {
      Array.from( document.querySelectorAll( "[data-puppetry=__puppetry-highlight-target]" ) )
        .forEach( el => el.parentNode.removeChild( el ) );
      return Promise.resolve();
    });
  } catch ( e ) {
    // ignore
  }
};


/**
 * Extending JEST
 */
const OPERATOR_MAP = {
  gt: ">",
  lt: "<",
  eq: "="
};

/**
 *
 * @param {Number} a
 * @param {String} operator
 * @param {Number} b
 * @returns {Boolean}
 */
function compare( a, operator, b ) {
  switch( operator ) {
    case "gt":
      return a > b;
    default:
      return a < b;
  }
}

/**
 * Helper
 * @param {Boolean} pass
 * @param {String} errorMsg
 * @param {String} [vsMsg]
 * @returns {Object}
 */
function expectReturn( pass, errorMsg, vsMsg = null ) {
  const negativeErrorMsg = vsMsg || errorMsg.replace( " expected ", " not expected " );
  return {
    message: () => pass ? negativeErrorMsg : errorMsg,
    pass
  };
}

function isEnabled( assert, key ) {
  if ( !assert.hasOwnProperty( "_enabled" ) ) {
    return true;
  }
  return assert.enabled[ key ];
}

expect.extend({
  /**
   * Assert value is truthy
   * @param {Boolean} received
   * @param {String} source
   * @returns {Object}
   */
  toBeOk( received, source ) {
    const pass = Boolean( received );
    return expectReturn( pass,
      `[${ source }] expected ${ JSON.stringify( received ) } to be truthy`,
      `[${ source }] expected ${ JSON.stringify( received ) } to be falsy` );
  },

  /**
   * Assert values equal
   * @param {String|Number|Boolean} received
   * @param {String|Number|Boolean} value
   * @param {String} source
   * @returns {Object}
   */
  toBeEqual( received, value, source ) {
    const pass = received === value;
    return expectReturn( pass,
      `[${ source }] expected ${ JSON.stringify( received ) } to equal ${ JSON.stringify( value ) }`,
      `[${ source }] expected ${ JSON.stringify( received ) } not to equal ${ JSON.stringify( value ) }` );
  },

   /**
   * Assert value is truthy
   * @param {Boolean} received
   * @param {*} mismatchTolerance
   * @param {String} source
   * @returns {Object}
   */
  toMatchScreenshot( received, mismatchTolerance, source ) {
    const pass = Number( received ) === 0;
    return expectReturn( pass,
      `[${ source }] expected to satisfy mismatch tolerance of ${ mismatchTolerance }`,
      `[${ source }] expected `
        + `not to satisfy mismatch tolerance of ${ mismatchTolerance }` );
  },

  /**
   * Assert that string includes substring
   * @param {String} received
   * @param {String} substring
   * @param {String} source
   * @returns {Object}
   */
  toIncludeSubstring( received, substring, source ) {
    const pass = received.includes( substring );
    return expectReturn( pass,
      `[${ source }] expected "${received}" to contain "${substring}"`,
      `[${ source }] expected "${received}" not to contain "${substring}"` );
  },

 /**
   * Assert that at least one element of passed array includes substring
   * @param {String} received
   * @param {String} substring
   * @param {String} source
   * @returns {Object}
   */
  toHaveString( received, substring, source ) {
    const pass = received.some( string => string === substring ),
          receivedPrint = `[${ received.join(",").substr( 0, 128 ) }..]`;
    return expectReturn( pass,
      `[${ source }] expected "${ receivedPrint }" to have "${substring}"`,
      `[${ source }] expected "${ receivedPrint }" not to have "${substring}"` );
  },

   /**
   * Assert that at least one element of passed array includes substring
   * @param {String} received
   * @param {String} substring
   * @param {String} source
   * @returns {Object}
   */
  toHaveSubstring( received, substring, source ) {
    const pass = received.some( string => string.includes( substring ) ),
          receivedPrint = `[${ received.join(",").substr( 0, 128 ) }..]`;
    return expectReturn( pass,
      `[${ source }] expected "${ receivedPrint }" to contain "${substring}"`,
      `[${ source }] expected "${ receivedPrint }" not to contain "${substring}"` );
  },

  /**
   * Asser condition
   * @param {Number} rawReceived
   * @param {String} operator
   * @param {Number} rawValue
   * @param {String} source
   * @returns {Object}
   */
  toPassCondition( rawReceived, operator, rawValue, source ) {
    const received = parseInt( rawReceived, 10 ),
          value = parseInt( rawValue, 10 ),
          pass = operator === "eq"
            ? received === value
            : ( operator === "gt" ? received > value : received < value );

    return expectReturn( pass,
      `[${ source }] expected ${ received } ${ OPERATOR_MAP[ operator ] } ${ value }` );
  },

  /**
   * Assert the received bounding box satisfies the snapshot
   * @param {Object} received
   * @param {Object} snapshot
   * @param {String} source
   * @returns {Object}
   */
  toMatchBoundingBoxSnapshot( received, snapshot, source ) {
    const x = compare( received.x, snapshot.xOperator, parseInt( snapshot.xValue, 10 ) ),
          y = compare( received.y, snapshot.yOperator, parseInt( snapshot.yValue, 10 ) ),
          w = compare( received.width, snapshot.wOperator, parseInt( snapshot.wValue, 10 ) ),
          h = compare( received.height, snapshot.hOperator, parseInt( snapshot.hValue, 10 ) );


    if ( isEnabled( snapshot, "xValue" ) && !x ) {
      return expectReturn( x,
        `[${ source }] expected for box.x: ${received.x} ${OPERATOR_MAP[snapshot.xOperator]} ${snapshot.xValue}` );
    }
    if ( isEnabled( snapshot, "yValue" ) && !y ) {
      return expectReturn( y,
        `[${ source }] expected for box.y: ${received.y} ${OPERATOR_MAP[snapshot.yOperator]} ${snapshot.yValue}` );
    }
    if ( isEnabled( snapshot, "wValue" ) &&!w ) {
      return expectReturn( w,
        `[${ source }] expected for box.width: `
          + `${received.width} ${OPERATOR_MAP[snapshot.wOperator]} ${snapshot.wValue}` );
    }
    if ( isEnabled( snapshot, "hValue" ) && !h ) {
      return expectReturn( h,
        `[${ source }] expected for box.height: ${received.height}`
          + ` ${OPERATOR_MAP[snapshot.hOperator]} ${snapshot.hValue}` );
    }
    return expectReturn( true, `` );
  },

  /**
   * Assert position
   *
   * @param {Object} received
   * @param {String} position
   * @param {Object} target
   * @param {Object} counterpart
   * @param {String} source
   * @returns {Object}
   */
  toMatchPosition( received, position, target, counterpart, source ) {
    const a = received.target,
          b = received.counterpart;
    let pass;
    switch ( position ) {
      case "above":
        pass = a.y + a.height <= b.y;
        if ( !pass ) {
          return expectReturn( pass, `[${ source }] expected ${ target } (y=${ a.y }, height=${ a.height }) `
            + `is above ${ counterpart } (y=${ b.y })` );
        }
        break;
      case "below":
        pass = a.y >= b.y + b.height;
        if ( !pass ) {
          return expectReturn( pass, `[${ source }] expected ${ target } (y=${ a.y }) is below ${ counterpart } `
            + `(y=${ b.y }, height=${ b.height }) ` );
        }
        break;
      case "left":
        pass = a.x + a.width <= b.x;
        if ( !pass ) {
          return expectReturn( pass, `[${ source }] expected ${ target } `
            + `(x=${ a.x }, width=${ a.width }) `
            + `is left to ${ counterpart } (x=${ b.x })` );
        }
        break;
      case "right":
        pass = a.x >= b.x + b.width;
        if ( !pass ) {
          return expectReturn( pass, `[${ source }] expected ${ target } (x=${ a.x }) is right to ${ counterpart } `
            + `(x=${ b.x }, width=${ b.width })` );
        }
        break;
    }
    return expectReturn( true, `` );
  }

});

module.exports = ( ns ) => {
  // create namespace-dependent image options creator
  util.setSuiteName( ns );
  return {
    bs,
    util,
    fetch,
    localStorage
  };
};