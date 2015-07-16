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
