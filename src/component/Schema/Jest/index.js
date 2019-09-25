import { RUNNER_PUPPETRY } from "constant";
import { renderSuiteHtml } from "./interactive-mode";
import fs from "fs";
import { join } from "path";

const NETWORK_TIMEOUT = 50000,
      INTERACTIVE_MODE_TIMEOUT = 1800000, // 30min

      normalizeName = ( str ) => {
        const re = /[^a-zA-Z0-9_-]/g;
        return str.replace( re, "--" );
      },

      readInteractAsset = ( outputDirectory, file ) => fs.readFileSync(
        join( outputDirectory, "lib", "interactive-mode", file ), "utf8"
      );


export const tplQuery = ({ target, selector }) => {
  return `const ${target} = async () => bs.query( ${ JSON.stringify( selector )}, `
    + `${ JSON.stringify( target )} );`;
};

function buildEnv( env ) {
  if ( !env || !env.variables ) {
    return "";
  }
  const body = Object.entries( env.variables )
    .map( ([ k, v ]) => `  "${ k }": "${ v }"` )
    .join( ",\n" );
  return `// Environment variables
const ENV = {
${ body }
};`;
}



export const tplSuite = ({
  title, body, targets, suite, runner, projectDirectory, outputDirectory, env, options, interactive
}) => `
/**
 * Generated by https://github.com/dsheiko/puppetry
 * on ${ String( Date() ) }
 * Suite: ${ suite.title }
 */

${ runner !== RUNNER_PUPPETRY ? `var nVer = process.version.match( /^v(\\d+)/ );
if ( !nVer || nVer[ 1 ] < 9 ) {
  console.error( "WARNING: You have an outdated Node.js version " + process.version
    + ". You need at least v.9.x to run this test suite." );
}
` : `` }

const {
        bs, util, fetch, localStorage
      } = require( "../lib/bootstrap" )( ${ JSON.stringify( normalizeName( title ) ) } ),
      devices = require( "puppeteer/DeviceDescriptors" );

${ runner === RUNNER_PUPPETRY ? `
util.setProjectDirectory( ${ JSON.stringify( projectDirectory ) } );
` : `` }

jest.setTimeout( ${ options.interactiveMode ? INTERACTIVE_MODE_TIMEOUT : ( suite.timeout || NETWORK_TIMEOUT ) } );

const consoleLog = [], // assetConsoleMessage
      dialogLog = [], // assertDialog
      responses = {}, // assert preformance budget
      resources = [];

${ buildEnv( env ) }

${ targets }

describe( ${ JSON.stringify( title ) }, async () => {
  beforeAll(async () => {
    await bs.setup();

    bs.page.on( "console", ( msg ) => consoleLog.push( msg ) );
    bs.page.on( "dialog", ( dialog ) => dialogLog.push( dialog.message() ) );

    try {
      const session = await bs.page.target().createCDPSession();

      // map responses
      session.on( "Network.responseReceived", ( e ) => {
        responses[ e.requestId ] = event.response;
      });
      // collect response details
      session.on( "Network.dataReceived", ( e ) => {
        const { url, mimeType } = responses[ e.requestId ];
        if ( url.startsWith( "data:" ) ) {
          return;
        }
        resources.push({
          url,
          mimeType,
          length: event.encodedDataLength
        });
      });

      await session.send( "Network.enable" );
    } catch( e ) {
      console.warn( e );
    }

    ${ options.interactiveMode ? `
    let stepIndex = 0;
    await bs.page.exposeFunction('setPuppetryStepIndex', index => {
      stepIndex = index;
    });

    bs.page.on( "load", async () => {
      await bs.page.addStyleTag({ content: \`${ readInteractAsset( outputDirectory, "toolbox.css" ) }\`});
      await bs.page.addScriptTag({ content: \`
        const data = ${ JSON.stringify( interactive )  };
        let stepIndex = \${ stepIndex };
        const suiteHtml = ${ JSON.stringify( renderSuiteHtml( suite ) ) };
        ${ readInteractAsset( outputDirectory, "toolbox.js" ) }\`});
    });
    ` : `` }
  });

  afterAll(async () => {
    await bs.teardown();
  });

${body}

});
`;

export const tplGroup = ({ title, body }) => `
  describe( ${ JSON.stringify( title ) }, async () => {
${body}
  });
`;

export const tplTest = ({ title, body }) => `
    test( ${ JSON.stringify( title ) }, async () => {
      let result, assert;
${body}
    });
`;