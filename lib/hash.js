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
module.exports = function ( entryFile, cb, opts ) {

    // Throw error if the entry file doesn't exist
    if( !(
        fs.existsSync( entryFile ) &&
        fs.lstatSync( entryFile ).isFile()
    ) ) {
        return cb( entryFile + ' is not a regular file, or does not exist.' );
    }
    // Process defaults
    opts = _.isPlainObject( opts ) ? opts : {};
    opts = _.defaults( opts, {
        exclude: [],
        include: []
    } );

    // Instantiate a new browserify object with the entry module
    var b = bsfy( entryFile );

    // Exclude external deps
    b.external( opts.exclude );

    // Collect all bundle dependency sources
    b.pipeline.get( 'deps' ).push( thru.obj( module.exports._depCollector ) );

    // Return a hash of the sorted, concatinated dependency hashes. (Sort to
    // maintain consistent ordering.)
    b.bundle( _.curry( module.exports._bundler ) ( opts, cb ) );
};

// Source file hash registry
module.exports.srcHashReg = {};

// Collect each dependency's source hash
module.exports._depCollector = function ( dep, enc, next ) {
    module.exports.srcHashReg[ dep.id ] = md5( dep.source );
    this.push( dep );
    next();
};

// Callback for the the bsfy bundle
module.exports._bundler = function ( opts, cb, err, bundle ) {
    if ( err ) {
        return cb( err );
    }

    // Include additional modules
    opts.include.forEach( function ( incFile ) {
        var incFileSrc = fs.readFileSync( incFile, 'utf8' );
        module.exports.srcHashReg[ incFile ] = md5( incFileSrc );
    } );

    cb(
        null, 
        md5( _.values( module.exports.srcHashReg ).sort() ),
        module.exports.srcHashReg
    );
} ;
