
var assert = chai.assert;


describe('IDB', function() {

	var initIDB = function initIDB(done) {
		var db = new IDB({ name: 'testdb', version: 1 });
		db.onUpgrade = function(db, oldVersion, newVersion) {
			var dirtyStore = db.createObjectStore('dirty', { keyPath: 'id', autoIncrement: true });
			dirtyStore.createIndex('modelIdAndStoreNameIndex', ['modelId', 'storeName'], { unique: true });
			dirtyStore.createIndex('storeNameIndex', 'storeName', { unique: false });

			var destroyedStore = db.createObjectStore('destroyed', { keyPath: 'id', autoIncrement: true });
			destroyedStore.createIndex('modelIdAndStoreNameIndex', ['modelId', 'storeName'], { unique: true });
			destroyedStore.createIndex('storeNameIndex', 'storeName', { unique: false });
		};
		db.onConnect = function() {
			done(null, db);
		};
		db.onError = function(err) { 
			done(err);
		};
	};

	beforeEach(function (done) {
		IDB.dropDatabase('testdb', done);
	});

	it('Should create an entry with IDB', function (done) {
		initIDB(function (err, db) {
			if (err) return done(err);
			db.add('dirty', { foo: 'bar' }, function (err, newId) {
				if (err) return done(err);
				assert.equal(newId, 1);
				db.findOne('dirty', newId, function (err, result) {
					if (err) return done(err);
					assert.isNotNull(result);
					db.close();
					done();
				});
			});
		});
	});

	it('Should edit an entry with IDB', function (done) {
		initIDB(function (err, db) {
			if (err) return done(err);
			db.add('dirty', { foo: 'bar' }, function (err, newId) {
				if (err) return done(err);
				assert.equal(newId, 1);
				db.edit('dirty', { id: newId, foo: 'bar2' }, function (err, newId) {
					if (err) return done(err);
					db.findOne('dirty', newId, function (err, result) {
						if (err) return done(err);
						assert.isNotNull(result);
						assert.equal(result.foo, 'bar2');
						db.close();
						done();
					});	
				});
			});
		});
	});


	it('Should delete an entry with IDB', function (done) {
		initIDB(function (err, db) {
			if (err) return done(err);
			db.add('dirty', { foo: 'bar' }, function (err, newId) {
				if (err) return done(err);
				assert.equal(newId, 1);
				db.delete('dirty', newId, function (err) {
					if (err) return done(err);
					db.findOne('dirty', newId, function (err, result) {
						if (err) return done(err);
						assert.isNull(result);
						db.close();
						done();
					});
				});
			});
		});
	});

	it('Should clear a store with IDB', function (done) {
		initIDB(function (err, db) {
			if (err) return done(err);
			db.add('dirty', { foo1: 'bar1' }, function (err, newId1) {
				if (err) return done(err);
				db.add('dirty', { foo2: 'bar2' }, function (err, newId2) {
					if (err) return done(err);
					db.clear('dirty', function (err) {
						if (err) return done(err);
						db.findOne('dirty', newId1, function (err, result) {
							if (err) return done(err);
							assert.isNull(result);
							db.close();
							done();
						});
					});
				});
			});
		});
	});

	it('Should find all entries in a store with IDB', function (done) {

		var fixtures = function (db, callback) {
			db.add('dirty', { 'modelId': 1, 'storeName': 'customers' }, function (err, newId1) {
				if (err) return callback(err);
				db.add('dirty', { 'modelId': 2, 'storeName': 'customers' }, function (err, newId2) {
					if (err) return callback(err);
					db.add('dirty', { 'modelId': 3, 'storeName': 'customers' }, function (err, newId3) {
						if (err) return callback(err);
						callback();
					});
				});
			});
		};

		initIDB(function (err, db) {
			if (err) return done(err);
			fixtures(db, function (err) {
				if (err) return done(err);
				var conditions = {
					index: 'modelIdAndStoreNameIndex',
					keyRange: db.makeKeyRange({ only: [1, 'customers'] })
				};
				db.find('dirty', conditions, function (err, results) {
					if (err) return done(err);
					assert.equal(results.length, 1);
					assert.equal(results[0].modelId, 1);

					var conditions = {
						index: 'storeNameIndex',
						keyRange: db.makeKeyRange({ only: 'customers' })
					};
					db.find('dirty', conditions, function (err, results) {
						if (err) return done(err);
						assert.equal(results.length, 3);
						assert.equal(results[0].modelId, 1);
						assert.equal(results[1].modelId, 2);
						assert.equal(results[2].modelId, 3);

						var conditions = {
							keyRange: db.makeKeyRange({ lower: 2, upper: 3 })
						};
						db.find('dirty', conditions, function (err, results) {
							if (err) return done(err);
							assert.equal(results.length, 2);
							assert.equal(results[0].modelId, 2);
							assert.equal(results[1].modelId, 3);
							db.close();
							done();
						});
					});
				});
			});
		});
	});
});
