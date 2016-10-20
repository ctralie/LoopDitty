//Purpose: Code for dealing with SoundCloud and processing features


//A function to show a progress bar
var loading = false;
var loadString = "Loading";
var loadColor = "yellow";
var ndots = 0;
function changeLoad() {
    if (!loading) {
        changeReady();
        return;
    }
    var s = "<h3><font color = \"" + loadColor + "\">" + loadString;
    for (var i = 0; i < ndots; i++) {
        s += ".";
    }
    s += "</font></h3>";
    waitingDisp.innerHTML = s;
    if (loading) {
        ndots = (ndots + 1)%6;
        setTimeout(changeLoad, 500);
    }
}
function changeReady() {
    loading = false;
    waitingDisp.innerHTML = "<h3><font color = \"green\">Ready</font></h3>";
}


//Parameters for doing PCA on music
var MusicParams = {TimeWin:3.5, usingMFCC:true, usingChroma:true, usingCentroid:true, usingRoloff:true, usingFlux:true, usingZeroCrossings:true, sphereNormalize:false};

var results = null;


//        res = {'hopSize':s.hopSize, 'Fs':s.Fs, 'MFCC':pretty_floats(MFCC.tolist()), 'Chroma':pretty_floats(Chroma.tolist()), 'Centroid':pretty_floats(Centroid.tolist()), 'Roloff':pretty_floats(Roloff.tolist()), 'Flux':pretty_floats(Flux.tolist()), 'ZeroCrossings':pretty_floats(ZeroCrossings.tolist())}
//This function assumes that numericjs has been loaded
function getDelaySeriesPCA() {
    var hopSize = parseFloat(results.hopSize);
    var Fs = parseFloat(results.Fs);
    var hopSizeSec = hopSize/Fs;
    var NIn = results.Flux[0].length;
    if (NIn == 0) {
        return;
    }
    
    //First figure out how many dimensions there are
    var dim = 0;
    if (MusicParams.usingMFCC) {
        dim += results.MFCC.length;
    }
    if (MusicParams.usingChroma) {
        dim += results.Chroma.length;
    }
    if (MusicParams.usingRoloff) {
        dim++;
    }
    if (MusicParams.usingFlux) {
        dim++;
    }
    if (MusicParams.usingZeroCrossings) {
        dim++;
    }
    
    //Pre-allocate space for input and output arrays
    var Segs = numeric.rep([NIn, dim], 0);

    //Step 1: Loop through and copy all of the fields into the segments
    var i = 0;
    var j = 0;
    var k = 0;
    for (i = 0; i < NIn; i++) {
        j = 0;
        if (MusicParams.usingMFCC) {
            for (k = 0; k < results.MFCC.length; k++) {
                Segs[i, j] = parseFloat(results.MFCC[k][i]);
                j++;
            }
        }
        if (MusicParams.usingChroma) {
            for (k = 0; k < results.Chroma.length; k++) {
                Segs[i, j] = parseFloat(results.MFCC[k][i]);
                j++;
            }
        }
        if (MusicParams.usingRoloff) {
            Segs[i, j] = parseFloat(results.Roloff[0][i]);
            j++;
        }
        if (MusicParams.usingFlux) {
            Segs[i, j] = parseFloat(results.Flux[0][i]);
            j++;
        }
        if (MusicParams.usingZeroCrossings) {
            Segs[i, j] = parseFloat(results.ZeroCrossings[0][i]);
            j++;
        }
    }

    //Step 2: Loop through and take the average and standard deviation
    //of each feature in a window
    
    //Allocate output variables
    var Win = Math.floor(MusicParams.TimeWin/hopSizeSec);
    Win = Math.max(Win, 2);
    var NOut = NIn - Win + 1;
    var X = numeric.rep([NOut, dim*2], 0);
    var tout = numeric.rep([NOut], 0);
    for (i = 0; i < NOut; i++) {
        tout[i] = hopSizeSec*i;
        //Compute means
        for (j = i; j < i+Win; j++) {
            for (k = 0; k < dim; k++) {
                X[i][k] = X[i][k] + Segs[j][k];
            }
        }
        for (k = 0; k < dim; k++) {
            X[i][k] = X[i][k]/Win;
        }
    }
    for (i = 0; i < NOut; i++) {
        //Compute standard deviations
        for (j = i; j < i+Win; j++) {
            for (k = 0; k < dim; k++) {
                X[i][k+dim] += (X[i][k] - Segs[j][k])*(X[i][k] - Segs[j][k]);
            }
        }
        for (k = 0; k < dim; k++) {
            X[i][k+dim] = Math.sqrt(X[i][k+dim]/(Win-1));
        }
    }
    
    //Step 3: Compute and subtract off mean of each dimension
    var mean = numeric.rep([dim*2], 0);
    for (i = 0; i < NOut; i++) {
        for (k = 0; k < dim*2; k++) {
            mean[k] += X[i][k];
        }
    }
    for (var k = 0; k < dim*2; k++) {
        mean[k] /= NOut;
    }
    for (i = 0; i < NOut; i++) {
        for (k = 0; k < dim*2; k++) {
            X[i][k] -= mean[k];
        }
    }
    
    //Step 4: Compute standard deviation and scale every component
    var std = numeric.rep([dim*2], 0);
    for (i = 0; i < NOut; i++) {
        for (k = 0; k < dim*2; k++) {
            std[k] += (X[i][k]-mean[k])*(X[i][k]-mean[k]);
        }
    }
    for (k = 0; k < dim*2; k++) {
        std[k] = numeric.sqrt([std[k]/(NOut-1)])[0];
    }
    for (i = 0; i < NOut; i++) {
        for (k = 0; k < dim*2; k++) {
            X[i][k] /= std[k];
        }
    }    
    
    //Step 5: Do PCA
    B = numeric.dot(numeric.transpose(X), X);
    E = numeric.eig(B).E.x;
    X = numeric.dot(X, E);
    
    //Step 6: Store the first 3 principal components, and make the 4th
    //component the time of occurrence
    Y = numeric.rep([NOut, 4], 0);
    for (i = 0; i < NOut; i++) {
        for (k = 0; k < 3; k++) {
            Y[i][k] = X[i][k];
        }
        Y[i][3] = tout[i];
    }
    
    //Step 7: Subtract off mean and scale by standard deviation of each 
    //component in the projected space
    var mean = numeric.rep([3], 0);
    for (i = 0; i < NOut; i++) {
        for (k = 0; k < 3; k++) {
            mean[k] += Y[i][k];
        }
    }
    for (i = 0; i < NOut; i++) {
        for (k = 0; k < 3; k++) {
            Y[i][k] -= mean[k]/NOut;
        }
    }
    var std = numeric.rep([3], 0);
    for (i = 0; i < NOut; i++) {
        for (k = 0; k < 3; k++) {
            std[k] += (Y[i][k]-mean[k])*(Y[i][k]-mean[k]);
        }
    }
    for (k = 0; k < 3; k++) {
        std[k] = numeric.sqrt([std[k]/(NOut-1)])[0];
    }
    for (i = 0; i < NOut; i++) {
        for (k = 0; k < 3; k++) {
            Y[i][k] /= std[k];
        }
    }        
    
    return Y;
}


function outputSegments(X) {
    var pagestatus = document.getElementById("pagestatus");
    var str = "";
    var i;
    var j;
    for (i = 0; i < X.length; i++) {
        for (j = 0; j < X[i].length; j++) {
            str = str + X[i][j] + ",";
        }
        str = str + "<BR>\n";
    }
    pagestatus.innerHTML = str;
}

function processSoundcloudResults(res) {
    results = res;
    //Update soundcloud widget with this song
    var scurl = document.getElementById("scurl").value;

    //Load analysis data from echo nest
    var pagestatus = document.getElementById("pagestatus");
    loadString = "Computing 3D projection";
    loadColor = "yellow"
    var X = getDelaySeriesPCA();
    loadString = "Allocating GL buffers";
    initGLBuffers(X);//Initialize the GL buffers    
    loadString = "Loading audio";
    //TODO: Load audio buffer from mp3 file
    loading = false;
}


function setHeader(xhr) {
    xhr.setRequestHeader('Content-Type', 'text/plain');
}

function querySoundCloudURL() {
    var pagestatus = document.getElementById("pagestatus");
    loadString = "Grabbing data from server (this may take a moment)";
    loadColor = "red";
    loading = true;
    changeLoad();
    var scurl = document.getElementById("scurl").value;
    $.ajax({
      //url:  'http://loopditty.herokuapp.com/',
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

//Preset Examples
function queryMichaelJackson() {
    var scurl = document.getElementById("scurl");
    scurl.value = "https://soundcloud.com/murray-feiss-tall-man/michael-jackson-bad";
    querySoundCloudURL();
}

function queryHudsonMohawke() {
    var scurl = document.getElementById("scurl");
    scurl.value = "https://soundcloud.com/hudsonmohawke/demouse";
    querySoundCloudURL();
}

function queryChiddyBang() {
    var scurl = document.getElementById("scurl");
    scurl.value = "https://soundcloud.com/chiddy-bang/kids-feat-mgmt-1";
    querySoundCloudURL();
}

function queryTI() {
    var scurl = document.getElementById("scurl");
    scurl.value = "https://soundcloud.com/steven-schon/ti-what-you-know-about-that-w-lyrics";
    querySoundCloudURL();
}

function queryBodyLanguage() {
    var scurl = document.getElementById("scurl");
    scurl.value = "https://soundcloud.com/bodylanguage/just-because";
    querySoundCloudURL();
}

function queryDJNappy() {
    var scurl = document.getElementById("scurl");
    scurl.value = "https://soundcloud.com/doandroidsdance/go-dj-nappy-vs-benga-thugstep";
    querySoundCloudURL();
}

function queryDuranDuran() {
    var scurl = document.getElementById("scurl");
    scurl.value = "https://soundcloud.com/windmaker100/duran-duran-rio";
    querySoundCloudURL();
}

function queryMissyElliot() {
    var scurl = document.getElementById("scurl");
    scurl.value = "https://soundcloud.com/as-sbj/missy-elliot-lose-control";
    querySoundCloudURL();
}

function queryWizKhalifa() {
    var scurl = document.getElementById("scurl");
    scurl.value = "https://soundcloud.com/wiz-khalifa-7/work-hard-play-hard";
    querySoundCloudURL();
}

function queryEWF() {
    var scurl = document.getElementById("scurl");
    scurl.value = "https://soundcloud.com/nattaliaramos/september-earth-wind-and-fire";
    querySoundCloudURL();
}

function queryAerosmith() {
    var scurl = document.getElementById("scurl");
    scurl.value = "https://soundcloud.com/irealmar/sweet-emotion-aerosmith";
    querySoundCloudURL();
}

function queryRollingStones() {
    var scurl = document.getElementById("scurl");
    scurl.value = "https://soundcloud.com/tataflorentino/the-rolling-stones-sympathy";
    querySoundCloudURL();
}

function queryDiannaRoss() {
    var scurl = document.getElementById("scurl");
    scurl.value = "https://soundcloud.com/thewhitekeys/upside-down-diana-ross-2013";
    querySoundCloudURL();
}

function queryBeeGees() {
    var scurl = document.getElementById("scurl");
    scurl.value = "https://soundcloud.com/musicmetalape/bee-gees-stayin-alive-1";
    querySoundCloudURL();
}

function queryTchaikovsky() {
    var scurl = document.getElementById("scurl");
    scurl.value = "https://soundcloud.com/msaly/tchaikovsky-valse-sentimentale";
    querySoundCloudURL();
}

function queryMotorhead() {
    var scurl = document.getElementById("scurl");
    scurl.value = "https://soundcloud.com/immy619/motorhead-ace-of-spades-1";
    querySoundCloudURL();
}

function queryBigSean() {
    var scurl = document.getElementById("scurl");
    scurl.value = "https://soundcloud.com/bigsean-1/10-high-feat-wiz-khalifa";
    querySoundCloudURL();
}

function queryWillSmith() {
    var scurl = document.getElementById("scurl");
    scurl.value = "https://soundcloud.com/houseandelectro/will-smith-miami";
    querySoundCloudURL();
}

function queryAlienAntFarm() {
    var scurl = document.getElementById("scurl");
    scurl.value = "https://soundcloud.com/yangstar89/alien-ant-farm-movies";
    querySoundCloudURL();
}

function queryVanillaIce() {
    var scurl = document.getElementById("scurl");
    scurl.value = "https://soundcloud.com/cleopatra-recs/vanilla-ice-ice-ice-baby";
    querySoundCloudURL();
}

function querySugarhillGang() {
    var scurl = document.getElementById("scurl");
    scurl.value = "https://soundcloud.com/maata808/sugarhill-gang-apache-jump-on-it";
    querySoundCloudURL();
}

function queryTheBeatles() {
    var scurl = document.getElementById("scurl");
    scurl.value = "https://soundcloud.com/narzo-fernandez-maldonado-sanabria/the-beatles-let-it-be-live";
    querySoundCloudURL();
}

function queryThePixies() {
    var scurl = document.getElementById("scurl");
    scurl.value = "https://soundcloud.com/whitewives/where-is-my-mind-the-pixies";
    querySoundCloudURL();
}

function queryKevinLyttle() {
    var scurl = document.getElementById("scurl");
    scurl.value = "https://soundcloud.com/usuario134/106-kevin-lyttle-turn-me-on";
    querySoundCloudURL();
}

function queryPeterGabriel() {
    var scurl = document.getElementById("scurl");
    scurl.value = "https://soundcloud.com/neoneoptery/peter-gabriel-red-rain";
    querySoundCloudURL();
}
