var leveldown = require('../')('demo')

var putForm = document.querySelector('#form')
var entriesTable = document.querySelector('#entries tbody')

var onerror = function (err) {
  throw err
}

var createRow = function (key, value) {
  var tr = document.createElement('tr')
  var keyCell = document.createElement('td')
  var valueCell = document.createElement('td')
  var deleteCell = document.createElement('td')
  var deleteButton = document.createElement('button')

  tr.dataset.key = window.btoa(key)
  keyCell.textContent = key
  valueCell.textContent = value
  deleteButton.textContent = 'Delete'
  deleteButton.type = 'button'
  deleteButton.onclick = function () {
    leveldown.del(key, function (err) {
      if (err) return onerror(err)
      entriesTable.removeChild(tr)
    })
  }

  deleteCell.appendChild(deleteButton)
  tr.appendChild(keyCell)
  tr.appendChild(valueCell)
  tr.appendChild(deleteCell)

  return tr
}

var appendRow = function (key, value) {
  entriesTable.appendChild(createRow(key, value))
}

var updateOrAppendRow = function (key, value) {
  var tr = entriesTable.querySelector(`tr[data-key="${window.btoa(key)}"]`)

  if (tr) {
    entriesTable.insertBefore(createRow(key, value), tr)
    entriesTable.removeChild(tr)
  } else {
    appendRow(key, value)
  }
}

putForm.onsubmit = function (e) {
  e.preventDefault()

  var key = putForm.elements.key.value
  var value = putForm.elements.value.value

  leveldown.put(key, value, function (err) {
    if (err) return onerror(err)
    updateOrAppendRow(key, value)
  })
}

leveldown.open(function (err) {
  if (err) return onerror(err)

  var iterator = leveldown.iterator({
    keyAsBuffer: false,
    valueAsBuffer: false
  })

  iterator.next(function next (err, key, value) {
    if (err) return onerror(err)
    if (key) {
      appendRow(key, value)
      iterator.next(next)
    }
  })
})
