let Px = [];
let Py = [];
let Pz = [];
const degree = 3
const internalKnots = []
let knots = []

function memo(f) {
  cache = {}
  return (...args) => {
    if (String(args) in cache) {
      return cache[String(args)]
    }
    else {
      cache[String(args)] = f(...args)
      return cache[String(args)]
    }
  }
}

function combine(n ,k) {
  if (k > n) {
    return 0
  }
  if (k == 0 || k == n) {
    return 1
  }
  return combine(n-1, k-1) + combine(n-1, k)
}

combine = memo(combine)

function bez(k, n, u) {
  return combine(n, k) * Math.pow(u, k) * Math.pow(1-u, n-k)
}

function surface(P, u, v) {
  let result = [0.0, 0.0, 0.0]
  let m = P.length - 1
  let n = P[0].length - 1
  for (let j = 0; j <= m; j++) {
    for (let i = 0; i <= n; i++) {
        coef = bez(j, m, v) * bez(i, n, u)
        result = result.map((e, index) => e + P[j][i][index] * coef)
    }
  }
  return result
}

function resetKnots() {
  knots = []
  for (let i = 0; i < degree + 1; i++) {
    knots.push(0)
  }
  for (let i = 0; i < internalKnots.length; i++) {
    knots.push(internalKnots[i])
  }
  for (let i = 0; i < degree + 1; i++) {
    knots.push(1)
  }
}

resetKnots()
const vertexCount = 100;

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


function reloadSliders() {
  document.getElementById("debug-data").innerText = `Px=${Px} Py=${Py} Knots=${knots}`

  let elem = document.getElementById("knot")
  elem.innerHTML = ''
  for (let i = 0; i < knots.length; i++) {
    let disabled = Math.min(i, knots.length - i - 1) <= degree
    let child = document.createElement("div")
    child.innerHTML = `
        <label for=\"myRange\">Knot ${i}: </label>
        <input ${disabled ? "disabled" : ""} type=\"range\" min=\"1\" max=\"100\" value=\"${100 * knots[i]}\" class=\"slider\" id=\"myRange\">`
    child.children[1].addEventListener("click", function (event) {
      console.log(`knots-${i} - ${event.target.value}`)
      let value = Number(event.target.value) / 100
      if (knots[i - 1] < value && value < knots[i + 1]) {
        internalKnots[i - degree - 1] = value
        resetKnots()
      } else {
        event.target.value = knots[i] * 100
      }
    })
    elem.appendChild(child)
  }
}

reloadSliders()
//
// Start here
//
function main() {
  const canvas = document.querySelector('#glcanvas');
  const gl = canvas.getContext('webgl');
  canvas.addEventListener('click', e => {

    const pos = getNoPaddingNoBorderCanvasRelativeMousePosition(e, gl.canvas);
    console.log(pos)
    if (Px.length >= degree + 1) {
      if (internalKnots.length > 0) {
        internalKnots.push(internalKnots[internalKnots.length - 1])
      } else {
        internalKnots.push(0.5)
      }
    }
    console.log("Dastan:")
    resetKnots()
    console.log(internalKnots)
    console.log(knots)
    Px.push(pos.x)
    Py.push(pos.y)
    reloadSliders()
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

  function draw() {
    const buffers = initBuffers(gl);

    // Draw the scene
    drawScene(gl, programInfo, buffers);
  }

  setInterval(draw, 1000);
  draw()
}

function safeDivision(a, b) {
  /// Acording to definition of N function
  if (b === 0)
    return 0
  else
    return a / b
}

function N(i, j, t) {
  if (j === 0) {
    if (knots[i] <= t && t < knots[i + 1])
      return 1
    else
      return 0
  } else {
    return (
      N(i, j - 1, t) * safeDivision(t - knots[i], knots[i + j] - knots[i]) +
      N(i + 1, j - 1, t) * safeDivision(knots[i + j + 1] - t, knots[i + j + 1] - knots[i + 1])
    )
  }
}

function f(t, points) {
  const n = points.length - 1
  if (n < degree)
    return 0
  const m = knots.length - 1
  const p = m - n - 1
  console.assert(p === degree)
  let sum = 0
  for (let i = 0; i < points.length; i++) {
    sum += points[i] * N(i, p, t)
  }
  return sum;
}

function createPosition() {
  const positions = [];
  for (let t = 0.0; t <= 1; t += 0.01) {
    positions.push(f(t, Px))
    positions.push(f(t, Py))
  }
  return positions;
}

//
// initBuffers
//
// Initialize the buffers we'll need. For this demo, we just
// have one object -- a simple two-dimensional square.
//
function initBuffers(gl) {

  // Create a buffer for the square's positions.

  const positionBuffer = gl.createBuffer();

  // Select the positionBuffer as the one to apply buffer
  // operations to from here out.

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  // Now create an array of positions for the square.

  const positions = createPosition();

  // Now pass the list of positions into WebGL to build the
  // shape. We do this by creating a Float32Array from the
  // JavaScript array, then use it to fill the current buffer.

  gl.bufferData(gl.ARRAY_BUFFER,
    new Float32Array(positions),
    gl.STATIC_DRAW);

  return {
    position: positionBuffer,
  };
}

//
// Draw the scene.
//
function drawScene(gl, programInfo, buffers) {
  gl.clearColor(1.0, 1.0, 1.0, 1.0);  // Clear to black, fully opaque
  gl.clearColor(1.0, 1.0, 1.0, 1.0);  // Clear to black, fully opaque
  gl.clearDepth(1.0);                 // Clear everything
  gl.enable(gl.DEPTH_TEST);           // Enable depth testing
  gl.depthFunc(gl.LEQUAL);            // Near things obscure far things

  // Clear the canvas before we start drawing on it.

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

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
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
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
    gl.drawArrays(gl.LINE_STRIP, offset, vertexCount);
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

