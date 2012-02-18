var redis   = require('redis'),
    _       = require('underscore');
    async   = require('async');

var registeredConnections = {};

var StreamDB = function (port, host, connectionKey) {
    this.namespace = 'monitor';
    this.key = connectionKey;
    
    
    this.redis = redis.createClient(
        port || 6379, 
        host || '61.222.87.71'
    );
    
    this.redis
        .on('error', function (err) {
            console.log(err);
        })
};


// redis key prefix
StreamDB.prototype.use = function (namespace) {
    this.namespace = namespace;
};

// close the connection
StreamDB.prototype.quit = function () {
    this.redis.quit();
    delete registeredConnections[this.key];
};




StreamDB.prototype.addHeader = function (header, callback) {
    
    var self = this;
    
    // add to the session set
    this.redis.sadd(this.namespace + ':sessions:' + header.session, JSON.stringify(header), function (err, data) {
        if (err) throw err;
        
        // new session
        if (data === 1) {
            self._addSession(header.session, function () {            
                if (callback)
                    callback(data);
            });
        } else {                
            if (callback)
                callback(data);
        }
    });
};



StreamDB.prototype.addData = function (data, callback) {
    
    var streamID = data.id;
    
    // id ripped
    var data = JSON.stringify({
        value: data.value,
        time: data.time
    });
        
    this.redis.rpush(this.namespace + ':streams:' + streamID, data, function (err, data) {
        if (err) throw err;        
        if (callback)
            callback(data);
    
    });
};

StreamDB.prototype._addSession = function (sessionID, callback) {
    this.redis.sadd(this.namespace + ':sessions', sessionID, function (err, data) {
        if (err) throw err;
        
        if (callback)
            callback(data);    
    })
};


StreamDB.prototype.getSession = function (sessionID, callback) {

    // add to the session set
    this.redis.smembers(this.namespace + ':sessions:' + sessionID, function (err, data) {
        if (err) throw err;        
        data = _.map(data, JSON.parse);                    
        if (callback)
            callback(data);    
    });
};



StreamDB.prototype.getSessions = function (callback) {
    var self = this;
    
    this.getSessionList(function (reply) {
    
        var multi = self.redis.multi();
        
        _.each(reply, function (elem) {
            multi.smembers(self.namespace + ':sessions:' + elem);
        })
        
        multi.exec(function (err, replies) {
            if (err) throw err;
            
            var result = [];
            
            _.each(replies, function (session) {
                result.push(_.map(session, JSON.parse));
            })
                           
            if (callback)
                callback(result);
        });
    });
};

StreamDB.prototype.getSessionList = function (callback) {
    this.redis.smembers(this.namespace + ':sessions', function (err, data) {
        if (err) throw err;
        if (callback)
            callback(data);    
    });
};

StreamDB.prototype.getStream = function (streamID, callback) {

    // add to the session set
    this.redis.lrange(this.namespace + ':streams:' + streamID, 0, -1, function (err, data) {
        if (err) throw err;        
        
        data = _.map(data, JSON.parse);                    
        if (callback)
            callback(data);    
    });
};


StreamDB.prototype.removeSession = function (sessionID, callback) {

    var self = this;

    this.getSession(sessionID, function (data) {
    
        var streamList = []
        
        _.each(data, function (elem) {
            streamList = streamList.concat(_.values(elem.value));
        });
        
        var tasks =  _.map(streamList, function (streamID) {
            return function (callback) {
                self.redis.del(self.namespace + ':streams:' + streamID, function (err, data) {
                    if (err) throw err;
                    callback();
                })
            };
        });
        
        tasks.push(function (callback) {
            self.redis.srem(self.namespace + ':sessions', sessionID, function (err, data) {
                if (err) throw err;
                
                callback(null, data);        
            });
        });
        
        tasks.push(function (callback) {
            self.redis.del(self.namespace + ':sessions:' + sessionID, function (err, data) {
                if (err) throw err;
                
                callback(null, data);        
            });
        });
        
        async.parallel(tasks, function (err, result) {
            callback(result);
        });
    });
};

module.exports = function (port, host) {

    // unify
    if (host === 'localhost') 
        host = '127.0.0.1';

    // default port and host
    port = port || 6379;
    host = host || '61.222.87.71';

    // compose the key
    var connectionKey = host + ':' + port;
       
    var existedConnection = _.contains(registeredConnections, connectionKey);
    
    if (existedConnection)
        return registeredConnections[connectionKey];
    else
        return registeredConnections[connectionKey] = new StreamDB(port, host, connectionKey);
    
};
