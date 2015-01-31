
/**
 * Module dependencies
 */

var util = require('util');
var PassThrough  = require('stream').PassThrough;

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

  PassThrough .call(this);
  this._opened = false;
  this._opening = false;

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

  this.mode = 'w'; //Mongodb v2 driver have disabled w+ because of write possible data coruption. So only alow `w` for now.

  // The value of this.name may be undefined. GridStore treats that as a missing param
  // in the call signature, which is what we want.
  this._store = new grid.mongo.GridStore(grid.db, this.id, this.name, this.mode, this.options);

  this._open();
}

/**
 * Inherit from stream.PassThrough
 * @ignore
 */

util.inherits(GridWriteStream, PassThrough);

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
    self._pipe(gs.stream());
  });
}

/**
 * _close
 *
 * @api private
 */

GridWriteStream.prototype._close = function _close () {
  var self = this;
  if (!this._opened) return self.emit('close');
  self._store.close(function (err, file) {
    if (err) return self._error(err);
    self.emit('close', file);
  });
}

/**
 * _pipe
 *
 * @api private
 */

GridWriteStream.prototype._pipe = function _pipe (gsWriteStream) {
  var self = this;
  if (!self._opened) return self._error('Unable to pipe.  Expected gridstore to be open');
  gsWriteStream.on('end', function() {
      self._close();
  });

  // Pipe readstream to gridstore
  self.pipe(gsWriteStream);

  // Emit progress
  var size = 0;
  self.on('data', function(data) {
      size += data.length;
      self.emit('progress',size);
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
  this._close();
}

/**
 * destroySoon
 *
 * @api public
 */

GridWriteStream.prototype.destroySoon = function destroySoon () {
  this._close();
};
