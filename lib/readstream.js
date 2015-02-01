
/**
 * Module dependencies
 */

var util = require('util');
var PassThrough  = require('stream').PassThrough;

/**
 * expose
 * @ignore
 */

module.exports = exports = GridReadStream;

/**
 * GridReadStream
 *
 * @param {Grid} grid
 * @param {Object} options
 */

function GridReadStream (grid, options) {
  if (!(this instanceof GridReadStream))
    return new GridReadStream(grid, options);

  PassThrough.call(this);
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

  this.name = this.options.filename || '';
  this.mode = 'r';

  this.range = this.options.range || { startPos: 0, endPos: undefined };
  if (typeof(this.range.startPos) === 'undefined') {
    this.range.startPos = 0;
  }

  this._store = new grid.mongo.GridStore(grid.db, this.id || new grid.mongo.ObjectID(), this.name, this.mode, this.options);
  // Workaround for Gridstore issue https://github.com/mongodb/node-mongodb-native/pull/930
  if (!this.id) {
    //var REFERENCE_BY_FILENAME = 0,
    this._store.referenceBy = 0;
  }

  this._open();
}

/**
 * Inherit from stream.PassThrough
 * @ignore
 */

util.inherits(GridReadStream, PassThrough);

/**
 * _open
 *
 * @api private
 */

GridReadStream.prototype._open = function _open () {
  if (this._opening) return;
  this._opening = true;

  var self = this;
  this._store.open(function (err, gs) {
    if (err) return self._error(err);
    self._opened = true;
    gs.seek(self.range.startPos, function(err) {
      if (err) return self._error(err);
      self.emit('open');
      self._pipe(gs.stream());
    });
  });
}

/**
 * _pipe
 *
 * @api private
 */

GridReadStream.prototype._pipe = function _pipe (gsReadStream) {
  var self = this;
  if (!this._opened) return self._error('Unable to pipe. Expected gridstore to be open');

  //Init range request
  var currentPos = self.range.startPos;
  var isGreatThanEndPos = false;

  //Pipe implementation
  //Unable to just use gsReadStream.pipe(self) becuase you cant sepeficy end range in gridStore, only where to begin.
  //No need to handle setEncoding as the PassThrough stream handels it.
  gsReadStream.on('data', function (data) {
    //Control the range of data sent
    if (typeof(self.range.endPos) !== 'undefined' && currentPos + data.length > self.range.endPos + 1) {
      isGreatThanEndPos = true;
      data = data.slice(0, self.range.endPos - currentPos + 1);
    }

    //Write data and pause if stream gets saturated
    var ready = self.write(data);
    if (ready === false) {
        gsReadStream.pause();
        self.once('drain', this.resume.bind(this));
    }

    //If end of requested range then end stream and close the store
    if (isGreatThanEndPos) {
      gsReadStream.end();
      self.emit('end');
      self._close();
    }

    //Keep track of the data that is sent
    currentPos += data.length;
  });

  //If end of stream is reached emit `end` and close the store
  gsReadStream.on('end', function (data) {
    if (!isGreatThanEndPos) {
        self.emit('end', data);
        self._close();
    }
  });

}

/**
 * _close
 *
 * @api private
 */

GridReadStream.prototype._close = function _close () {
  var self = this;
  if (!self._opened) return self.emit('close');

  self._store.close(function (err) {
    if (err) return self._error(err);
    self.emit('close');
  });
}

/**
 * _error
 *
 * @api private
 */

GridReadStream.prototype._error = function _error (err) {
  // Emit the error event
  this.emit('error', err);

  //Close the gridsore if an error is received.
  this._close()
}

/**
 * destroy
 *
 * @api public
 */

GridReadStream.prototype.destroy = function destroy () {
  this._close();
}

