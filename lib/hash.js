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

    // Source file hash registry
    var srcHashReg = {};

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
    b.pipeline
        .get( 'deps' )
        .push(
            thru.obj(
                _.curry( module.exports._depCollector )( srcHashReg )
            )
        );

    // Return a hash of the sorted, concatinated dependency hashes
    b.bundle(
        _.curry( module.exports._generateHash )( opts, cb, srcHashReg )
    );
};

// Collect each dependency's source hash
module.exports._depCollector = function ( srcHashReg, dep, enc, next ) {
    srcHashReg[ dep.id ] = md5( dep.source );
    this.push( dep );
    next();
};

// Callback for the the bsfy bundle
module.exports._generateHash = function ( opts, cb, srcHashReg, err, bundle ) {
    if ( err ) {
        return cb( err );
    }

    // Include additional modules
    _.forEach( opts.include, function ( incFile ) {
        var incFileSrc = fs.readFileSync( incFile, 'utf8' );
        srcHashReg[ incFile ] = md5( incFileSrc );
    } );

    // Sort to maintain consistent ordering
    cb(
        null,
        md5( _.values( srcHashReg ).sort().join( '' ) ),
        srcHashReg
    );
} ;
