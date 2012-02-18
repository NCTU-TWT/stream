var redis   = require('redis'),
    _       = require('underscore');
    async   = require('async');



var StreamDB = function () {
    this.client = undefined;
    this.namespace = 'monitor';
};


// redis key prefix
StreamDB.prototype.use = function (namespace) {
    this.namespace = namespace;
};

// establish a connection
StreamDB.prototype.connect = function (port, host) {
    console.log('foo')
    this.client = redis.createClient(
        port || 6379, 
        host || '61.222.87.71'
    );
    this.client
        .on('connect', function (err) {
            console.log('connect');
        })
        .on('error', function (err) {
            console.log(err);
        })
        .on('end', function () {
            console.log('end');
        });
};

// close the connection
StreamDB.prototype.quit = function () {
    this.client.quit();
};




StreamDB.prototype.addChart = function (chart, callback) {
    
    var self = this;
    
    // add to the session set
    this.client.sadd(this.namespace + ':sessions:' + chart.session, JSON.stringify(chart), function (err, data) {
        if (err) throw err;
        
        // new session
        if (data === 1) {
            self._addSession(chart.session, function () {            
                if (callback)
                    callback(data);
            });
        } else {                
            if (callback)
                callback(data);
        }
    });
};



StreamDB.prototype.addStream = function (data, callback) {
    
    var streamID = data.id;
    
    // id ripped
    var data = JSON.stringify({
        value: data.value,
        time: data.time
    });
        
    this.client.rpush(this.namespace + ':streams:' + streamID, data, function (err, data) {
        if (err) throw err;        
        if (callback)
            callback(data);
    
    });
};

StreamDB.prototype._addSession = function (sessionID, callback) {
    this.client.sadd(this.namespace + ':sessions', sessionID, function (err, data) {
        if (err) throw err;
        
        if (callback)
            callback(data);    
    })
};


StreamDB.prototype.getSession = function (sessionID, callback) {

    // add to the session set
    this.client.smembers(this.namespace + ':sessions:' + sessionID, function (err, data) {
        if (err) throw err;        
        data = _.map(data, JSON.parse);                    
        if (callback)
            callback(data);    
    });
};



StreamDB.prototype.getSessions = function (callback) {
    console.log('getSessions')
    var self = this;
    
    this.getSessionList(function (reply) {
    
        console.log('got list')
        var multi = self.client.multi();
        
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
    this.client.smembers(this.namespace + ':sessions', function (err, data) {
        console.log('got session list')
        if (err) throw err;
        if (callback)
            callback(data);    
    });
};

StreamDB.prototype.getStream = function (streamID, callback) {

    // add to the session set
    this.client.lrange(this.namespace + ':streams:' + streamID, 0, -1, function (err, data) {
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
                self.client.del(self.namespace + ':streams:' + streamID, function (err, data) {
                    if (err) throw err;
                    callback();
                })
            };
        });
        
        tasks.push(function (callback) {
            self.client.srem(self.namespace + ':sessions', sessionID, function (err, data) {
                if (err) throw err;
                
                callback(null, data);        
            });
        });
        
        tasks.push(function (callback) {
            self.client.del(self.namespace + ':sessions:' + sessionID, function (err, data) {
                if (err) throw err;
                
                callback(null, data);        
            });
        });
        
        async.parallel(tasks, function (err, result) {
            callback(result);
        });
    });
};

module.exports = StreamDB;
