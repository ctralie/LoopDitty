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

var ECHONESTKEY = "ECTXVZVAD1IMVG2DA";
var retryCount = 5;
var retryInterval = 3000;

//TODO: Make these input variables
var TimeWin = 5;
var TimeHop = 0.05;

//This function assumes that numericjs has been loaded
function getSegmentsPCA(track) {
	console.log("Getting segments PCA");
	var NIn = track.analysis.segments.length;
	if (NIn == 0) {
		return;
	}
	
	//Pre-allocate space for input and output arrays
	//12 timbre + 12 pitch = 24
	var Segs = numeric.rep([NIn, 24], 0);
	var times = numeric.rep([NIn], 0);
	times[0] = parseFloat(track.analysis.segments[0].duration);

	//Step 1: Loop through the segments and place the cumulative sum
	//of the durations and the pitch/timbral features in one array
	var i = 0;
	var j = 0;
	var k = 0;
	var str = "";
	for (i = 0; i < track.analysis.segments.length; i++) {
		var seg = track.analysis.segments[i];
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
	ret = numeric.rep([NOut, 4], 0);
	for (i = 0; i < NOut; i++) {
		for (k = 0; k < 3; k++) {
			ret[i][k] = X[i][k];
		}
		ret[i][3] = tout[i];
	}
	return ret;
}


//This function assumes that numericjs has been loaded
function getSegmentsOnly(track) {
	var NIn = track.analysis.segments.length;
	if (NIn == 0) {
		return;
	}
	
	//Pre-allocate space for input and output arrays
	//12 timbre + 12 pitch = 24
	//Last dimension used to store timestamp
	var Segs = numeric.rep([NIn, 25], 0);
	var times = numeric.rep([NIn], 0);
	times[0] = parseFloat(track.analysis.segments[0].duration);

	console.log("Doing step 1...");
	//Step 1: Loop through the segments and place the cumulative sum
	//of the durations and the pitch/timbral features in one array
	var i = 0;
	var j = 0;
	var k = 0;
	var str = "";
	for (i = 0; i < track.analysis.segments.length; i++) {
		var seg = track.analysis.segments[i];
		for (j = 0; j < 12; j++) {
			Segs[i][j] = seg.timbre[j];
			Segs[i][j+12] = seg.pitches[j];
		}
		if (i > 0) {
			times[i] = times[i-1] + parseFloat(seg.duration);
			Segs[i][25] = times[i];
		}
	}
	return Segs;
}

<!--Copied and modified from echo nest remix!-->
function getSegmentsText(track) {
	var X = getSegmentsPCA(track);
	var infoid = document.getElementById("info");
	var text = "";
	var i = 0;
	var j = 0;
	for (i = 0; i < X.length; i++ ) {
		for (j = 0; j < X[i].length; j++) {
			text += X[i][j] + " ";
		}
		text += "<BR>\n";
	}
	infoid.innerHTML = text;
	
	/*X = getSegmentsOnly(track);
	var originalid = document.getElementById("original");
	text = "";
	for (i = 0; i < X.length; i++ ) {
		for (j = 0; j < X[i].length; j++) {
			text += X[i][j] + " ";
		}
		text += "<BR>\n";
	}
	originalid.innerHTML = text;*/
}

function lookForAnalysis(trackID) {
    var url = 'http://developer.echonest.com/api/v4/track/profile?format=json&bucket=audio_summary';
    var track;
    
	$.getJSON(url, {id:trackID, api_key:ECHONESTKEY}, function(data) {
		var analysisURL = data.response.track.audio_summary.analysis_url;
		track = data.response.track;
		
		// This call is proxied through the yahoo query engine.  
		// This is temporary, but works.
		$.getJSON("http://query.yahooapis.com/v1/public/yql", 
			{ q: "select * from json where url=\"" + analysisURL + "\"", format: "json"}, 
			function(data) {
				if (data.query.results != null) {
					track.analysis = data.query.results.json;
					console.log("Got analysis");
					getSegmentsText(track);
				}
				else {
					retryCount = retryCount - 1;
					retryInterval = retryInterval + 1000;
					if (retryCount > 0) {
						console.log('Analysis pending, trying again')
						setTimeout(function () {
							lookForAnalysis(trackID);
						}, retryInterval);
					} else {
						console.log('error', 'No analysis data returned:  try again, or try another trackID');   
					}
				}
		}); // end yahoo proxy getJson
	});
} // end lookForAnalysis
<!--End copy and modify from echo nest remix!-->


var getEchoNestSongInfo = function(results) {
	var info = document.getElementById("info");
	var track = results.response.track;
	info.innerHTML = track.artist + "<BR><a href = \"" + track.preview_url + "\">preview</a><BR>" + "<img src = " + track.release_image + "><BR>" + track.song_id;
};

var getTRID = function(results) {
	var trackid = document.getElementById("trackid");
	trackid.innerHTML = results.trid;
	retryCount = 5;
	retryInterval = 2000;
	lookForAnalysis(results.trid);
	
	/*jQuery.getJSON('http://developer.echonest.com/api/v4/track/profile',
		{
			id: results.trid,
			api_key: ECHONESTKEY,
			bucket: "audio_summary",
		}, 
		getEchoNestSongInfo
	);*/
		
};

function loadSongUrl() {
	var url = document.getElementById("urlin").value;

    jQuery.getJSON('http://labs.echonest.com/SCAnalyzer/analyze',
        {
            id:url,
        },
		getTRID
    );
}
