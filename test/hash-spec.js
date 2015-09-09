'use strict';

var _       = require( 'lodash' );
var pequire = require( 'proxyquire' );
var sinon   = require( 'sinon' );
var chai    = require( 'chai' );
var schai   = require( 'sinon-chai' );

// Configure Chai
var expect = chai.expect;
chai.use( schai );

var getDepTree = function ( overrides ) {
    return pequire( '../lib/hash', {

    } );
};

describe( 'hash', function () {

    it( 'asserts the root file path exists and is a regular file', function () {
        getDepTree().bind( null, 'fake-file', {}, function ( err ) {
            expect( err ).to.equal(
                'fake-file is not a regular file, or does not exist.'
            )
        } );
    } );
} );
