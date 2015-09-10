# README #
Voiceplay is an experimental method of controlling your airplay-connected devices by voice via the Amazon Echo, enabling you to search for and control content from YouTube and your iTunes media library and play it directly on your TV.  

Voiceplay is comprised of a node-based server that runs on your local network and two  AWS Lambda functions  that redirect your voice queries to your home media server.  The voiceplayer server communicates with auto-discovered airplay-compatible devices, like an Apple TV. It leverages NaturalNode's naïve Bayes classifier to infer commands based upon natural language.

### Requirements ###
* Amazon Echo
* Apple TV
* Node installed - https://nodejs.org/en/
* Amazon Apps & Services Developer Account - https://developer.amazon.com/appsandservices
* Amazon Web Services Account (for your Lambda redirect functions) - http://aws.amazon.com
* YouTube API key via the Google Developers Portal (for searching YouTube) - https://console.developers.google.com
	

### Setup ###
* If you haven't already, install node.
* With npm, install the latest version of voiceplay:

```
#!
npm install voiceplay
```

* Using Finder, Navigate to the folder where the voiceplay module is installed and open voiceplay.js with your editor of choice to specify its start arguments: your YouTube API key and the path to your iTunes directory.



```
#!javascript

server.configure({
  iTunesPath: '/Volumes/Media/iTunes/Home Videos/',           // iTunes media library path
  youtubeApiKey: 'AIzaSyDT6ebsYYqQGOY95izP1jtilUsrYdSKXIE',   // example YouTube API key
  port: 8080
});
```

* Save the script and with terminal navigate to the directory where you installed the voiceplay module and run it:


```
#!
node voiceplay
```

* If successfully running, you will see:

```
#!
Amazon Echo / Alexa Voice-Activated Airplay Media Server listening at http://192.168.0.12:8080 
Airplay device discovered: Apple TV.  Ready to start receiving requests from the AWS Lambda function.
```
* Sign up or log in to the [AWS Console](http://console.aws.amazon.com) and choose Lambda from the Services > All Services menu. 
* Create a Lambda function, skip the intro wizard, name this function 'YouTube' and paste the contents of 'lambda redirect.js'.  A description isn't required.
* Repeat the process for the iTunes media function, naming it iTunes (the names of these functions on the AWS portal isn't important). Take note of each function's ARN endpoint.
* Seperate from AWS, log in to your [Amazon Apps & services Developer Account](https://developer.amazon.com/appsandservices) and under Apps & Services, choose Alexa.
* You will need to add two Alexa Skills - one for YouTube and the other for iTunes.  Each skill has an associated name (youtube | itunes), invocation name (youtube | itunes), intent schema & sample utterances included here that must be specified in order for the functions to work.
* For each skill, specify the ARN of the lambda functions created on the AWS console.

### Notes ###
* Ensure that the port you specifed (default: 8080) is open by your ISP and that it's forwarded to the computer running voiceplay.js.
<<<<<<< HEAD
* Refer to [Developing an Alexa Skill as a Lambda Function](https://developer.amazon.com/appsandservices/solutions/alexa/alexa-skills-kit/docs/developing-an-alexa-skill-as-a-lambda-function) to learn how to prep your Amazon Echo for use with your Amazon Developer account.


=======
>>>>>>> ec06f640c11ad93d1ae22180a7f3068d7bef4f5f
