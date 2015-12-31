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

module.exports= function (req, res, url) {

    var token   = req.user ? req.user.squiddio.token : 'null';
    var uri = url+"?access_token="+token;

    request(uri, function (error, response, body) {

        if (!error && response.statusCode == 200) {
            res.setHeader('Content-Type', 'application/json');
            res.send(body);
        } else {
            res.send({"error": "Unauthenticated request. Please login.", "requestUrl": uri });
        }
    });
};
