const lighthouse = require('lighthouse');
const ChromeLauncher = require('lighthouse/lighthouse-cli/chrome-launcher').ChromeLauncher;
const perfConfig = require('lighthouse/lighthouse-core/config/perf.json');
const CircularJSON = require('circular-json');
const got = require('got');
const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');
//const fs = require('fs');
// Connection URL
const url = 'mongodb://heroku_9sb7jt3f:i25u4fst07hgnvcnrb25kba3pj@ds031607.mlab.com:31607/heroku_9sb7jt3f';

function forAll(obj, callback, currentPath) {

    if (!currentPath) { currentPath = []; }

    if (obj) { Object.keys(obj).forEach(compute); }

    function compute(key) {
        var value = obj[key];
        if (typeof value !== 'object') {
            callback(currentPath, key, obj);
        } else {
            var path = currentPath.slice(0);    // clone array
            path.push(key);
            forAll(value, callback, path);      // recursion
        }
    }

    return;

}
// Use connect method to connect to the Server
const insertDocuments = function(db, collection, doc, callback) {
  // Get the documents collection
    const col = db.collection(collection);
  // Insert some documents
    col.insertOne(doc, {check_keys: false,}, function(err, result) {
        assert.equal(err, null);
        console.log(`Inserted document into the ${collection} collection`);
        callback(result);
    });
};
const connectToDB = (collection, doc) => {
    console.log('Trying to connect to MongoDB server.');
    return MongoClient.connect(url,function(err, db) {
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
       .then(stopCL)
       .catch(handleError);
    });
};

/**
 * Stop cL
 */
const stopCL = function() {
  // connect.serverClose();
    console.log('trying to kill');
    chromeLauncher.kill();
    chromeLauncher = null;
    console.log('killed');
};

function getOverallScore(lighthouseResults) {    
    const scoredAggregations = lighthouseResults.aggregations.filter(a => a.scored);
    console.log("scoredAggregations", scoredAggregations);
    const total = scoredAggregations.reduce((sum, aggregation) => sum + aggregation.total, 0);
    console.log("totes", total);
    return (total / scoredAggregations.length) * 100;
}

// Pulling out the metrics we are interested in
function generateTrackableReport(audit) {
    const reports = [
        'first-meaningful-paint',
        'speed-index-metric',
        'estimated-input-latency',
        'time-to-interactive',
        //'total-byte-weight',
        'dom-size',
    ];

    const obj = {
        score: Math.round(audit.score),
        results: {},
    };

    reports.forEach(report => {
        obj.results[report] = getRequiredAuditMetrics(audit.results.audits[report]);
    });
    console.log("OBJ", obj)
    return obj;
}

// getting the values we interested in
function getRequiredAuditMetrics(metrics) {
    return {
        score: metrics.score,
        value: metrics.rawValue,
        optimal: metrics.optimalValue,
    };
}

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
    //stopCL();
    console.log('handle ok');
    console.log('results');
        //  const json = CircularJSON.stringify(results);
        //  const circumscribedRes = JSON.parse(json);
    console.log('Analyzing Lighthouse Metrics'); // eslint-disable-line no-console
    const metrics = generateTrackableReport({
        //score: getOverallScore(results),
        results,
    });
    connectToDB('lighthouse', metrics);        
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


