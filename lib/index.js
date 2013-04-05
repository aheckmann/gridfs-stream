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
 * Creates a writable stream for the given `filename`.
 *
 * __NOTE__ It is advised to pass a filename using the option 'filename', since some filenames can not be distinguished
 * from ObjectIds
 *
 * @param {ObjectId|String} objectId (optional)
 * @param {Object} [options]
 * @return Stream
 */

Grid.prototype.createWriteStream = function (objectId, options) {
  return new GridWriteStream(this, objectId, options);
}

/**
 * Creates a readable stream ior the given `filename`.
 *
 * @param {ObjectId|String} filename
 * @param {Object} [options]
 * @return Stream
 */

Grid.prototype.createReadStream = function (filename, options) {
  return new GridReadStream(this, filename, options);
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
 * Removes a file by `id`.
 *
 * @param {ObjectId|HexString} id
 * @param {Function} callback
 */

Grid.prototype.remove = function (id, callback) {
  var _id = this.tryParseObjectId(id) || id;
  return this.mongo.GridStore.unlink(this.db, _id, callback);
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
