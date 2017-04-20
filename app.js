'use strict';

var apiai = require('apiai');
var express = require('express');
var bodyParser = require('body-parser');
var uuid = require('node-uuid');
var request = require('request');
var JSONbig = require('json-bigint');
var async = require('async');
var log4js = require('log4js');
var fs = require('fs');
var util = require('util');


//var config = require('devconfig.json');

var REST_PORT = (process.env.PORT || process.env.port || process.env.OPENSHIFT_NODEJS_PORT || 5000);
var SEVER_IP_ADDR = process.env.OPENSHIFT_NODEJS_IP || process.env.HEROKU_IP;
var FB_VERIFY_TOKEN = "verify123";
var FB_PAGE_ACCESS_TOKEN ="EAAAADg2NdZAkBANIwFgsqUJE7mHaVWbMpZBLkLusYX550ZComqg9SJXzWTl9bFExn2ZBel3gBqZBGT2PZBkiqRUgGIqxUctoZAFNFurZBLgZBb2yn6lUqdulYGvMWYoYBZAf1E2xl47QhOvZBXFHM3jIMq6ZAJ1SGZBhHAMkeKbvlZAJM3mgZDZD";
var APIAI_ACCESS_TOKEN = "0b0df306ce58498ba23ecf31503ac615";
var APIAI_LANG = 'en';
var APIAI_VERIFY_TOKEN = 'verify123';
var apiAiService = apiai(APIAI_ACCESS_TOKEN);
var sessionIds = new Map();


log4js.configure({
    appenders:
    [
        {
            type: 'dateFile', filename: 'botws.log', category: 'botws', "pattern": "-yyyy-MM-dd", "alwaysIncludePattern": false
        },
        {
            type: 'logLevelFilter',

            level: 'Info',
            appender: {
                type: "dateFile",

                filename: 'botHistorylog.log',

                category: 'Historylog',
                "pattern": "-yyyy-MM-dd",
                "alwaysIncludePattern": false
            }
        }
    ]
});

var logger = log4js.getLogger("botws");
var ChatHistoryLog = log4js.getLogger('Historylog');

var app = express();
app.use(bodyParser.text({ type: 'application/json' }));

app.listen(REST_PORT, SEVER_IP_ADDR, function () {
    logger.debug('Rest service ready on port ' + REST_PORT);
});


app.get('/webhook/', function (req, res) {
    logger.debug("inside webhook get");
    if (req.query['hub.verify_token'] == FB_VERIFY_TOKEN) {
        res.send(req.query['hub.challenge']);

        setTimeout(function () {
            doSubscribeRequest();
        }, 3000);
    } else {
        res.send('Error, wrong FB validation token');
    }
});


app.get('/apipolling/', function (req, res) {
    logger.debug("Inside api polling");
    try {
        res.end("welcome");
    }
    catch (err) {
        
    }

});
function doSubscribeRequest() {
    request({
        method: 'POST',
        uri: "https://graph.facebook.com/v2.8/me/subscribed_apps?access_token=" + FB_PAGE_ACCESS_TOKEN,
        proxy: config.vz_proxy
    },
        function (error, response, body) {
            if (error) {
                logger.debug('Error while subscription: ', error);
            } else {
                logger.debug('Subscription result: ', response.body);
            }
        });
}
function processEvent(event, userCoversationArr) {
console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< START OF MESSAGE REQUEST >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");  
    logger.debug("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< START OF MESSAGE REQUEST >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");

    var sender = event.sender.id.toString();
    var inpustr = '';
    var msgText = '';

    if (event.message) {
        msgText = event.message.text;
    }

    async.series({
        one: function (callback) {
            if (inpustr != '') {


            }
            else {

            }

        }
    }, function (err, results) {

        if ((event.message && event.message.text) || (event.postback && event.postback.payload)) {

            var text = event.message ? event.message.text : event.postback.payload;

            if (event.message && event.message.quick_reply && event.message.quick_reply.payload) text = event.message.quick_reply.payload;

            logger.debug("Before Account Linking ");

            if (!sessionIds.has(sender)) {
                //logger.debug("Inside sessionID:- ");
                sessionIds.set(sender, uuid.v1());
            }

            var ReqSenderID = event.sender.id.toString();
            var ReqRecipientID = event.recipient.id.toString();
            var ReqMessageText = text;
            var ReqTimeStamp;
            var ReqMessageID;

            if (event.timestamp) {
                ReqTimeStamp = event.timestamp.toString();
            }

            if (event.message) {
                if (event.message.mid) {
                    ReqMessageID = event.message.mid.toString();
                }
            }

            if (event.postback && event.postback.payload && event.postback.payload.indexOf("RetryAuthCode|") > 0) {
                var authCode = event.postback.payload.split("|")[1];
                var paramArr = { authCodeParam: authCode, senderParam: sender, userIdParam: "" };

                //getvzUserID(authCode, userCoversationArr, function (str) { getvzUserIDCallback(str, paramArr, userCoversationArr) });


            } else {

                // api.ai request moved to function
                callapiai(text, sender, sessionIds, userCoversationArr);
            }
        } else if (event.account_linking) {
            //logger.debug("event account_linking content :- " + JSON.stringify(event.account_linking));
            if (event.account_linking == undefined) {
                //  logger.debug("Account Linking null - 2");
            }
            else if (event.account_linking.status === "linked") {
                //logger.debug("Account Linking convert: Auth Code" + JSON.stringify(event.account_linking.authorization_code, null, 2));
                logger.debug("Account Linking convert: Status " + JSON.stringify(event.account_linking.status, null, 2));
                var authCode = event.account_linking.authorization_code;

                //delete event.account_linking;
                var paramArr = { authCodeParam: authCode, senderParam: sender, userIdParam: "" };
                userCoversationArr.ufdreqdatetime = getDateTime();
                getvzUserID(authCode, userCoversationArr, function (str) { getvzUserIDCallback(str, paramArr, userCoversationArr) });

            } else if (event.account_linking.status === "unlinked") {
                //Place holder code to unlink.
                logger.debug("Account unlinked");
                userCoversationArr.ufdreqdatetime = getDateTime();
                //DeleteAuthProfile(sender, userCoversationArr, function (str) { DeleteAuthProfileCallback(str, sender, userCoversationArr) });
            }
        }
    });
}


function callapiai(msgtext, sender, sessionIds, userCoversationArr) {

    logger.debug("api ai start");

    var payloadIntent = '';
    var response = '';
    var strIntent = '';
    var actionname = '';
    var result = '';

    try {

        logger.debug("apiai Call text " + msgtext);
        logger.debug("apiai sender ID " + sender);

        if (msgtext.indexOf('|Payload:recorddetails|') > -1) {

            // logger.debug('inside payload intent with record details');

            userCoversationArr.apireqdatetime = getDateTime();

            var formattedResponse = NLPresponseFormatter("custom", msgtext);

            //logger.debug('payloadmessage::::' + JSONbig.stringify(formattedResponse));

            strIntent = formattedResponse.formattedResponse.parameters.Intent;

            //logger.debug('insidepayloadstrIntent::::' + JSONbig.stringify(strIntent));

            response = result;
            actionname = strIntent;

            userCoversationArr.action = actionname;
            userCoversationArr.intent = actionname;
            userCoversationArr.apiresdatetime = getDateTime();
            userCoversationArr.apiTimeTaken = getsecondstaken('apiai', userCoversationArr.apireqdatetime, userCoversationArr.apiresdatetime);
            userCoversationArr.apiaireq = 'passed';
            printChatHistory(userCoversationArr);

            Findswitchcase(formattedResponse, actionname, strIntent, sender, userCoversationArr, "");



        }
        else if (msgtext.indexOf('|Payload|') > -1) {

            //logger.debug('inside payload intent with other payloads');

            userCoversationArr.apireqdatetime = getDateTime();

            var formattedResponse = NLPresponseFormatter("custom", msgtext);
            //logger.debug('payloadmessage::::' + JSONbig.stringify(formattedResponse));

            strIntent = formattedResponse.formattedResponse.parameters.Intent;

            //logger.debug('insidepayloadstrIntent::::' + JSONbig.stringify(strIntent));

            response = result;
            actionname = strIntent;

            userCoversationArr.action = actionname;
            userCoversationArr.intent = actionname;
            userCoversationArr.apiresdatetime = getDateTime();
            userCoversationArr.apiTimeTaken = getsecondstaken('apiai', userCoversationArr.apireqdatetime, userCoversationArr.apiresdatetime);
            userCoversationArr.apiaireq = 'passed';
            printChatHistory(userCoversationArr);


            Findswitchcase(formattedResponse, actionname, strIntent, sender, userCoversationArr, "");
        }
        else {

            logger.debug('Getting ready to send information to api.ai');

            userCoversationArr.apireqdatetime = getDateTime();

            var apiaiRequest = apiAiService.textProxyRequest(msgtext, { sessionId: sessionIds.get(sender) });

            apiaiRequest.on('response', function (response) {

                if (isDefined(response.result)) {

                    logger.debug("Api.Ai Full Response " + JSON.stringify(response));

                    var responseText = response.result.fulfillment.speech;
                    var responseData = response.result.fulfillment.data;
                    var action = response.result.action;

                    var intent = response.result.metadata.intentName;
                    var Finished_Status = response.result.actionIncomplete;

                    //logger.debug("Finished_Status " + Finished_Status);
                    logger.debug('responseText  : - ' + responseText);
                    //logger.debug('responseData  : - ' + responseData);
                    logger.debug('action : - ' + action);
                    logger.debug('intent : - ' + intent);

                    var logdatetime = getDateTime();

                    userCoversationArr.action = action;
                    userCoversationArr.intent = intent;

                    userCoversationArr.apiresdatetime = getDateTime();
                    userCoversationArr.apiTimeTaken = getsecondstaken('apiai', userCoversationArr.apireqdatetime, userCoversationArr.apiresdatetime);
                    userCoversationArr.apiaireq = 'passed';
                    printChatHistory(userCoversationArr);

                    var strNLP = config.NLP;

                    var formattedResponse = NLPresponseFormatter(strNLP, response);

                    // see if the intent is not finished play the prompt of API.ai or fall back messages
                    if (Finished_Status == true || intent == "Default Fallback Intent") {
                        sendFBMessage(sender, { text: responseText }, userCoversationArr);
                    }
                    else //if the intent is complete do action
                    {
                        logger.debug("----->>>>>>>>>>>> INTENT SELECTION <<<<<<<<<<<------");

                        // Methods to be called based on action
                        //Findswitchcase(response, action, intent, sender, userCoversationArr, "");

                        Findswitchcase(formattedResponse, action, intent, sender, userCoversationArr, responseText);
                    }
                }
            });

            apiaiRequest.on('error', function (error) {
                logger.debug("Error on sending request to api.ai " + error)
                userCoversationArr.apiaireq = 'error';
                printChatHistory(userCoversationArr);

            });


            apiaiRequest.end2();

        }
    }
    catch (apiaierror) {
        logger.error("apiai Error in sending message to apiai " + apiaierror)
    }

    logger.debug("apiai end");
}

function getsecondstaken(whatreq, fromdate, todate) {
    var retsecondsTook;
    try {
        var reqDate = new Date(fromdate);
        var resDate = new Date(todate);

        var differenceTravel = resDate.getTime() - reqDate.getTime();

        retsecondsTook = Math.floor((differenceTravel) / (1000));

        logger.debug("Total seconds Taken for " + whatreq + " is " + retsecondsTook);

        retsecondsTook = retsecondsTook.toString();
    }
    catch (dateDiffexp) {
        logger.debug("Exception while getting the time taken between two dates : " + dateDiffexp)
    }

    return retsecondsTook;
}
function Findswitchcase(response, responseText, strIntent, sender, userCoversationArr, apiairesp) {

    logger.debug("----->>>>>>>>>>>> INTENT SELECTION <<<<<<<<<<<------");
    //logger.debug("Findswitchcase payload " + JSONbig.stringify(response));
    //logger.debug("Findswitchcase apiairesp " + JSONbig.stringify(apiairesp));
    //logger.debug("Selected_action : " + responseText);
    // Methods to be called based on action 
    switch (responseText) {

        case "TheaterSearch":
            logger.debug("----->>>>>>>>>>>> INSIDE MoreOptions <<<<<<<<<<<------");
            userCoversationArr.ufdreqdatetime = '';
            userCoversationArr.ufdresdatetime = ''
            userCoversationArr.ufdTimeTaken = ''
            userCoversationArr.ufdreq = 'NA'
            
            break;

        default:
            logger.debug("----->>>>>>>>>>>> INSIDE default <<<<<<<<<<<------");

            if ((apiairesp == undefined) || (apiairesp == ''))
                        

            break;
    }
}
function NLPresponseFormatter(NLP, response) {
    var formattedResponse = {};
    if (NLP == "apiai") {
        //convert api resp to below format
        formattedResponse = { "formattedResponse": { "parameters": response.result.parameters } };
    }
    else if (NLP == "watson") {
        //convert Watson  resp to below format
        formattedResponse = { "formattedResponse": { "parameters": { "Channel": "HBO", "ChannelGenre": "", "date": "", "Genre": "", "Programs": "" } } };
    }
    else if (NLP == "custom") { //payload concept

        //convert payload resp to below format

        //logger.debug("custom payload conversion" + response);

        var result = { parameters: {} };
        {
            response.split('|').forEach(function (x) {
                var arr = x.split(':');
                arr[1] && (result.parameters[arr[0]] = arr[1]);
                arr[1] && ("{" + arr[0].trim() + ":" + arr[1].trim() + "}");
            });

            //  logger.debug('strPayloadresult : ' + JSONbig.stringify(result));
        }

        formattedResponse = { "formattedResponse": result };
    }

    return formattedResponse;
}
function getsecondstaken(whatreq, fromdate, todate) {
    var retsecondsTook;
    try {
        var reqDate = new Date(fromdate);
        var resDate = new Date(todate);

        var differenceTravel = resDate.getTime() - reqDate.getTime();

        retsecondsTook = Math.floor((differenceTravel) / (1000));

        logger.debug("Total seconds Taken for " + whatreq + " is " + retsecondsTook);

        retsecondsTook = retsecondsTook.toString();
    }
    catch (dateDiffexp) {
        logger.debug("Exception while getting the time taken between two dates : " + dateDiffexp)
    }

    return retsecondsTook;
}
