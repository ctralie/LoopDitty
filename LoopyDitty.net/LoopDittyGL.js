var gl;

function initGL(canvas) {
    try {
        gl = canvas.getContext("experimental-webgl");
        gl.viewportWidth = canvas.width;
        gl.viewportHeight = canvas.height;
    } catch (e) {
    }
    if (!gl) {
        alert("Could not initialise WebGL, sorry :-(");
    }
}


//Type 0: Fragment shader, Type 1: Vertex Shader
function getShader(gl, str, type) {
	var xmlhhtp;
    var shader;
    if (type == 0) {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (type == 1) {
        shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
        return null;
    }
	
    gl.shaderSource(shader, str);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(gl.getShaderInfoLog(shader));
        return null;
    }

    return shader;
}


var shaderProgram;

function initShaders() {
	var str = "precision mediump float;\n";
	str = str + "varying vec4 fColor;\n";
	str = str + "void main(void) {\n";
	str = str + "gl_FragColor = fColor;\n";
	str = str + "}\n\n";
    var fragmentShader = getShader(gl, str, 0);
    
    str = "attribute vec3 vPos;\n";
    str = str + "attribute vec4 vColor;\n";
	str = str + "uniform mat4 uMVMatrix;\n";
	str = str + "uniform mat4 uPMatrix;\n";
	str = str + "varying vec4 fColor;\n";
	str = str + "void main(void) {\n";
	str = str + "gl_PointSize = 5.0;\n";
    str = str + "gl_Position = uPMatrix * uMVMatrix * vec4(vPos, 1.0);\n";
    str = str + "fColor = vColor;\n";
	str = str + "}";
    var vertexShader = getShader(gl, str, 1);

    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert("Could not initialise shaders");
    }

    gl.useProgram(shaderProgram);

    shaderProgram.vPosAttrib = gl.getAttribLocation(shaderProgram, "vPos");
    gl.enableVertexAttribArray(shaderProgram.vPosAttrib);

    shaderProgram.vColorAttrib = gl.getAttribLocation(shaderProgram, "vColor");
    gl.enableVertexAttribArray(shaderProgram.vColorAttrib);

    shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
    shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
}


var mvMatrix = mat4.create();
var mvMatrixStack = [];
var pMatrix = mat4.create();

function mvPushMatrix() {
    var copy = mat4.create();
    mat4.set(mvMatrix, copy);
    mvMatrixStack.push(copy);
}

function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
        throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}


function setMatrixUniforms() {
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}


function degToRad(degrees) {
    return degrees * Math.PI / 180;
}



var COLORMAP = [0.208100000000000,0.166300000000000,0.529200000000000,0.211623809523810,0.189780952380952,0.577676190476191,0.212252380952381,0.213771428571429,0.626971428571429,0.208100000000000,0.238600000000000,0.677085714285714,0.195904761904762,0.264457142857143,0.727900000000000,0.170728571428571,0.291938095238095,0.779247619047619,0.125271428571429,0.324242857142857,0.830271428571429,0.0591333333333334,0.359833333333333,0.868333333333333,0.0116952380952381,0.387509523809524,0.881957142857143,0.00595714285714286,0.408614285714286,0.882842857142857,0.0165142857142857,0.426600000000000,0.878633333333333,0.0328523809523810,0.443042857142857,0.871957142857143,0.0498142857142857,0.458571428571429,0.864057142857143,0.0629333333333333,0.473690476190476,0.855438095238095,0.0722666666666667,0.488666666666667,0.846700000000000,0.0779428571428572,0.503985714285714,0.838371428571429,0.0793476190476190,0.520023809523810,0.831180952380952,0.0749428571428571,0.537542857142857,0.826271428571429,0.0640571428571428,0.556985714285714,0.823957142857143,0.0487714285714286,0.577223809523810,0.822828571428572,0.0343428571428572,0.596580952380952,0.819852380952381,0.0265000000000000,0.613700000000000,0.813500000000000,0.0238904761904762,0.628661904761905,0.803761904761905,0.0230904761904762,0.641785714285714,0.791266666666667,0.0227714285714286,0.653485714285714,0.776757142857143,0.0266619047619048,0.664195238095238,0.760719047619048,0.0383714285714286,0.674271428571429,0.743552380952381,0.0589714285714286,0.683757142857143,0.725385714285714,0.0843000000000000,0.692833333333333,0.706166666666667,0.113295238095238,0.701500000000000,0.685857142857143,0.145271428571429,0.709757142857143,0.664628571428572,0.180133333333333,0.717657142857143,0.642433333333333,0.217828571428571,0.725042857142857,0.619261904761905,0.258642857142857,0.731714285714286,0.595428571428571,0.302171428571429,0.737604761904762,0.571185714285714,0.348166666666667,0.742433333333333,0.547266666666667,0.395257142857143,0.745900000000000,0.524442857142857,0.442009523809524,0.748080952380952,0.503314285714286,0.487123809523809,0.749061904761905,0.483976190476191,0.530028571428571,0.749114285714286,0.466114285714286,0.570857142857143,0.748519047619048,0.449390476190476,0.609852380952381,0.747314285714286,0.433685714285714,0.647300000000000,0.745600000000000,0.418800000000000,0.683419047619048,0.743476190476191,0.404433333333333,0.718409523809524,0.741133333333333,0.390476190476190,0.752485714285714,0.738400000000000,0.376814285714286,0.785842857142857,0.735566666666667,0.363271428571429,0.818504761904762,0.732733333333333,0.349790476190476,0.850657142857143,0.729900000000000,0.336028571428571,0.882433333333333,0.727433333333333,0.321700000000000,0.913933333333333,0.725785714285714,0.306276190476191,0.944957142857143,0.726114285714286,0.288642857142857,0.973895238095238,0.731395238095238,0.266647619047619,0.993771428571429,0.745457142857143,0.240347619047619,0.999042857142857,0.765314285714286,0.216414285714286,0.995533333333333,0.786057142857143,0.196652380952381,0.988000000000000,0.806600000000000,0.179366666666667,0.978857142857143,0.827142857142857,0.163314285714286,0.969700000000000,0.848138095238095,0.147452380952381,0.962585714285714,0.870514285714286,0.130900000000000,0.958871428571429,0.894900000000000,0.113242857142857,0.959823809523810,0.921833333333333,0.0948380952380953,0.966100000000000,0.951442857142857,0.0755333333333333,0.976300000000000,0.983100000000000,0.0538000000000000];

var songVertexVBO;
var songColorVBO;
var times = [];

var pointsVBO = -1;
var colorsVBO = -1;
//Use the information in the Nx4 matrix X to initialize the vertex/color buffers
function initGLBuffers(X) {
	console.log("Initializing buffers...");
    var N = X.length;
    var i = 0;
    var ci = 0;
    var li = 0;
    var ri = 0;
    
    var vertices = [];
    var colors = [];
    times = [];
    
    for (i = 0; i < N; i++) {
    	for (k = 0; k < 3; k++) {
    		vertices.push(X[i][k]);
    	}
    	times.push(X[i][3]);
    	ci = 63.0*(0.1+X[i][3])/(0.1+X[N-1][3]);
    	li = numeric.floor([ci])[0];
    	ri = numeric.ceil([ci])[0];
    	ri = numeric.min([ri], [63])[0];
    	//Linear interpolation for colormap
    	colors.push(COLORMAP[li*3]*(ri-ci) + COLORMAP[ri*3]*(ci-li));//Red
    	colors.push(COLORMAP[li*3+1]*(ri-ci) + COLORMAP[ri*3+1]*(ci-li));//Green
    	colors.push(COLORMAP[li*3+2]*(ri-ci) + COLORMAP[ri*3+2]*(ci-li));//Blue
    	colors.push(1);//Alpha
    }
    
    if (pointsVBO == -1) {
    	pointsVBO = gl.createBuffer();
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, pointsVBO);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    pointsVBO.itemSize = 3;
    pointsVBO.numItems = N;

	if (colorsVBO == -1) {
    	colorsVBO = gl.createBuffer();
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, colorsVBO);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
    colorsVBO.itemSize = 4;
    colorsVBO.numItems = N;
    console.log("Finished initializing buffers");
    requestAnimFrame(repaint);
}

//Variables for polar camera
var theta = 0.0;
var phi = 0.0;
var camCenter = [0.0, 0.0, 0.0];
var camR = 2.0;

function drawScene() {
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix);

    mat4.identity(mvMatrix);
    var sinT = numeric.sin([theta])[0];
    var cosT = numeric.cos([theta])[0];
    var sinP = numeric.sin([phi])[0];
    var cosP = numeric.cos([phi])[0];
    var T = [-sinP*cosP, -cosP, sinP*sinT];
    var U = [-cosP*cosT, sinP, cosP*sinT];
    var eye = [camCenter[0] - camR*T[0], camCenter[1] - camR*T[1], camCenter[2] - camR*T[2]];

	if (pointsVBO != -1 && colorsVBO != -1) {
		gl.bindBuffer(gl.ARRAY_BUFFER, pointsVBO);
		gl.vertexAttribPointer(shaderProgram.vPosAttrib, pointsVBO.itemSize, gl.FLOAT, false, 0, 0);

		gl.bindBuffer(gl.ARRAY_BUFFER, colorsVBO);
		gl.vertexAttribPointer(shaderProgram.vColorAttrib, colorsVBO.itemSize, gl.FLOAT, false, 0, 0);
		setMatrixUniforms();
		gl.drawArrays(gl.POINTS, 0, pointsVBO.numItems);
    }
}


function repaint() {
    drawScene();
}

function webGLStart() {
    var canvas = document.getElementById("LoopDittyGLCanvas");
    initGL(canvas);
    initShaders();
    initGLBuffers([[0, 0, -4, 0], [0, 1, -4, 2], [1, 1, -4, 3], [1, 0, -5, 4]]);

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
	
	requestAnimFrame(repaint);
}
