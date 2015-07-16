/*!
kurento-room.js - v0.0.1 - 2015-07-16
*/
(function() {
var KurentoRoom;

KurentoRoom = (function() {
  function KurentoRoom(wsUri, callback) {
    var options, rpc, rpcParams, that, userName, ws;
    if (!(this instanceof KurentoRoom)) {
      return new KurentoRoom(wsUri, callback);
    }
    that = this;
    userName = void 0;
    ws = new WebSocket(wsUri);
    ws.onopen = function() {
      callback(null, that);
    };
    ws.onerror = function(evt) {
      callback(evt.data);
    };
    ws.onclose = function() {
      console.log('Connection Closed');
    };
    options = {
      request_timeout: 50000
    };
    rpc = new RpcBuilder(RpcBuilder.packers.JsonRPC, options, ws, function(request) {
      console.info('Received request: ' + JSON.stringify(request));
      switch (request.method) {
        case 'participantJoined':
          onParticipantJoined(request.params);
          break;
        case 'participantPublished':
          onParticipantPublished(request.params);
          break;
        case 'participantUnpublished':
          onParticipantLeft(request.params);
          break;
        case 'participantLeft':
          onParticipantLeft(request.params);
          break;
        case 'sendMessage':
          onNewMessage(request.params);
          break;
        case 'iceCandidate':
          iceCandidateEvent(request.params);
          break;
        case 'roomClosed':
          onRoomClosed(request.params);
          break;
        case 'mediaError':
          onMediaError(request.params);
          break;
        default:
          console.error('Unrecognized request: ' + JSON.stringify(request));
      }
    });
    rpcParams = void 0;
    return;
  }

  KurentoRoom.prototype.onParticipantJoined = function(msg) {
    if (room !== void 0) {
      room.onParticipantJoined(msg);
    }
  };

  KurentoRoom.prototype.onParticipantPublished = function(msg) {
    if (room !== void 0) {
      room.onParticipantPublished(msg);
    }
  };

  KurentoRoom.prototype.onParticipantLeft = function(msg) {
    if (room !== void 0) {
      room.onParticipantLeft(msg);
    }
  };

  KurentoRoom.prototype.onNewMessage = function(msg) {
    if (room !== void 0) {
      room.onNewMessage(msg);
    }
  };

  KurentoRoom.prototype.iceCandidateEvent = function(msg) {
    if (room !== void 0) {
      room.recvIceCandidate(msg);
    }
  };

  KurentoRoom.prototype.onRoomClosed = function(msg) {
    if (room !== void 0) {
      room.onRoomClosed(msg);
    }
  };

  KurentoRoom.prototype.onMediaError = function(params) {
    if (room !== void 0) {
      room.onMediaError(params);
    }
  };

  KurentoRoom.setRpcParams = function(params) {
    var rpcParams;
    rpcParams = params;
  };

  KurentoRoom.sendRequest = function(method, params, callback) {
    var index;
    if (rpcParams && rpcParams !== 'null' && rpcParams !== 'undefined') {
      for (index in rpcParams) {
        if (rpcParams.hasOwnProperty(index)) {
          params[index] = rpcParams[index];
        }
      }
    }
    rpc.encode(method, params, callback);
    console.log('Sent request: { method:"' + method + '", params: ' + JSON.stringify(params) + ' }');
  };

  KurentoRoom.prototype.close = function(forced) {
    if (room !== void 0) {
      room.leave(forced);
    }
    ws.close();
  };

  KurentoRoom.prototype.disconnectParticipant = function(stream) {
    if (room !== void 0) {
      room.disconnect(stream);
    }
  };

  KurentoRoom.prototype.Stream = function(room, options) {
    options.participant = room.getLocalParticipant();
    return new Stream(that, true, room, options);
  };

  KurentoRoom.prototype.Room = function(options) {
    var room, userName;
    room = new Room(that, options);
    userName = options.userName;
    return room;
  };

  KurentoRoom.prototype.sendMessage = function(room, user, message) {
    this.sendRequest('sendMessage', {
      message: message,
      userMessage: user,
      roomMessage: room
    }, function(error, response) {
      var connected;
      if (error) {
        console.error(error);
      } else {
        connected = false;
      }
    });
  };

  KurentoRoom.prototype.sendCustomRequest = function(params, callback) {
    this.sendRequest('customRequest', params, callback);
  };

  return KurentoRoom;

})();

var Participant;

Participant = (function() {
  function Participant(kurento1, local1, room1, options1) {
    var i, id, stream, streams, that;
    this.kurento = kurento1;
    this.local = local1;
    this.room = room1;
    this.options = options1;
    that = this;
    id = options.id;
    streams = {};
    if (options.streams) {
      i = 0;
      while (i < options.streams.length) {
        stream = new Stream(kurento, false, room, {
          id: options.streams[i].id,
          participant: that
        });
        addStream(stream);
        i++;
      }
    }
    return;
  }

  Participant.prototype.setId = function(newId) {
    var id;
    id = newId;
  };

  Participant.prototype.addStream = function(stream) {
    streams[stream.getID()] = stream;
    room.getStreams()[stream.getID()] = stream;
  };

  Participant.prototype.getStreams = function() {
    return streams;
  };

  Participant.prototype.dispose = function() {
    var key;
    for (key in streams) {
      streams[key].dispose();
    }
  };

  Participant.prototype.getID = function() {
    return id;
  };

  Participant.prototype.sendIceCandidate = function(candidate) {
    if (local) {
      console.debug('Local');
    } else {
      console.debug('Remote', 'candidate for', that.getID(), JSON.stringify(candidate));
    }
    kurento.sendRequest('onIceCandidate', {
      endpointName: that.getID(),
      candidate: candidate.candidate,
      sdpMid: candidate.sdpMid,
      sdpMLineIndex: candidate.sdpMLineIndex
    }, function(error, response) {
      if (error) {
        console.error('Error sending ICE candidate: ' + JSON.stringify(error));
      }
    });
  };

  return Participant;

})();

var Room;

Room = (function() {
  function Room(kurento, options) {
    var ee, subscribeToStreams, that;
    that = this;
    that.name = options.room;
    ee = new EventEmitter();
    this.streams = {};
    this.participants = {};
    this.connected = false;
    this.localParticipant = void 0;
    subscribeToStreams = options.subscribeToStreams || true;
    this.localParticipant = new Participant(kurento, true, that, {
      id: options.user
    });
    this.participants[options.user] = this.localParticipant;
    return;
  }

  Room.prototype.getLocalParticipant = function() {
    return this.localParticipant;
  };

  Room.prototype.addEventListener = function(eventName, listener) {
    ee.addListener(eventName, listener);
  };

  Room.prototype.emitEvent = function(eventName, eventsArray) {
    ee.emitEvent(eventName, eventsArray);
  };

  Room.prototype.connect = function() {
    kurento.sendRequest('joinRoom', {
      user: options.user,
      room: options.room
    }, function(error, response) {
      var exParticipants, i, key, length, participant, roomEvent;
      if (error) {
        ee.emitEvent('error-room', [
          {
            error: error
          }
        ]);
      } else {
        this.connected = true;
        exParticipants = response.value;
        roomEvent = {
          participants: [],
          streams: []
        };
        length = exParticipants.length;
        i = 0;
        while (i < length) {
          participant = new Participant(kurento, false, that, exParticipants[i]);
          this.participants[participant.getID()] = participant;
          roomEvent.participants.push(participant);
          this.streams = participant.getStreams();
          for (key in this.streams) {
            roomEvent.streams.push(this.streams[key]);
            if (subscribeToStreams) {
              this.streams[key].subscribe();
            }
          }
          i++;
        }
        ee.emitEvent('room-@connected', [roomEvent]);
      }
    });
  };

  Room.prototype.subscribe = function(stream) {
    stream.subscribe();
  };

  Room.prototype.onParticipantPublished = function(msg) {
    var key, participant, pid, stream;
    participant = new Participant(kurento, false, that, msg);
    pid = participant.getID();
    if (!(pid in this.participants)) {
      console.info('Publisher not found in @participants list by its id', pid);
    } else {
      console.log('Publisher found in @participants list by its id', pid);
    }
    this.participants[pid] = participant;
    ee.emitEvent('participant-published', [
      {
        participant: participant
      }
    ]);
    this.streams = participant.getStreams();
    for (key in this.streams) {
      stream = this.streams[key];
      if (subscribeToStreams) {
        stream.subscribe();
        ee.emitEvent('stream-added', [
          {
            stream: stream
          }
        ]);
      }
    }
  };

  Room.prototype.onParticipantJoined = function(msg) {
    var participant, pid;
    participant = new Participant(kurento, false, that, msg);
    pid = participant.getID();
    if (!(pid in this.participants)) {
      console.log('New participant to @participants list with id', pid);
      this.participants[pid] = participant;
    } else {
      log.info('Participant already exists in @participants list with ' + 'the same id, old:', this.participants[pid], ', joined now:', participant);
      participant = this.participants[pid];
    }
    ee.emitEvent('participant-joined', [
      {
        participant: participant
      }
    ]);
  };

  Room.prototype.onParticipantLeft = function(msg) {
    var key, participant;
    participant = this.participants[msg.name];
    if (participant !== void 0) {
      delete this.participants[msg.name];
      ee.emitEvent('participant-left', [
        {
          participant: participant
        }
      ]);
      this.streams = participant.getStreams();
      for (key in this.streams) {
        ee.emitEvent('stream-removed', [
          {
            stream: this.streams[key]
          }
        ]);
      }
      participant.dispose();
    } else {
      console.error('Participant ' + msg.name + ' unknown. Participants: ' + JSON.stringify(this.participants));
    }
  };

  Room.prototype.onNewMessage = function(msg) {
    var message, room, user;
    console.log('New message: ' + JSON.stringify(msg));
    room = msg.room;
    user = msg.user;
    message = msg.message;
    if (user !== void 0) {
      ee.emitEvent('newMessage', [
        {
          room: room,
          user: user,
          message: message
        }
      ]);
    } else {
      console.error('User undefined in new message:', msg);
    }
  };

  Room.prototype.recvIceCandidate = function(msg) {
    var candidate, key, participant, stream;
    candidate = {
      candidate: msg.candidate,
      sdpMid: msg.sdpMid,
      sdpMLineIndex: msg.sdpMLineIndex
    };
    participant = this.participants[msg.endpointName];
    if (!participant) {
      console.error('Participant not found for endpoint ' + msg.endpointName + '. Ice candidate will be ignored.', candidate);
      return false;
    }
    this.streams = participant.getStreams();
    for (key in this.streams) {
      stream = this.streams[key];
      if (key === 'webcam') {
        stream.getWebRtcPeer().addIceCandidate(candidate, function(error) {
          if (error) {
            console.error('Error adding candidate: ' + error);
            return;
          }
        });
        break;
      }
    }
  };

  Room.prototype.onRoomClosed = function(msg) {
    var room;
    console.log('Room closed: ' + JSON.stringify(msg));
    room = msg.room;
    if (room !== void 0) {
      ee.emitEvent('room-closed', [
        {
          room: room
        }
      ]);
    } else {
      console.error('Room undefined in on room closed', msg);
    }
  };

  Room.prototype.onMediaError = function(params) {
    var error;
    console.error('Media error: ' + JSON.stringify(params));
    error = params.error;
    if (error) {
      ee.emitEvent('error-media', [
        {
          error: error
        }
      ]);
    } else {
      console.error('Received undefined media error. Params:', params);
    }
  };

  Room.prototype.leave = function(forced) {
    var key;
    forced = !!forced;
    console.log('Leaving room (forced=' + forced + ')');
    if (this.connected && !forced) {
      kurento.sendRequest('leaveRoom', function(error, response) {
        if (error) {
          console.error(error);
        } else {
          this.connected = false;
        }
      });
    }
    for (key in this.participants) {
      this.participants[key].dispose();
    }
  };

  Room.prototype.disconnect = function(stream) {
    var participant;
    participant = stream.getParticipant();
    if (!participant) {
      console.error('Stream to disconnect has no participant', stream);
      return false;
    }
    delete this.participants[participant.getID()];
    participant.dispose();
    if (participant === this.localParticipant) {
      console.log('Unpublishing my media (I\'m ' + participant.getID() + ')');
      delete this.localParticipant;
      kurento.sendRequest('unpublishVideo', function(error, response) {
        if (error) {
          console.error(error);
        } else {
          console.info('Media unpublished correctly');
        }
      });
    } else {
      console.log('Unsubscribing from ' + stream.getGlobalID());
      kurento.sendRequest('unsubscribeFromVideo', {
        sender: stream.getGlobalID()
      }, function(error, response) {
        if (error) {
          console.error(error);
        } else {
          console.info('Unsubscribed correctly from ' + stream.getGlobalID());
        }
      });
    }
  };

  Room.prototype.getStreams = function() {
    return this.streams;
  };

  return Room;

})();

var Stream;

Stream = (function() {
  var localMirrored;

  function Stream(kurento1, local1, room, options1) {
    var sdpOffer;
    this.kurento = kurento1;
    this.local = local1;
    this.room = room;
    this.options = options1;
    this.ee = new EventEmitter();
    sdpOffer = void 0;
    this.wrStream = void 0;
    this.wp = void 0;
    this.id = void 0;
    if (options.id) {
      this.id = options.id;
    } else {
      this.id = 'webcam';
    }
    this.video = void 0;
    this.videoElements = [];
    this.elements = [];
    this.participant = options.participant;
    this.showMyRemote = false;
    return;
  }

  Stream.prototype.showSpinner = function(spinnerParentId) {
    var progress;
    progress = document.createElement('div');
    progress.id = 'progress-' + this.getGlobalID();
    progress.style.background = 'center transparent url(\'img/spinner.gif\') no-repeat';
    document.getElementById(spinnerParentId).appendChild(progress);
  };

  Stream.prototype.hideSpinner = function(spinnerId) {
    spinnerId = typeof spinnerId === 'undefined' ? this.getGlobalID() : spinnerId;
    $('#progress-' + spinnerId).hide();
  };

  Stream.prototype.initWebRtcPeer = function(sdpOfferCallback) {
    var options;
    if (local) {
      options = {
        videoStream: this.wrStream,
        onicecandidate: this.participant.sendIceCandidate.bind(this.participant)
      };
      if (this.displayMyRemote()) {
        this.wp = new kurentoUtils.WebRtcPeer.WebRtcPeerSendrecv(options, function(error) {
          if (error) {
            return console.error(error);
          }
          this.generateOffer(sdpOfferCallback.bind(this));
        });
      } else {
        this.wp = new kurentoUtils.WebRtcPeer.WebRtcPeerSendonly(options, function(error) {
          var options;
          if (error) {
            return console.error(error);
          }
          this.generateOffer(sdpOfferCallback.bind(this));
        });
      }
    } else {
      options = {
        onicecandidate: this.participant.sendIceCandidate.bind(this.participant)
      };
      this.wp = new kurentoUtils.WebRtcPeer.WebRtcPeerRecvonly(options, function(error) {
        if (error) {
          return console.error(error);
        }
        this.generateOffer(sdpOfferCallback.bind(this));
      });
    }
    console.log(this.getGlobalID() + ' waiting for SDP offer');
  };

  Stream.prototype.subscribeToMyRemote = function() {
    this.showMyRemote = true;
  };

  Stream.prototype.displayMyRemote = function() {
    return this.showMyRemote;
  };

  localMirrored = false;

  Stream.prototype.mirrorLocalStream = function(wr) {
    this.showMyRemote = true;
    localMirrored = true;
    if (wr) {
      this.wrStream = wr;
    }
  };

  Stream.prototype.isLocalMirrored = function() {
    return localMirrored;
  };

  Stream.prototype.getWrStream = function() {
    return this.wrStream;
  };

  Stream.prototype.getWebRtcPeer = function() {
    return wp;
  };

  Stream.prototype.addEventListener = function(eventName, listener) {
    this.ee.addListener(eventName, listener);
  };

  Stream.prototype.playOnlyVideo = function(parentElement, thumbnailId) {
    this.video = document.createElement('video');
    this.video.id = 'native-video-' + this.getGlobalID();
    this.video.autoplay = true;
    this.video.controls = false;
    if (this.wrStream) {
      this.video.src = URL.createObjectURL(this.wrStream);
      $('#' + thumbnailId).show();
      hideSpinner();
    } else {
      console.log('No @wrStream yet for', this.getGlobalID());
    }
    this.videoElements.push({
      thumb: thumbnailId,
      video: this.video
    });
    if (local) {
      this.video.setAttribute('muted', 'muted');
    }
    if (typeof parentElement === 'string') {
      document.getElementById(parentElement).appendChild(this.video);
    } else {
      parentElement.appendChild(this.video);
    }
  };

  Stream.prototype.playThumbnail = function(thumbnailId) {
    var container, name;
    container = document.createElement('div');
    container.className = 'participant';
    container.id = this.getGlobalID();
    document.getElementById(thumbnailId).appendChild(container);
    this.elements.push(container);
    name = document.createElement('div');
    container.appendChild(name);
    name.appendChild(document.createTextNode(this.getGlobalID()));
    name.id = 'name-' + this.getGlobalID();
    name.className = 'name';
    showSpinner(thumbnailId);
    this.playOnlyVideo(container, thumbnailId);
  };

  Stream.prototype.getID = function() {
    return id;
  };

  Stream.prototype.getParticipant = function() {
    return this.participant;
  };

  Stream.prototype.getGlobalID = function() {
    if (this.participant) {
      return this.participant.getID() + '_' + id;
    } else {
      return id + '_webcam';
    }
  };

  Stream.prototype.init = function() {
    var constraints;
    this.participant.addStream(this);
    constraints = {
      audio: true,
      video: {
        mandatory: {
          maxWidth: 640
        },
        optional: [
          {
            maxFrameRate: 15
          }, {
            minFrameRate: 15
          }
        ]
      }
    };
    getUserMedia(constraints, (function(userStream) {
      this.wrStream = userStream;
      this.ee.emitEvent('access-accepted', null);
    }), function(error) {
      console.error('Access denied', error);
      this.ee.emitEvent('access-denied', null);
    });
  };

  Stream.prototype.publishVideoCallback = function(error, sdpOfferParam, wp) {
    if (error) {
      return console.error('SDP offer error');
    }
    console.log('Invoking SDP offer callback function - publisher: ' + this.getGlobalID());
    kurento.sendRequest('publishVideo', {
      sdpOffer: sdpOfferParam,
      doLoopback: this.displayMyRemote() || false
    }, (function(_this) {
      return function(error, response) {
        if (error) {
          console.error('Error on publishVideo: ' + JSON.stringify(error));
        } else {
          _this.room.emitEvent('stream-published', [
            {
              stream: _this
            }
          ]);
          _this.processSdpAnswer(response.sdpAnswer);
        }
      };
    })(this));
  };

  Stream.prototype.startVideoCallback = function(error, sdpOfferParam, wp) {
    if (error) {
      return console.error('SDP offer error');
    }
    console.log('Invoking SDP offer callback function - ' + 'subscribing to: ' + this.getGlobalID());
    kurento.sendRequest('receiveVideoFrom', {
      sender: this.getGlobalID(),
      sdpOffer: sdpOfferParam
    }, function(error, response) {
      if (error) {
        console.error('Error on recvVideoFrom: ' + JSON.stringify(error));
      } else {
        this.processSdpAnswer(response.sdpAnswer);
      }
    });
  };

  Stream.prototype.publish = function() {
    initWebRtcPeer(this.publishVideoCallback);
  };

  Stream.prototype.subscribe = function() {
    initWebRtcPeer(this.startVideoCallback);
  };

  Stream.prototype.processSdpAnswer = function(sdpAnswer) {
    var answer, pc;
    answer = new RTCSessionDescription({
      type: 'answer',
      sdp: sdpAnswer
    });
    console.info(this.getGlobalID() + ': SDP answer received, setting the peer connection');
    pc = this.wp.peerConnection;
    pc.setRemoteDescription(answer, (function() {
      var video;
      var i, thumbnailId, video;
      if (!local || this.displayMyRemote()) {
        this.wrStream = pc.getRemoteStreams()[0];
        console.log('Peer remote stream', this.wrStream);
        i = 0;
        while (i < this.videoElements.length) {
          thumbnailId = this.videoElements[i].thumb;
          video = this.videoElements[i].video;
          video.src = URL.createObjectURL(this.wrStream);
          video.onplay = function() {
            var elementId, videoId;
            elementId = this.id;
            videoId = elementId.split('-');
            $('#' + thumbnailId).show();
            hideSpinner(videoId[2]);
          };
          i++;
        }
        this.room.emitEvent('stream-subscribed', [
          {
            stream: this
          }
        ]);
      }
    }), function(error) {
      console.error(this.getGlobalID() + ': Error setting SDP to the peer connection: ' + JSON.stringify(error));
    });
  };

  Stream.prototype.unpublish = function() {
    if (this.wp) {
      this.wp.dispose();
    } else {
      if (this.wrStream) {
        this.wrStream.getAudioTracks().forEach(function(track) {
          track.stop && track.stop();
        });
        this.wrStream.getVideoTracks().forEach(function(track) {
          track.stop && track.stop();
        });
      }
    }
    console.log(this.getGlobalID() + ': Stream \'' + id + '\' unpublished');
  };

  Stream.prototype.dispose = function() {
    var disposeElement, i;
    disposeElement = function(element) {
      if (element && element.parentNode) {
        element.parentNode.removeChild(element);
      }
    };
    i = 0;
    while (i < this.elements.length) {
      disposeElement(this.elements[i]);
      i++;
    }
    i = 0;
    while (i < this.videoElements.length) {
      disposeElement(this.videoElements[i].video);
      i++;
    }
    if (this.wp) {
      this.wp.dispose();
    } else {
      if (this.wrStream) {
        this.wrStream.getAudioTracks().forEach(function(track) {
          track.stop && track.stop();
        });
        this.wrStream.getVideoTracks().forEach(function(track) {
          track.stop && track.stop();
        });
      }
    }
    console.log(this.getGlobalID() + ': Stream \'' + id + '\' disposed');
  };

  return Stream;

})();
if (typeof define === 'function' && define.amd) {
define(function () {
    return KurentoRoom;
});
}
else if (typeof module !== 'undefined' && module.exports) {
module.exports = KurentoRoom;
}
else {
this.KurentoRoom = KurentoRoom;
}
}.call(this));