attribute vec3 vPos;
attribute vec4 vColor;

uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;

varying vec4 fColor;


void main(void) {
    gl_Position = uPMatrix * uMVMatrix * vec4(Pos, 1.0);
    fColor = vColor;
}
