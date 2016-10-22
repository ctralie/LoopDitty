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
var MusicParams = {TimeWin:3.5, usingMFCC:true, usingChroma:true, usingCentroid:true, usingRoloff:true, usingFlux:true, usingZeroCrossings:true, sphereNormalize:false, usingDerivatives:false};

var musicFeatures = null;


//        res = {'hopSize':s.hopSize, 'Fs':s.Fs, 'MFCC':pretty_floats(MFCC.tolist()), 'Chroma':pretty_floats(Chroma.tolist()), 'Centroid':pretty_floats(Centroid.tolist()), 'Roloff':pretty_floats(Roloff.tolist()), 'Flux':pretty_floats(Flux.tolist()), 'ZeroCrossings':pretty_floats(ZeroCrossings.tolist())}
//This function assumes that numericjs has been loaded
function getDelaySeriesPCA() {
    loadString = "Computing 3D projection";
    loadColor = "yellow";
    var hopSize = parseFloat(musicFeatures.hopSize);
    var Fs = parseFloat(musicFeatures.Fs);
    var hopSizeSec = hopSize/Fs;
    var NIn = musicFeatures.Flux[0].length;
    if (NIn == 0) {
        return;
    }
    
    //First figure out how many dimensions there are
    var dim = 0;
    if (MusicParams.usingMFCC) {
        dim += musicFeatures.MFCC.length;
    }
    if (MusicParams.usingChroma) {
        dim += musicFeatures.Chroma.length;
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
    loadString = "Copying Fields / Computing Derivatives";
    var Segs = numeric.rep([NIn, dim*2], 0);

    //Step 1: Loop through and copy all of the fields into the segments
    var i = 0;//Used to index window
    var j = 0;//Used to index delay
    var k = 0;//Used to index dimension
    for (i = 0; i < NIn; i++) {
        j = 0;
        if (MusicParams.usingMFCC) {
            for (k = 0; k < musicFeatures.MFCC.length; k++) {
                Segs[i][j] = parseFloat(musicFeatures.MFCC[k][i]);
                j++;
            }
        }
        if (MusicParams.usingChroma) {
            for (k = 0; k < musicFeatures.Chroma.length; k++) {
                Segs[i][j] = parseFloat(musicFeatures.MFCC[k][i]);
                j++;
            }
        }
        if (MusicParams.usingRoloff) {
            Segs[i][j] = parseFloat(musicFeatures.Roloff[0][i]);
            j++;
        }
        if (MusicParams.usingFlux) {
            Segs[i][j] = parseFloat(musicFeatures.Flux[0][i]);
            j++;
        }
        if (MusicParams.usingZeroCrossings) {
            Segs[i][j] = parseFloat(musicFeatures.ZeroCrossings[0][i]);
            j++;
        }
    }
    
    //Step 2: Compute magnitude discrete derivatives along each dimension
    //and put them in the second half of the dimensions (cumulative sum
    //of these is like total variation)
    for (i = 0; i < NIn-1; i++) {
        for (k = 0; k < dim; k++) {
            Segs[i][dim+k] = Math.abs(Segs[i+1][k] - Segs[i][k]);
        }
    }
    dim = dim*2; //From now on, there are twice as many dimensions
    //(raw feature and derivative)

    
    //Step 3: Loop through and take the average of the normal and 
    //derivative features in the window
    loadString = "Computing block means";
    //Allocate output variables
    var Win = Math.floor(MusicParams.TimeWin/hopSizeSec);
    Win = Math.max(Win, 2);
    var NOut = NIn - Win + 1;
    var X = numeric.rep([NOut, dim], 0);
    var tout = numeric.rep([NOut], 0);
    //Variables used for fast cumulative sums with mean
    var cumsum = numeric.rep([dim], 0);
    //Setup for sliding window average
    for (j = 0; j < Win; j++) {
        for (k = 0; k < dim; k++) {
            cumsum[k] += Segs[j][k];
        }
    }
    //Compute the first mean
    for (k = 0; k < dim; k++) {
        X[0][k] = cumsum[k] / Win;
    }
    
    //Compute the rest of the means
    for (i = 1; i < NOut; i++) {
        tout[i] = hopSizeSec*i;
        //Subtract off oldest part and add newest part
        //to get new sliding window sum
        for (k = 0; k < dim; k++) {
            cumsum[k] -= Segs[i-1][k];
            cumsum[k] += Segs[i+Win-1][k];
            X[i][k] = cumsum[k] / Win;
        }
    }
    
    //Step 4: Compute and subtract off mean of each dimension
    loadString = "Normalizing";
    var mean = numeric.rep([dim], 0);
    for (i = 0; i < NOut; i++) {
        for (k = 0; k < dim; k++) {
            mean[k] += X[i][k];
        }
    }
    for (var k = 0; k < dim; k++) {
        mean[k] /= NOut;
    }
    for (i = 0; i < NOut; i++) {
        for (k = 0; k < dim; k++) {
            X[i][k] -= mean[k];
        }
    }
    
    //Step 5: Compute standard deviation and scale every component
    var std = numeric.rep([dim], 0);
    for (i = 0; i < NOut; i++) {
        for (k = 0; k < dim; k++) {
            std[k] += X[i][k]*X[i][k];
        }
    }
    for (k = 0; k < dim; k++) {
        std[k] = Math.sqrt(std[k]/(NOut-1));
        if (std[k] <= 0) {
            std[k] = 1; //Prevent divide by zero
        }
    }
    for (i = 0; i < NOut; i++) {
        for (k = 0; k < dim; k++) {
            X[i][k] /= std[k];
        }
    }
    
    //Step 5.5: If the user so chooses, do sphere normalization
    //TODO: Finish this
    
    //Step 6: Do PCA
    loadString = "Computing PCA";
    //NOTE: It's possible to have 3 or fewer features based on user
    //choices, in which case PCA can be skipped
    if (dim > 3) { 
        X = doPCA(X, 3, 100);
    }
    
    //Step 7: Store the first 3 principal components, and make the 4th
    //component the time of occurrence
    Y = numeric.rep([NOut, 4], 0);
    for (i = 0; i < NOut; i++) {
        for (k = 0; k < X[i].length; k++) {
            Y[i][k] = X[i][k];
        }
        Y[i][3] = tout[i];
    }
    
    //Step 8: Subtract off mean and scale by standard deviation of each 
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
        std[k] = Math.sqrt(std[k]/(NOut-1));
        if (std[k] == 0) {
            std[k] = 1;
        }
    }
    for (i = 0; i < NOut; i++) {
        for (k = 0; k < 3; k++) {
            Y[i][k] /= std[k];
        }
    }
    loadString = "Initializing OpenGL";
    initGLBuffers(Y);
    loading = false;
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
    musicFeatures = res;
    //Update soundcloud widget with this song
    var scurl = document.getElementById("scurl").value;

    //Load analysis data from echo nest
    setTimeout(getDelaySeriesPCA, 1);
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
