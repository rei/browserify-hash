'use strict';

var fs   = require( 'fs' );
var _    = require( 'lodash' );
var hash = require( './hash' );

/**
 * Returns if a bundle's source files have changed given its entry module. Hits
 * return false, misses return true. First-runs are misses.
 *
 * @param  {[type]}   entryFile [description]
 * @param  {[type]}   opts      [description]
 * @param  {Function} cb        [description]
 * @return {[type]}             [description]
 */
module.exports = function ( entryFile, opts, cb ) {

    // Absoluteify entryFile to maintain uniqueness
    entryFile = path.resolve( entryFile );

    // Throw error if the entry file doesn't exist
    if( !(
        fs.existsSync( entryFile ) &&
        fs.lstatSync( entryFile ).isFile()
    ) ) {
        cb( entryFile + ' is not a regular file, or does not exist.' );
    }

    // Process defaults
    opts = _.defaults( opts || {}, {
        hashFile: './.bsfy-hash-reg',
        external: [],
    } );

    // Consider missing hash registry files a miss
    if ( ! fs.existsSync( opts.hashFile ) ) {
        cb( null, true );
    }

    // If the registry exists, but isn't a regular file, return with an error
    if ( ! fs.lstatSync( opts.hashFile ).isFile() ) {
        cb( opts.hashFile + ' exists, but is not a regular file.' );
    }

    // Load the hash registry, return encountered errors
    try {
        var hashReg = require( opts.hashFile );
    } catch ( err ) {
        cb( 'Error loading hash registry:\n\n', err.stack );
    }

    // If the entryFile is missing from the registry, return with a miss
    if ( _.isUndefined( hashReg[ entryFile ] ) ) {
        cb( null, true );
    }

    // Generate a hash and compare. If they're the same, return a hit,
    // otherwise, return a miss.
    hash( entryFile, opts, function ( err, h ) {
        if ( err ) cb ( err );
        cb( h !== hashReg[ entryFile ] );
    } );
};
