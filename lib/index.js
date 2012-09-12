// gridfs-stream

/**
 * Module dependencies.
 */

var GridWriteStream = require('./writestream')
var GridReadStream = require('./readstream')

module.exports = exports = function gridfsStream (mongo) {
  function Grid (db) {
    if (!(this instanceof Grid)) {
      return new Grid(db);
    }

    // the db must be open b/c there is no `open` event emitted
    this.db = db;
    this.mongo = mongo;
    this.tryParseObjectId = tryParseObjectId;
  }

  Grid.prototype.createWriteStream = function (filename, options) {
    return new GridWriteStream(this, filename, options);
  }

  Grid.prototype.createReadStream = function (filename, options) {
    return new GridReadStream(this, filename, options);
  }

  return Grid;
}

/**
 * Attemps to parse `string` into an ObjectId
 *
 * @param {GridReadStream} self
 * @param {String|ObjectId} string
 * @return {ObjectId|Boolean}
 */

function tryParseObjectId (string) {
  try {
    return new this.mongo.BSONPure.ObjectID(string);
  } catch (_) {
    return false;
  }
}
