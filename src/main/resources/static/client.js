//connecting to our signaling server
// let conn = new WebSocket('ws://localhost:8080/socket');
let conn = new WebSocket('wss://59.29.102.45:8443/socket');

conn.onopen = function() {
    console.log("Connected to the signaling server");
    initialize();
};

conn.onmessage = function(msg) {
    let content = JSON.parse(msg.data);
    let data = content.data;
    switch (content.event) {
        // when somebody wants to call us
        case "offer":
            handleOffer(data);
            break;
        case "answer":
            handleAnswer(data);
            break;
        // when a remote peer sends an ice candidate to us
        case "candidate":
            handleCandidate(data);
            break;
        default:
            break;
    }
};

function send(message) {
    conn.send(JSON.stringify(message));
}

let peerConnection;
let dataChannel; // 텍스트 채널
let localVideo = document.getElementById("localVideo");
let remoteVideo = document.getElementById("remoteVideo");
let input = document.getElementById("messageInput");
let messages = document.getElementById("messages");

function initialize() {
    let configuration = {
        "iceServers" : [ {
            "url" : "stun:stun.l.google.com:19302"
        }
        ]
    };
    peerConnection = new RTCPeerConnection(configuration);

    // allow video and audio
    const constraints = {
        video: true,
        audio : false
    };

    navigator.mediaDevices.getUserMedia(constraints).
    then(function(stream) {
        localVideo.srcObject = stream; // 현재 내 웹캠을 localVideo에 연결
        peerConnection.addTrack(stream.getVideoTracks()[0], stream);
        // peerConnection.addTrack(stream.getAudioTracks()[0], stream);
    }).catch(function(err) { alert("비디오연결 안됨") });

    peerConnection.onicecandidate = function(event) {
        if (event.candidate) {
            send({
                event : "candidate",
                data : event.candidate
            });
            console.log('send ice candidate');
        }
    };

    // creating data channel
    dataChannel = peerConnection.createDataChannel("dataChannel", {
        reliable : true
    });


    dataChannel.onerror = function(error) {
        console.log("Error occured on datachannel:", error);
    };

    // when we receive a message from the other peer, printing it on the console
    dataChannel.onmessage = function(event) {
        let divElement = document.createElement("div");
        divElement.textContent = event.data;
        messages.appendChild(divElement); // 채팅 메시지를 메시지 리스트에 추가
        console.log("received message:", event.data);
    };

    dataChannel.onclose = function() {
        console.log("data channel is closed");
    };

    peerConnection.ondatachannel = function (event) {
        console.log('peerConnection datachannel');
        dataChannel = event.channel;
    };

    peerConnection.ontrack = function (event) {
        // 원격 비디오 스트림을 remoteVideos 객체를 사용하여 표시
        remoteVideo.srcObject = event.streams[0];
        remoteVideo.autoplay = true;
    }
}

function createOffer() {
    peerConnection.createOffer(function (offer) {
        console.log('1. createOffer');
        peerConnection.setLocalDescription(offer).then(function () {
            console.log('2. saved offer');
            send({
                event: "offer",
                data: offer,
            });
            console.log('3. send offer');
        });
    }, function (error) {
        alert("Error creating an offer");
    });
}

function handleOffer(offer) {
        peerConnection.setRemoteDescription(new RTCSessionDescription(offer)).then(function () {
            console.log('4. Remote : save offer');
            peerConnection.createAnswer().then(function (answer) {
                console.log('5. Remote : create Answer');
                peerConnection.setLocalDescription(answer).then(function () {
                    console.log('6. Remote : save answer');
                    send({
                        event: "answer",
                        data: answer,
                    });
                    console.log('7. Remote : send answer');
                });
            });
    });
}

function handleCandidate(candidate) {
    console.log("receive candidate");
    peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
        .then(() => {
            console.log("add candidate");
        })
        .catch((error) => {
            console.error("Error adding ICE candidate:", error);
        });
};

function handleAnswer(answer) {
    console.log('8. Local : receive answer');
    peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
        .then(() => {
            console.log("9. Local : save answer");
        })
        .catch((error) => {
            console.error("Error setting remote description:", error);
        });
};

function sendMessage() {
    dataChannel.send(input.value);
    input.value = "";
}