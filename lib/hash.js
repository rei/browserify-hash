'use strict';

var fs   = require( 'fs' );
var _    = require( 'lodash' );
var md5  = require( 'md5' );
var thru = require( 'through2' );
var bsfy = require( 'browserify' );

/**
 * Generate a hash representing a Browserify bundle's source files.
 *
 * @param {String}   entryFile - Path to the Browserify bundle's entry-point
 *                               source file
 * @param {Function} cb        - Callback to call with encountered errors, and
 *                               the resulting hash
 *
 * @param {Object} opts              - Options object
 * @param {Array}  [opts.exclude=[]] - Dependencies to exclude from
 *                                     consideration, e.g., `lodash`, which can
 *                                     degrade performance
 * @param {Array}  [opts.include=[]] - Files to include from parsing, e.g.,
 *                                     `lodash`, which can degrade performance
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
                _.curry( module.exports._registerDep )( srcHashReg )
            )
        );

    // Return a hash of the sorted, concatinated dependency hashes
    b.bundle(
        _.curry( module.exports._generateHash )( opts, cb, srcHashReg )
    );
};

// Register a dependency and its source hash from the 'deps' phase of the
// Browserify pipeline. `srcHashReg` must be curried, `dep`, `enc`, and `next`
// are injected by through2.obj.
module.exports._registerDep = function ( srcHashReg, dep, enc, next ) {
    srcHashReg[ dep.id ] = md5( dep.source );
    this.push( dep );
    next();
};

// Register include files and their source hashes
module.exports._registerIncludes = function ( srcHashReg, includeFiles ) {
    _.forEach( includeFiles, function ( incFile ) {
        var incFileSrc = fs.readFileSync( incFile, 'utf8' );
        srcHashReg[ incFile ] = md5( incFileSrc );
    } );
};

// Callback for the the Browserify bundle
module.exports._generateHash = function ( opts, cb, srcHashReg, err, bundle ) {
    if ( err ) {
        return cb( err );
    }

    // Include additional modules
    module.exports._registerIncludes( srcHashReg, opts.include );

    // Sort to maintain consistent ordering
    cb(
        null,
        md5( _.values( srcHashReg ).sort().join( '' ) ),
        srcHashReg
    );
} ;
