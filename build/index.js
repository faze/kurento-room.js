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
