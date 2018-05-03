# indexeddown

Leveldown API implementation on top of IndexedDB. Underneath [abstract-leveldown](https://github.com/Level/abstract-leveldown) is used to ensure compatibility with [leveldown](https://github.com/level/leveldown).

    npm install indexeddown

Only browsers with non-prefixed IndexedDB API are supported.

## Usage

The regular `leveldown` API is exposed.

```javascript
var indexeddown = require('indexeddown')

var db = indexeddown('test')

db.open(function (err) {
  db.put('key', 'value', function (err) {
    db.get('key', function (err, value) {
      console.log(value)
    })
  })
})
```

By default this implementation does not enable the snapshot feature available in `leveldown`, unless the `snapshot` option is passed to the constructor, but this might increase memory consumption.

```javascript
var db = indexeddown('test', { snapshot: true })
```
