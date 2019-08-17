var fs = require('fs');
var express = require('express');
var socketio = require('socket.io');
var https = require('https');
var app = express();
//指定静态资源目录
app.use(express.static(__dirname + '/public'));
app.get('/', function(req,res){
    res.sendFile(__dirname+'/public/index.html');
});

// Yes, SSL is required
var credentials = {
    key: fs.readFileSync('./public/key.pem', 'utf8'),
    cert: fs.readFileSync('./public/cert.pem', 'utf8'),
};

var httpsServer = https.createServer(credentials, app);
httpsServer.listen(3000, /*'192.168.1.102',*/ function() {
    console.log('Listen 3000');
    console.log('Server start running!');
});
var io = socketio.listen(httpsServer);

//ICEServer
var twilioAcountId = 'AC5f1707d99ca3db0ed4cc15ebd8cc650f';
var twilioAuthToken = '72883be0f0677f26472e6e80ce51838b';
var twilio = require('twilio')(twilioAcountId, twilioAuthToken);

// ----------------------------------------------------------------------------------------

// Create a server for handling websocket calls

io.sockets.on('connection', function(socket) {
    socket.on('join', function(room) {
        var rooms = io.sockets.adapter.rooms[room];
        var numClients = (typeof rooms == 'undefined')?0:rooms.length;
        console.log(rooms);
        if (numClients == 0) {
            console.log('numClients is 0');
            socket.join(room);
        } else if (numClients == 1) {
            console.log('numClients is 1');
            socket.join(room);
            socket.emit('ready', room);
            socket.broadcast.emit('ready', room);
        } else {
            console.log('numClients is above 2');
            socket.emit('full', room);
        }
    });

    socket.on('token', function() {
        twilio.tokens.create(function(err, response) {
            if (err) {
                console.log(err);
            } else {
                socket.emit('token', response);
            }
        });
    });

    socket.on('candidate', function(candidate) {
        console.log('candidate add');
        socket.broadcast.emit('candidate', candidate);
    });

    socket.on('offer', function(offer) {
        socket.broadcast.emit('offer', offer);
    });

    socket.on('answer', function(answer) {
        socket.broadcast.emit('answer', answer);
    });
});
