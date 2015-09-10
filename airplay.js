///////////////////////////////////////////////////////////////////////////////////////////////////////
//// A bit of a wrapper around the airplay2 module.
///////////////////////////////////////////////////////////////////////////////////////////////////////
var browser = require('airplay2').createBrowser();


var that = this;

var config = {
  device: null,
  found: false,
  url: '',
  status: 0,
  playRequested: false,
  discovering: false,
  duration: 0,
  position: 0,
  callback: null,
  start: 0,
  query: null,
  statusResponse: null
};
exports.getConfig = function () {
  return config;
};
exports.stop = function () {
  if (config.device) {
    config.device.stop();
  }

  var devices = browser.getDevices();
  devices.forEach(function (element) {


  }, this);
};
exports.pause = function () {
  if (config.device) {
    config.device.rate(0);
  }
};
exports.resume = function () {
  if (config.device) {
    config.device.rate(1);
  }
};

exports.play = function (url, statusCallback) {

  if (config.device) {
    config.device.stop();
  }

  config.playRequested = true;
  config.url = url;
  config.callback = statusCallback;

  playback(config.start, statusCallback);
};


exports.status = function (statusCallback) {
  if (config.device && statusCallback) {
    config.device.getStatus(function (res) {
      parseStatusResponse(res);
      statusCallback();
    });
  } else if (statusCallback) {
    statusCallback();
  }
};

exports.startDiscover = function () {
  config.discovering = true;
  resetConfig();
  try {
    browser.start();
  } catch (error) {
    console.log(error.message);
  }

}

browser.on('deviceOn', deviceFound);
browser.on('deviceOnline', deviceFound);
browser.on('deviceOffline', function (device) {
  resetConfig();
});

function parseStatusResponse(res) {
  if (res) {
    config.status = STATUSES.PLAYING;
    config.duration = res.duration;
    config.position = res.position;
  } else {
    config.status = STATUSES.ERROR;
  }
  config.statusResponse = res;
}
function resetConfig() {
  config.url = null;
  config.device = null;
  config.found = false;
}


function deviceFound(device) {
  config.device = device;
  config.found = true;
  config.discovering = false;

  console.log('Airplay device discovered: %s.  Ready to start receiving requests from the AWS Lambda function.', config.device.info ? config.device.info.name : 'Unknown');
  if (config.playRequested) {
    playback(0, config.callback);
  }
}

function playback(seconds, statusCallback) {
  if (config.device) {
    config.device.stop();


    var devices = browser.getDevices();
    devices.forEach(function (element) {
      element.play(config.url, seconds, function (res) {

      })

    }, this);
    if (statusCallback) {
      statusCallback();
    }


  } else {
    statusCallback({ error: true });
  }

}


exports.startDiscovery = function () {
  this.startDiscover();
}


var STATUSES = {
  OFF: 0,
  DISCOVERING: 1,
  PLAYING: 2,
  PAUSED: 3,
  ERROR: -1
};
