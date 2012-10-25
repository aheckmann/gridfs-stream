# gridfs-stream

Easily stream files to and from MongoDB [GridFS](http://www.mongodb.org/display/DOCS/GridFS).

```js
var mongo = require('mongodb');
var Grid = require('gridfs-stream');
var gfs = Grid(db, mongo);

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
var Grid = require('gridfs-stream');

// create or use an existing mongodb-native db instance.
// for this example we'll just create one:
var db = new mongo.Db('yourDatabaseName', new Server("127.0.0.1", 27017));

// make sure the db instance is open before passing into `Grid`
db.open(function (err) {
  if (err) return handleError(err);
  var gfs = Grid(db, mongo);

  // all set!
})
```

The `gridfs-stream` module exports a constructor that accepts an open [mongodb-native](https://github.com/mongodb/node-mongodb-native/) db and the [mongodb-native](https://github.com/mongodb/node-mongodb-native/) driver you are using. _The db must already be opened before calling `createWriteStream` or `createReadStream`._

Now we're ready to start streaming.

## createWriteStream

To stream data to GridFS we call `createWriteStream` passing a filename and any options.

```js
var writestream = gfs.createWriteStream('filename' [, options]);
fs.createReadStream('/some/path').pipe(writestream);
```

The created File object is passed in the writeStreams `close` event.

```js
writestream.on('close', function (file) {
  // do something with `file`
  console.log(file.filename);
});
```

## createReadStream

To stream data out of GridFS we call `createReadStream` passing a filename and any options.

```js
var readstream = gfs.createReadStream('filename' [, options]);
readstream.pipe(response);
```

Any options are passed to the internally created [GridStore](http://mongodb.github.com/node-mongodb-native/api-generated/gridstore.html).

## removing files

Files can be removed by passing their `id` to the `remove()` method.

```js
gfs.remove(id, function (err) {
  if (err) return handleError(err);
  console.log('success');
});

```

## accessing file metadata

All file meta-data (file name, upload date, contentType, etc) are stored in a special mongodb collection separate from the actual file data. This collection can be queried directly:

```js
  var gfs = Grid(conn.db);
  gfs.files.find({ filename: 'myImage.png' }).toArray(function (err, files) {
    if (err) ...
    console.log(files);
  })
```

You may optionally change the root gridfs collection as well:

```js
  var gfs = Grid(conn.db);
  gfs.collection('myroot').find({ filename: 'myImage.png' }).toArray(function (err, files) {
    if (err) ...
    console.log(files);
  })
```

## using with mongoose

```js
var mongoose = require('mongoose');
var Grid = require('gridfs-stream');

var conn = mongoose.createConnection(..);
conn.once('open', function () {
  var gfs = Grid(conn.db, mongoose.mongo);

  // all set!
})
```

You may optionally assign the driver directly to the `gridfs-stream` module so you don't need to pass it along each time you construct a grid:

```js
var mongoose = require('mongoose');
var Grid = require('gridfs-stream');
Grid.mongo = mongoose.mongo;

var conn = mongoose.createConnection(..);
conn.once('open', function () {
  var gfs = Grid(conn.db);

  // all set!
})
```

[LICENSE](https://github.com/aheckmann/gridfs-stream/blob/master/LICENSE)
