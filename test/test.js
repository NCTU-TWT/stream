var stream      = require('../index').createStream(4900),
    streamDB    = require('../index').createDB();

stream.on('header', function (data) {
    streamDB.addHeader(data, function (reply) {
        console.log(reply);
    });
});

stream.on('data', function (data) {
    streamDB.addData(data, function (reply) {
        console.log(reply);
    });
});
