'use strict';

var fs   = require( 'fs' );
var path = require( 'path' );
var _    = require( 'lodash' );
var md5  = require( 'md5' );
var thru = require( 'through2' );
var bsfy = require( 'browserify' );

/**
 * Generate a hash representing a Browserify bundle's source files.
 *
 * @param {String}   entryFile - Path to the Browserify bundle's entry-point
 *                               source file
 * @param {Function} cb        - Callback to call with encountered errors, the
 *                               resulting hash, and the raw dependency path ->
 *                               source hash object
 *
 * @param {Object} opts                     - Options object
 * @param {Object} [opts.bsfy=browserify()] - Provide your own configured
 *                                        Browserify instance.
 * @param {Array}  [opts.exclude=[]]      - Dependencies to exclude from
 *                                        consideration, e.g., `lodash`, which
 *                                        can degrade performance
 * @param {Array}  [opts.include=[]]      - Additional files to include in the
 *                                        dep tree
 */
module.exports = function ( entryFile, cb, opts ) {

    // Source file hash registry
    var srcHashReg = {};

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
    opts = _.isPlainObject( opts ) ? opts : {};
    opts = _.defaults( opts, {
        bsfy:    bsfy(),
        exclude: [],
        include: []
    } );

    // Add the entry module
    opts.bsfy.add( entryFile );

    // Exclude external deps
    opts.bsfy.external( opts.exclude );

    // Collect all bundle dependency sources
    opts.bsfy.pipeline
        .get( 'deps' )
        .push(
            thru.obj(
                _.curry( module.exports._registerDep )( srcHashReg )
            )
        );

    // Return a hash of the sorted, concatinated dependency hashes
    return opts.bsfy.bundle(
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
