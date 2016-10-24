//Purpose: Code for dealing with SoundCloud and processing features

//SERVER_URL = 'http://loopditty.herokuapp.com/';
SERVER_URL = 'http://127.0.0.1:5000';

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
function setLoadingFailed() {
    loading = false;
    waitingDisp.innerHTML = "<h3><font color = \"red\">Loading Failed :(</font></h3>";
}

//Base64 Functions
//http://stackoverflow.com/questions/21797299/convert-base64-string-to-arraybuffer
function base64ToArrayBuffer(base64) {
    var binary =  window.atob(base64);
    var len = binary.length;
    var bytes = new Uint8Array( len );
    for (var i = 0; i < len; i++)        {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

function ArrayBufferTobase64(arrayBuff) {
    var binary = '';
    var bytes = new Uint8Array(arrayBuff);
    var N = bytes.byteLength;
    for (var i = 0; i < N; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

//Parameters for doing PCA on music
var MusicParams = {TimeWin:3.5, usingMFCC:true, usingChroma:true, usingCentroid:true, usingRoloff:true, usingFlux:true, usingZeroCrossings:true, sphereNormalize:false, usingDerivatives:false};
var musicFeatures = null;

function checkForFeatureFields(res) {
    var allFields = true;
    if (!('MFCC' in res)) {
        allFields = false;
    }
    if (!('Chroma' in res)) {
        allFields = false;
    }
    if (!('Centroid' in res)) {
        allFields = false;
    }
    if (!('Roloff' in res)) {
        allFields = false;
    }
    if (!('Flux' in res)) {
        allFields = false;
    }
    if (!('ZeroCrossings' in res)) {
        allFields = false;
    }
    return allFields;
}

function processSoundcloudResults(res) {
    if ('Error' in res) {
        alert(res.Error);
        setLoadingFailed();
        return;
    }
    if (!checkForFeatureFields(res)) {
        alert("Music features not returned properly from server");
        setLoadingFailed();
        return;
    }
    musicFeatures = res;
    //Update soundcloud widget with this song
    var scurl = document.getElementById("scurl").value;
    //TODO: Finish this

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
            var arrayBuff = base64ToArrayBuffer(musicFeatures.mp3data);
            decodeAudio(arrayBuff);
            var timeSlider = document.getElementById('timeSlider');
            timeSlider.value = 0;
            changeToReady();
        }
    }
}

function processCustomAudio(res) {
    if ('Error' in res) {
        alert(res.Error);
        setLoadingFailed();
        return;
    }
    if (!checkForFeatureFields(res)) {
        alert("Music features not returned properly from server");
        setLoadingFailed();
        return;
    }
    musicFeatures = res;
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
      url: SERVER_URL,
      type: 'GET',
      data: {url: scurl},
      dataType: 'json',
      success: processSoundcloudResults,
      error: function (xhr, ajaxOptions, thrownError) {
        alert("Error Loading Song");
        console.log(xhr.status);
        console.log(thrownError);
        setLoadingFailed();
      },
      beforeSend: setHeader
    });
}


function queryCustomFeatures(file) {
    pauseAudio();
    var pagestatus = document.getElementById("pagestatus");
    loadString = "Sending data to server for processing (this may take a moment)";
    loadColor = "red";
    loading = true;
    changeLoad();

    //TODO: Add file here
    var formData = new FormData();
    formData.append('file', file, file.name);
    var xhr = new XMLHttpRequest();
    xhr.open('POST', SERVER_URL, true);
    xhr.onload = function (results) {
        if (xhr.status == 200) {
            processCustomAudio(JSON.parse(results.target.response));
        }
        else {
            alert("Error Loading Song");
            console.log(xhr.status);
            console.log(thrownError);
            setLoadingFailed();
        }
    };
    xhr.send(formData);
}
