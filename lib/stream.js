var net             = require('net'),
    EventEmitter    = require('events').EventEmitter,
    _               = require('underscore');

var registeredConnections = {};

var createStream = function (port) {
        
    var stream = new EventEmitter; 
    
    var parser = function (data) {
        if (data.session !== undefined) 
            stream.emit('header', data);
        else 
            stream.emit('data', data);
    };
    
    var socketServer = net.createServer(function (client) {
          
        client
            .on('data', function (data) {
                // parse with caution   
                try {
                    data = JSON.parse(data.toString());
                } catch (e) {
                    stream.emit('error', e);
                }
                // hand to the parse
                parser(data);

            }).on('error', function (error) {
                // pipe error
                stream.emit('error', error);
            })
        
    }).listen(port || 4900);






    stream.pipe = function (event, destination) {    
        stream.on(event, function (data) {            
            destination.emit(event, data);
        });
    };



    return stream;
};



module.exports = function (port, host) {

    // unify
    if (host === 'localhost') 
        host = '127.0.0.1';

    // default port and host
    port = port || 4900;
    host = host || '127.0.0.1';

    // compose the key
    var connectionKey = host + ':' + port;
       
    var existedConnection = _.contains(registeredConnections, connectionKey);
    
    if (existedConnection)
        return registeredConnections[connectionKey];
    else
        return registeredConnections[connectionKey] = createStream(port, host);
    
};
