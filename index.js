const lighthouse = require('lighthouse');
const chromeLauncher = require('lighthouse/chrome-launcher/chrome-launcher');
const log = require('lighthouse/lighthouse-core/lib/log');

function launchChromeAndRunLighthouse(url, flags, config = null) {
  return chromeLauncher.launch().then(chrome => {
    flags.port = chrome.port;
    return lighthouse(url, flags, config).then(results =>
      chrome.kill().then(() => results)
    );
  });
}

const flags = {logLevel: 'info', output: 'json'};
log.setLevel(flags.logLevel);

// Usage:
launchChromeAndRunLighthouse('https://willowtreeapps.com', flags).then(results => {
  // Use results!
});