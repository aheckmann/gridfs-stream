
/**
 * Module dependencies
 */

var util = require('util');
//var Writable  = require('stream').Writable;

// This is a workaround to implement a _flush method for Writable (like for Transform) to indicate that all data has been flushed to the underlying system. See https://www.npmjs.com/package/flushwritable and https://github.com/joyent/node/issues/7348
var FlushWritable = require('flushwritable');

/**
 * expose
 * @ignore
 */

module.exports = exports = GridWriteStream;

/**
 * GridWriteStream
 *
 * @param {Grid} grid
 * @param {Object} options (optional)
 */

function GridWriteStream (grid, options) {
  if (!(this instanceof GridWriteStream))
    return new GridWriteStream(grid, options);

  FlushWritable.call(this);
  this._opened = false;
  this._opening = false;
  this._writable = true;
  this._closing = false;
  this._grid = grid;

  // a bit backwards compatible
  if (typeof options === 'string') {
    options = { filename: options };
  }
  this.options = options || {};
  if(options._id) {
    this.id = grid.tryParseObjectId(options._id);

    if(!this.id) {
      this.id = options._id;
    }
  }

  this.name = this.options.filename;  // This may be undefined, that's okay

  if (!this.id) {
    //_id not passed or unparsable? This is a new file!
    this.id = new grid.mongo.ObjectID();
    this.name = this.name || '';  // A new file needs a name
  }

  this.mode = 'w'; //Mongodb v2 driver have disabled w+ because of possible data corruption. So only allow `w` for now.

  // The value of this.name may be undefined. GridStore treats that as a missing param
  // in the call signature, which is what we want.
  this._store = new grid.mongo.GridStore(grid.db, this.id, this.name, this.mode, this.options);

  var self = this;

  self._open();
}

/**
 * Inherit from stream.Writable (FlushWritable for workaround to defer finish until all data flushed)
 * @ignore
 */

util.inherits(GridWriteStream, FlushWritable);

// private api

/**
 * _open
 *
 * @api private
 */

GridWriteStream.prototype._open = function _open () {
  if (this._opening) return;
  this._opening = true;

  var self = this;
  this._store.open(function (err, gs) {
    if (err) return self._error(err);
    self._opened = true;
    self.emit('open');

    // If data was sent before store is open start writing to the store
    if (self._delayedWrite) return self._writeInternal(self._delayedWrite.chunk, self._delayedWrite.encoding, self._delayedWrite.done);

    // If empty file
    if (self._needToFlush  && !this._writePending) {
      self._needToFlush();
      self._close();
    }
  });
}

/**
 * _writeInternal
 *
 * @api private
 */

GridWriteStream.prototype._writeInternal = function (chunk, encoding, done) {
  // If destroy or error no more data will be written.
  if (!this._writable) return;

  var self = this;
  // Write the chunk to the GridStore. The write head automatically moves along with each write.
  this._store.write(chunk, function (err, store) {
    if (err) return self._error(err);
    self._writePending = false;

    // Emit the write head position
    self.emit('progress', store.position);

    // We are ready to receive a new chunk from the writestream - call done().
    done();

    // If we received an indication to flush - call _needToFlush and close the store.
    if (self._needToFlush) {
      self._needToFlush();
      self._close();
    }

  });
}

/**
 * _write
 *
 * @api private
 */

GridWriteStream.prototype._write = function (chunk, encoding, done) {
  // Used to know if its OK to close the store after an indication to flush is received.
  this._writePending = true;

  // The store is not open but data is ready to be written so delay the write until the store is opened.
  if (!this._opened) {
    this._delayedWrite = {chunk: chunk, encoding: encoding, done: done};
    return
  }

  // The store is open so pass all arguments to _writeInternal to be written to the gridstore
  this._writeInternal(chunk, encoding, done);
}

/**
 * _flush
 *
 * @api private
 */

GridWriteStream.prototype._flush = function (flushed) {
  // If all data has been flushed to the gridstore call flushed and close the store.
  if (!this._writePending && this._opened) {
    flushed();
    return this._close();
  }

  // If write outstanding defer the callback until it completes. Save the flushed callback and call it in the write method or after store opens if its an empty file.
  this._needToFlush = flushed;
}

/**
 * _close
 *
 * @api private
 */

GridWriteStream.prototype._close = function _close () {
  if (!this._opened) return;
  if (this._closing) return;
  this._closing = true;

  var self = this;
  this._store.close(function (err, file) {
    if (err) return self._error(err);
    self.emit('close', file);
  });
}

/**
 * _error
 *
 * @api private
 */

GridWriteStream.prototype._error = function _error (err) {
  // Stop receiving more data to write, emit `error` and close the store
  this._writable = false;
  this.emit('error', err);
  this._close();
}

// public api

/**
 * destroy
 *
 * @api public
 */

GridWriteStream.prototype.destroy = function destroy () {
  // Stop receiving more data to write and close the store
  this._writable = false;
  this._close();
}
