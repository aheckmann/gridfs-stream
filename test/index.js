
// fixture/logo.png
var assert = require('assert')
  , Stream = require('stream')
  , fs = require('fs')
  , mongo = require('mongodb')
  , Grid = require('../')
  , crypto = require('crypto')
  , checksum = require('checksum')
  , tmpDir = __dirname + '/tmp/'
  , fixturesDir = __dirname + '/fixtures/'
  , imgReadPath = fixturesDir + 'mongo.png'
  , txtReadPath =fixturesDir + 'text.txt'
  , emptyReadPath = fixturesDir + 'emptydoc.txt'
  , largeBlobPath = tmpDir + '1mbBlob'
  , server
  , db


describe('test', function(){
  var id;
  before(function (done) {
    server = new mongo.Server('localhost', 27017);
    db = new mongo.Db('gridstream_test', server, {w:1});
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir);
    }
    fs.writeFile(largeBlobPath, crypto.randomBytes(1024*1024), function (err) {
      if (err) {
        done(err);
      }
      db.open(done)
    });
  });

  describe('Grid', function () {
    it('should be a function', function () {
      assert('function' == typeof Grid);
    });
    it('should create instances without the new keyword', function () {
      var x = Grid(2,3);
      assert(x instanceof Grid);
    });
    it('should store the arguments', function () {
      var x = new Grid(4, 5);
      assert.equal(x.db, 4);
      assert.equal(x.mongo, 5);
    });
    it('should require mongo argument', function(){
      assert.throws(function () {
        new Grid(3)
      }, /missing mongo argument/);
    })
    it('should require db argument', function(){
      assert.throws(function () {
        new Grid(null, 3)
      }, /missing db argument/);
    })
    describe('files', function(){
      it('returns a collection', function(){
        var g = new Grid(db, mongo);
        assert(g.files instanceof mongo.Collection);
      })
    })
    describe('collection()', function(){
      it('changes the files collection', function(){
        var g = new Grid(db, mongo);
        assert.equal('function', typeof g.collection);
        assert(g.collection() instanceof mongo.Collection);
        assert.equal(g.collection(), g.files);
        var old = g.files;
        g.collection('changed')
        assert(g.collection() instanceof mongo.Collection);
        assert.ok(g.collection() == g.files);
        assert.ok(g.collection() != old);
        g.collection()
        assert(g.collection() instanceof mongo.Collection);
        assert.equal(g.collection(), g.files);
        assert.equal(g.collection().collectionName, old.collectionName);
      })
    })
  });

  describe('createWriteStream', function(){
    it('should be a function', function () {
      var x = Grid(1, mongo);
      assert('function' == typeof x.createWriteStream);
    });
  })

  describe('GridWriteStream', function(){
    var g
      , ws

    before(function(){
      Grid.mongo = mongo;
      g = Grid(db);
      ws = g.createWriteStream({ filename: 'logo.png' });
    });

    it('should be an instance of Stream', function(){
      assert(ws instanceof Stream);
    })
    it('should should be writable', function(){
      assert(ws.writable);
    });
    it('should store the grid', function(){
      assert(ws._grid == g)
    });
    it('should have an id', function(){
      assert(ws.id)
    })
    it('id should be an ObjectId', function(){
      assert(ws.id instanceof mongo.BSONPure.ObjectID);
    });
    it('should have a name', function(){
      assert(ws.name == 'logo.png')
    })
    describe('options', function(){
      it('should have two keys', function(){
        assert(Object.keys(ws.options).length === 2);
      });
      it('limit should be Infinity', function(){
        assert(ws.options.limit === Infinity)
      });
    })
    it('mode should default to w+', function(){
      assert(ws.mode == 'w+');
    })
    it('should have an empty q', function(){
      assert(Array.isArray(ws._q));
      assert(ws._q.length === 0);
    })
    describe('store', function(){
      it('should be an instance of mongo.GridStore', function(){
        assert(ws._store instanceof mongo.GridStore)
      })
    })
    describe('#methods', function(){
      describe('write', function(){
        it('should be a function', function(){
          assert('function' == typeof ws.write)
        })
      })
      describe('end', function(){
        it('should be a function', function(){
          assert('function' == typeof ws.end)
        })
      })
      describe('destroy', function(){
        it('should be a function', function(){
          assert('function' == typeof ws.destroy)
        })
      })
      describe('destroySoon', function(){
        it('should be a function', function(){
          assert('function' == typeof ws.destroySoon)
        })
      })
    });
    it('should provide piping from a readableStream into GridFS', function(done){
      var readStream = fs.createReadStream(imgReadPath, { bufferSize: 1024 });
      var ws = g.createWriteStream({ filename: 'logo.png'});

      // used in readable stream test
      id = ws.id;

      var progress = 0;

      ws.on('progress', function (size) {
        progress = size;
      });

      ws.on('close', function () {
        assert(progress > 0);
        done();
      });

      var pipe = readStream.pipe(ws);
    });
    it('should provide Error and File object on WriteStream close event', function(done){
      var readStream = fs.createReadStream(imgReadPath, { bufferSize: 1024 });
      var ws = g.createWriteStream({
        mode: 'w',
        filename: 'closeEvent.png',
        content_type: "image/png"
      });
      // used in readable stream test
      id = ws.id;

      var progress = 0;

      ws.on('progress', function (size) {
        progress = size;
      });

      ws.on('close', function (file) {
        assert(file.filename === 'closeEvent.png')
        assert(file.contentType === 'image/png')
        assert(progress > 0);
        done();
      });
      var pipe = readStream.pipe(ws);
    });

    it('should pipe more data to an existing GridFS file', function(done){
      function pipe (id, cb) {
        if (!cb) cb = id, id = null;
        var readStream = fs.createReadStream(txtReadPath);
        var ws = g.createWriteStream({
          _id: id,
          mode: 'w+' });
        ws.on('close', function () {
          cb(ws.id);
        });
        readStream.pipe(ws);
      }

      pipe(function (id) {
        pipe(id, function (id) {
          // read the file out. it should consist of two copies of original
          mongo.GridStore.read(db, id, function (err, txt) {
            if (err) return done(err);
            assert.equal(txt.length, fs.readFileSync(txtReadPath).length*2);
            done();
          });
        });
      })
    });

    it('should be able to store a 12-letter file name', function() {
      var ws = g.createWriteStream({ filename: '12345678.png' });
      assert.equal(ws.name,'12345678.png');
    });

    it("shouldn't clobber filename when rewriting to an existing file by id", function(done){
      var ws = g.createWriteStream({
        mode: 'w',
        filename: 'filename.txt',
        content_type: 'text/plain'
      });
      var rewrite_id = ws.id;
      ws.write("Some text\n");
      ws.end();

      ws.on('close', function () {
        // Rewrite the same file by _id
        var ws2 = g.createWriteStream({
          _id: rewrite_id,
          mode: 'w'
        });
        ws2.write("Some more text\n");
        ws2.end();

        ws2.on('close', function () {
          g.exist({ _id: rewrite_id }, function (err, result) {
            if (err) return done(err);
            assert.ok(result);
            g.exist({ filename: "filename.txt" }, function (err, result) {
              if (err) return done(err);
              assert.ok(result);
              done();
            });
          });
        });
      });
    });

    it('should be able to store an empty file', function(done){
      var readStream = fs.createReadStream(emptyReadPath);
      var ws = g.createWriteStream({
        mode: 'w',
        filename: 'closeEvent.txt',
        content_type: "text/plain"
      });

      ws.on('close', function (file) {
        assert(file.filename === 'closeEvent.txt')
        assert(file.contentType === 'text/plain')
        done();
      });
      var pipe = readStream.pipe(ws);
    });

    it('should create files with an _id of arbitrary type', function(done){
      var readStream = fs.createReadStream(imgReadPath, { bufferSize: 1024 });
      var ws = g.createWriteStream({ _id: 'an_arbitrary_id', filename: 'file.img'});

      ws.on('close', function (file) {
        assert(file._id === 'an_arbitrary_id');
        done();
      });

      var pipe = readStream.pipe(ws);
    });
  });

  describe('createReadStream', function(){
    it('should be a function', function () {
      var x = Grid(1);
      assert('function' == typeof x.createReadStream);
    });
  });

  describe('GridReadStream', function(){
    var g
      , rs

    before(function(){
      g = Grid(db);
      rs = g.createReadStream({
        filename: 'logo.png'
      });
    });

    it('should create an instance of Stream', function(){
      assert(rs instanceof Stream);
    });
    it('should should be readable', function(){
      assert(rs.readable);
    });
    it('should store the grid', function(){
      assert(rs._grid == g)
    });
    it('should have a name', function(){
      assert(rs.name == 'logo.png')
    })
    it('should not have an id', function(){
      assert.equal(rs.id, null)
    })
    describe('options', function(){
      it('should have no defaults', function(){
        assert(Object.keys(g.createReadStream({}).options).length === 0);
      });
    })
    it('mode should default to r', function(){
      assert(rs.mode == 'r');
      assert(rs._store.mode == 'r');
    })

    describe('store', function(){
      it('should be an instance of mongo.GridStore', function(){
        assert(rs._store instanceof mongo.GridStore)
      })
    })
    describe('#methods', function(){
      describe('setEncoding', function(){
        it('should be a function', function(){
          assert('function' == typeof rs.setEncoding)
          // TODO test actual encodings
        })
      })
      describe('pause', function(){
        it('should be a function', function(){
          assert('function' == typeof rs.pause)
        })
      })
      describe('destroy', function(){
        it('should be a function', function(){
          assert('function' == typeof rs.destroy)
        })
      })
      describe('resume', function(){
        it('should be a function', function(){
          assert('function' == typeof rs.resume)
        })
      })
      describe('pipe', function(){
        it('should be a function', function(){
          assert('function' == typeof rs.pipe)
        })
      })
    });
    it('should provide piping to a writable stream by name', function(done){
      var file = fixturesDir + 'byname.png';
      var rs = g.createReadStream({
        filename: 'logo.png'
      });
      var writeStream = fs.createWriteStream(file);

      var opened = false;
      var ended = false;

      rs.on('open', function () {
        opened = true;
      });

      rs.on('error', function (err) {
        throw err;
      });

      rs.on('end', function () {
        ended = true;
      });

      writeStream.on('close', function () {
        // check they are identical
        var buf1 = fs.readFileSync(imgReadPath);
        var buf2 = fs.readFileSync(file);

        assert(buf1.length === buf2.length);

        for (var i = 0, len = buf1.length; i < len; ++i) {
          assert(buf1[i] == buf2[i]);
        }

        assert(opened);
        assert(ended);

        fs.unlinkSync(file);
        done();
      });

      rs.pipe(writeStream);
    });

    it('should provide piping to a writable stream by id', function(done){
      var file = fixturesDir + 'byid.png';
      var rs = g.createReadStream({
        _id: id
      });
      var writeStream = fs.createWriteStream(file);
      assert(rs.id instanceof mongo.BSONPure.ObjectID);
      assert(rs.id == String(id))

      var opened = false;
      var ended = false;

      rs.on('open', function () {
        opened = true;
      });

      rs.on('error', function (err) {
        throw err;
      });

      rs.on('end', function () {
        ended = true;
      });

      writeStream.on('close', function () {
        //check they are identical
        assert(opened);
        assert(ended);

        var buf1 = fs.readFileSync(imgReadPath);
        var buf2 = fs.readFileSync(file);

        assert(buf1.length === buf2.length);

        for (var i = 0, len = buf1.length; i < len; ++i) {
          assert(buf1[i] == buf2[i]);
        }

        fs.unlinkSync(file);
        done();
      });

      rs.pipe(writeStream);
    });

    it('should provide piping to a writable stream with a range by id', function(done){
      var file = fixturesDir + 'byid.png';
      var rs = g.createReadStream({
        _id: id,
        range: {
          startPos: 1000,
          endPos: 10000
        }
      });
      var writeStream = fs.createWriteStream(file);
      assert(rs.id instanceof mongo.BSONPure.ObjectID);
      assert(rs.id == String(id))

      var opened = false;
      var ended = false;

      rs.on('open', function () {
        opened = true;
      });

      rs.on('error', function (err) {
        throw err;
      });

      rs.on('end', function () {
        ended = true;
      });

      writeStream.on('close', function () {
        //check they are identical
        assert(opened);
        assert(ended);

        var buf1 = fs.readFileSync(imgReadPath);
        var buf2 = fs.readFileSync(file);

        assert(buf2.length === rs.options.range.endPos - rs.options.range.startPos + 1);

        for (var i = 0, len = buf2.length; i < len; ++i) {
          assert(buf1[i + rs.options.range.startPos] == buf2[i]);
        }

        fs.unlinkSync(file);
        done();
      });

      rs.pipe(writeStream);
    });

    it('should read files with an _id of arbitrary type', function(done){
      var rs = g.createReadStream({ _id: 'an_arbitrary_id'});

      rs.on('open', function () {
        assert(rs.id === 'an_arbitrary_id');
        done();
      });

    });

    it('should allow checking for existence of files', function(done){
      g.exist({ _id: id }, function (err, result) {
        if (err) return done(err);
        assert.ok(result);
        done();
      });
    });

    it('should allow checking for non existence of files', function(done){
      g.exist({ filename: 'does-not-exists.1234' }, function (err, result) {
        if (err) return done(err);
        assert.ok(!result);
        done();
      });
    });

    // See #51
    it('should allow checking for existence of files in an alternate root collection', function(done){
      var alternateFileOptions = {filename: 'alternateLogo.png', root: 'alternate' };
      var readStream = g.createReadStream({filename: 'logo.png'});
      var writeStream = g.createWriteStream(alternateFileOptions);
      readStream.pipe(writeStream);
      writeStream.on('close', function () {
        g.exist(alternateFileOptions, function (err, result) {
          if (err) return done(err);
          assert.ok(result);
          done();
        });
      });
    });

    it('should allow removing files', function(done){
      g.remove({ _id: id }, function (err) {
        if (err) return done(err);
        g.files.findOne({ _id: id }, function (err, doc) {
          if (err) return done(err);
          assert.ok(!doc);
          done();
        })
      });
    })

    it('should be possible to pause a stream after constructing it', function (done) {
      var rs = g.createReadStream({ filename: 'logo.png' });
      rs.pause();
      setTimeout(function () {
        rs.resume();
      }, 1000);

      rs.on('data', function (data) {
        done();
        rs.destroy();
      });
    });

    //issue #46
    it('should be able handle multiple streams with multiple chunks', function (done) {
      var doneCounter = 0;
      var totalCounter = 100;
      var checksums = [];


      this.timeout(10000);
      function doTest (i) {
        var copyFileName = tmpDir + 'logo' + i + '.png';
        var readStream = g.createReadStream({filename: '1mbBlob'});
        var writeStream = fs.createWriteStream(copyFileName);
        readStream.pipe(writeStream);
        writeStream.on('close', function () {
          checksum.file(copyFileName, function (err, sum) {
            checksums.push(sum);
            fs.unlinkSync(copyFileName);
            if (++doneCounter == totalCounter) {
              assert(checksums.filter(function (value, index, self) {
                return self.indexOf(value) === index;
              }).length === 1);
              done();
            }
          });
        });
      }

      var writeStream = g.createWriteStream({filename: '1mbBlob'});
      fs.createReadStream(largeBlobPath).pipe(writeStream);
      writeStream.on('close', function() {
        for (var i = totalCounter; i-- > 0;) {
          doTest(i);
        }
      });
    });
  });

  after(function (done) {
    fs.unlink(largeBlobPath, function (err) {
      if (err) {
        done(err);
      }
      fs.rmdir(tmpDir, function () {
        db.dropDatabase(function () {
          db.close(true, done);
        });
      });
    });
  });
});