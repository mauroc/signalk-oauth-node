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
        var reqPath = pathName+"?user_id="+spark.query.user_id+"&token="+spark.query.token;
        var currTimeInSecs = new Date().getTime()/1000;

        if (spark.query.user_id && spark.query.token) {
            // check if user exists and token is valid
            User.findOne({ 'squiddio.id' : spark.query.user_id.toString() },function(err, user) {
                if (user && !user.error && user.squiddio.token == spark.query.token){
                    //var onChange, event;
                    if (currTimeInSecs < user.tokenExpires ){

                      spark.on('data', function(msg) {
                        debug("<" + JSON.stringify(msg));
                      });

                      var onChange = function(data) {
                        spark.write(data);
                      };

                      app.signalk.on('change:delta', onChange);

                      spark.onDisconnect = function() {
                        app.signalk.removeListener('change:delta', onChange);
                      };

                      spark.write({
                        name: app.config.name,
                        version: app.config.version,
                        timestamp: new Date(),
                        self: app.selfId,
                        roles: ["master", "main"]
                      })
                    } else {
                        spark.write({error: 'oauth: expired token'});
                    }
                }
                else if (user && user.error) spark.write({"error": user.error, requestUrl: reqPath });
                else if (user) spark.write({"error": "oauth: invalid token for user", requestUrl: reqPath});
                else spark.write({"error": "oauth: invalid user id", requestUrl: reqPath});
            });
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
};

function normalizeUpdate(update) {
  return update.values.map(function(value) {
    return {
      source: update.source,
      values: [value]
    }
  })
}

