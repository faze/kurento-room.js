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
