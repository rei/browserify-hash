'use strict';

/**
 * Hash a Browserify module's and its dependency tree
 */

var md5         = require( 'md5' );
var dtree       = require( './lib/dep-tree' );
var readFiles   = require( './lib/read-files' );

/**
 * Return the MD5 hash value of a JS module and its dependency tree
 * concatinated.
 *
 * @param  {String} rootFile - Path to the entry point module.
 * @return {String} - The MD5 hash of the `rootFile` module and its dependency
 *                    tree concatinated
 */
module.exports = function ( rootFile ) {

    // 1. Get the entire dependency tree

    // 2. Reduce dep tree to a list of files

    // 3. Concatinate all files

    // 4. Return MD5 hash
};
