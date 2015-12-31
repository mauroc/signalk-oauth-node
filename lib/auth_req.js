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
