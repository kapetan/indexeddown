var testCommon = require('abstract-leveldown/testCommon')
var leveldown = require('../')

var dbs = []

var location = function () {
  var name = testCommon.location()
  dbs.push(name)
  return name
}

var cleanup = function (cb) {
  var i = 0
  var destroy = function (err) {
    if (err) return cb(err)
    if (i >= dbs.length) return cb()
    var db = dbs[i++]
    leveldown.destroy(db, destroy)
  }

  destroy()
}

var setUp = function (t) {
  cleanup(function (err) {
    t.error(err, 'cleanup returned an error')
    t.end()
  })
}

var tearDown = function (t) {
  setUp(t)
}

module.exports = {
  location: location,
  cleanup: cleanup,
  lastLocation: testCommon.lastLocation,
  setUp: setUp,
  tearDown: tearDown,
  collectEntries: testCommon.collectEntries
}
