

var ytdl = require('ytdl-core');
var app = (require('express'))();
var youtube = new (require('youtube-node'))();
var airplay = require('./airplay.js');
var intents = require('./intents.js');
var dns = require('dns');


///////////////////////////////////////////////////////////////////////////////////////////////////////
//// General state management ~ current query, intent, view history, config, etc.
///////////////////////////////////////////////////////////////////////////////////////////////////////

var context = {
  appname: 'Amazon Echo / Alexa Voice-Activated Airplay Media Server',
  server: null,
  intent: null,
  history: [],
  userPrompted: false,
  prompt: -1,
  cancel: false,
  query: null,
  youtubeResults: [],
  playbackIndex: 0,
  request: null,
  response: null,
  statement: null,
  searchStatement: null,
  video: {
    playing: false,
    title: null,
    description: null,
    url: null,
    youtubeUrl: null
  },
  config: {
    iTunesPath: '/Volumes/Media/iTunes/Home Videos/',
    youtubeApiKey: '',
    host: null,
    port: 8080
  },
};


var PROMPTS = {
  NONE: -1,
  LAUNCH: 0,
  RESTART_VIDEO: 1,
  NEXT_VIDEO: 2,
  TROUBLESHOOT: 3,
  CANCEL: 4
};


exports.configure = function (c) {
  context.config = c;
};

///////////////////////////////////////////////////////////////////////////////////////////////////////
//// Node Web Server - the app is essentiall a web server that exposes 3 endpoints:
////   ---- /           -- receives the request from the AWS Lambda service.
////   ---- /itunes     -- serves the iTunes media library content request by AppleTV
////   ---- /youtube    -- serves the YouTube video as requested by the AppleTV 
///////////////////////////////////////////////////////////////////////////////////////////////////////
exports.start = function () {
  airplay.startDiscover();
  context.server = app.listen(context.config.port, function () {
    dns.lookup(require('os').hostname(), function (err, address, fam) {
      context.config.host = address;

      console.log('%s listening at http://%s:%s',
        context.appname,
        context.config.host,
        context.config.port);
      
    });
  });
};



///////////////////////////////////////////////////////////////////////////////////////////////////////
//// On /itunes, the app serves the content of your iTunes media library. 
///////////////////////////////////////////////////////////////////////////////////////////////////////
app.get('/itunes/', function (req, res) {
  var fs = require('fs');
  var file = context.config.iTunesPath + getITunesFileNameFromRequest(req);
  fs.exists(file, function (exists) {

    if (exists) {
      fs.createReadStream(file).pipe(res);
    } else {
      render404(req, res);
    }
  });

});

///////////////////////////////////////////////////////////////////////////////////////////////////////
//// On /videos/{videoId} via ytdl the app streams the corresponding YouTube video supplied by the parameter
//// videoId which is the YouTuve video's unique ID.
///////////////////////////////////////////////////////////////////////////////////////////////////////
app.get('/videos/:videoId', function (req, res) {
  var videoId = req.params.videoId;
  var videoUrl = 'https://www.youtube.com/watch?v=' + videoId;

  ytdl(videoUrl, { quality: 'highest', filter: function (format) { return format.container === 'mp4'; } })
    .pipe(res);
});


///////////////////////////////////////////////////////////////////////////////////////////////////////
//// This endpoint receives the raw request from the AWS Lambda service and parses it, using intents.js
//// & airplay.js to determine what to do with the request.
///////////////////////////////////////////////////////////////////////////////////////////////////////
app.get('/', function (req, res) {

  context.history.push(context.intent);
  context.intent = getIntentFromRequest(req);
  context.request = req;
  context.response = res;

  //Figure out what to do with the request.
  parseIntent(function () {
    if (context.cancel) {
      context.prompt = PROMPTS.NONE;
      context.userPrompted = false;
      context.cancel = false;
      context.intent.responseEnd = true;
    }

    if (playbackNotCancelled()) {
      renderPlayback(context.intent);
    }
    

    //Respond the AWS lambda service
    res.json({
      text: context.intent.responseText,
      shouldEndSession: context.intent.responseEnd
    });

  });
});


///////////////////////////////////////////////////////////////////////////////////////////////////////
//// Parse intent to determine what to do.
///////////////////////////////////////////////////////////////////////////////////////////////////////
function parseIntent(callback) {

  determineIfUserPrompted(context.intent);

  if (context.intent.responseEnd && !context.cancel) {

    var d = intents.determineIntent(context.intent.query);

    if (d && d.name) {
      context.userPrompted = false;
      context.cancel = true;
      context.intent.responseEnd = true;
      context.intent.cancel = true;

      switch (d.name) {
        case 'movieinfo':
          respondWithMovieInfo();
          break;
        case 'pause':
          respondWithMoviePause();
          break;
        case 'resume':
          respondWithMovieResume();
          break;
        case 'play':
          searchByIntent(-1, callback);
          return;
        case 'skip':
          respondWithMovieSkipping(callback);
          return;
        case 'replay':
          searchByIntent(context.playbackIndex, callback);
          return;
        case 'open-video':
          respondWithOpeningMovieOnServer();
          break;
        case 'back':
          if (context.playbackIndex > -1) {
            respondWithMovieSkippingBack(callback);
            return;
          } else {
            context.intent.responseText = 'Sorry, there\'s no video to go back to.';
            break;
          }

      }

    }

  }

  callback(context.intent);
}

function respondWithMovieInfo() {
  if (context.video) {
    context.intent.responseText = context.video.title;
  } else {
    context.intent.responseText = 'You don\'t seem to be watching anything right now.';
  }
}

function respondWithMoviePause() {
  airplay.pause();
  context.intent.responseText = 'Playback paused.';
}

function respondWithMovieResume() {
  airplay.resume();
  context.intent.responseText = 'Playback resume.';
}

function respondWithMovieSkipping(callback) {
  context.playbackIndex++;
  searchByIntent(context.playbackIndex, callback);
}

function respondWithMovieSkippingBack(callback) {
  context.playbackIndex--;
  searchByIntent(context.playbackIndex, callback);
}

function respondWithOpeningMovieOnServer() {
  context.intent.responseText = 'OK.  Pulling this up on your mac.';
  context.intent.responseEnd = true;

  invoke('open /Applications/Safari.app ' + (context.video.youtubeUrl ? context.video.youtubeUrl : context.video.url));
}

///////////////////////////////////////////////////////////////////////////////////////////////////////
//// Here we determine if the user was previously prompted by a question by the amazon ech as a response
//// to the user's input.
///////////////////////////////////////////////////////////////////////////////////////////////////////
function determineIfUserPrompted() {
  if (context.userPrompted) {

    switch (context.prompt) {
      case PROMPTS.LAUNCH:
        setUserPromptNone();
        break;
      case PROMPTS.RESTART_VIDEO:
        setUserPromptRestart();
        break;
    }

  } else {
    if (context.intent.name == 'launch') {
      setUserPromptForLaunch();
    }
  }
}

function setUserPromptRestart() {
  context.cancel = true;
  if (intents.determineAffirmativeIntent(context.intent)) {
    console.log('User confirmed affirmative intent: %s', JSON.stringify(context.intent));

    context.intent = context.history.length - 2 > -1 ? context.history[context.history.length - 2] : context.intent;
    context.intent.responseEnd = true;
    context.intent.responseText = 'Restarting this video.';

  } else {
    context.intent.responseEnd = true;
    context.intent.responseText = 'K.  I\'ll leave it on!';
    context.intent.cancel = true;
  }
}

function setUserPromptNone() {
  context.userPrompted = false;
  context.prompt = PROMPTS.NONE;
}

function setUserPromptForLaunch() {
  context.intent.responseEnd = false;
  context.intent.responseText = 'What would you like to watch?';
  context.userPrompted = true;
  context.prompt = PROMPTS.LAUNCH;
}

function searchByIntent(playbackIndex, callback) {
  context.statement = playbackIndex == -1 ? intents.generateSearchQuery(context.intent.query) : context.statement;
  context.youtubeResults = null;
  context.playbackIndex = playbackIndex == -1 ? 0 : playbackIndex;
  context.cancel = false;
  context.intent.responseEnd = true;
  context.intent.cancel = false;

  switch (context.intent.name) {
    case 'YouTube':
      searchForYouTubeVideos(function (videoId) {
        if (videoId) {
          context.intent.responseText = 'Playing ' + context.statement + '. ' + context.intent.video.title + ' from YouTube.';
        } else {
          context.intent.responseText = 'I couldn\'t find anything like that on youtube.';
        }
        callback(context.intent);
      });
      break;

    case 'iTunes':

      searchMovieDirectory(function (file) {
        context.intent.video.data = file;
        context.intent.video.url = getServeriTunesPath(context.request, file);
        context.intent.video.title = parseMovieTitle(file);
        context.intent.responseText = 'Now playing ' + context.intent.video.title + ' from your iTunes library.';

        callback(context.intent);

      });

      break;
    default:

      callback(context.intent);

      break;
  }

}
function playbackNotCancelled() {
  return (context.intent.responseEnd && !context.intent.cancel);
}


///////////////////////////////////////////////////////////////////////////////////////////////////////
//// Initiate playback on the airplay device.
///////////////////////////////////////////////////////////////////////////////////////////////////////
function renderPlayback() {
  airplay.play(context.intent.video.url, function (e) {
    if (!e) {
      if (airplay.getConfig().status == -1) {
        context.intent.responseEnd = true;
        context.intent.responseText = 'I\'m having trouble connecting to your AirPlay device.';
      } else {
        context.video = context.intent.video;
      }
    } else {
      context.intent.responseEnd = true;
      context.intent.responseText = 'I\'m having trouble connecting to your AirPlay device.  Please make sure it\'s on.';

    }
  });
}

function render404(req, res) {
  res.status(404);
  if (req.accepts('json')) {
    res.send({ error: 'Not found' });
    return;
  }
  res.type('txt').send('Not found');
}


///////////////////////////////////////////////////////////////////////////////////////////////////////
//// Searches the supplied itunes movie directory for the query provided.
///////////////////////////////////////////////////////////////////////////////////////////////////////
function searchMovieDirectory(callback) {
  require('fs').readdir(context.config.iTunesPath, function (err, files) {
    if (err) throw err;

    var matchFile;
    var matchCount = 0;
    files.forEach(function (file) {
      file = file.toLowerCase();

      var t = intents.generateSearchQuery(context.intent.query).split(' ');
      var c = 0;

      t.forEach(function (e1) {

        c += (file.indexOf(e1) > -1 ? 1 : 0);

      }, this);

      if (c > matchCount) {
        matchFile = file;
        matchCount = c;
      }

    });

    callback(matchFile);
  });
}



///////////////////////////////////////////////////////////////////////////////////////////////////////
//// Utilizes the YouTube API and configured API key to search YouTube for the provided query.
///////////////////////////////////////////////////////////////////////////////////////////////////////
function searchForYouTubeVideos(callback) {
  if (context.intent && context.intent.video && context.intent.video.data) {
    callback(context.intent.video.data);
  } else {
    youtube.setKey(context.config.youtubeApiKey);
    youtube.addParam('type', 'video');
    youtube.search(context.statement, 10, function (error, result) {
      if (!error && result && result.items) {
        context.youtubeResults = result.items;

        populateVideoMetaData(context.youtubeResults[context.playbackIndex]);

        callback(context.intent.video.youTubeVideoId);
      } else {
        callback(null);
      }
    });
  }

}

///////////////////////////////////////////////////////////////////////////////////////////////////////
//// Populates the intent with the video's meta data.
///////////////////////////////////////////////////////////////////////////////////////////////////////
function populateVideoMetaData(item) {
  context.intent.video.description = item.snippet.description;
  context.intent.video.title = item.snippet.title;
  context.intent.video.youTubeVideoId = item.id.videoId;
  context.intent.video.data = item.id.videoId;
  context.intent.video.url = getServerYouTubePath(context.request, item.id.videoId);
  context.intent.video.youtubeUrl = 'http://youtube.com/watch?v=' + item.id.videoId;

}

///////////////////////////////////////////////////////////////////////////////////////////////////////
//// Here we parse the request to determine what the user's intent was.
///////////////////////////////////////////////////////////////////////////////////////////////////////
function getIntentFromRequest(req) {
  var query = getQueryFromRequest(req);
  var json = query && query.json != undefined && query.json != 'undefined' ? JSON.parse(query.json) : null;
  var queryText = json ? json.slots.Question.value : null;
  var i = json ? json.name : 'launch';
  var responseEnd = true;
  var responseText = '';

  if (queryText == null) {
    //Experimental ~ using AppleWatch to play YouTube videos:
    queryText = query && query.input != undefined && query.input != 'undefined' ? query.input : null;
    i = 'YouTube';
  }
  queryText = queryText ? queryText.toLowerCase() : queryText;

  if (queryText == null) {
    responseText = 'What would you like to watch?';
    responseEnd = false;
  }

  return {
    query: queryText,
    name: i,
    responseText: responseText,
    responseEnd: responseEnd,
    video: {}
  };
}


///////////////////////////////////////////////////////////////////////////////////////////////////////
//// Utility
///////////////////////////////////////////////////////////////////////////////////////////////////////
function getQueryFromRequest(req) {
  var url = require('url');
  var url_parts = url.parse(req.url, true);
  var query = url_parts.query;

  return query;
}

function getServerPath(req) {
  return 'http://' + context.config.host + ':' + context.config.port;
}

function getServerYouTubePath(req, videoId) {
  return getServerPath(req) + '/videos/' + videoId
}
function getServeriTunesPath(req, file) {
  return getServerPath(req) + '/itunes/?file=' + escape(file);
}

function getITunesFileNameFromRequest(req) {
  var query = getQueryFromRequest(req);
  var name = query ? unescape(query.file) : null;

  return name;

}

function parseMovieTitle(title) {
  if (title && title.indexOf('.') > -1) {
    return title.replace(/\./g, ' ');
  }
  return title;
}

///////////////////////////////////////////////////////////////////////////////////////////////////////
//// Let the user know the server's port is in use.
///////////////////////////////////////////////////////////////////////////////////////////////////////
process.on('uncaughtException', function (err) {
  if (err.errno === 'EADDRINUSE')
    console.log('Looks like that port is in use.');
  else
    console.log(err);
  process.exit(1);
});     



///////////////////////////////////////////////////////////////////////////////////////////////////////
//// Used for opening safari or chrome.
///////////////////////////////////////////////////////////////////////////////////////////////////////
function invoke(cmd) {
  var exec = require('child_process').exec;
  exec(cmd, function (error, stdout, stderr) {
    console.log(stderr);
  });
}