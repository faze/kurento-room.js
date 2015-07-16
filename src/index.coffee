class KurentoRoom
  constructor: (wsUri, callback) ->
    if !(this instanceof KurentoRoom)
      return new KurentoRoom(wsUri, callback)
    that = this
    userName = undefined
    ws = new WebSocket(wsUri)

    ws.onopen = ->
      callback null, that
      return

    ws.onerror = (evt) ->
      callback evt.data
      return

    ws.onclose = ->
      console.log 'Connection Closed'
      return

    options = request_timeout: 50000
    rpc = new RpcBuilder(RpcBuilder.packers.JsonRPC, options, ws, (request) ->
      console.info 'Received request: ' + JSON.stringify(request)
      switch request.method
        when 'participantJoined'
          onParticipantJoined request.params
        when 'participantPublished'
          onParticipantPublished request.params
        when 'participantUnpublished'
          #TODO use a different method, don't delete
          # the participant for future reconnection?
          onParticipantLeft request.params
        when 'participantLeft'
          onParticipantLeft request.params
        when 'sendMessage'
          #CHAT
          onNewMessage request.params
        when 'iceCandidate'
          iceCandidateEvent request.params
        when 'roomClosed'
          onRoomClosed request.params
        when 'mediaError'
          onMediaError request.params
        else
          console.error 'Unrecognized request: ' + JSON.stringify(request)
      return
    )
    rpcParams = undefined
    return
  onParticipantJoined: (msg) ->
    if room != undefined
      room.onParticipantJoined msg
    return

  onParticipantPublished: (msg) ->
    if room != undefined
      room.onParticipantPublished msg
    return

  onParticipantLeft: (msg) ->
    if room != undefined
      room.onParticipantLeft msg
    return

  onNewMessage: (msg) ->
    if room != undefined
      room.onNewMessage msg
    return

  iceCandidateEvent: (msg) ->
    if room != undefined
      room.recvIceCandidate msg
    return

  onRoomClosed: (msg) ->
    if room != undefined
      room.onRoomClosed msg
    return

  onMediaError: (params) ->
    if room != undefined
      room.onMediaError params
    return

  @setRpcParams: (params) ->
    rpcParams = params
    return

  @sendRequest: (method, params, callback) ->
    if rpcParams and rpcParams != 'null' and rpcParams != 'undefined'
      for index of rpcParams
        if rpcParams.hasOwnProperty(index)
          params[index] = rpcParams[index]
    rpc.encode method, params, callback
    console.log 'Sent request: { method:"' + method + '", params: ' + JSON.stringify(params) + ' }'
    return

  close: (forced) ->
    if room != undefined
      room.leave forced
    ws.close()
    return

  disconnectParticipant: (stream) ->
    if room != undefined
      room.disconnect stream
    return

  Stream: (room, options) ->
    options.participant = room.getLocalParticipant()
    new Stream(that, true, room, options)

  Room: (options) ->
    # FIXME Support more than one room
    room = new Room(that, options)
    # FIXME Include name in stream, not in room
    userName = options.userName
    room

  #CHAT
  sendMessage: (room, user, message) ->
    @sendRequest 'sendMessage', {
      message: message
      userMessage: user
      roomMessage: room
    }, (error, response) ->
      if error
        console.error error
      else
        connected = false
      return
    return
  sendCustomRequest: (params, callback) ->
    @sendRequest 'customRequest', params, callback
    return
