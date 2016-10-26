//Purpose: Code for dealing with SoundCloud and processing features

SERVER_URL = 'http://loopditty.herokuapp.com/';
//SERVER_URL = 'http://127.0.0.1:5000';

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
var MusicParams = {TimeWin:3.5, usingMFCC:true, usingChroma:true, usingCentroid:true, usingRoloff:true, usingFlux:true, usingZeroCrossings:true, sphereNormalize:false, usingDerivatives:false, displayTimeEdges:true, needsUpdate:false, soundcloudSong:false, scurl:""};
var musicFeatures = {};

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

function updateParams() {
    if (!MusicParams.needsUpdate) {
        alert('Nothing has changed, so no need to recompute');
        return;
    }
    if (!checkForFeatureFields(musicFeatures)) {
        alert('Must load in song before parameters can be tweaked');
        return;
    }
    pauseAudio();
    var TimeWin = parseFloat(windowLengthText.value);
    TimeWin = Math.max(TimeWin, 0.1);
    TimeWin = Math.min(TimeWin, 100);
    windowLengthText.value = "" + TimeWin;
    MusicParams.TimeWin = TimeWin;
    //Load a web worker in the background that makes the
    //delay series and does PCA
    loadColor = "yellow";
    loading = true;
    changeLoad();
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
            recomputeButton.style.backgroundColor = "#bfbfbf";
            MusicParams.needsUpdate = false;
            updateTwitterLink();
            changeToReady();
        }
    }
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
    MusicParams.soundcloudSong = true;
    //Update soundcloud widget with this song
    var scurl = document.getElementById("scurl").value;
    MusicParams.scurl = scurl;
    //TODO: Finish this and display data from soundcloud

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
            timeSlider.value = 0;
            recomputeButton.style.backgroundColor = "#bfbfbf";
            MusicParams.needsUpdate = false;
            updateTwitterLink();
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
    MusicParams.soundcloudSong = false;
    MusicParams.scurl = "";
    updateTwitterLink();
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
            timeSlider.value = 0;
            recomputeButton.style.backgroundColor = "#bfbfbf";
            MusicParams.needsUpdate = false;
            changeToReady();
        }
    }
}

function processPrecomputedResults(res) {
    if (!checkForFeatureFields(res)) {
        alert("Music features not returned properly from server");
        setLoadingFailed();
        return;
    }
    musicFeatures = res;
    MusicParams.soundcloudSong = true;
    MusicParams.scurl = musicFeatures.url;
    updateTwitterLink();
    //Update soundcloud widget with this song
    var scurlfield = document.getElementById("scurl");
    scurlfield.value = musicFeatures.url;

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
            timeSlider.value = 0;
            recomputeButton.style.backgroundColor = "#bfbfbf";

            MusicParams.needsUpdate = false;
            changeToReady();
        }
    }
}

function setHeader(xhr) {
    xhr.setRequestHeader('Content-Type', 'text/plain');
}

function querySoundCloudURL() {
    pauseAudio();
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
    loadString = "Sending data to server for processing (this may take a moment)";
    loadColor = "red";
    loading = true;
    changeLoad();

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


function loadPrecomputedSong(file) {
    loadString = "Reading data from server";
    loadColor = "red";
    loading = true;
    changeLoad();

    var xhr = new XMLHttpRequest();
    xhr.open('GET', file, true);
    xhr.responseType = 'json';
    xhr.onload = function(err) {
        processPrecomputedResults(this.response);
    };
    loading = true;
    ndots = 0;
    changeLoad();
    xhr.send();

}

//Functions to deal with twitter or precomputed choices
function musicParamsToString() {
    var idx = MusicParams.scurl.indexOf("soundcloud.com/");
    if (idx == -1) {
        return "";
    }
    var sep = "?"
    var scstr = MusicParams.scurl.substring(idx+"soundcloud.com/".length);
    var s = MusicParams.TimeWin + sep + MusicParams.usingMFCC + sep + MusicParams.usingChroma + sep + MusicParams.usingCentroid + sep + MusicParams.usingRoloff + sep + MusicParams.usingFlux + sep + MusicParams.usingZeroCrossings + sep + MusicParams.sphereNormalize + sep + MusicParams.usingDerivatives + sep + MusicParams.displayTimeEdges + sep + scstr;
    return s;
}

//var MusicParams = {TimeWin:3.5, usingMFCC:true, usingChroma:true, usingCentroid:true, usingRoloff:true, usingFlux:true, usingZeroCrossings:true, sphereNormalize:false, usingDerivatives:false, displayTimeEdges:true, needsUpdate:false, soundcloudSong:false, scurl:""};
function checkURLParameters() {
    //Now check to see if the user is loading in any predefined songs or parameters
    var sep = "?";
    var s = location.href;
    var idx = s.indexOf("MusicParams");
    if (idx > -1) {
        s = s.substring(idx+"MusicParams".length+1);
        fields = s.split(sep);
        if (fields.length < 11) {
            alert("Not enough parameters specified in the URL");
            return;
        }
        var i = 0;
        MusicParams.TimeWin = parseFloat(s[i]);
        windowLengthText.value = fields[i];
        i++;
        MusicParams.usingMFCC = (fields[i] == "true");
        MFCCCheckbox.checked = MusicParams.usingMFCC;
        i++;
        MusicParams.usingChroma = (fields[i] == "true");
        ChromaCheckbox.checked = MusicParams.usingChroma;
        i++;
        MusicParams.usingCentroid = (fields[i] == "true");
        CentroidCheckbox.checked = MusicParams.usingCentroid;
        i++;
        MusicParams.usingRoloff = (fields[i] == "true");
        RoloffCheckbox.checked = MusicParams.usingRoloff;
        i++;
        MusicParams.usingFlux = (fields[i] == "true");
        FluxCheckbox.checked = MusicParams.usingFlux;
        i++;
        MusicParams.usingZeroCrossings = (fields[i] == "true");
        ZeroCrossingsCheckbox.checked = MusicParams.usingZeroCrossings;
        i++;
        MusicParams.sphereNormalize = (fields[i] == "true");
        SphereNormalizeCheckbox.checked = MusicParams.sphereNormalize;
        i++;
        MusicParams.usingDerivatives = (fields[i] == "true");
        UseVariationCheckbox.checked = MusicParams.usingDerivatives;
        i++;
        MusicParams.displayTimeEdges = (fields[i] == "true");
        timeEdgesCheckbox.checked = MusicParams.displayTimeEdges;
        i++;
        MusicParams.soundcloudSong = true;
        MusicParams.scurl = "https://www.soundcloud.com/" + fields[i];
        document.getElementById("scurl").value = MusicParams.scurl;
        querySoundCloudURL();
    }
}

function updateTwitterLink() {
    var twitterButton = document.getElementById("twitterButton");
    var twitterImage = document.getElementById("twitterImage");
    if (!MusicParams.soundcloudSong) {
        twitterButton.style.visibility = "hidden";
        twitterImage.style.visibility = "hidden";
        twitterButton.href = "#loading";
        return;
    }
    twitterButton.style.visibility = "visible";
    twitterImage.style.visibility = "visible";
    baseurl = "https://twitter.com/intent/tweet?text=Checkout+this+song+I+found+on+LoopDitty&hashtags=loopditty&url=";
    url = "http://www.loopditty.net/index.html#loading?MusicParams=" + musicParamsToString();
    url = encodeURIComponent(url);
    twitterButton.href = baseurl + url;
}

function makeMusicParamsDirty() {
    MusicParams.needsUpdate = true;
    recomputeButton.style.backgroundColor = "red";
    requestAnimFrame(function(){repaintWithContext(context)});
}
