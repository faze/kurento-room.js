# Room --------------------------------
class Room
  constructor: (kurento, options) ->
    that = this
    that.name = options.room
    ee = new EventEmitter()
    @streams = {}
    @participants = {}
    @connected = false
    @localParticipant = undefined
    subscribeToStreams = options.subscribeToStreams or true
    @localParticipant = new Participant(kurento, true, that, id: options.user)
    @participants[options.user] = @localParticipant
    return
  getLocalParticipant: ->
    @localParticipant

  addEventListener: (eventName, listener) ->
    ee.addListener eventName, listener
    return

  emitEvent: (eventName, eventsArray) ->
    ee.emitEvent eventName, eventsArray
    return

  connect: ->
    kurento.sendRequest 'joinRoom', {
      user: options.user
      room: options.room
    }, (error, response) ->
      if error
        ee.emitEvent 'error-room', [ { error: error } ]
        #console.error(error);
      else
        @connected = true
        exParticipants = response.value
        roomEvent =
          participants: []
          streams: []
        length = exParticipants.length
        i = 0
        while i < length
          participant = new Participant(kurento, false, that, exParticipants[i])
          @participants[participant.getID()] = participant
          roomEvent.participants.push participant
          @streams = participant.getStreams()
          for key of @streams
            roomEvent.streams.push @streams[key]
            if subscribeToStreams
              @streams[key].subscribe()
          i++
        ee.emitEvent 'room-@connected', [ roomEvent ]
      return
    return

  subscribe: (stream) ->
    stream.subscribe()
    return

  onParticipantPublished: (msg) ->
    participant = new Participant(kurento, false, that, msg)
    pid = participant.getID()
    if !(pid of @participants)
      console.info 'Publisher not found in @participants list by its id', pid
    else
      console.log 'Publisher found in @participants list by its id', pid
    #replacing old participant (this one has @streams)
    @participants[pid] = participant
    ee.emitEvent 'participant-published', [ { participant: participant } ]
    @streams = participant.getStreams()
    for key of @streams
      stream = @streams[key]
      if subscribeToStreams
        stream.subscribe()
        ee.emitEvent 'stream-added', [ { stream: stream } ]
    return

  onParticipantJoined: (msg) ->
    participant = new Participant(kurento, false, that, msg)
    pid = participant.getID()
    if !(pid of @participants)
      console.log 'New participant to @participants list with id', pid
      @participants[pid] = participant
    else
      #use existing so that we don't lose @streams info
      log.info 'Participant already exists in @participants list with ' + 'the same id, old:', @participants[pid], ', joined now:', participant
      participant = @participants[pid]
    ee.emitEvent 'participant-joined', [ { participant: participant } ]
    return

  onParticipantLeft: (msg) ->
    participant = @participants[msg.name]
    if participant != undefined
      delete @participants[msg.name]
      ee.emitEvent 'participant-left', [ { participant: participant } ]
      @streams = participant.getStreams()
      for key of @streams
        ee.emitEvent 'stream-removed', [ { stream: @streams[key] } ]
      participant.dispose()
    else
      console.error 'Participant ' + msg.name + ' unknown. Participants: ' + JSON.stringify(@participants)
    return

  onNewMessage: (msg) ->
    console.log 'New message: ' + JSON.stringify(msg)
    room = msg.room
    user = msg.user
    message = msg.message
    if user != undefined
      ee.emitEvent 'newMessage', [ {
        room: room
        user: user
        message: message
      } ]
    else
      console.error 'User undefined in new message:', msg
    return

  recvIceCandidate: (msg) ->
    candidate =
      candidate: msg.candidate
      sdpMid: msg.sdpMid
      sdpMLineIndex: msg.sdpMLineIndex
    participant = @participants[msg.endpointName]
    if !participant
      console.error 'Participant not found for endpoint ' + msg.endpointName + '. Ice candidate will be ignored.', candidate
      return false
    @streams = participant.getStreams()
    for key of @streams
      stream = @streams[key]
      if key == 'webcam'
        stream.getWebRtcPeer().addIceCandidate candidate, (error) ->
          if error
            console.error 'Error adding candidate: ' + error
            return
          return
        break
    return

  onRoomClosed: (msg) ->
    console.log 'Room closed: ' + JSON.stringify(msg)
    room = msg.room
    if room != undefined
      ee.emitEvent 'room-closed', [ { room: room } ]
    else
      console.error 'Room undefined in on room closed', msg
    return

  onMediaError: (params) ->
    console.error 'Media error: ' + JSON.stringify(params)
    error = params.error
    if error
      ee.emitEvent 'error-media', [ { error: error } ]
    else
      console.error 'Received undefined media error. Params:', params
    return

  leave: (forced) ->
    forced = ! !forced
    console.log 'Leaving room (forced=' + forced + ')'
    if @connected and !forced
      kurento.sendRequest 'leaveRoom', (error, response) ->
        if error
          console.error error
        else
          @connected = false
        return
    for key of @participants
      @participants[key].dispose()
    return

  disconnect: (stream) ->
    participant = stream.getParticipant()
    if !participant
      console.error 'Stream to disconnect has no participant', stream
      return false
    delete @participants[participant.getID()]
    participant.dispose()
    if participant == @localParticipant
      console.log 'Unpublishing my media (I\'m ' + participant.getID() + ')'
      delete @localParticipant
      kurento.sendRequest 'unpublishVideo', (error, response) ->
        if error
          console.error error
        else
          console.info 'Media unpublished correctly'
        return
    else
      console.log 'Unsubscribing from ' + stream.getGlobalID()
      kurento.sendRequest 'unsubscribeFromVideo', { sender: stream.getGlobalID() }, (error, response) ->
        if error
          console.error error
        else
          console.info 'Unsubscribed correctly from ' + stream.getGlobalID()
        return
    return
  getStreams: ->
    @streams
