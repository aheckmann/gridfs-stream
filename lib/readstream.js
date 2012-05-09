
/**
 * Module dependencies
 */

var Stream = require('stream');
var mongo = require('mongodb');
var fs = require('fs');

/**
 * expose
 * @ignore
 */

module.exports = exports = GridReadStream;

/**
 * GridReadStream
 *
 * @param {Grid} grid
 * @param {String} filename (optional)
 * @param {Object} options (optional)
 */

function GridReadStream (grid, filename, options) {
  if (!(this instanceof GridReadStream))
    return new GridReadStream(grid, filename, options);

  Stream.call(this);
  this.paused = false;
  this.readable = true;

  this._grid = grid;

  // lookup using string filename or _id

  this.name = 'string' == typeof filename
    ? filename
    : ''

  this.id = filename && filename.toHexString ? filename
    : this.name ? this.name
    : null

  this.options = filename && 'Object' == filename.constructor.name
    ? filename
    : options || {};

  this.mode = 'r';

  this._store = this.id
    ? new mongo.GridStore(grid.db, this.id, this.mode, this.options)
    : new mongo.GridStore(grid.db, this.name, this.mode, this.options);

  var self = this;
  process.nextTick(function () {
    self._open();
  });
}

/**
 * Inherit from Stream
 * @ignore
 */

GridReadStream.prototype = { __proto__: Stream.prototype }

// public api

GridReadStream.prototype.readable;
GridReadStream.prototype.paused;

GridReadStream.prototype.setEncoding = fs.ReadStream.prototype.setEncoding;

/**
 * pause
 *
 * @api public
 */

GridReadStream.prototype.pause = function pause () {
  // Overridden when the GridStore opens.
  this.paused = true;
}

/**
 * resume
 *
 * @api public
 */

GridReadStream.prototype.resume = function resume () {
  // Overridden when the GridStore opens.
  this.paused = false;
}

/**
 * destroy
 *
 * @api public
 */

GridReadStream.prototype.destroy = function destroy () {
  // Overridden when the GridStore opens.
  this.readable = false;
}

// private api

GridReadStream.prototype._open = function _open () {
  var self = this;
  this._store.open(function (err) {
    if (err) return self._error(err);
    if (!self.readable) return;
    self.emit('open');
    self._read();
  });
}

GridReadStream.prototype._read = function _read () {
  if (!this.readable || this.paused || this.reading) {
    return;
  }

  this.reading = true;

  var self = this;
  var stream = this._stream = this._store.stream();
  stream.paused = this.paused;

  stream.on('data', function (data) {
    if (self._decoder) {
      var str = self._decoder.write(data);
      if (str.length) self.emit('data', str);
    } else {
      self.emit('data', data);
    }
  });

  stream.on('end', function (data) {
    self.emit('end', data);
  });

  stream.on('error', function (data) {
    self._error(data);
  });

  stream.on('close', function (data) {
    self.emit('close', data);
  });

  this.pause = function () {
    // native doesn't always pause.
    // bypass its pause() method to hack it
    self.paused = stream.paused = true;
  }

  this.resume = function () {
    self.paused = false;
    stream.resume();
    self.readable = stream.readable;
  }

  this.destroy = function () {
    self.readable = false;
    stream.destroy();
  }
}

GridReadStream.prototype._error = function _error (err) {
  this.readable = false;
  this.emit('error', err);
}

