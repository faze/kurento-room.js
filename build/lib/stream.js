
/*
 * options: name: XXX data: true (Maybe this is based on webrtc) audio: true,
 * video: true, url: "file:///..." > Player screen: true > Desktop (implicit
 * video:true, audio:false) audio: true, video: true > Webcam
 *
 * stream.hasAudio(); stream.hasVideo(); stream.hasData();
 */
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
