///////////////////////////////////////////////////////////////////////////////////////////////////////
//// intents.js allows us to train the app with examples and classify the inputted statements to match
//// one of a set of possible intents (e.g. play, pause, skip, movie-info, etc.).
///////////////////////////////////////////////////////////////////////////////////////////////////////
var openNLP = require("opennlp");
var natural = require('natural');
var nlp = require('nlp_compromise');

var that = this;
var intents = [
	{
		name: 'play',
		strict: false,
		statements: [
			'play a',
			'put on',
			'can you play',
			'show me',
			'show us',
			'show',
			'play some',
			'play something like',
			'play a video by',
			'play something by',
			'show me a video by',
			'play a show'
		]
	},
	{
		name: 'open-video',
		strict: false,
		statements: [
			'open this',
			'launch this on my desktop',
			'pull this up on my computer',
			'put this on my computer',
			'put this on my desktop',
			'show this to me on my mac',
			'put this on my desktop',
			'paul this up on my'
		]
	},
	{
		name: 'movieinfo',
		strict: true,
		declaritive: true,
		statements: [
			'what is this about',
			'what is this',
			'more information',
			'what is this about',
			'what\'s this video about',
			'what are we watching',
			'what is this movie about',
			'what\'s playing',
			'what\'s currently playing',
			'what are we watching',
			'more info'
		]
	},
	{
		name: 'skip',
		strict: false,
		statements: [
			'next',
			'play something else',
			'another',
			'play something different',
			'to play something different',
			'skip this'

		]
	},
	{
		name: 'pause',
		strict: false,
		statements: [
			'pause',
			'stop playback',
			'stop',
			'stop playing'
		]
	},
	{
		name: 'resume',
		strict: false,
		statements: [
			'continue',
			'resume playback',
			'keep playing'
		]
	},
	{
		name: 'back',
		strict: false,
		statements: [
			'go back',
			'to go back',
			'go back to that last',
			'previous',
			'play the last',


		]
	},
	{
		name: 'replay',
		strict: false,
		statements: [
			'replay this',
			'to replay',
			'start this over',
			'start from the beginning',
			'to start over',
			'to restart this',
			'restart this video',
			'play this again',
			'repeat',
			'play again'

		]
	}

];

exports.getIntentByName = function (name) {
	var returnIntent = null;
	intents.forEach(function (element) {
		if (element.name == name) {
			returnIntent = element;
			return;
		}
	}, this);
	return returnIntent;
}


// Needs improvements
exports.affirmativeIntent = function (q) {
	return q.query && q.query.indexOf('yes') > -1
}

exports.determineIntent = function (statement) {

	if (statement) {
		var classifier = new natural.BayesClassifier();
		var i = null;
		intents.forEach(function (intent) {
			intent.statements.forEach(function (matchStatement) {
				if (intent.strict) {
					if (matchStatement.indexOf(statement) > -1 || statement.indexOf(matchStatement) > -1) {
						i = intent;
					}
				}
				classifier.addDocument(matchStatement, intent.name);
			}, this);
		}, this);

		if (i) {
			return i;
		} else {
			classifier.train();
			return that.getIntentByName(classifier.classify(statement));
		}

	} else {
		return that.getIntentByName('play');;
	}

};

exports.generateSearchQuery = function (statement) {
	if (statement) {
		var r = '';
		var s = nlp.pos(statement).sentences[0];
		var a = [];

		a = a.concat(s.entities());
		a = a.concat(s.people());
		a = a.concat(s.nouns());
		a = a.concat(s.adjectives());
		a = a.concat(s.adverbs());
		a = a.concat(s.values());
		a = a.concat(nlp.value(statement).date());

		a.forEach(function (element) {
			if (element && element.normalised && r.indexOf(element.normalised) == -1) {
				r = element.normalised + ' ' + r;
			}
		}, this);

		return that.generateEasterEgg(r);
	} else {
		return statement;
	}

};

exports.generateEasterEgg = function (statement) {
	var s = statement;
	if (s && s.trim() == 'something') {
		//do random at some  point:
		s = 'funny videos compilation';
	}
	return s;
};

/*
that.determineIntent('play a video by michael jackson');
that.determineIntent('restart this video');
that.determineIntent('to play something else');
that.determineIntent('play something different');
that.determineIntent('what\'s this video about');
that.determineIntent('Billy Jean');
that.determineIntent('Play the last video');
that.determineIntent('Give me more information about this video');
that.determineIntent('what\'s playing');
that.determineIntent('what is');
that.determineIntent('play something else');
that.determineIntent('play this again');
that.determineIntent('repeat');
that.determineIntent('more info');
that.determineIntent('play some keeping up with the kardashians');
that.determineIntent('awsome fail footage');
that.determineIntent('go back');
that.determineIntent('for Apple Macintosh software tutorials');
that.determineIntent('play a three second video');
*/
