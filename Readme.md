# gridfs-stream

Easily stream files to and from MongoDB [GridFS](http://www.mongodb.org/display/DOCS/GridFS).

```js
var mongo = require('mongodb');
var Grid = require('gridfs-stream');
var gfs = Grid(db, mongo);

// streaming to gridfs
var writestream = gfs.createWriteStream({
    filename: 'my_file.txt'
});
fs.createReadStream('/some/path').pipe(writestream);

// streaming from gridfs
var readstream = gfs.createReadStream({
  filename: 'my_file.txt'
});

//error handling, e.g. file does not exist
readstream.on('error', function (err) {
  console.log('An error occurred!', err);
  throw err;
});

readstream.pipe(response);
```

Alternatively you could read the file using an _id. This is often a better option, since filenames don't have to be unique within the collection. e.g.

```js
var readstream = gfs.createReadStream({
  _id: '50e03d29edfdc00d34000001'
});

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
var db = new mongo.Db('yourDatabaseName', new mongo.Server("127.0.0.1", 27017));

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

To stream data to GridFS we call `createWriteStream` passing any options.

```js
var writestream = gfs.createWriteStream([options]);
fs.createReadStream('/some/path').pipe(writestream);
```

Options may contain zero or more of the following options, for more information see [GridStore](http://mongodb.github.com/node-mongodb-native/api-generated/gridstore.html):
```js
{
    _id: '50e03d29edfdc00d34000001', // a MongoDb ObjectId
    filename: 'my_file.txt', // a filename
    mode: 'w', // default value: w+, possible options: w, w+ or r, see [GridStore](http://mongodb.github.com/node-mongodb-native/api-generated/gridstore.html)

    //any other options from the GridStore may be passed too, e.g.:

    chunk_size: 1024, 
    content_type: 'plain/text', // For content_type to work properly, set "mode"-option to "w" too!
    root: 'my_collection',
    metadata: {
        ...
    }
}
```

The created File object is passed in the writeStreams `close` event.

```js
writestream.on('close', function (file) {
  // do something with `file`
  console.log(file.filename);
});
```

## createReadStream

To stream data out of GridFS we call `createReadStream` passing any options, at least an `_id` or `filename`.

```js
var readstream = gfs.createReadStream(options);
readstream.pipe(response);
```

See the options of `createWriteStream` for more information.

## removing files

Files can be removed by passing options (at least an `_id` or `filename`) to the `remove()` method.

```js
gfs.remove(options, function (err) {
  if (err) return handleError(err);
  console.log('success');
});
```

See the options of `createWriteStream` for more information.

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
