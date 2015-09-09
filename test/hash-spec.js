'use strict';

var _       = require( 'lodash' );
var pequire = require( 'proxyquire' );
var sinon   = require( 'sinon' );
var chai    = require( 'chai' );
var schai   = require( 'sinon-chai' );

// Configure Chai
chai.should();
chai.use( schai );

// Configure spies
var spies = {
    md5: sinon.stub().returns( 'md5-return' )
};

// Configure module getter
var getHash = function ( overrides ) {
    _.forEach( spies, function ( spy ) { spy.reset() } );
    return pequire( '../lib/hash', _.assign( {}, {
        md5: spies.md5
    } ) );
};

describe( 'hash', function () {

    it( 'asserts the root file path exists and is a regular file', function () {
        getHash().bind( null, 'fake-file', {}, function ( err ) {
            err.should.equal(
                'fake-file is not a regular file, or does not exist.'
            )
        } );
    } );

    it( 'returns a hash of the entry file and its dependency tree' );
} );

describe( '_depCollector', function () {

    beforeEach( function () {
        this.pushSpy = sinon.spy();
        this.nextSpy = sinon.spy();
        this.hash    = getHash();
        // Call dep collector with a custom `this` context
        this.hash._depCollector.bind( { push: this.pushSpy } )(
            { source: 'fake-dep-source' },
            null,
            this.nextSpy
        );
    } );

    it( 'hashes every dep source', function () {
        spies.md5.should.have.been.calledOnce;
        spies.md5.should.have.been.calledWith( 'fake-dep-source' );
    } );

    it( 'pushes every hashed dep source onto the hash registry', function () {
        this.hash._srcHashes.should.deep.equal( [ 'md5-return' ] );
    } );

    it( 'pushes the dep, unchanged, back onto the stream', function () {
        this.pushSpy.should.have.been.called.once;
        this.pushSpy.args[ 0 ][ 0 ]
            .should.deep.equal( { source: 'fake-dep-source' } );
    } );

    it( 'calls the `next` callback', function () {
        this.nextSpy.should.have.been.calledOnce;
    } );
} );
