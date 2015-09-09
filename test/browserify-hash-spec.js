'use strict';

var _       = require( 'lodash' );
var pequire = require( 'proxyquire' );
var sinon   = require( 'sinon' );
var chai    = require( 'chai' );
var schai   = require( 'sinon-chai' );

// Configure Chai
var expect  = chai.expect;
chai.use( schai );

var getDepTree = function ( overrides ) {
    return pequire( '../lib/dep-tree', {

    } );
};

describe( 'dep-tree', function () {

    it( 'asserts the root file path exists and is a regular file', function () {
        expect( getDepTree().bind( null, 'fake-file' ) )
            .to.throw( 'fake-file is not a regular file, or does not exist.' );
    } );

    
} );
