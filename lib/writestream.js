
/**
 * Module dependencies
 */

var util = require('util');
var Writable  = require('stream').Writable;

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

  Writable .call(this);
  this._opened = false;
  this._opening = false;
  this._finish = false;
  this._writePending = false;
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

  this._q = [];

  // The value of this.name may be undefined. GridStore treats that as a missing param
  // in the call signature, which is what we want.
  this._store = new grid.mongo.GridStore(grid.db, this.id, this.name, this.mode, this.options);

  var self = this;

  // Close store if all data was written to the store when `finished` received. If data left in queue dont close yet - first finish the queue and then close the store. The write function checks if there are data left in the queue and if `_finish=true`
  this.on('finish', function() {
    self._finish = true;
    if (self._opened && !self._writePending && self._q.length === 0) {
      self._close();
    }
  });

  self._open();
}

/**
 * Inherit from stream.Writable
 * @ignore
 */

util.inherits(GridWriteStream, Writable);

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
    if (self._writePending) self._write();

    // If `finished` already received and no data left in queue close the store - this is mostly for an empty or very small files
    if (self._finish && !self._writePending && self._q.length === 0) self._close();
  });
}

/**
 * _write
 *
 * @api private
 */

GridWriteStream.prototype._write = function (chunk, encoding, done) {
  // This function is called from the writestream and also internal to write chunks received before the store is open.

  // If destroy is called no data will be written
  if (!this._writable) return;

  // Used so that we know that there is data pending for a write before the store is open and not to close the store too soon.
  this._writePending = true;

  // Queue data until we open. This queue only grow until the store is open then done() is only called after each successful GridStore write. This queue will only grow until the store opens and then it should remain at a maximum of 1. New data only sent after the previous one was written and `done()` called.
  if (!this._opened) {
    if (chunk) {
      // Push the chunk in the queue
      if (!this._destroying) this._q.push(chunk);
      // Return done() so that the writestream will send another chunk for our queue
      return done();
    }
  }

  // If chunk then push to queue
  if (chunk && !this._destroying) this._q.push(chunk);

  var self = this;

  // Write the first chunk in the queue to the GridStore. The write head automatically moves along with each write.
  this._store.write(this._q.shift(), function (err, store) {
    if (err) return self._error(err);
    self._writePending = false;

    // Emit the write head position
    self.emit('progress', store.position);

    // If there is more data in the queue from data received before the store was open write them
    if (self._q.length > 0) self._write();

    // If `finished` received from the writestream then the data is done and only data left in queue must be written
    if (self._q.length === 0 && (self._finish || self._destroying)) {
      self._close();
    }

    // We are ready to receive a new chunk from the writestream - call done().
    if (chunk) {
        done();
    }
    });

}

/**
 * _close
 *
 * @api private
 */

GridWriteStream.prototype._close = function _close () {
  var self = this;
  if (!this._opened) return;
  if (this._closing) return;
  this._closing = true;

  self._store.close(function (err, file) {
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
  this.emit('error', err);
  this._close();
}

/**
 * destroy
 *
 * @api public
 */

GridWriteStream.prototype.destroy = function destroy () {
  // Close and do not emit any more events. queued data is not sent.
  if (!this._writable) return;
  this._writable = false;
  this._q.length = 0;
  this._close();
}

/**
 * destroySoon
 *
 * @api public
 */

GridWriteStream.prototype.destroySoon = function destroySoon () {
  // As soon as write queue is drained, destroy.
  // May call destroy immediately if no data is queued.
  if (!this._q.length) {
    return this.destroy();
  }
  this._destroying = true;
};
