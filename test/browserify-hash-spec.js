'use strict';

/**
 * Test high-level functionality
 */

var path   = require( 'path' );
var _      = require( 'lodash' );
var expect = require( 'chai' ).expect;

describe( 'browserify-hash', function () {

    beforeEach( function () {
        this.bsfyHash = require( '../index.js' );
    } );

    describe( 'hash', function () {

        it( 'generates a hash of a browserify module\'s source files', function ( done ) {
            this.timeout( 4000 );
            var TEST_FILE = path.join( __dirname, 'fixture/main-a.js' );
            this.bsfyHash.hash( TEST_FILE, function ( err, result, reg ) {
                expect( result ).to.equal( 'fbaf48ec981a5eecdb57b929fdd426e8' );
                done();
            } );
        } );

        xit( 'allows you to exclude dependencies', function ( done ) {
            this.timeout( 4000 );
            var TEST_FILE = path.join( __dirname, 'fixture/main-a.js' );
            var EXCLUDES  = _.keys(
                require(
                    path.join( __dirname, '../package.json' )
                ).dependencies
            );
            this.bsfyHash.hash( TEST_FILE, function ( err, result, reg ) {
                //console.log( err, result, reg )
                expect( result ).to.equal( 'fbaf48ec981a5eecdb57b929fdd426e8' );
                done();
            }, {
                exclude: EXCLUDES
            } );
        } );
    } );

    describe( 'changed', function () {

    } );
} );
