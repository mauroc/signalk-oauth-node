/*
 /*
 * Copyright 2015 Mauro Calvi <coupdemistral@gmail.com>
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

var request = require('request');
var isOnline = require('is-online');

module.exports= function (req, res, url) {

    if (req.user) {

        var formData              = req.body;
        formData["user_id"]       = req.user.id;
        formData["access_token"]  = req.user.squiddio.token || 'null';

        isOnline(function(err, online) {
            if (online) {
                request.post({url: url, formData: formData}, function optionalCallback(err, response, body) {
                    if (!err) {
                        res.setHeader('Content-Type', 'application/json');
                        res.send(body);
                    } else {
                        res.send({"error": err , "requestUrl": url });
                    }
                });

            } else {
                res.send({"error": "No internet connection.", "requestUrl": url });
            }
        });
    } else {
        res.send({"error": "Unauthenticated request. Please login.", "requestUrl": url });
    }
};


