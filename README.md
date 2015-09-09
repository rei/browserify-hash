# browserify-hash

> Detect changes to a Browserify bundle's source files given the entry module.

Browserify-hash detects changes in a Browserify bundle's source files by
generating and comparing a hash for the entry module and its dependency tree.

## Status

Work in progress. Check back later :)

## API

Begin by requiring browserify-hash:

```js
var bsfyHash = require( 'browserify-hash' );
```

### `bsfyHash.changed(entryModule, opts)`

Returns if a bundle's source files have changed given its entry module. It does
this by generating and comparing a hash representing the entry module and its
dependency tree. Hits return false, misses return true.

### `bsfyHash.hash(entryModule)`

Return a hash representing the entry module and its dependency tree.

## Resources

- [The Browserify Handbook](https://github.com/substack/browserify-handbook)

## License

MIT
