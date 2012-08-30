# gridfs-stream

Easily stream files to and from MongoDB [GridFS](http://www.mongodb.org/display/DOCS/GridFS).

```js
var mongo = require('mongodb');
var Grid = require('gridfs-stream')(mongo);
var gfs = Grid(db);

// streaming to gridfs
var writestream = gfs.createWriteStream('filename');
fs.createReadStream('/some/path').pipe(writestream);

// streaming from gridfs
var readstream = gfs.createReadStream('filename');
readstream.pipe(response);
```

Created streams are compatible with other Node streams so piping anywhere is easy.

## install

```
npm install gridfs-stream
```

## use

```js
var mongo = require('mongodb');
var Grid = require('gridfs-stream')(mongo);

// create or use an existing mongodb-native db instance.
// for this example we'll just create one:
var db = new mongo.Db('yourDatabaseName', new Server("127.0.0.1", 27017));

// make sure the db instance is open before passing into `Grid`
db.open(function (err) {
  if (err) return handleError(err);
  var gfs = Grid(db);

  // all set!
})
```

The `gridfs-stream` module exports a function that accepts the [mongodb-native](https://github.com/mongodb/node-mongodb-native/) driver you are using.

Executing this function, (_`Grid` in the example above_), returns a constructor that accepts a [mongodb-native](https://github.com/mongodb/node-mongodb-native/) db. The db must already be opened before calling `createWriteStream` or `createReadStream`.

Now we're ready to start streaming.

## createWriteStream

To stream data to GridFS we call `createWriteStream` passing a filename and any options.

```js
var writestream = gfs.createWriteStream('filename' [, options]);
fs.createReadStream('/some/path').pipe(writestream);
```

## createReadStream

To stream data out of GridFS we call `createReadStream` passing a filename and any options.

```js
var readstream = gfs.createReadStream('filename' [, options]);
readstream.pipe(response);
```

Any options are passed to the internally created [GridStore](http://mongodb.github.com/node-mongodb-native/api-generated/gridstore.html).

## using with mongoose

```js
var mongoose = require('mongoose');
var Grid = require('gridfs-stream')(mongoose.mongo);

var conn = mongoose.createConnection(..);
conn.once('open', function () {
  var gfs = Grid(conn.db);

  // all set!
})
```

[LICENSE](https://github.com/aheckmann/gridfs-stream/blob/master/LICENSE)
