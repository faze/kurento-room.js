# Participant Class --------------------------------
class Participant
  constructor: (@kurento, @local, @room, @options) ->
    that = this
    id = options.id
    streams = {}
    if options.streams
      i = 0
      while i < options.streams.length
        stream = new Stream(kurento, false, room,
          id: options.streams[i].id
          participant: that)
        addStream stream
        i++

    return
  setId: (newId) ->
    id = newId
    return
  addStream: (stream) ->
    streams[stream.getID()] = stream
    room.getStreams()[stream.getID()] = stream
    return
  getStreams: ->
    streams
  dispose: ->
    for key of streams
      streams[key].dispose()
    return
  getID: ->
    id
  sendIceCandidate: (candidate) ->
    if local
      console.debug 'Local'
    else
      console.debug 'Remote', 'candidate for', that.getID(), JSON.stringify(candidate)
    kurento.sendRequest 'onIceCandidate', {
      endpointName: that.getID()
      candidate: candidate.candidate
      sdpMid: candidate.sdpMid
      sdpMLineIndex: candidate.sdpMLineIndex
    }, (error, response) ->
      if error
        console.error 'Error sending ICE candidate: ' + JSON.stringify(error)
      return
    return
