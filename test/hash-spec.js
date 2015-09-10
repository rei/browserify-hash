'use strict';

var path    = require( 'path' );
var _       = require( 'lodash' );
var pequire = require( 'proxyquire' );
var sinon   = require( 'sinon' );
var chai    = require( 'chai' );
var schai   = require( 'sinon-chai' );

var MOD_PATH = '../lib/hash.js';

// Configure Chai
chai.should();
chai.use( schai );

// Configure spies
var spies = {};
spies.lodash_defaults        = sinon.spy( _.defaults );
spies.md5                    = sinon.stub().returns( 'md5-return' );
spies.thru_obj               = sinon.spy();
spies.bsfy_bundle            = sinon.spy();
spies.bsfy_pipeline_get_push = sinon.spy();
spies.bsfy_pipeline_get      = sinon.stub().returns( {
    push: spies.bsfy_pipeline_get_push
} );
spies.bsfy_external = sinon.spy();
spies.bsfy = sinon.stub().returns( {
    external: spies.bsfy_external,
    pipeline: {
        get: spies.bsfy_pipeline_get
    },
    bundle: spies.bsfy_bundle
} );

// Configure happy-path dependencies
var HAPPY_DEPS = {
    fs: {
        existsSync: function () {
            return true;
        },
        lstatSync:  function () {
            return {
                isFile: function () {
                    return true;
                }
            };
        }
    },
    lodash: _.assign( {}, _, {
        defaults: spies.lodash_defaults,
        curry:    _.curry
    } ),
    md5: spies.md5,
    through2: {
        obj: spies.thru_obj
    },
    browserify: spies.bsfy
};

// Configure module getter
var getHash = function ( overrides ) {
    _.forEach( spies, function ( spy ) { spy.reset() } );
    return pequire( MOD_PATH, _.assign( {}, HAPPY_DEPS, overrides ) );
};

describe( 'hash', function () {

    // Integration tests to test high-level functionality
    describe( 'integration', function () {

        beforeEach( function () {
            // Get a clean, real-world module
            this.hash = require( MOD_PATH );
        } );

        it( 'generates a hash of a browserify module\'s source files', function ( done ) {
            this.timeout( 5000 );

            var TEST_FILE = path.join( __dirname, 'fixture/main-a.js' );
            this.hash( TEST_FILE, function ( err, result, reg ) {
                result.should.equal( 'fbaf48ec981a5eecdb57b929fdd426e8' );
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
            this.hash.hash( TEST_FILE, function ( err, result, reg ) {
                //console.log( err, result, reg )
                result.should.equal( 'fbaf48ec981a5eecdb57b929fdd426e8' );
                done();
            }, {
                exclude: EXCLUDES
            } );
        } );
    } );

    it( 'asserts the root file path exists and is a regular file', function () {
        var ERR_MSG = 'fake-file is not a regular file, or does not exist.';
        getHash( {
            fs: _.assign( {}, HAPPY_DEPS.fs, {
                existsSync: function () {
                    return false;
                }
            } )
        } )( 'fake-file', function ( err ) {
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
        } )( 'fake-file', function ( err ) {
            err.should.equal( ERR_MSG );
        } );
    } );

    it( 'defaults undefined options', function () {
        getHash()( 'fake-file', _.noop );
        spies.lodash_defaults.should.be.calledOnce;
        spies.lodash_defaults.args[ 0 ][ 1 ].should.deep.equal( {
            exclude: [],
            include: []
        } );
    } );

    it( 'creates a new bsfy instance with the entry file', function () {
        getHash()( 'fake-file', _.noop );
        spies.bsfy.should.be.calledOnce;
        spies.bsfy.should.be.calledWith( 'fake-file' );
    } );

    it( 'tells bsfy to ignore excluded files', function () {
        getHash()( 'fake-file', _.noop, {
            exclude: [
                'fake-dep-a',
                'fake-dep-b'
            ]
        } );
        spies.bsfy_external.should.be.calledOnce;
        spies.bsfy_external.args[ 0 ][ 0 ].should.deep.equal( [
            'fake-dep-a',
            'fake-dep-b'
        ] );
    } );

    it( 'pushes the dep collector onto the `deps` pipeline phase', function () {
        var thruObjSpy = sinon.spy( function ( cb ) {
            cb().should.equal( 'dep-collector-return' );
            return 'thru-return';
        } );
        var hash = getHash( {
            through2: {
                obj: thruObjSpy
            }
        } );
        var depCollectorStub = sinon.stub( hash, '_depCollector' )
            .returns( 'dep-collector-return' );

        hash()

        thruObjSpy.should.have.been.calledOnce;

        spies.bsfy_pipeline_get_push.should.have.been.calledOnce;
        spies.bsfy_pipeline_get_push.should.have.been.calledWith( 'thru-return' );

        spies.bsfy_pipeline_get.should.have.been.calledOnce;
        spies.bsfy_pipeline_get.should.have.been.calledWith( 'deps' );
    } );

    it( 'calls the bundle handler', function () {
        var bundleSpy = sinon.spy( function ( cb ) {
            cb( null, null ).should.equal( 'bundler-return' );
            return 'bundler-return';
        } );
        var hash = getHash( {
            browserify: function () {
                return _.assign( {}, spies.bsfy(), {
                    bundle: bundleSpy
                } )
            }
        } );
        var bundlerStub = sinon.stub( hash, '_bundler', function ( opts, cb, err, bundle ) {
            return 'bundler-return';
        } )

        hash();
    } );
} );

describe( '_depCollector', function () {

    beforeEach( function () {
        this.pushSpy = sinon.spy();
        this.nextSpy = sinon.spy();
        this.hash    = getHash();
        // Call dep collector with a custom `this` context
        this.hash._depCollector.bind( { push: this.pushSpy } )(
            {
                id:     'fake-dep-id',
                source: 'fake-dep-source'
            },
            null,
            this.nextSpy
        );
    } );

    it( 'hashes every dep source', function () {
        spies.md5.should.have.been.calledOnce;
        spies.md5.should.have.been.calledWith( 'fake-dep-source' );
    } );

    it( 'pushes every hashed dep source onto the hash registry', function () {
        this.hash.srcHashReg.should.deep.equal( {
            'fake-dep-id': 'md5-return'
        } );
    } );

    it( 'pushes the dep, unchanged, back onto the stream', function () {
        this.pushSpy.should.have.been.called.once;
        this.pushSpy.args[ 0 ][ 0 ]
            .should.deep.equal( {
                id:     'fake-dep-id',
                source: 'fake-dep-source'
            } );
    } );

    it( 'calls the `next` callback', function () {
        this.nextSpy.should.have.been.calledOnce;
    } );
} );
