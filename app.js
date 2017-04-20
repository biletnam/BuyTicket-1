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
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

var config = require('./config/devconfig.json');

var REST_PORT = (process.env.PORT || process.env.port || process.env.OPENSHIFT_NODEJS_PORT || 8080);
var SEVER_IP_ADDR = process.env.OPENSHIFT_NODEJS_IP || process.env.HEROKU_IP || '127.0.0.1';
var FB_VERIFY_TOKEN = config.FBVERIFYTOKEN;
var APIAI_ACCESS_TOKEN = config.APIAIACCESSTOKEN;
var APIAI_LANG = 'en';
var APIAI_VERIFY_TOKEN = config.APIAI_VERIFY_TOKEN;
var apiAiService = apiai(APIAI_ACCESS_TOKEN);

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


