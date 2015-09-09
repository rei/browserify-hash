'use strict';

var fs   = require( 'fs' );
var _    = require( 'lodash' );
var md5  = require( 'md5' );
var thru = require( 'through2' );
var bsfy = require( 'browserify' );

/**
 * Generate a hash representing a Browserify bundle's source files.
 *
 * @param  {String} entryFile - Path to the Browserify bundle's entry point
 * @return {String} - A hash representing the entry module
 */
module.exports = function ( entryFile, opts, cb ) {

    // Throw error if the entry file doesn't exist
    if( !(
        fs.existsSync( entryFile ) &&
        fs.lstatSync( entryFile ).isFile()
    ) ) {
        cb( entryFile + ' is not a regular file, or does not exist.' );
    }

    // Process defaults
    opts = _.defaults( opts || {}, {
        external: []
    } );

    // Instantiate a new browserify object with the entry module
    var b = bsfy( entryFile );

    // Exclude external deps
    b.external( opts.external );

    // Collect all bundle dependency sources
    b.pipeline.get( 'deps' ).push( thru.obj( module.exports._depCollector ) );

    // Return a hash of the sorted, concatinated dependency hashes. (Sort to
    // maintain consistent ordering.)
    b.bundle( function ( err, bundle ) {
        if ( err ) cb( err );
        cb( null, md5( module.exports._srcHashes.sort().join() ) );
    } );
};

// Source file hash registry
module.exports._srcHashes = [];

// Collect each dependency's source hash
module.exports._depCollector = function ( dep, enc, next ) {
    module.exports._srcHashes.push( md5( dep.source ) );
    this.push( dep );
    next();
};
