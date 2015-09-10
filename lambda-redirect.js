///////////////////////////////////////////////////////////////////////////////////////////////////////
//// This lambda redirect file can be pasted as a function within AWS Lambda to reroute the Amazon Echo request to 
//// the server instatiated by voiceplay.js on your local network.  In order for it to function, not only must the lambda function's 
//// ARN endpoint be property configured on the Amazon Developer Console (where you configure the Alexa skill seperate from AWS Lambda), 
//// but whatever port you use below must be open and forwarded to the machine running server.js on your local network/intranet.
///////////////////////////////////////////////////////////////////////////////////////////////////////
var config = {
    host: '68.104.32.7',                                    //ip or hostname of your home network.
    port: 8080,                                             //port you're running app.js on.
    appname: 'Alexa Voice-Activated Airplay Media Server'
};

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = function (event, context) {
    try {
        console.log("event.session.application.applicationId=" + event.session.application.applicationId);

        if (event.session.new) {
            onSessionStarted({ requestId: event.request.requestId }, event.session);
        }
        //Just chuck both types of requests at the server and let it handle things:
        if (event.request.type === "LaunchRequest" || event.request.type === "IntentRequest") {
            onIntent(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "SessionEndedRequest") {
            onSessionEnded(event.request, event.session);
            context.succeed();
        }
    } catch (e) {
        context.fail("Exception: " + e);
    }
};

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
    console.log("onSessionStarted requestId=" + sessionStartedRequest.requestId
        + ", sessionId=" + session.sessionId);
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {
    console.log("onIntent requestId=" + intentRequest.requestId
        + ", sessionId=" + session.sessionId);

    require('http').get(getServiceUrl(intentRequest.intent), function (res) {
        var responseString = '';

        res.on('data', function (data) {
            responseString += data;
        })

        res.on('end', function () {
            var repromptText = "";


            var sessionAttributes = {};


            var response = responseString ? JSON.parse(responseString) : { text: 'Oops! Something went wrong!' };

            var speechOutput = response.text;
            var shouldEndSession = response.shouldEndSession;

            callback(sessionAttributes,
                buildSpeechletResponse(config.appname, speechOutput, repromptText, shouldEndSession));
        });
    });
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
    console.log("onSessionEnded requestId=" + sessionEndedRequest.requestId
        + ", sessionId=" + session.sessionId);
}


// --------------- Helpers that build all of the responses -----------------------

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        card: {
            type: "Simple",
            title: "SessionSpeechlet - " + title,
            content: "SessionSpeechlet - " + output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    }
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: "1.0",
        sessionAttributes: sessionAttributes,
        response: speechletResponse
    }
}

function getServiceUrl(intent) {
    return 'http://' + config.host + ':' + config.port + '/?json=' + escape(JSON.stringify(intent));
}