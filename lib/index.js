// gridfs-stream

/**
 * Module dependencies.
 */

var GridWriteStream = require('./writestream')
var GridReadStream = require('./readstream')

/**
 * Grid constructor
 *
 * @param {mongo.Db} db - an open mongo.Db instance
 * @param {mongo} [mongo] - the native driver you are using
 */

function Grid (db, mongo) {
  if (!(this instanceof Grid)) {
    return new Grid(db, mongo);
  }

  mongo || (mongo = Grid.mongo ? Grid.mongo : undefined);

  if (!mongo) throw new Error('missing mongo argument\nnew Grid(db, mongo)');
  if (!db) throw new Error('missing db argument\nnew Grid(db, mongo)');

  // the db must already be open b/c there is no `open` event emitted
  // in old versions of the driver
  this.db = db;
  this.mongo = mongo;
}

/**
 * Creates a writable stream.
 *
 * @param {Object} [options]
 * @return Stream
 */

Grid.prototype.createWriteStream = function (options) {
  return new GridWriteStream(this, options);
}

/**
 * Creates a readable stream. Pass at least a filename or _id option
 *
 * @param {Object} options
 * @return Stream
 */

Grid.prototype.createReadStream = function (options) {
  return new GridReadStream(this, options);
}

/**
 * The collection used to store file data in mongodb.
 * @return {Collection}
 */

Object.defineProperty(Grid.prototype, 'files', {
  get: function () {
    if (this._col) return this._col;
    return this.collection();
  }
});

/**
 * Changes the default collection to `name` or to the default mongodb gridfs collection if not specified.
 *
 * @param {String|undefined} name root gridfs collection name
 * @return {Collection}
 */

Grid.prototype.collection = function (name) {
  name || (name = this.mongo.GridStore.DEFAULT_ROOT_COLLECTION);
  return this._col = this.db.collection(name + ".files");
}

/**
 * Removes a file by passing any options, at least an _id or filename
 *
 * @param {Object} options
 * @param {Function} callback
 */

Grid.prototype.remove = function (options, callback) {
  var _id;
  if (options._id) {
    _id = this.tryParseObjectId(options._id) || options._id;
  }
  if (!_id) {
    _id = options.filename;
  }
  return this.mongo.GridStore.unlink(this.db, _id, options, callback);
}

/**
 * Checks if a file exists by passing a filename
 *
 * @param {Object} options
 * @param {Function} callback
 */

Grid.prototype.exist = function (options, callback) {
    var _id;
    if (options._id) {
        _id = this.tryParseObjectId(options._id) || options._id;
    }
    if (!_id) {
        _id = options.filename;
    }
    return this.mongo.GridStore.exist(this.db, _id, options.root, callback);
}

/**
 * Attemps to parse `string` into an ObjectId
 *
 * @param {GridReadStream} self
 * @param {String|ObjectId} string
 * @return {ObjectId|Boolean}
 */

Grid.prototype.tryParseObjectId = function tryParseObjectId (string) {
  try {
    return new this.mongo.BSONPure.ObjectID(string);
  } catch (_) {
    return false;
  }
}

/**
 * expose
 */

module.exports = exports = Grid;
