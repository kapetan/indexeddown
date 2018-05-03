var test = require('tape')
var iteratorTest = require('abstract-leveldown/abstract/iterator-test')
var openTest = require('abstract-leveldown/abstract/open-test')

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

iteratorTest.all(leveldownSnapshot, test, testCommon)

iteratorTest.snapshot = noop
iteratorTest.all(leveldown, test, testCommon)

openTest.openAdvanced = noop
openTest.all(leveldown, test, testCommon)
