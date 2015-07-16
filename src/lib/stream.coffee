# Stream --------------------------------

###
# options: name: XXX data: true (Maybe this is based on webrtc) audio: true,
# video: true, url: "file:///..." > Player screen: true > Desktop (implicit
# video:true, audio:false) audio: true, video: true > Webcam
#
# stream.hasAudio(); stream.hasVideo(); stream.hasData();
###
class Stream
  constructor: (@kurento, @local, @room, @options) ->
    @ee = new EventEmitter()
    sdpOffer = undefined
    @wrStream = undefined
    @wp = undefined
    @id = undefined
    if options.id
      @id = options.id
    else
      @id = 'webcam'
    @video = undefined
    @videoElements = []
    @elements = []
    @participant = options.participant
    @showMyRemote = false
    return
  showSpinner: (spinnerParentId) ->
    progress = document.createElement('div')
    progress.id = 'progress-' + @getGlobalID()
    progress.style.background = 'center transparent url(\'img/spinner.gif\') no-repeat'
    document.getElementById(spinnerParentId).appendChild progress
    return

  hideSpinner: (spinnerId) ->
    spinnerId = if typeof spinnerId == 'undefined' then @getGlobalID() else spinnerId
    $('#progress-' + spinnerId).hide()
    return

  initWebRtcPeer: (sdpOfferCallback) ->
    if local
      options =
        videoStream: @wrStream
        onicecandidate: @participant.sendIceCandidate.bind(@participant)
      if @displayMyRemote()
        @wp = new (kurentoUtils.WebRtcPeer.WebRtcPeerSendrecv)(options, (error) ->
          if error
            return console.error(error)
          @generateOffer sdpOfferCallback.bind(@)
          return
        )
      else
        @wp = new (kurentoUtils.WebRtcPeer.WebRtcPeerSendonly)(options, (error) ->
          `var options`
          if error
            return console.error(error)
          @generateOffer sdpOfferCallback.bind(@)
          return
        )
    else
      options = onicecandidate: @participant.sendIceCandidate.bind(@participant)
      @wp = new (kurentoUtils.WebRtcPeer.WebRtcPeerRecvonly)(options, (error) ->
        if error
          return console.error(error)
        @generateOffer sdpOfferCallback.bind(@)
        return
      )
    console.log @getGlobalID() + ' waiting for SDP offer'
    return
  subscribeToMyRemote: ->
    @showMyRemote = true
    return

  displayMyRemote: ->
    @showMyRemote

  localMirrored = false

  mirrorLocalStream: (wr) ->
    @showMyRemote = true
    localMirrored = true
    if wr
      @wrStream = wr
    return

  isLocalMirrored: ->
    localMirrored

  getWrStream: ->
    @wrStream

  getWebRtcPeer: ->
    wp

  addEventListener: (eventName, listener) ->
    @ee.addListener eventName, listener
    return

  playOnlyVideo: (parentElement, thumbnailId) ->
    @video = document.createElement('video')
    @video.id = 'native-video-' + @getGlobalID()
    @video.autoplay = true
    @video.controls = false
    if @wrStream
      @video.src = URL.createObjectURL(@wrStream)
      $('#' + thumbnailId).show()
      hideSpinner()
    else
      console.log 'No @wrStream yet for', @getGlobalID()
    @videoElements.push
      thumb: thumbnailId
      video: @video
    if local
      @video.setAttribute 'muted', 'muted'
    if typeof parentElement == 'string'
      document.getElementById(parentElement).appendChild @video
    else
      parentElement.appendChild @video
    return

  playThumbnail: (thumbnailId) ->
    container = document.createElement('div')
    container.className = 'participant'
    container.id = @getGlobalID()
    document.getElementById(thumbnailId).appendChild container
    @elements.push container
    name = document.createElement('div')
    container.appendChild name
    name.appendChild document.createTextNode(@getGlobalID())
    name.id = 'name-' + @getGlobalID()
    name.className = 'name'
    showSpinner thumbnailId
    @playOnlyVideo container, thumbnailId
    return

  getID: ->
    id

  getParticipant: ->
    @participant

  getGlobalID: ->
    if @participant
      @participant.getID() + '_' + id
    else
      id + '_webcam'

  init: ->
    @participant.addStream @
    constraints =
      audio: true
      video:
        mandatory: maxWidth: 640
        optional: [
          { maxFrameRate: 15 }
          { minFrameRate: 15 }
        ]
    getUserMedia constraints, ((userStream) ->
      @wrStream = userStream
      @ee.emitEvent 'access-accepted', null
      return
    ), (error) ->
      console.error 'Access denied', error
      @ee.emitEvent 'access-denied', null
      return
    return

  publishVideoCallback: (error, sdpOfferParam, wp) ->
    if error
      return console.error('SDP offer error')
    console.log 'Invoking SDP offer callback function - publisher: ' + @getGlobalID()
    kurento.sendRequest 'publishVideo', {
      sdpOffer: sdpOfferParam
      doLoopback: @displayMyRemote() or false
    }, (error, response) =>
      if error
        console.error 'Error on publishVideo: ' + JSON.stringify(error)
      else
        @room.emitEvent 'stream-published', [ { stream: @ } ]
        @processSdpAnswer response.sdpAnswer
      return
    return

  startVideoCallback: (error, sdpOfferParam, wp) ->
    if error
      return console.error('SDP offer error')
    console.log 'Invoking SDP offer callback function - ' + 'subscribing to: ' + @getGlobalID()
    kurento.sendRequest 'receiveVideoFrom', {
      sender: @getGlobalID()
      sdpOffer: sdpOfferParam
    }, (error, response) ->
      if error
        console.error 'Error on recvVideoFrom: ' + JSON.stringify(error)
      else
        @processSdpAnswer response.sdpAnswer
      return
    return

  publish: ->
    # FIXME: Throw error when stream is not local
    initWebRtcPeer @publishVideoCallback
    # FIXME: Now we have coupled connecting to a room and adding a
    # stream to this room. But in the new API, there are two steps.
    # This is the second step. For now, it do nothing.
    return

  subscribe: ->
    # FIXME: In the current implementation all participants are subscribed
    # automatically to all other participants. We use this method only to
    # negotiate SDP
    initWebRtcPeer @startVideoCallback
    return

  processSdpAnswer: (sdpAnswer) ->
    answer = new RTCSessionDescription(
      type: 'answer'
      sdp: sdpAnswer)
    console.info @getGlobalID() + ': SDP answer received, setting the peer connection'
    pc = @wp.peerConnection
    pc.setRemoteDescription answer, (->
      `var video`
      # Avoids to subscribe to your own stream remotely
      # except when @showMyRemote is true
      if !local or @displayMyRemote()
        @wrStream = pc.getRemoteStreams()[0]
        console.log 'Peer remote stream', @wrStream
        i = 0
        while i < @videoElements.length
          thumbnailId = @videoElements[i].thumb
          video = @videoElements[i].video
          video.src = URL.createObjectURL(@wrStream)

          video.onplay = ->
            #is ('native-video-' + @getGlobalID())
            elementId = @id
            videoId = elementId.split('-')
            $('#' + thumbnailId).show()
            hideSpinner videoId[2]
            return

          i++
        @room.emitEvent 'stream-subscribed', [ { stream: @ } ]
      return
    ), (error) ->
      console.error @getGlobalID() + ': Error setting SDP to the peer connection: ' + JSON.stringify(error)
      return
    return

  unpublish: ->
    if @wp
      @wp.dispose()
    else
      if @wrStream
        @wrStream.getAudioTracks().forEach (track) ->
          track.stop and track.stop()
          return
        @wrStream.getVideoTracks().forEach (track) ->
          track.stop and track.stop()
          return
    console.log @getGlobalID() + ': Stream \'' + id + '\' unpublished'
    return

  dispose: ->

    disposeElement = (element) ->
      if element and element.parentNode
        element.parentNode.removeChild element
      return

    i = 0
    while i < @elements.length
      disposeElement @elements[i]
      i++
    i = 0
    while i < @videoElements.length
      disposeElement @videoElements[i].video
      i++
    if @wp
      @wp.dispose()
    else
      if @wrStream
        @wrStream.getAudioTracks().forEach (track) ->
          track.stop and track.stop()
          return
        @wrStream.getVideoTracks().forEach (track) ->
          track.stop and track.stop()
          return
    console.log @getGlobalID() + ': Stream \'' + id + '\' disposed'
    return
