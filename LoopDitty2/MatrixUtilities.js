//https://thiscouldbebetter.wordpress.com/2012/12/18/loading-editing-and-saving-a-text-file-in-html5-using-javascrip/
function destroyClickedElement(event)
{
    document.body.removeChild(event.target);
}

//Function for exporting matrix to a text file for debugging
function saveMatrix(X, filename)
{
    var textToSave = "";
    for (var i = 0; i < X.length; i++) {
        for (var j = 0; j < X[i].length; j++) {
            textToSave += X[i][j] + " ";
        }
        textToSave += "\n";
    }
    var textToSaveAsBlob = new Blob([textToSave], {type:"text/plain"});
    var textToSaveAsURL = window.URL.createObjectURL(textToSaveAsBlob);
 
    var downloadLink = document.createElement("a");
    downloadLink.download = filename;
    downloadLink.innerHTML = "Download File";
    downloadLink.href = textToSaveAsURL;
    downloadLink.onclick = destroyClickedElement;
    downloadLink.style.display = "none";
    document.body.appendChild(downloadLink);
 
    downloadLink.click();
}

//Simple implementation of the power method
function getDominantEigenvector(A, NIters) {
    var dim = A[0].length;
    var V = numeric.random([dim, 1]);
    var iter;
    var k;
    var norm = 0;
    //Now, do iteration
    for (iter = 0; iter < NIters; iter++) {
        V = numeric.dot(A, V);
        norm = 0.0;
        for (k = 0; k < dim; k++) {
            norm += V[k][0]*V[k][0];
        }
        norm = Math.sqrt(norm);
        for (k = 0; k < dim; k++) {
            V[k][0] /= norm;
        }
    }
    return V;
}


function doPCA(X, num, NIters) {
    var N = X.length;
    var dim = X[0].length;
    num = Math.min(num, dim);
    var Y = numeric.clone(X);
    var res = numeric.rep([N, num], 0.0);
    var A;
    var V;
    var proj;
    for (var j = 0; j < num; j++) {
        A = numeric.dot(numeric.transpose(Y), Y);
        V = getDominantEigenvector(A, NIters);
        proj = numeric.dot(X, V);
        for (var i = 0; i < N; i++) {
            //Copy over projection as the j^th coordinate
            res[i][j] = proj[i][0]; 
            //Now subtract off the projection
            for (var k = 0; k < dim; k++) {
                Y[i][k] -= proj[i][0]*V[k][0];
            }
        }
    }
    return res;
}

function mat4Str(m) {
	var str = "";
	for (var i = 0; i < 16; i++) {
		var col = i%4;
		var row = (i-col)/4;
		if (row > 0 && col == 0) {
			str += "\n";
		}
		str += m[col*4+row].toFixed(2) + " ";
	}
	return str;
}

