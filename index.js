const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const perfConfig = require('lighthouse/lighthouse-core/config/perf.json');
const got = require('got');
const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');
require('dotenv').config()

// hackery to fix bug in chrome-devtools-frontend
// https://github.com/GoogleChrome/lighthouse/issues/73#issuecomment-309159928
/*global self*/
self.setImmediate = (callback, ...argsForCallback) => {
    Promise.resolve().then(() => callback(...argsForCallback));
    return 0;
};

// Use connect method to connect to the Server
const insertDocuments = (db, collection, doc, callback) => {
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
    const dbURL = process.env.MONGODB_URI;
    console.log('Trying to connect to MongoDB server.');
    return MongoClient.connect(dbURL,function(err, db) {
        assert.equal(null, err); 
        console.log('Connected correctly to server.');
        insertDocuments(db, collection, doc, function() {
            db.close();
        });
    });
};

/**
 * Start Pagespeed report
 */
async function startPS(url) {
    got( `https://www.googleapis.com/pagespeedonline/v2/runPagespeed?url=${url}&strategy=mobile&key=${process.env.PS_KEY}`)
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
 * Start Chrome and Lighthouse
 */
const startCL = () => {
  runLighthouse('https://willowtreeapps.com')
 .then(handleOk)
 .catch(handleError);
}
        

const getOverallScore =  lighthouseResults => {    
    const scoredAggregations = lighthouseResults.aggregations.filter(a => a.scored);
    console.log('scoredAggregations', scoredAggregations);
    const total = scoredAggregations.reduce((sum, aggregation) => sum + aggregation.total, 0);
    console.log('totes', total);
    return (total / scoredAggregations.length) * 100;
};

// Pulling out the metrics we are interested in
const generateTrackableReport = audit => {
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
    
    return obj;
};

// getting the values we interested in
const getRequiredAuditMetrics = metrics => 
     ({
        score: metrics.score,
        value: metrics.rawValue,
        optimal: metrics.optimalValue,
    });

/**
 * Run lighthouse
 */
async function runLighthouse(url) {
    // available options - https://github.com/GoogleChrome/lighthouse/#cli-options
    console.log("Launching Chrome.")
    const chrome = await chromeLauncher.launch({
        port: 9222,
        chromeFlags: ['--headless', '--disable-gpu', '--remote-debugging-port=9222',],
    });
    const lighthouseOptions = {
      output: 'json',
      port: chrome.port,
    };
    console.log("Lighthouse debugging started on port", chrome.port)
    const results = await lighthouse(url, lighthouseOptions, perfConfig);
    process.on('exit', e => {
      console.log('Lighthouse stopped: ', e);
    });
    process.on('uncaughtException', e => {
      console.log('Chrome exiting. Caught exception: ', e);
    });
    await chrome.kill();
    return results;
};

/**
 * Handle ok result
 * @param {Object} results - Lighthouse results
 */
const handleOk = results => {
    console.log('Analyzing Lighthouse Metrics'); // eslint-disable-line no-console
    const metrics = generateTrackableReport({
        //score: getOverallScore(results),
        results,
    });
    connectToDB('lighthouse', metrics);        
  // TODO: use lighthouse results for checking your performance expectations.
  // e.g. process.exit(1) or throw Error if score falls below a certain threshold.
  //return results;
};

/**
 * Handle error
 */
const handleError = e => {
    console.error(e);
    throw e; // Throw to exit process with status 1.
};

const runReports = url => {
  startPS(url), startCL(url);
}

runReports('https://willowtreeapps.com');

