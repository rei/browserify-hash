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
    lodash_defaults: sinon.stub().returns( {
        external: [],
        include:  []
    } ),
    md5: sinon.stub().returns( 'md5-return' )
};

// Configure happy-path dependencies
var HAPPY_DEPS = {
    fs: {
        existsSync: function () {
            return true;
        },
        lstatSync: function () {
            return {
                isFile: function () {
                    return true;
                }
            };
        }
    },
    lodash: _.assign( {}, _, {
        defaults: spies.lodash_defaults
    } ),
    md5: spies.md5
};

// Configure module getter
var getHash = function ( overrides ) {
    _.forEach( spies, function ( spy ) { spy.reset() } );
    return pequire( '../lib/hash', _.assign( {}, HAPPY_DEPS, overrides ) );
};

describe( 'hash', function () {

    beforeEach( function () {
        //this.hash = getHash();
    } );

    it( 'asserts the root file path exists and is a regular file', function () {
        var ERR_MSG = 'fake-file is not a regular file, or does not exist.';
        getHash( {
            fs: _.assign( {}, HAPPY_DEPS.fs, {
                existsSync: function () {
                    return false;
                }
            } )
        } )( 'fake-file', {}, function ( err ) {
            err.should.equal( ERR_MSG );
        } );

        getHash( {
            fs: _.assign( {}, HAPPY_DEPS.fs, {
                lstatSync: function () {
                    return {
                        isFile: function () {
                            return false;
                        }
                    };
                }
            } )
        } )( 'fake-file', {}, function ( err ) {
            err.should.equal( ERR_MSG );
        } );
    } );

    it( 'defaults undefined options', function () {
        getHash()( 'fake-file', { fake: 'option' }, _.noop );
        spies.lodash_defaults.should.be.calledOnce;
        spies.lodash_defaults.args[ 0 ][ 0 ].should.deep.equal( {
            fake: 'option'
        } );
        spies.lodash_defaults.args[ 0 ][ 1 ].should.deep.equal( {
            external: [],
            include:  []
        } );
    } );

    it( 'creates a new bsfy instance with the entry file' );

    it( 'pushes the dep collector onto the `deps` pipeline phase' );

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
