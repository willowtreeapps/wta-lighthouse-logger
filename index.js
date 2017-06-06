'use strict';

/**
 * Copyright 2017 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const lighthouse = require('lighthouse');
const ChromeLauncher = require('lighthouse/lighthouse-cli/chrome-launcher').ChromeLauncher;
const perfConfig = require('lighthouse/lighthouse-core/config/perf.json');
const log = require('lighthouse/lighthouse-core/lib/log');
const CircularJSON = require('circular-json');
const got = require('got');

let chromeLauncher;

/**
 * Start cL
 */
const startPS = function() {
  got( 'https://www.googleapis.com/pagespeedonline/v2/runPagespeed?url=https://willowtreeapps.com&strategy=mobile&key=AIzaSyCimlxrolGkuhGYp5JF_HJVUB0QrZtNzyo')
      .then(response => {
          console.log(response.body);
          //=> '<!doctype html> ...' 
      })
      .catch(error => {
          console.log(error.response.body);
          //=> 'Internal server error ...' 
      });
}

/**
 * Start cL
 */
 const startCL = function() {
   chromeLauncher = new ChromeLauncher();
   return chromeLauncher.run().then(_ => {
     // startServer();
     return runLighthouse()
       .then(handleOk)
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
  const url = "https://willowtreeapps.com"
  //const url = `http://localhost:${PORT}/index.html`;
  const lighthouseOptions = {logLevel: 'info', output: 'json'}; // available options - https://github.com/GoogleChrome/lighthouse/#cli-options
  log.setLevel(lighthouseOptions.logLevel);
  return lighthouse(url, lighthouseOptions, perfConfig);
};

/**
 * Handle ok result
 * @param {Object} results - Lighthouse results
 */
const handleOk = function(results) {
  stopCL();
  console.log(CircularJSON.stringify(results)); // eslint-disable-line no-console
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


