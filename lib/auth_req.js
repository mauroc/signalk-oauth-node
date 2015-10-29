var request = require('request');

module.exports= function (req, res, url) {

    var token   = req.user.squiddio.token

    request(url+"?access_token="+token, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            res.setHeader('Content-Type', 'application/json');
            res.send(body);
        } else {
            console.log(error);
        }
    });
};
