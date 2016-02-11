/*
 * Copyright 2015 Mauro Calvi <coupdemistral@gmail.com>
 * Copyright 2014-2015 Fabian Tollenaar <fabian@starting-point.nl>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/*
 * Modified original ws.js to authenticate a websocket request. The ws URL must include the user_id and token parameters, which are checked against
 * the server's mongodb storage. For example, a correct wscat request will look something like:
 * wscat --connect 'ws://localhost:3000/signalk/stream/v1?stream=delta&user_id=1110&token=df0314cd89de6e1fc26cc67c4a8e46013eb18b49c9c5a8a2605d3058435d58cf
 * The original has also been refactored for readability (extracted the handleSpark function)
 */
var flatMap = require('flatmap');
var User = require('../../models/user');
var url = require('url');
var isOnline = require('is-online');

var oauthSettings = require('../../settings/oauth-settings.json');
var request = require('request');
if (oauthSettings.updInterval){
    var updInterval = Math.max(oauthSettings.updInterval,10);
    console.log('Post events to sQuiddio every: ',updInterval, " seconds.");
}

var post_url = oauthSettings.authServer+"/signalk/api/v1/vessels/navigation/position.json";
var lastPost = new Date();
var tags = {};

//-------------------------------------------------------------- begin set up mySql connection
var mysql      = require('mysql');
var mysqlConn;
function handleDisconnect() {
    mysqlConn = mysql.createConnection({
        // may need to be replaced by pooled connection i.e.mysql.createPool({
        host     : oauthSettings.mysqlAuth.host,
        user     : oauthSettings.mysqlAuth.user,
        password : oauthSettings.mysqlAuth.pwd,
        database : oauthSettings.mysqlAuth.db
    });
    mysqlConn.connect(function(err) {
        if(err) {
            console.log('error when connecting to db:', err);
            setTimeout(handleDisconnect, 2000);
        }
    });
    mysqlConn.on('error', function(err) {
        console.log('db error', err);
        if(err.code === 'PROTOCOL_CONNECTION_LOST') {
            handleDisconnect();
        } else {
            throw err;
        }
    });
}
handleDisconnect();
console.log("Connected to mysql database ---------------------------");
//-------------------------------------------------------------- end set up mySql connection

module.exports = function(app) {
    'use strict';

    var _ = require('lodash'),
        debug = require('debug')('signalk-server:interfaces:ws'),
        Primus = require('primus'),
        api = {},
        started = false,
        primus;

    api.mdns = {
        name: "_signalk-ws",
        type: "tcp",
        port: app.config.port
    };
    var pathName = '/signalk/v1/stream' ;

    api.start = function() {
        debug('Starting Primus/WS interface');

        started = true;

        primus = new Primus(app.server, {
            transformer: 'websockets',
            pathname: pathName,
            timeout: false
        });

        primus.on('connection', function(spark) {
            debug(spark.id + " connected with params " + JSON.stringify(spark.query));
            var reqPath = oauthSettings.localHost + pathName+"?user_id="+spark.query.user_id+"&token="+spark.query.token;
            var currTimeInSecs = new Date().getTime()/1000;

            if (spark.query.user_id && spark.query.token) {
                // ------------------------------------------------------ signalk running on squidd.io only: authenticate against squidd.io mysql database
                var token, user, user_id;
                mysqlConn.query("SELECT * FROM `f_oauth_access_tokens` WHERE token = '"+spark.query.token+"' LIMIT 1", function(err, row, fields) {
                    if (row[0] && !err) {
                        token = row[0];
                        user_id = token.resource_owner_id;
                        if ( user_id == spark.query.user_id) {
                            mysqlConn.query("SELECT * FROM f_users WHERE id = "+user_id, function(err, row, fields) {
                                user=row[0];
                                user.tokenExpires = token.created_at.getTime()/1000 + token.expires_in;
                                //var onChange, event;
                                var currTimeInSecs = new Date().getTime()/1000;
                                if (currTimeInSecs < user.tokenExpires ){
                                    // ------------------------------------------------------- end mysql auth conditions

                                    spark.on('data', function(msg) {
                                        debug("<" + JSON.stringify(msg));
                                    });

                                    var onChange = function(data) {
                                        spark.write(data);
                                    };

                                    app.signalk.on('delta', onChange);

                                    spark.onDisconnect = function() {
                                        app.signalk.removeListener('delta', onChange);
                                    };

                                    spark.write({
                                        name: app.config.name,
                                        version: app.config.version,
                                        timestamp: new Date(),
                                        self: app.selfId,
                                        roles: ["master", "main"]
                                    });

                                    //------------------------------------------------------------- begin mysql auth error statements
                                } else {spark.write({error: 'oauth: expired token'});}
                            });
                        } else {spark.write({"error": "oauth: invalid user id", requestUrl: reqPath});}
                    } else {spark.write({"error": "oauth: invalid token for user", requestUrl: reqPath})}
                });
                // ------------------------------------------------------------ end mysql auth error statements

            } else {spark.write({error: 'Unauthenticated request. Please login.', requestUrl: reqPath })}
        });

        primus.on('disconnection', function(spark) {
            //spark.onDisconnect();
            debug(spark.id + " disconnected");
        });
    };

    api.stop = function() {
        if (primus.destroy && started) {
            debug("Destroying primus...");
            primus.destroy({
                close: false,
                timeout: 500
            });
        }
    };
    return api;
};

function normalizeDelta(delta) {
    return flatMap(delta.updates, normalizeUpdate).map(function(update) {
        return {
            context: delta.context,
            updates: [update]
        }
    })
}

function normalizeUpdate(update) {
    return update.values.map(function(value) {
        return {
            source: update.source,
            values: [value]
        }
    })
}


