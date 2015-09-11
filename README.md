# browserify-hash

> Detect changes to a Browserify bundle's source files

Browserify-hash detects changes in a Browserify bundle's source files by
generating and comparing a hash for the entry module and its dependency tree.

## Status

Work in progress. Check back later :)

## API

Begin by requiring browserify-hash:

```js
var bsfyHash = require( 'browserify-hash' );
```

### `bsfyHash.changed( entryModule, opts, cb )`

```
/**
 * Returns if a bundle's source files have changed given its entry module. Hits
 * return false, misses return true. First-runs are always misses.
 *
 * @param {String}   entryFile - Path to the Browserify bundle's entry-point
 *                               source file
 * @param {Function} cb        - Callback to call with encountered errors, and
 *                               the resulting hash
 *
 * @param {Object} opts                    - Options object
 * @param {String} [hashFile='.bsfy-hash'] - JSON file to store the hashes to
 *                                           detect changes between runs
 * @param {Array}  [opts.exclude=[]]       - Dependencies to exclude from
 *                                           consideration
 * @param {Array}  [opts.include=[]]       - Additional files to include in the
 *                                           dep tree
 */
```

### `bsfyHash.hash( entryModule, opts, cb )`

```
/**
 * Generate a hash representing a Browserify bundle's source files.
 *
 * @param {String}   entryFile - Path to the Browserify bundle's entry-point
 *                               source file
 * @param {Function} cb        - Callback to call with encountered errors, the
 *                               resulting hash, and the raw dependency path ->
 *                               source hash object
 *
 * @param {Object} opts              - Options object
 * @param {Array}  [opts.exclude=[]] - Dependencies to exclude from
 *                                     consideration, e.g., `lodash`, which can
 *                                     degrade performance
 * @param {Array}  [opts.include=[]] - Additional files to include in the dep
 *                                     tree
 */
```

## Resources

- [The Browserify Handbook](https://github.com/substack/browserify-handbook)

## License

MIT
