// app.js
var VideoChat = {
    socket: io(),
    requestMediaStream: function(event) {
        navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true
        }).then(function(stream) {
            VideoChat.localVideo = document.getElementById('local-video');
            VideoChat.localVideo.volume = 0;
            console.log(stream);
            VideoChat.localStream = stream;
            VideoChat.videoButton.setAttribute('disabled', 'disabled');
            VideoChat.localVideo.srcObject = stream;
            VideoChat.socket.emit('join', 'test');
            VideoChat.socket.on('ready', function() {
                console.log('ready to call');
                VideoChat.callButton.removeAttribute('disabled');
            });
            VideoChat.socket.on('offer', VideoChat.onOffer);
        }).catch(function(e) {
            alert('getUserMedia()调用失败: ' + e.name);
        });
    },
    createOffer: function() {
        VideoChat.peerConnection.createOffer(
            function(offer) {
                VideoChat.peerConnection.setLocalDescription(offer);
                VideoChat.socket.emit('offer', JSON.stringify(offer));
                console.log('offer已创建!');
            },
            function(err) {
                console.log(err);
            }
        );
    },
    createAnswer: function(offer) {
        return function() {
            rtcOffer = new RTCSessionDescription(JSON.parse(offer));
            VideoChat.peerConnection.setRemoteDescription(rtcOffer);
            VideoChat.peerConnection.createAnswer(
                function(answer) {
                    VideoChat.peerConnection.setLocalDescription(answer);
                    VideoChat.socket.emit('answer', JSON.stringify(answer));
                },
                function(err) {
                    console.log(err);
                }
            );
        }
    },
    onOffer: function(offer) {
        console.log('收到一个offer');
        VideoChat.socket.on('token', VideoChat.onToken(VideoChat.createAnswer(offer)));
        VideoChat.socket.emit('token');
    },
    onAnswer: function(answer) {
        var rtcAnswer = new RTCSessionDescription(JSON.parse(answer));
        VideoChat.peerConnection.setRemoteDescription(rtcAnswer);
    },
    onCandidate: function(candidate) {
        console.log('add candidate');
        console.log(candidate);
        rtcCandidate = new RTCIceCandidate(JSON.parse(candidate));
        VideoChat.peerConnection.addIceCandidate(rtcCandidate);
    },
    onIceCandidate: function(event) {
        console.log('get candidate!');
        console.log(event);
        if (event.candidate) {
            VideoChat.socket.emit('candidate', JSON.stringify(event.candidate));
        }
    },
    startCall: function(event) {
        /*VideoChat.peerConnection = new RTCPeerConnection({
          iceServers: [{url: "stun:global.stun.twilio.com:3478?transport=udp" }]
        });*/
        VideoChat.socket.on('token', VideoChat.onToken(VideoChat.createOffer));
        VideoChat.socket.emit('token');
    },
    onToken: function(callback) {
        return function(token) {
            VideoChat.callButton.setAttribute('disabled', 'disabled');
            VideoChat.peerConnection = new RTCPeerConnection({
                iceServers: token.iceServers
            });
            //将本地的Stream传给peerConnection
            VideoChat.peerConnection.addStream(VideoChat.localStream);
            VideoChat.peerConnection.onicecandidate = VideoChat.onIceCandidate;
            VideoChat.peerConnection.onaddstream = VideoChat.onAddStream;
            VideoChat.socket.on('candidate', VideoChat.onCandidate);
            VideoChat.socket.on('answer', VideoChat.onAnswer);
            callback();
        }
    },
    onAddStream: function(event) {
        console.log('remote-video');
        VideoChat.remoteVideo = document.getElementById('remote-video');
        VideoChat.remoteVideo.srcObject = event.stream;
    }
};

VideoChat.callButton = document.getElementById('call');
VideoChat.callButton.addEventListener(
    'click',
    VideoChat.startCall,
    false
);

VideoChat.videoButton = document.getElementById('get-video');

VideoChat.videoButton.addEventListener(
    'click',
    VideoChat.requestMediaStream,
    false
);
