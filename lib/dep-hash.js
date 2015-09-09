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
 * @throws {Error} if `entryFile` is not a regular file
 */
module.exports = function ( entryFile, opts, cb ) {

    // Throw error if the entry file doesn't exist
    if( !(
        fs.existsSync( entryFile ) &&
        fs.lstatSync( entryFile ).isFile()
    ) ) {
        throw new Error( entryFile + ' is not a regular file, or does not exist.' );
    }

    // Process defaults
    opts = _.defaults( opts || {}, {
        external: []
    } );

    var b = bsfy( entryFile );

    // Exclude external deps
    b.external( opts.external );

    // Collect all bundle dependency sources
    b.pipeline.get( 'deps' ).push( thru.obj( module.exports._depCollector ) );

    // Hash concatinated dependency sources
    b.bundle( function ( err, bundle ) {
        if ( err ) cb( err );

        // Sort the source hashes to maintain order consistency
        module.exports._srcHashes.sort();
        var allHashes = _.reduce( module.exports._srcHashes, function ( allHashes, hash ) {
            return allHashes += hash;
        } );

        console.log( module.exports._srcHashes );
        console.log( 'Hash:', md5( allHashes ) );
    } );
};

// Source file hash registry
module.exports._srcHashes = [];

// Collect each dependency's source hash
module.exports._depCollector = function ( dep, enc, next ) {
    console.log( 'Processing', dep.id );
    module.exports._srcHashes.push( md5( dep.source ) );
    this.push( dep );
    next();
};

var external = [ 'lodash', 'browserify', 'md5' ];
module.exports( './test/fixture/main-a.js', { external: external } );
