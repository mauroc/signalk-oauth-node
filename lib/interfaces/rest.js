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


var isAuthenticated = function (req, res, next) {
    // if user is authenticated in the session, call the next() to call the next request handler
    // Passport adds this method to request object. A middleware is allowed to add properties to
    // request and response objects
    if (req.isAuthenticated())
        return next();
    // if the user is not authenticated then redirect him to the login page
    res.redirect('/');
}

module.exports = function(app) {
  'use strict';

  var debug = require('debug')('signalk-server:interfaces:rest');

  return {
    start: function() {
      app.get('/signalk/api/v1/*', isAuthenticated,  function(req, res) {
        var path = String(req.path).replace('/signalk/api/v1/', '');
        var data = app.signalk.retrieve();
        var self = data.self;
        var last = data;

        if(path === 'self' || path === 'vessels/self' || path === 'vessels/self/') {
          return res.json(data.vessels[self]);
        }

        path = path.split('/');

        for(var i in path) {
          var p = path[i];

          if(p === 'self') {
            p = self;
          }

          if(typeof last[p] !== 'undefined') {
            last = last[p];
          }
        }

        return res.json(last);
      });
    },

    mdns: {
      name: "_signalk-http",
      type: "tcp",
      port: app.config.port
    }
  };
};