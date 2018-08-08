var test = require('tape')
var iteratorTest = require('abstract-leveldown/abstract/iterator-test')

var leveldown = require('../')
var testCommon = require('./testCommon')

var noop = function () {}
var leveldownSnapshot = function (location) {
  return leveldown(location, { snapshot: true })
}

require('abstract-leveldown/abstract/batch-test').all(leveldown, test, testCommon)
require('abstract-leveldown/abstract/chained-batch-test').all(leveldown, test, testCommon)
require('abstract-leveldown/abstract/close-test').close(leveldown, test, testCommon)
require('abstract-leveldown/abstract/del-test').all(leveldown, test, testCommon)
require('abstract-leveldown/abstract/get-test').all(leveldown, test, testCommon)
require('abstract-leveldown/abstract/leveldown-test').args(leveldown, test, testCommon)
require('abstract-leveldown/abstract/put-get-del-test').all(leveldown, test, testCommon)
require('abstract-leveldown/abstract/put-test').all(leveldown, test, testCommon)
require('abstract-leveldown/abstract/iterator-range-test').all(leveldown, test, testCommon)
require('abstract-leveldown/abstract/open-test').all(leveldown, test, testCommon)

iteratorTest.all(leveldownSnapshot, test, testCommon)

iteratorTest.snapshot = noop
iteratorTest.all(leveldown, test, testCommon)

test('approximate size', function (t) {
  var db = leveldown(testCommon.location())

  t.test('open', function (t) {
    db.open(function (err) {
      t.end(err)
    })
  })

  t.test('batch write', function (t) {
    db.batch([
      { type: 'put', key: 'key0', value: 'value0' },
      { type: 'put', key: 'key1', value: 'value1' },
      { type: 'put', key: 'key2', value: 'value2' },
      { type: 'put', key: 'key3', value: 'value3' }
    ], function (err) {
      t.end(err)
    })
  })

  t.test('without range', function (t) {
    db.approximateSize(null, null, function (err, count) {
      t.error(err)
      t.equals(count, 4)
      t.end()
    })
  })

  t.test('range with lower bound', function (t) {
    db.approximateSize('key1', null, function (err, count) {
      t.error(err)
      t.equals(count, 3)
      t.end()
    })
  })

  t.test('range with upper bound', function (t) {
    db.approximateSize(null, 'key2', function (err, count) {
      t.error(err)
      t.equals(count, 2)
      t.end()
    })
  })

  t.test('range with bounds', function (t) {
    db.approximateSize('key1', 'key2', function (err, count) {
      t.error(err)
      t.equals(count, 1)
      t.end()
    })
  })

  t.test('cleanup', function (t) {
    db.close(function (err) {
      t.error(err)
      testCommon.cleanup(function (err) {
        t.end(err)
      })
    })
  })
})

test('closing operation', function (t) {
  var db = leveldown(testCommon.location())

  t.test('open', function (t) {
    db.open(function (err) {
      t.end(err)
    })
  })

  t.test('get while closing', function (t) {
    db.close(function (err) {
      t.error(err)
    })

    db.get('key', function (err) {
      t.ok(err, err.message)
      t.end()
    })
  })

  t.test('cleanup', function (t) {
    testCommon.cleanup(function (err) {
      t.end(err)
    })
  })
})

test('closing iterator', function (t) {
  var db = leveldown(testCommon.location())

  t.test('open', function (t) {
    db.open(function (err) {
      t.end(err)
    })
  })

  t.test('iterate while closing', function (t) {
    db.close(function (err) {
      t.error(err)
    })

    var it = db.iterator({ snapshot: true })

    it.next(function (err) {
      t.ok(err, err.message)
      t.end()
    })
  })

  t.test('cleanup', function (t) {
    testCommon.cleanup(function (err) {
      t.end(err)
    })
  })
})
