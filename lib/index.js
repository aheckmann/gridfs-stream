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
  }

  Grid.prototype.createWriteStream = function (filename, options) {
    return new GridWriteStream(this, filename, options);
  }

  Grid.prototype.createReadStream = function (filename, options) {
    return new GridReadStream(this, filename, options);
  }

  return Grid;
}

