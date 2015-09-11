'use strict';

var fs      = require( 'fs-extra' );
var path    = require( 'path' );
var _       = require( 'lodash' );
var pequire = require( 'proxyquire' );
var sinon   = require( 'sinon' );
var chai    = require( 'chai' );
var schai   = require( 'sinon-chai' );

var MOD_PATH = '../lib/changed.js';
var TMP_DIR  = path.join( __dirname, 'tmp' );

// Configure Chai
chai.should();
chai.use( schai );

describe( 'changed', function () {

    var changed   = null;
    var TEST_FILE = path.join( __dirname, 'fixture/main-a.js' );

    beforeEach( function () {
        changed = require( MOD_PATH );
    } );

    afterEach( function () {
        fs.removeSync( TMP_DIR );
    } );

    describe( 'true (cache miss)', function () {
        // Hash file does not exist
        it( 'returns true if the hash file does not exist, and creates it', function ( done ) {
            var HASH_FILE = path.join( TMP_DIR, 'non-existant' );
            changed( TEST_FILE, function ( err, result ) {
                result.should.be.true;
                fs.readJsonSync( HASH_FILE ).should.deep.equal( {} );
                done();
            }, {
                hashFile: HASH_FILE
            } );
        } );

        // Entry file is not present in the hash file
        it( 'returns true if the entry file is absent from the hash file', function ( done ) {
            var HASH_FILE = path.join( TMP_DIR, 'absent' );
            fs.outputJsonSync( HASH_FILE, {
                'fake-file': 'fake-file-hash'
            } );
            changed( TEST_FILE, function ( err, result ) {
                result.should.be.true;
                fs.readJsonSync( HASH_FILE )[ 'fake-file' ].should.equal( 'fake-file-hash' );
                done();
            }, {
                hashFile: HASH_FILE
            } );
        } );

        // Entry file is present in the hash file, but hash differs
        it( 'returns true if the entry file\'s hash differs, and updates it', function ( done ) {
            var HASH_FILE = path.join( TMP_DIR, 'mismatch' );
            var testHash = {};
            testHash[ TEST_FILE ] = 'fake-file-hash';
            fs.outputJsonSync( HASH_FILE, testHash );
            changed( TEST_FILE, function ( err, result ) {
                result.should.be.true;
                fs.readJsonSync( HASH_FILE )[ TEST_FILE ].should.not.equal( testHash[ TEST_FILE ] );
                done();
            }, {
                hashFile: HASH_FILE
            } );
        } );
    } );

    describe( 'false (cache hit)', function () {
        
        // Entry file's hash matches
        it( 'returns false if the entry file\'s hash matches', function ( done ) {
            var HASH_FILE = path.join( TMP_DIR, 'match' );
            var testHash = {};
            testHash[ TEST_FILE ] = '011a059a39784c7f9f7bc6b918a7fd61';
            fs.outputJsonSync( HASH_FILE, testHash );
            changed( TEST_FILE, function ( err, result ) {
                result.should.be.false;
                fs.readJsonSync( HASH_FILE )[ TEST_FILE ].should.equal( testHash[ TEST_FILE ] );
                done();
            }, {
                hashFile: HASH_FILE
            } );
        } );
    } );
} );
