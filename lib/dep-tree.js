'use strict';

var fs    = require( 'fs' );
var madge = require( 'madge' );

/**
 * Return the dependency tree of root module
 * @return {[type]} [description]
 */
module.exports = function ( rootModulePath ) {

    if( !(
        fs.existsSync( rootModulePath ) &&
        fs.lstatSync( rootModulePath ).isFile()
    ) ) {
        throw new Error( rootModulePath + ' is not a regular file, or does not exist.' );
    }

    madge( rootModulePath ).tree
};
