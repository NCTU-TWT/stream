var assert      = require('assert'),
    _           = require('underscore'),
    redis       = require('redis'),
    async       = require('async'),
    colors      = require('colors');
    StreamDB    = require('../lib/streamdb'); 


var db = new StreamDB;

db.connect();
db.use('test');

var client = redis.createClient(6379, '61.222.87.71');
client.on('error', function (err) {
    console.err(err);
});
    
var charts = [{
        'session': 'session01',
        'unit': 'G',
        'value': {
            'a': 1000,
            'b': 1001,
            'c': 1002
        },
        'upperBound': '100',
        'lowerBound': '-100',
        'reference': '0'
    }, {
        'session': 'session01',
        'unit': 'G',
        'value': {
            'A': 1003,
            'B': 1004,
            'C': 1005
        },
        'upperBound': '100',
        'lowerBound': '-100',
        'reference': '0'
    }, {
        'session': 'session02',
        'unit': 'G',
        'value': {
            'a': 2000,
            'b': 2001,
            'c': 2002
        },
        'upperBound': '100',
        'lowerBound': '-100',
        'reference': '0'
    }, {
        'session': 'session02',
        'unit': 'G',
        'value': {
            'A': 2003,
            'B': 2004,
            'C': 2005
        },
        'upperBound': '100',
        'lowerBound': '-100',
        'reference': '0'
}]

var sessions = [
    'session01',
    'session02'
];

var streams = (function (times) {
    var list = [];
    for (var i = 0; i < times; i++) {
        list.push({
            id: 2000 + i % 3,
            value: i,
            time: i
        });
    }
    return list;
})(5);

var sameArray = function (a, b) {
    return _.all(a, function (aElem) {
        return _.any(b, function (bElem) {
            return _.isEqual(bElem, aElem);
        });
    }) && _.all(b, function (bElem) {
        return _.any(a, function (aElem) {
            return _.isEqual(aElem, bElem);
        });
    });
};



// addChart
var testAddChart = function (callback) {

    tests = _.map(charts, function (chart) {
        return function (callback) {
            
            db.addChart(chart, function (data) {

                async.parallel([
                    function (callback) {
                        
                        client.smembers('test:sessions', function (err, data) {  
                            if (err) throw err;    
                            
                            var ok = _.all(sessions, function (elem) {
                                return _.contains(data, elem);
                            });
                            
                            assert(ok, 'new session not added to the session sets'.red);
                            callback();
                        });
                        
                    },
                    function (callback) {
                
                        client.smembers('test:sessions:' + chart.session, function (err, data) { 
                            if (err) throw err; 
                            data = _.map(data, JSON.parse);  
                            var ok = _.any(data, function (ch) {
                                return _.isEqual(ch, chart);
                            });                            
                            assert(ok, 'new chart not adding to the session'.red);
                            callback();
                        });
                }], function () {
                    callback();
                });
            
            });
            
            
        };
    });
    
    async.parallel(tests, function (err, result) {
        console.log('addChart ' + 'pass'.green)       
        callback();
    });
    
};




// getSession
var testGetSession = function (callback) {

    tests = _.map(charts, function (chart) {
        return function (callback) {
            
            db.getSession(chart.session, function (result) {
                            
                expected = _.filter(charts, function (elem) {
                    return elem.session === chart.session;
                })
                
                var ok = sameArray(result, expected);
    
                
                assert(ok, 'unable to get the session'.red);            
                callback();
            });
            
            
            
        };
    });

    async.parallel(tests, function (err, result) {
        console.log('getSession ' + 'pass'.green)       
        callback();
    });
    
};



// getSessions
var testGetSessions = function (callback) {

    tests = _.map(charts, function (chart) {
        return function (callback) {
            
            db.getSessions(function (result) {
                
                var ok = _.all(charts, function (chart) {
                
                    return _.any(_.flatten(result), function (elem) {
                        return _.isEqual(chart, elem);
                    });
                });
                
                assert(ok, 'unable to get the session sets'.red);            
                callback();
            });
            
        };
    });

    async.parallel(tests, function (err, result) {
        console.log('getSessions ' + 'pass'.green)       
        callback();
    });
    
};


// getSessionList
var testGetSessionList = function (callback) {

    tests = _.map(charts, function (chart) {
        return function (callback) {
            
            db.getSessionList(function (result) {
            
                expected = sessions;
    
                var ok = _.all(expected, function (elem) {
                    return _.contains(result, elem);
                });
                
                assert(ok, 'unable to get the session list'.red);            
                callback();
            });
            
        };
    });

    async.parallel(tests, function (err, result) {
        console.log('getSessionList ' + 'pass'.green)       
        callback();
    });
    
};

// getStream
var testGetStream = function (callback) {

    tests = _.map(streams, function (stream) {
        return function (callback) {
            
            db.getStream(stream.id, function (result) {
                
            
                var ok = _.all(result, function (resultElem) {
                    return _.any(streams, function (expectedElem) {
                        return _.isEqual(resultElem, {
                            value: expectedElem.value,
                            time: expectedElem.time
                        });
                    });                        
                });
                assert(ok, 'unable to get the stream'.red);     
                callback();
            });
            
        };
    });

    async.parallel(tests, function (err, result) {
        console.log('getStream ' + 'pass'.green)       
        callback();
    });
    
};




// removeSession
var testRemoveSession = function (callback) {

    tests = _.map(charts, function (chart) {
        return function (callback) {
            
            db.removeSession(chart.session, function (result) {
                
                var streamList = [];
                
                streamList = streamList.concat(_.values(chart.value));
                
                var tests = _.map(streamList, function (streamID) {
                    return function (callback) {                        
                        client.exists('test:streams:' + streamID, function (err, data) {            
                            if (err) throw err;                            
                            var ok = data === 0;
                            
                            assert(ok, 'stream not removed'.red);  
                            callback();
                        });   
                    };
                });
            
                tests.push(function (callback) {
                    client.sismember('test:sessions', chart.session, function (err, data) {                
                        if (err) throw err;
                        
                        var ok = data === 0;
                        
                        assert(ok, 'session ID not removed from sessions set'.red);  
                        callback();
                    })
                });
            
                tests.push(function (callback) {
                
                    client.exists('test:sessions:' + chart.session, function (err, data) {                
                        if (err) throw err;                            
                        var ok = data === 0;
                        
                        assert(ok, 'session not removed'.red);  
                        callback();
                    });
                });            
            
                async.parallel(tests, function (err, result) {
                    callback();
                });
            
            });
            
        };
    });

    async.parallel(tests, function (err, result) {
        console.log('removeSession ' + 'pass'.green)       
        callback();
    });
    
};


// addStream
var testAddStream = function (callback) {

    tests = _.map(streams, function (stream) {
        return function (callback) {
            
            db.addStream(stream, function (result) {
            
            
                client.lrange('test:streams:' + stream.id, 0, -1, function (err, data) {                
                    if (err) throw err;
                    
                    data = _.map(data, JSON.parse);
                    
                    var ok = _.any(data, function (elem) {
                        return _.isEqual(elem, {
                            value: stream.value,
                            time: stream.time
                        });
                    });
                    
                    assert(ok, 'data not in stream'.red);            
                    callback();
                })                
            });
            
        };
    });

    async.parallel(tests, function (err, result) {
        console.log('addStream ' + 'pass'.green)       
        callback();
    });
    
};




async.series([
    testAddChart,
    testAddStream,
    testGetSession,
    testGetSessions,
    testGetSessionList,
    testGetStream,
    testRemoveSession
], function (err, result) {
    
    client.quit();
    db.quit();
});
