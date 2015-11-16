/*
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

var flatMap = require('flatmap');
var User = require('../../models/user');

// check if authentication mysql database is available (signalk running on sQuidd.io only)
var fileName = "../../settings/database.json";
fs = require("fs");
var config;

try {
    config = require(fileName);
    console.log("authenticating against squidd.io database: " + fileName);
}
catch (err) {
    config = {};
}
// connect to mysql database if it exists

if (config.db_type == 'mysql') {
    var mysql      = require('mysql');

    var mysqlConn = mysql.createConnection({
        // may need to be replaced by pooled connection i.e.mysql.createPool({
        host     : config.mysql.host,
        user     : config.mysql.user,
        password : config.mysql.pwd,
        database : config.mysql.db
    });
    mysqlConn.connect();
}

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

    api.start = function() {

        debug('Starting Primus/WS interface');
        started = true;

        primus = new Primus(app.server, {
            transformer: 'websockets',
            pathname: '/signalk/stream/v1',
            timeout: false
        });

        primus.on('connection', function(spark) {
            debug(spark.id + " connected with params " + JSON.stringify(spark.query));

            if (spark.query.user_id && spark.query.token) {

                if (!mysqlConn){
                    // standard signalk install with mongodb
                    User.findOne({ 'squiddio.id' : spark.query.user_id.toString() },function(err, user) {
                        handleSpark(app, spark, user);
                    });
                } else {
                    // signalk running on squidd.io only: authenticate against squidd.io mysql database
                    //var user = mySqlUser(mysqlConn, spark.query);
                    var token, boat_id;
                    mysqlConn.query("SELECT * FROM `oauth_access_tokens` WHERE token = '"+spark.query.token+"' LIMIT 1", function(err, row, fields) {
                        if (!err) {
                            token = row[0];
                            var app_id = token.application_id;
                            if (app_id) {
                                mysqlConn.query("SELECT * FROM oauth_applications WHERE id = "+app_id+" LIMIT 1", function(err, row, fields) {
                                    if (!err){
                                        boat_id = row[0].owner_id;
                                        if (boat_id) {
                                            mysqlConn.query("SELECT * FROM boats WHERE id = "+boat_id+" AND currently_onboard = 1", function(err, row, fields) {
                                                if (!err) {
                                                    var user_id = row[0].user_id;
                                                    var user;
                                                    mysqlConn.query("SELECT * FROM users WHERE id = "+user_id, function(err, row, fields) {
                                                        user=row[0];
                                                        user.tokenExpires = token.created_at.getTime()/1000 + token.expires_in;
                                                        handleSpark(app, spark, user);
                                                    });
                                                }
                                                else
                                                    return {"error": "squiddio auth: missing user"};
                                            });
                                        }
                                    }
                                    else
                                        return {"error": "squiddio auth: missing vessel"};
                                });
                            }
                        }
                        else
                            return {"error": "squiddio auth: missing token"};
                    });
                }
            } else {spark.write({status: 'missing credentials'});}
        });

        primus.on('disconnection', function(spark) {
            spark.onDisconnect();
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

function handleSpark(app,spark,user) {

    var onChange, event;

    if (user && !user.error) {
        var currTimeInSecs = new Date().getTime()/1000;

        if (currTimeInSecs < user.tokenExpires ){
            if (spark.query.stream === 'delta') {
                event = 'change:delta';
                onChange = function(data) {
                    spark.write(data);
                };
            } else if (spark.query.stream === 'subscribe') {
                debug('stream:subscribe');
                //inefficient for many sparks, should instead keep track of which sparks subscribe to which paths
                spark.paths = {};
                event = 'change:delta';
                onChange = function(delta) {
                    normalizeDelta(delta).forEach(function(oneValueDelta) {
                        var doSend = oneValueDelta.updates.some(function(update) {
                            return update.values.some(function(value) {
                                return spark.paths[value.path];
                            });
                        });
                        if (doSend) {
                            spark.write(oneValueDelta);
                        }
                    });
                };
                spark.on('data', function(msg) {
                    debug("<" + JSON.stringify(msg));
                    if (msg.command === 'subscribe') {
                        msg.paths.forEach(function(path) {
                            spark.paths[path] = true;
                        });
                    }
                    debug(spark.paths);
                });
            } else {
                event = 'change';
                onChange = function(data) {
                    spark.write(app.signalk.retrieve());
                };
                spark.write(app.signalk.retrieve()); //output tree after connect
            }

            app.signalk.on(event, onChange);

            spark.onDisconnect = function() {
                app.signalk.removeListener(event, onChange);
            }
        } else {
            spark.write({status: 'expired Oauth token'});
        }
    } else if (user && user.error) {
        spark.write(user.error);
    } else {
        spark.write({status: 'invalid credentials'});
    }
}

function normalizeDelta(delta) {
  return flatMap(delta.updates, normalizeUpdate).map(function(update) {
    return {
      context: delta.context,
      updates: [update]
    }
  })
};

function normalizeUpdate(update) {
  return update.values.map(function(value) {
    return {
      source: update.source,
      values: [value]
    }
  })
}

