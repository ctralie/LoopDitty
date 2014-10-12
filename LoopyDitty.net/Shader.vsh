attribute vec3 vPos;

uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;

varying vec3 vColor;


void main(void) {
    gl_Position = uPMatrix * uMVMatrix * vec4(Pos, 1.0);
    fColor = vColor;
}
