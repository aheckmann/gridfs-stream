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

The `gridfs-stream` module exports a function that accepts the [mongodb-native](https://github.com/mongodb/node-mongodb-native/) driver you are using.

```js
var mongo = require('mongodb');
var Grid = require('gridfs-stream')(mongo);
```

Executing this function returns a constructor that accepts a [mongodb-native](https://github.com/mongodb/node-mongodb-native/) db. The db must already be opened before calling `createWriteStream` or `createReadStream`.

```js
var gfs = Grid(db);
```

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

[LICENSE](https://github.com/aheckmann/gridfs-stream/blob/master/LICENSE)
