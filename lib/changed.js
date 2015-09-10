'use strict';

var fs   = require( 'fs' );
var path = require( 'path' );
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
        return cb( entryFile + ' is not a regular file, or does not exist.' );
    }

    // Process defaults
    opts = _.defaults( opts || {}, {
        hashFile: './.bsfy-hash-reg',
        external: [],
    } );

    // If the hash registry file doesn't exist, create it, and consider it a
    // miss.
    if ( !fs.existsSync( opts.hashFile ) ) {
        fs.writeFileSync( opts.hashFile, JSON.stringify( {} ) );
        return cb( null, true );
    }

    // If the registry exists, but isn't a regular file, return with an error
    if ( !fs.lstatSync( opts.hashFile ).isFile() ) {
        return cb( opts.hashFile + ' exists, but is not a regular file.' );
    }

    // Load the hash registry, return encountered errors
    // @todo optimize disk reads 'cause it's sloooooooowww
    try {
        var hashReg = JSON.parse( fs.readFileSync( opts.hashFile, 'utf8' ) );
    } catch ( err ) {
        return cb( 'Error loading hash registry:\n\n', err.stack );
    }

    // Generate a hash and compare. If they're the same, return a hit,
    // otherwise, return a miss.
    hash( entryFile, function ( err, h ) {
        if ( err ) {
            cb ( err );
        }

        var changed = h !== hashReg[ entryFile ];

        // Update the registry
        hashReg[ entryFile ] = h;
        fs.writeFileSync( opts.hashFile, JSON.stringify( hashReg ) );

        cb( null, changed );
    }, opts );
};
