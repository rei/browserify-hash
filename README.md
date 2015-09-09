# browserify-hash

> Hash a Browserify module's dependency tree

Browserify-hash tells you if a Browserify module needs to be built by hashing
the module's dependency tree.

## Status

Work in progress. Check back later :)

## API

Begin by requiring browserify-hash:

```js
var bsfyHash = require( 'browserify-hash' );
```

### `bsfyHash.needsRebuild(rootModule, opts)`

Returns if a module needs to be rebuilt by hashing its dependency tree and
comparing it to its entry in the hash table. Hits return false, misses return
true.

### `bsfyHash.hash(rootModule)`

Return an MD5 hash of a module's dependency tree.

## License

MIT
