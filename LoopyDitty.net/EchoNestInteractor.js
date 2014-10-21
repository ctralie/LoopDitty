//Code for dealing with echo nest and SoundCloud
//https://soundcloud.com/lebronkb24/lil-wayne-ft-robin-thicke-shooter 
//https://soundcloud.com/chiddy-bang/fresh-like-us
//https://soundcloud.com/chiddy-bang/kids-feat-mgmt-1
//https://soundcloud.com/bodylanguage/raleigh-nc
//https://soundcloud.com/cleopatra-recs/ready-for-the-world-oh-sheila
//https://soundcloud.com/wiz-khalifa-7/work-hard-play-hard
//https://soundcloud.com/lilmo_rep_the_y187/3-6-mafia-i-gotta-stay-fly-ft-young-buck-8ball-mjg
//https://soundcloud.com/chris-finn-3/wale-clappers-feat-juicy-j
//https://soundcloud.com/steven-schon/ti-what-you-know-about-that-w-lyrics
//https://soundcloud.com/mariano-a-pina/soulja-boy-turn-my-swag-on

//TODO: Make these input variables
var TimeWin = 5;
var TimeHop = 0.2;
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
		while ( (times[li] < tout[i] ) && (li < NIn - 1) ) {
			li++;
		}
		li = li - 1;
		if (li < 0) {
			li = 0;
		}
		while ( (times[ri] < tout[i] ) + (TimeWin && ri < NIn - 1) ) {
			ri++;
		}
		for (j = li; j <= ri; j++) {
			weight = numeric.exp([-(tout[i] -times[j])*(tout[i] -times[j])/(TimeWin*TimeWin)])[0];
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
	for (i = 0; i < NOut; i++) {
		for (k = 0; k < 24; k++) {
			X[i][k] -= mean[k]/NOut;
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
	
	//Step 7: Linearly interpolate to make it smoother
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
