
var mongoose = require('mongoose');

module.exports = mongoose.model('User',{
    squiddio: {
        id: String,
        token: String,
        firstName: String,
        lastName: String,
        email: String,
        boat: {
            id: String,
            name: String,
            mmsi: String
        }
    },
    tokenExpires: Number
});