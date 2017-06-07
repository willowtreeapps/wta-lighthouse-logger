const lighthouse = require('lighthouse');
const ChromeLauncher = require('lighthouse/lighthouse-cli/chrome-launcher').ChromeLauncher;
const perfConfig = require('lighthouse/lighthouse-core/config/perf.json');
const log = require('lighthouse/lighthouse-core/lib/log');
const CircularJSON = require('circular-json');
const got = require('got');
const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');
// Connection URL
const url = 'mongodb://heroku_9sb7jt3f:i25u4fst07hgnvcnrb25kba3pj@ds031607.mlab.com:31607/heroku_9sb7jt3f';
// Use connect method to connect to the Server
const insertDocuments = function(db, collection, doc, callback) {
  // Get the documents collection
    const col = db.collection(collection);
  // Insert some documents
    col.insertOne(doc, function(err, result) {
        assert.equal(err, null);
        console.log(`Inserted document into the ${collection} collection`);
        callback(result);
    });
};
const connectToDB = (collection, doc) => {
    return MongoClient.connect(url, function(err, db) {
        assert.equal(null, err); 
        console.log('Connected correctly to server');

        insertDocuments(db, collection, doc, function() {
            db.close();
        });
    });
};


let chromeLauncher;

/**
 * Start cL
 */
const startPS = function() {
    got( 'https://www.googleapis.com/pagespeedonline/v2/runPagespeed?url=https://willowtreeapps.com&strategy=mobile&key=AIzaSyCimlxrolGkuhGYp5JF_HJVUB0QrZtNzyo')
      .then(response => {
          console.log('Analyzing Pagespeed Metrics');
          connectToDB('pagespeed', JSON.parse(response.body));
      })
      .catch(error => {
          console.log(error.response.body);
          //=> 'Internal server error ...' 
      });
};
/**
 * Start cL
 */
const startCL = function() {
    chromeLauncher = new ChromeLauncher();
    return chromeLauncher.run().then(_ => {
     // startServer();
        return runLighthouse()
       .then(handleOk)
       .then( results => {
           console.log('results');
           const circumscribedRes = CircularJSON.stringify(results);
           console.log('Analyzing Lighthouse Metrics'); // eslint-disable-line no-console
         //console.log(circumscribedRes);
           connectToDB('lighthouse', circumscribedRes);
       })
       .catch(handleError);
    });
};

/**
 * Stop cL
 */
const stopCL = function() {
  // connect.serverClose();
    chromeLauncher.kill();
    chromeLauncher = null;
};

/**
 * Run lighthouse
 */
const runLighthouse = function() {
    const url = 'https://willowtreeapps.com';
  //const url = `http://localhost:${PORT}/index.html`;
    const lighthouseOptions = {/*logLevel: 'info',*/ output: 'json',}; // available options - https://github.com/GoogleChrome/lighthouse/#cli-options
    //log.setLevel(lighthouseOptions.logLevel);
    return lighthouse(url, lighthouseOptions, perfConfig);
};

/**
 * Handle ok result
 * @param {Object} results - Lighthouse results
 */
const handleOk = function(results) {
    stopCL();
    console.log('handle ok');
  // TODO: use lighthouse results for checking your performance expectations.
  // e.g. process.exit(1) or throw Error if score falls below a certain threshold.
    return results;
};

/**
 * Handle error
 */
const handleError = function(e) {
    stopCL();
    console.error(e); // eslint-disable-line no-console
    throw e; // Throw to exit process with status 1.
};

const init = function() {
    startPS();
    startCL();
};

init();


