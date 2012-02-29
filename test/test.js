var stream  = require('../index').createStream();
var db      = require('../index').createDBConnection(6379, '127.0.0.1');

db.redis
    .on('connect', function () {
    })
    .on('end', function (err) {
    })
    .on('error', function (err) {
    })
