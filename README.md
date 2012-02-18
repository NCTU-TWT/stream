這是 [Monitor](https://github.com/NCTU-TWT/monitor) 所使用的模組。

# 安裝或更新

    $ npm install git@github.com:NCTU-TWT/monitor-stream.git
    
# 使用

    var stream      = require('monitor-stream').createStream(),
        streamDB    = require('monitor-stream').createDBConnection();
        
    stream.on('header', function (header) {
        streamDB.addHeader(header);
    });

# 資料庫單元測試

    $ npm test
    
或者

    $ node test/db.js

# 串流 createStream([port=4900])

將原本從 sensor 傳來的資料抽象化成串流


建立並回傳一個串流。不傳參數預設監聽埠是 4900。

    var stream      = require('monitor-stream').createStream();
    
    stream.on('header', function (header) {
        // header coming in
    })
    
    stream.on('data', function (data) {
        // data coming in
    })
    
    // piping
    stream.pipe('data', someOtherEventEmitter);

## Event: header

串流標頭

## Event: data

串流資料

## pipe(event, targetEventEmitter)

下面兩段功能是一樣的

    stream.pipe('data', someSocket);

    stream.on('data', function (data) {
        someSocket.emit(data);
    })


# 資料庫 createDBConnection([port=6379], [host='61.222.87.71'])

存取串流標頭和資料

## namespace

儲存的鍵值前綴，預設為 `monitor'

    // 'someOtherNamespace:header:xxxxxx'
    streamDB.namespace = 'someOtherNamespace';
## redis

Redis 的 client

## addHeader(header, [callback])

將串流標頭存起來

    streamDB.addHeader(header);

## addData(data, [callback])

將串流資料存起來

## getSession(sessionID, [callback])

取得某 session

    streamDB.getSession('ab251d1cec', function (session) {
        // now you got the session
    });

## getSessions([callback])

取得所有 session

## getSessionList([callback])

取得所有 session 的 ID 列表

## getStream(streamID, [callback])

取得某串流

## removeSession(sessionID, [callback])

移除某 session







