'use strict';

var fs   = require( 'fs-extra' );
var path = require( 'path' );
var _    = require( 'lodash' );
var hash = require( './hash' );

/**
 * Returns if a bundle's source files have changed given its entry module. Hits
 * return false, misses return true. First-runs are always misses.
 *
 * @param {String}   entryFile - Path to the Browserify bundle's entry-point
 *                               source file
 * @param {Function} cb        - Callback to call with encountered errors, and
 *                               the resulting hash
 *
 * @param {Object} opts                    - Options object
 * @param {Object} [opts.skipMissing=true] - Skip mising files
 * @param {String} [hashFile='.bsfy-hash'] - JSON file to store the hashes to
 *                                           detect changes between runs
 * @param {Array}  [opts.exclude=[]]       - Dependencies to exclude from
 *                                           consideration
 * @param {Array}  [opts.include=[]]       - Additional files to include in the
 *                                           dep tree
 */
module.exports = function ( entryFile, cb, opts ) {

    // Absoluteify entryFile to maintain uniqueness
    entryFile = path.resolve( entryFile );

    // Process options
    opts = _.isPlainObject( opts ) ? opts : {};
    opts = _.defaults( opts, {
        skipMissing: true
    } );

    // Assume missing entry files always change, or throw error if the file
    // doesn't exist
    if ( !fs.existsSync( entryFile ) ) {
        if ( opts.skipMissing ) {
            return cb( null, true );
        }
        return cb( entryFile + ' does not exist.' );
    }

    if( !fs.lstatSync( entryFile ).isFile() ) {
        return cb( entryFile + ' is not a regular file.' );
    }

    // Process defaults
    opts = _.isPlainObject( opts ) ? opts : {};
    opts = _.defaults( opts, {
        hashFile: '.bsfy-hash'
    } );

    // If the hash registry file doesn't exist, create it, generate a hash, and
    // consider it a miss.
    if ( !fs.existsSync( opts.hashFile ) ) {
        return hash( entryFile, function ( err, result ) {
            if ( err ) {
                return cb( err );
            }

            // Save the hash to the new file
            var hashPair = {};
            hashPair[ entryFile ] = result;
            fs.outputJsonSync( opts.hashFile, hashPair );

            return cb( null, true );
        }, opts );
    }

    // If the registry exists, but isn't a regular file, return with an error
    if ( !fs.lstatSync( opts.hashFile ).isFile() ) {
        return cb( opts.hashFile + ' exists, but is not a regular file.' );
    }

    // Load the hash registry, return encountered errors
    // @todo optimize disk reads 'cause it's sloooooooowww
    try {
        var hashReg = fs.readJsonSync( opts.hashFile );
    } catch ( err ) {
        return cb( 'Error loading hash registry:\n\n' + err.stack );
    }

    // Generate a hash and compare. If they're the same, return a hit,
    // otherwise, return a miss.
    return hash( entryFile, function ( err, result ) {
        if ( err ) {
            return cb( err );
        }

        // Has the bundle changed?
        var changed = result !== hashReg[ entryFile ];

        // Update the registry
        hashReg[ entryFile ] = result;
        fs.outputJsonSync( opts.hashFile, hashReg );

        cb( null, changed );
    }, opts );
};
