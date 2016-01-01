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

var flatMap = require('flatmap');
var User = require('../../models/user');

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
    var pathName = '/signalk/stream/v1';

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

            var reqPath = pathName+"?user_id="+spark.query.user_id+"&token="+spark.query.token;

            if (spark.query.user_id && spark.query.token) {
                // check if user exists and token is valid
                User.findOne({ 'squiddio.id' : spark.query.user_id.toString() },function(err, user) {
                    if (user && user.squiddio.token == spark.query.token)
                        handleSpark(app, spark, user);
                    else if (user) spark.write({"error": "oauth: invalid token for user", requestUrl: reqPath});
                    else spark.write({"error": "oauth: invalid user id", requestUrl: reqPath});
                });
            } else {spark.write({error: 'Unauthenticated request. Please login.', requestUrl: reqPath });}
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
            spark.write({error: 'oauth: expired token'});
        }
    } else if (user && user.error) {
        spark.write(user.error);
    } else {
        spark.write({error: 'oauth: invalid credentials'});
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

