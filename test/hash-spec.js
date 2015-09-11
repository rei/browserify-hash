'use strict';

var path    = require( 'path' );
var _       = require( 'lodash' );
var pequire = require( 'proxyquire' );
var sinon   = require( 'sinon' );
var chai    = require( 'chai' );
var schai   = require( 'sinon-chai' );

var md5     = require( 'md5' );

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
    return overrides === 'clean' ?
        require( MOD_PATH ) :
        pequire( MOD_PATH, _.assign( {}, HAPPY_DEPS, overrides ) );
};

describe( 'hash', function () {

    // Integration tests to test high-level functionality
    describe.only( 'integration', function () {

        // Return a normalized registry structure to ease registry assertions
        var normalizeRegistry = function ( reg ) {
            return {
                paths:
                    _.reduce(
                        _.keys( reg ),
                        function ( relPaths, absPath ) {
                            relPaths.push( path.relative( __dirname, absPath ) );
                            return relPaths;
                        },
                        []
                    ).sort(),
                hashes: _.values( reg ).sort()
            };
        };

        beforeEach( function () {
            // Get a clean, real-world module
            this.hash = getHash( 'clean' );
        } );

        it( 'generates a hash of a browserify module\'s source files', function ( done ) {
            var TEST_FILE = path.join( __dirname, 'fixture/main-a.js' );
            this.hash( TEST_FILE, function ( err, result, reg ) {
                result.should.equal( '011a059a39784c7f9f7bc6b918a7fd61' );
                done();
            } );
        } );

        it( 'generates a unique hash when any file is changed', function ( done ) {
            var TEST_FILE = path.join( __dirname, 'fixture/main-b.js' );
            this.hash( TEST_FILE, function ( err, result, reg ) {
                result.should.equal( 'c4b78742d716762b30780e9428b85631' );
                done();
            } );
        } );

        it( 'includes a registry of dependencies and their hashes', function ( done ) {
            var TEST_FILE = path.join( __dirname, 'fixture/main-a.js' );
            this.hash( TEST_FILE, function ( err, result, reg ) {
                var nreg = normalizeRegistry( reg );
                nreg.paths.should.deep.equal( [
                    'fixture/lib/circle.js',
                    'fixture/lib/oval.js',
                    'fixture/lib/rect.js',
                    'fixture/lib/shape.js',
                    'fixture/lib/square-a.js',
                    'fixture/main-a.js',
                    'fixture/node_modules/foo/index.js'
                ] );
                nreg.hashes.should.deep.equal( [
                    '0f3f1445aeb4e2c712bbae776d4bb875',
                    '298f124c79ceff9ca0c4ffba7f14c80f',
                    '4ed47e3c525512b28c12250a4b7dfc51',
                    '5a1f16df82c5491485c255004d550127',
                    'e72034e8b4859e23df35c1e680377cec',
                    'f904b79cdca12e6f36d5ce6e67c4fe71',
                    'fdc6f4810e3bf14253a020bec3ba9c70'
                ] );
                done();
            } );
        } );

        it( 'allows you to exclude dependencies', function ( done ) {
            var TEST_FILE = path.join( __dirname, 'fixture/main-a.js' );
            var EXCLUDES  = [ 'foo' ];
            this.hash( TEST_FILE, function ( err, result, reg ) {
                var nreg = normalizeRegistry( reg );
                nreg.paths.should.deep.equal( [
                    'fixture/lib/circle.js',
                    'fixture/lib/oval.js',
                    'fixture/lib/rect.js',
                    'fixture/lib/shape.js',
                    'fixture/lib/square-a.js',
                    'fixture/main-a.js'
                    // No 'foo' here
                ] );
                nreg.hashes.should.deep.equal( [
                    '298f124c79ceff9ca0c4ffba7f14c80f',
                    '4ed47e3c525512b28c12250a4b7dfc51',
                    '5a1f16df82c5491485c255004d550127',
                    'e72034e8b4859e23df35c1e680377cec',
                    'f904b79cdca12e6f36d5ce6e67c4fe71',
                    'fdc6f4810e3bf14253a020bec3ba9c70'
                ] );
                result.should.equal(
                    '9557f6935ac6cb47a60cc3a89bbbc336'
                );
                done();
            }, {
                exclude: EXCLUDES
            } );
        } );

        it( 'allows you to include arbitrary files', function ( done ) {
            var TEST_FILE = path.join( __dirname, 'fixture/main-a.js' );
            var INCLUDES  = [ path.join( __dirname, 'fixture/unrelated.txt' ) ];
            this.hash( TEST_FILE, function ( err, result, reg ) {
                var nreg = normalizeRegistry( reg );
                nreg.paths.should.deep.equal( [
                    'fixture/lib/circle.js',
                    'fixture/lib/oval.js',
                    'fixture/lib/rect.js',
                    'fixture/lib/shape.js',
                    'fixture/lib/square-a.js',
                    'fixture/main-a.js',
                    'fixture/node_modules/foo/index.js',
                    'fixture/unrelated.txt' // Added file
                ] );
                nreg.hashes.should.deep.equal( [
                    '0f3f1445aeb4e2c712bbae776d4bb875',
                    '298f124c79ceff9ca0c4ffba7f14c80f',
                    '4ed47e3c525512b28c12250a4b7dfc51',
                    '5a1f16df82c5491485c255004d550127',
                    'e72034e8b4859e23df35c1e680377cec',
                    'e775be988fa4371b0a7d90a1a239d380',
                    'f904b79cdca12e6f36d5ce6e67c4fe71',
                    'fdc6f4810e3bf14253a020bec3ba9c70'
                ] );
                result.should.equal(
                    'c00ba07b0d3101a8a02a24eb68766acf'
                );
                done();
            }, {
                include: INCLUDES
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
