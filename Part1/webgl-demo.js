let Px = []//-1, -1, 1, 1];
let Py = []//-1, 1, -1, 1];
let C = []
const vertexCount = 100;

function createC() {
  const MAX_POINTS = 20;
  for (let i = 0; i <= MAX_POINTS; i++)
    C.push([])
  for (let i = 0; i <= MAX_POINTS; i++)
    for (let j = 0; j <= MAX_POINTS; j++)
      C[i].push(j)

  for (let i = 1; i <= MAX_POINTS; i++)
    C[i][0] = 1
  for (let i = 1; i <= MAX_POINTS; i++)
    C[i][i] = 1
  for (let i = 2; i <= MAX_POINTS; i++)
    for (let j = 1; j < i; j++)
      C[i][j] = C[i - 1][j - 1] + C[i - 1][j]
}

createC();

main();

function getRelativeMousePosition(event, target) {
  target = target || event.target;
  var rect = target.getBoundingClientRect();

  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  }
}

// assumes target or event.target is canvas
function getNoPaddingNoBorderCanvasRelativeMousePosition(event, target) {
  target = target || event.target;
  var pos = getRelativeMousePosition(event, target);

  pos.x = pos.x * target.width / target.clientWidth;
  pos.y = pos.y * target.height / target.clientHeight;

  pos.x = +1 * (pos.x / 320 - 1)
  pos.y = -1 * (pos.y / 320 - 1)
  return pos;
}


//
// Start here
//
function main() {
  const canvas = document.querySelector('#glcanvas');
  const gl = canvas.getContext('webgl');
  window.addEventListener('click', e => {

    const pos = getNoPaddingNoBorderCanvasRelativeMousePosition(e, gl.canvas);
    console.log(pos)
    Px.push(pos.x)
    Py.push(pos.y)
  })

  // If we don't have a GL context, give up now

  if (!gl) {
    alert('Unable to initialize WebGL. Your browser or machine may not support it.');
    return;
  }

  // Vertex shader program

  const vsSource = `
    attribute vec4 aVertexPosition;

    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;

    void main() {
      gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
    }
  `;

  // Fragment shader program

  const fsSource = `
    void main() {
      gl_FragColor = vec4(0, 0, 0, 1.0);
    }
  `;

  const shaderProgram2 = initShaderProgram(gl, vsSource, fsSource);
  const programInfo2 = {
    program: shaderProgram2,
    attribLocations: {
      vertexPosition: gl.getAttribLocation(shaderProgram2, 'aVertexPosition'),
    },
    uniformLocations: {
      projectionMatrix: gl.getUniformLocation(shaderProgram2, 'uProjectionMatrix'),
      modelViewMatrix: gl.getUniformLocation(shaderProgram2, 'uModelViewMatrix'),
    },
  };


  // Initialize a shader program; this is where all the lighting
  // for the vertices and so forth is established.
  const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

  // Collect all the info needed to use the shader program.
  // Look up which attribute our shader program is using
  // for aVertexPosition and look up uniform locations.
  const programInfo = {
    program: shaderProgram,
    attribLocations: {
      vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
    },
    uniformLocations: {
      projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
      modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
    },
  };

  // Here's where we call the routine that builds all the
  // objects we'll be drawing.
  const positionBuffer = gl.createBuffer();
  const positionBuffer2 = gl.createBuffer();
  setInterval(function () {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const positions = createPosition();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER,
      new Float32Array(positions),
      gl.STATIC_DRAW);
    drawScene(gl, programInfo, positionBuffer, gl.LINE_STRIP, vertexCount);


    const positions2 = createControlPoints();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer2);
    gl.bufferData(gl.ARRAY_BUFFER,
      new Float32Array(positions2),
      gl.STATIC_DRAW);
    drawScene(gl, programInfo2, positionBuffer2, gl.TRIANGLES, positions2.length);
  }, 100);

}

//
// initBuffers
//
// Initialize the buffers we'll need. For this demo, we just
function f(t, points) {
  if (points.length < 4)
    return 0
  let n = points.length - 1
  let sum = 0
  for (let i = 0; i <= n; i++) {
    sum += C[n][i] * Math.pow(1 - t, n - i) * Math.pow(t, i) * points[i]
  }
  return sum
}

// have one object -- a simple two-dimensional square.
function createPosition() {
  const positions = [];
  for (let t = 0.0; t <= 1; t += 0.01) {
    positions.push(f(t, Px))
    positions.push(f(t, Py))
  }
  return positions;
}

function createControlPoints() {
  const result = [];
  for (let i = 0; i < Px.length; i++) {
    const x = Px[i];
    const y = Py[i];
    const s = 0.02;
    // x-0.01, x+0.01
    // y-0.01, y+0.01
    result.push(x-s, y-s)
    result.push(x-s, y+s)
    result.push(x+s, y+s)

    result.push(x-s, y-s)
    result.push(x+s, y-s)
    result.push(x+s, y+s)
  }
  return result
}

//
//
// Draw the scene.
//
function drawScene(gl, programInfo, position, drawMode, count) {
  gl.clearColor(1.0, 1.0, 1.0, 1.0);  // Clear to black, fully opaque
  gl.clearColor(1.0, 1.0, 1.0, 1.0);  // Clear to black, fully opaque
  gl.clearDepth(1.0);                 // Clear everything
  gl.enable(gl.DEPTH_TEST);           // Enable depth testing
  gl.depthFunc(gl.LEQUAL);            // Near things obscure far things

  // Clear the canvas before we start drawing on it.

  // gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Create a perspective matrix, a special matrix that is
  // used to simulate the distortion of perspective in a camera.
  // Our field of view is 45 degrees, with a width/height
  // ratio that matches the display size of the canvas
  // and we only want to see objects between 0.1 units
  // and 100 units away from the camera.

  const fieldOfView = 90 * Math.PI / 180;   // in radians
  const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
  const zNear = 0.1;
  const zFar = 100.0;
  const projectionMatrix = mat4.create();

  // note: glmatrix.js always has the first argument
  // as the destination to receive the result.
  mat4.perspective(projectionMatrix,
    fieldOfView,
    aspect,
    zNear,
    zFar);

  // Set the drawing position to the "identity" point, which is
  // the center of the scene.
  const modelViewMatrix = mat4.create();

  // Now move the drawing position a bit to where we want to
  // start drawing the square.

  mat4.translate(modelViewMatrix,     // destination matrix
    modelViewMatrix,     // matrix to translate
    [-0.0, 0.0, -1.0]);  // amount to translate

  // Tell WebGL how to pull out the positions from the position
  // buffer into the vertexPosition attribute.
  {
    const numComponents = 2;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = 0;
    const offset = 0;
    gl.bindBuffer(gl.ARRAY_BUFFER, position);
    gl.vertexAttribPointer(
      programInfo.attribLocations.vertexPosition,
      numComponents,
      type,
      normalize,
      stride,
      offset);
    gl.enableVertexAttribArray(
      programInfo.attribLocations.vertexPosition);
  }

  // Tell WebGL to use our program when drawing

  gl.useProgram(programInfo.program);

  // Set the shader uniforms

  gl.uniformMatrix4fv(
    programInfo.uniformLocations.projectionMatrix,
    false,
    projectionMatrix);
  gl.uniformMatrix4fv(
    programInfo.uniformLocations.modelViewMatrix,
    false,
    modelViewMatrix);

  {
    const offset = 0;
    gl.drawArrays(drawMode, offset, count);
  }
}

//
// Initialize a shader program, so WebGL knows how to draw our data
//
function initShaderProgram(gl, vsSource, fsSource) {
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

  // Create the shader program

  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  // If creating the shader program failed, alert

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
    return null;
  }

  return shaderProgram;
}

//
// creates a shader of the given type, uploads the source and
// compiles it.
//
function loadShader(gl, type, source) {
  const shader = gl.createShader(type);

  // Send the source to the shader object

  gl.shaderSource(shader, source);

  // Compile the shader program

  gl.compileShader(shader);

  // See if it compiled successfully

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

