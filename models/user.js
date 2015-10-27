
var mongoose = require('mongoose');

module.exports = mongoose.model('User',{
    squiddio: {
        id: String,
        token: String,
        tokenExpires: Number,
        firstName: String,
        lastName: String,
        email: String
    }

});