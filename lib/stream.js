var net             = require('net'),
    EventEmitter    = require('events').EventEmitter,
    _               = require('underscore');

var createStream = function (port) {
        
    var stream = new EventEmitter; 
    
    var parser = function (data) {
        if (data.session !== undefined) 
            stream.emit('header', data);
        else if (data.time !== undefined) 
            stream.emit('data', data);
        else
            stream.emit('data#v0.1', data);
            
    };
    
    var socketServer = net.createServer(function (client) {
          
        client
            .on('data', function (data) {
            
                data = data.toString().replace('}{', '} {');
                data = data.split(' ');                
                
                for (var i = 0, len = data.length; i < len; i++) {
                    
                    // parse with caution
                    try {
                        data[i] = JSON.parse(data[i]);
                        parser(data[i]);
                    } catch (e) {
                        stream.emit('error', e);
                    }
                }                
                
            });
                
    }).listen(port || 4900);






    stream.pipe = function (event, destination) {    
        stream.on(event, function (data) {            
            destination.emit(event, data);
        });
    };



    return stream;
};



module.exports = createStream;
