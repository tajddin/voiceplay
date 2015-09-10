#!/usr/bin/env node
///////////////////////////////////////////////////////////////////////////////////////////////////////
//// Voiceplay is an experimental method of controlling your airplay-connected devices by voice via the Amazon Echo, enabling you to search for and control content from YouTube and your iTunes media library and play it directly on your TV.  

//// Application initialization and config prep.  All the magic happens in server.js but voiceplay.js is the entrypoint
//// allows us to prep and start the server with our configuration details.
//// 
//// REQUIREMENTS

//// - YouTube API Key, availabe via the Google Developers Console. 
//// - Amazon Web Services Account

///////////////////////////////////////////////////////////////////////////////////////////////////////
var server = require('./server.js');

server.configure({
  iTunesPath: '/Volumes/Media/iTunes/Home Videos/',           // iTunes media library path
  youtubeApiKey: 'AIzaSyDT6ebsYYqQGOY95izP1jtilUsrYdSKXIE',   // example YouTube API key
  port: 8080
});


server.start();




