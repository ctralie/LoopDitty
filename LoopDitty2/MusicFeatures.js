//Purpose: Code for dealing with SoundCloud and processing features

//SERVER_URL = 'http://loopditty.herokuapp.com/';
SERVER_URL = 'http://127.0.0.1:5000/';

//A function to show a progress bar
var loading = false;
var loadString = "Loading";
var loadColor = "yellow";
var ndots = 0;
function changeLoad() {
    if (!loading) {
        return;
    }
    var s = "<h3><font color = \"" + loadColor + "\">" + loadString;
    for (var i = 0; i < ndots; i++) {
        s += ".";
    }
    s += "</font></h3>";
    waitingDisp.innerHTML = s;
    if (loading) {
        ndots = (ndots + 1)%12;
        setTimeout(changeLoad, 200);
    }
}
function changeToReady() {
    loading = false;
    waitingDisp.innerHTML = "<h3><font color = \"#00FF00\">Ready</font></h3>";
}


//Parameters for doing PCA on music
var MusicParams = {TimeWin:3.5, usingMFCC:true, usingChroma:true, usingCentroid:true, usingRoloff:true, usingFlux:true, usingZeroCrossings:true, sphereNormalize:false, usingDerivatives:false};
var musicFeatures = null;

function processSoundcloudResults(res) {
    musicFeatures = res;
    //Update soundcloud widget with this song
    var scurl = document.getElementById("scurl").value;

    //Load a web worker in the background that makes the
    //delay series and does PCA
    loadColor = "yellow";
    var worker = new Worker("DelaySeries.js");
    worker.postMessage({MusicParams:MusicParams, musicFeatures:musicFeatures});
    
    worker.onmessage = function(event) {
        if (event.data.type == "newTask") {
            loadString = event.data.taskString;
        }
        else if (event.data.type == "end") {
            initGLBuffers(event.data.Y);
            decodeAudio(musicFeatures.mp3data);
            var timeSlider = document.getElementById('timeSlider');
            timeSlider.value = 0;
            changeToReady();
        }
    }
}

function setHeader(xhr) {
    xhr.setRequestHeader('Content-Type', 'text/plain');
}

function querySoundCloudURL() {
    pauseAudio();
    var pagestatus = document.getElementById("pagestatus");
    loadString = "Grabbing data from server (this may take a moment)";
    loadColor = "red";
    loading = true;
    changeLoad();
    var scurl = document.getElementById("scurl").value;
    $.ajax({
      //url:  '',
      url: 'http://127.0.0.1:5000/',
      type: 'GET',
      data: {url: scurl},
      dataType: 'json',
      success: processSoundcloudResults,
      error: function (xhr, ajaxOptions, thrownError) {
        alert(xhr.status);
        alert(thrownError);
        loading = false;
        waitingDisp.innerHTML = "<h3><font color = \"red\">Loading Failed :(</font></h3>";
      },
      beforeSend: setHeader
    });
}

