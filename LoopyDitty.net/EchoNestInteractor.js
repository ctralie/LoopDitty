//Code for dealing with echo nest and SoundCloud

//TODO: Make these input variables
var TimeWin = 3.5;
var TimeHop = 0.1;
var blowupFac = 10;//How many samples to linearly interpolate between

//This function assumes that numericjs has been loaded
function getSegmentsPCA(results) {
	var segments = results.segments;
	var NIn = segments.length;
	if (NIn == 0) {
		return;
	}
	
	//Pre-allocate space for input and output arrays
	//12 timbre + 12 pitch = 24
	var Segs = numeric.rep([NIn, 24], 0);
	var times = numeric.rep([NIn], 0);
	times[0] = parseFloat(segments[0].duration);

	//Step 1: Loop through the segments and place the cumulative sum
	//of the durations and the pitch/timbral features in one array
	var i = 0;
	var j = 0;
	var k = 0;
	var str = "";
	for (i = 0; i < segments.length; i++) {
		var seg = segments[i];
		for (j = 0; j < 12; j++) {
			Segs[i][j] = parseFloat(seg.timbre[j]);
			Segs[i][j+12] = parseFloat(seg.pitches[j]);
		}
		if (i > 0) {
			times[i] = times[i-1] + parseFloat(seg.duration);
		}
	}

	//Step 2: Loop through and average features within each window	
	//Allocate output variables
	var NOut = numeric.floor([(times[NIn-1] - TimeWin)/TimeHop])[0];
	var X = numeric.rep([NOut, 24], 0);
	var tout = numeric.rep([NOut], 0);
	var li = 0
	var ri = 0;
	var weightSum = 0;
	var weight = 0;
	for (i = 0; i < NOut; i++) {
		tout[i] = TimeHop*i;
		weightSum = 0;
		while ( (times[li] < tout[i] - TimeWin ) && (li < NIn - 1) ) {
			li++;
		}
		li = li - 1;
		if (li < 0) {
			li = 0;
		}
		while ( (times[ri] < (tout[i] + TimeWin) && ri < NIn - 1) ) {
			ri++;
		}
		for (j = li; j <= ri; j++) {
			weight = numeric.exp([-(tout[i] -times[j])*(tout[i] -times[j])/(TimeWin*TimeWin*2)])[0];
			weightSum = weightSum + weight;
			for (k = 0; k < 24; k++) {
				X[i][k] = X[i][k] + weight*Segs[j][k];
			}
		}
		for (k = 0; k < 24; k++) {
			X[i][k] = X[i][k]/weightSum;
		}
	}
	
	//Step 3: Compute and subtract off mean
	var mean = numeric.rep([24], 0);
	for (i = 0; i < NOut; i++) {
		for (k = 0; k < 24; k++) {
			mean[k] += X[i][k];
		}
	}
	for (var k = 0; k < 24; k++) {
	    mean[k] /= NOut;
	}
	for (i = 0; i < NOut; i++) {
		for (k = 0; k < 24; k++) {
			X[i][k] -= mean[k];
		}
	}
	
	//Step 4: Compute standard deviation and scale every component
	var std = numeric.rep([24], 0);
	for (i = 0; i < NOut; i++) {
		for (k = 0; k < 24; k++) {
			std[k] += (X[i][k]-mean[k])*(X[i][k]-mean[k]);
		}
	}
	for (k = 0; k < 24; k++) {
		std[k] = numeric.sqrt([std[k]/(NOut-1)])[0];
	}
	for (i = 0; i < NOut; i++) {
		for (k = 0; k < 24; k++) {
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
	
	
	//Step 8: Linearly interpolate to make it smoother
	var ret = numeric.rep([(NOut-1)*blowupFac+1, 4]);
	var dt;
	for (i = 0; i < NOut-1; i++) {
		for (j = 0; j < blowupFac; j++) {
			dt = (1.0*j)/blowupFac;
			for (k = 0; k < 4; k++) {
				ret[i*blowupFac + j][k] = dt*Y[i+1][k] + (1-dt)*Y[i][k];
			}
		}
	}
	for (k = 0; k < 4; k++) {
		ret[ret.length-1][k] = Y[Y.length-1][k];
	}
	return ret;
}

function getEchoNestSongInfo(track) {
	var trackinfo = document.getElementById("trackinfo");
	var title = "Unknown";
	var artist = "Unknown";
	str = "<table><tr><td>";
	if (track.hasOwnProperty('release_image')) {
		str += "<img src = " + track.release_image + ">";
	}
	if (track.hasOwnProperty('title')) {
		title = track.title;
	}
	if (track.hasOwnProperty('artist')) {
		artist = track.artist;
	}
	str += "</td><td><table><tr><td><h3>Title</h3></td><td><h3>" + title + "</h3></td></tr>";
	str += "<tr><td><h3>Artist</h3></td><td><h3>" + artist + "</h3></td></tr>";
	str += "</table></td></tr></table>";
	trackinfo.innerHTML = str;
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

function getSegmentsText(results) {
	//Update soundcloud widget with this song
	var scurl = document.getElementById("scurl").value;
    var widgetIframe = document.getElementById('sc-widget'),
        widget       = SC.Widget(widgetIframe);
    widget.load(scurl, {});
    
    //Load analysis data from echo nest
	var pagestatus = document.getElementById("pagestatus");
	pagestatus.innerHTML = "Computing 3D projection...";
	var X = getSegmentsPCA(results);
	pagestatus.innerHTML = "Allocating GL buffers...";
	initGLBuffers(X);//Initialize the GL buffers
	pagestatus.innerHTML = "Finished!!";
	//getEchoNestSongInfo(results.track);
	//outputSegments(X);
}


function setHeader(xhr) {
	xhr.setRequestHeader('Content-Type', 'text/plain');
}

function querySoundCloudURL() {
	var pagestatus = document.getElementById("pagestatus");
	pagestatus.innerHTML = "Grabbing Data from SoundCloud (this may take a moment)...";
	var scurl = document.getElementById("scurl").value;
    $.ajax({
      url:  'http://fast-river-6374.herokuapp.com/',
      type: 'GET',
      data: {url: scurl},
      dataType: 'json',
      success: getSegmentsText,
      error: function (xhr, ajaxOptions, thrownError) {
        alert(xhr.status);
        alert(thrownError);
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
