var util = require('util')
var abstract = require('abstract-leveldown')
var ltgt = require('ltgt')

var PREFIX = 'IndexedDB-LevelDOWN-'

var AbstractLevelDOWN = abstract.AbstractLevelDOWN
var AbstractIterator = abstract.AbstractIterator
var IDBKeyRange = window.IDBKeyRange

var toBuffer = function (arr) {
  if (Buffer.isBuffer(arr)) return arr
  if (typeof arr !== 'string' &&
      !(arr instanceof ArrayBuffer) &&
      !(arr.buffer instanceof ArrayBuffer) &&
      !ArrayBuffer.isView(arr)) {
    arr = String(arr)
  }

  return Buffer.from(arr)
}

var toBufferOrString = function (arr, asBuffer) {
  if (typeof arr === 'string' && !asBuffer) return arr
  arr = toBuffer(arr)
  if (asBuffer) return arr
  else return arr.toString('utf8')
}

var createKeyRange = function (options) {
  var lower = ltgt.lowerBound(options)
  var lowerExclusive = ltgt.lowerBoundExclusive(options)
  var upper = ltgt.upperBound(options)
  var upperExclusive = ltgt.upperBoundExclusive(options)

  if (lower && upper) {
    return IDBKeyRange.bound(
      lower,
      upper,
      lowerExclusive,
      upperExclusive)
  } else if (lower) {
    return IDBKeyRange.lowerBound(lower, lowerExclusive)
  } else if (upper) {
    return IDBKeyRange.upperBound(upper, upperExclusive)
  }
}

var Iterator = function (db, options) {
  AbstractIterator.call(this, db)

  this._options = options
  this._buffer = []
  this._cb = null
  this._started = false

  if (options.snapshot) {
    this._started = true
    this._cursor()
  }
}

util.inherits(Iterator, AbstractIterator)

Iterator.prototype._next = function (cb) {
  if (!this._options.limit) return cb()
  if (this._buffer.length) {
    var args = this._buffer.shift()
    return cb.apply(null, args)
  }
  if (!this._started) {
    this._started = true
    this._cursor()
  }

  this._cb = cb
}

Iterator.prototype._cursor = function () {
  var self = this
  var db = this.db
  var options = this._options
  var tx = null

  var push = function () {
    var cb = self._cb
    self._cb = null
    if (cb) cb.apply(null, arguments)
    else self._buffer.push(arguments)
  }

  try {
    tx = db.idb.transaction(db.location, 'readonly')
  } catch (err) {
    return push(err)
  }

  var store = tx.objectStore(db.location)
  var query = createKeyRange(options)
  var direction = options.reverse ? 'prev' : 'next'
  var count = 0

  tx.onabort = function (err) {
    push(err)
  }

  tx.oncomplete = function () {
    push()
  }

  store.openCursor(query, direction).onsuccess = function (e) {
    var cursor = e.target.result

    if (cursor && !this._ended) {
      count++
      var key = toBufferOrString(cursor.key, options.keyAsBuffer)
      var value = toBufferOrString(cursor.value, options.valueAsBuffer)
      push(null, key, value)
      if (count < options.limit || options.limit < 0) cursor.continue()
    }
  }
}

var Level = function (location, options) {
  if (!(this instanceof Level)) return new Level(location, options)
  AbstractLevelDOWN.call(this, location)

  this.idb = null
  this._options = options || {}
}

util.inherits(Level, AbstractLevelDOWN)

Level.destroy = function (db, cb) {
  if (typeof db !== 'string') db = db.location
  var deleteRequest = window.indexedDB.deleteDatabase(PREFIX + db)

  deleteRequest.onerror = function (e) {
    cb(e.target.error)
  }

  deleteRequest.onsuccess = function () {
    cb()
  }
}

Level.prototype.approximateSize = function (start, end, options, cb) {
  if (!cb) cb = options

  if (typeof cb !== 'function') {
    throw new Error('approximateSize() requires a callback argument')
  }

  if (start != null) start = this._serializeKey(start)
  if (end != null) end = this._serializeKey(end)
  var query = createKeyRange({ gte: start, lt: end })

  this._transaction('readonly', function (store) {
    return store.count(query)
  }, cb)
}

Level.prototype._open = function (options, cb) {
  var self = this
  var upgraded = false
  var err = null
  var openRequest = window.indexedDB.open(PREFIX + this.location, 1)

  openRequest.onerror = function (e) {
    cb(e.target.error)
  }

  openRequest.onsuccess = function (e) {
    if (!upgraded && options.errorIfExists) err = new Error('Database exists')
    if (err) {
      e.target.result.close()
      return cb(err)
    }

    self.idb = e.target.result
    cb()
  }

  openRequest.onupgradeneeded = function (e) {
    upgraded = true
    var db = e.target.result

    if (!db.objectStoreNames.contains(self.location)) {
      if (!options.createIfMissing) err = new Error('Database does not exist')
      else db.createObjectStore(self.location, { keyPath: null, autoIncrement: false })
    } else if (options.errorIfExists) {
      err = new Error('Database exists')
    }
  }
}

Level.prototype._close = function (cb) {
  this.idb.close()
  cb()
}

Level.prototype._get = function (key, options, cb) {
  this._transaction('readonly', function (store) {
    return store.get(key)
  }, function (err, value) {
    if (err) return cb(err)
    if (value === undefined) return cb(new Error('NotFound'))
    cb(null, toBufferOrString(value, options.asBuffer))
  })
}

Level.prototype._put = function (key, value, options, cb) {
  this._transaction('readwrite', function (store) {
    return store.put(toBuffer(value), key)
  }, function (err) {
    cb(err)
  })
}

Level.prototype._del = function (key, options, cb) {
  this._transaction('readwrite', function (store) {
    return store.delete(key)
  }, function (err) {
    cb(err)
  })
}

Level.prototype._batch = function (operations, options, cb) {
  var store = this._transaction('readwrite', null, function (err) {
    cb(err)
  })

  operations.forEach(function (op) {
    if (op.type === 'put') store.put(toBuffer(op.value), op.key)
    if (op.type === 'del') store.delete(op.key)
  })
}

Level.prototype._iterator = function (options) {
  if (!('snapshot' in options) && ('snapshot' in this._options)) {
    options.snapshot = this._options.snapshot
  }

  return new Iterator(this, options)
}

Level.prototype._transaction = function (mode, worker, cb) {
  var tx = null

  try {
    // Trying to access a closing db throws an error.
    // Instead pass the error back to the callback.
    tx = this.idb.transaction(this.location, mode)
  } catch (err) {
    return cb(err)
  }

  var store = tx.objectStore(this.location)
  var result = null

  // Request errors bubble up to the parent transaction.
  // If the propagation is not stopped the default behaviour
  // is to abort the transaction on any error.
  // The onabort handler will catch all request and transaction errors.
  tx.onabort = function (err) {
    cb(err)
  }

  tx.oncomplete = function () {
    cb(null, result)
  }

  if (worker) {
    worker(store).onsuccess = function (e) {
      result = e.target.result
    }
  }

  return store
}

module.exports = Level
