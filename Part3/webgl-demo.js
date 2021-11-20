let at = [0.0, 0.0, 0.0]
let eye = [1.0, 1.0, 1.0]
let up = [0.0, 1.0, 0.0]

let grid_size = 20
let Positions = [
  [
    [0, 0, 0], [0, -1, 0], [0, -1, -1], 
  ], 
  [
    [-1, 0, 0], [-1, -1, 0], [-1, -1, -1],
  ]
];

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

function makePositions(P) {
  let positions = []
  for (let i = 0; i < grid_size; i++) {
    for (let j = 0; j < grid_size; j++) {
      positions.push(surface(P, i/(grid_size-1), j/(grid_size-1)))
    }
  }
  return positions
}

function makeTriangles(P) {
  let triangle = []
  for (let i = 0; i < grid_size-1; i++) {
    for (let j = 0; j < grid_size-1; j++) {
      triangle.push(i*grid_size + j)
      triangle.push(i*grid_size + j+1)
      triangle.push((i+1)*grid_size + j)
      triangle.push((i+1)*grid_size + j)
      triangle.push(i*grid_size + j+1)
      triangle.push((i+1)*grid_size + j+1)
    }
  }
  return triangle
}

function lookAt(eye, at, up) {
  zaxis = (at - eye).normalized
  xaxis = (up * zaxis).normalized
  yaxis = zaxis * xaxis

  const mat1 = [
    [xaxis[0],  xaxis[1],  xaxis[2], 0.0],
    [yaxis[0],  yaxis[1],  yaxis[2], 0.0],
    [zaxis[0],  zaxis[1],  zaxis[2], 0.0],
    [0.0, 0.0, 0.0, 1.0],
  ]
  const mat2 = [
    [1.0, 0.0, 0.0, -eye[0]],
    [0.0, 1.0, 0.0, -eye[1]],
    [0.0, 0.0, 1.0, -eye[2]],
    [0.0, 0.0, 0.0, 1.0],
  ]
 
  return mat1 * mat2
}

//
// Draw the scene.
//
function drawScene(gl, programInfo) {
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
  // const projectionMatrix = mat4.create();

  // // note: glmatrix.js always has the first argument
  // // as the destination to receive the result.
  // mat4.perspective(projectionMatrix,
  //   fieldOfView,
  //   aspect,
  //   zNear,
  //   zFar);

  const projectionMatrix = mat4.create() // #FIXME

  // Set the drawing position to the "identity" point, which is
  // the center of the scene.
  const modelMatrix = mat4.create();

  const viewMatrix = mat4.create();

  // Now move the drawing position a bit to where we want to
  // start drawing the square.

  mat4.translate(modelMatrix,     // destination matrix
    modelMatrix,     // matrix to translate
    [-0.0, 0.0, -10.0]);  // amount to translate

  // Tell WebGL how to pull out the positions from the position
  // buffer into the vertexPosition attribute.
  {
    // Create a buffer for the square's positions.

    const positionBuffer = gl.createBuffer();

    // Select the positionBuffer as the one to apply buffer
    // operations to from here out.

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    if (!positionBuffer) {
      console.log('Failed to create the buffer object');
    }

    // Now create an array of positions for the square.

    // const positions = makePositions(Positions);
    // const triangles = makeTriangles(Positions);
    
    const positions = Positions[0]
    const triangles = [0, 1, 2];
    // console.log(positions)
    // console.log(triangles)

    // Now pass the list of positions into WebGL to build the
    // shape. We do this by creating a Float32Array from the
    // JavaScript array, then use it to fill the current buffer.

    gl.bufferData(gl.ARRAY_BUFFER,
      new Float32Array(positions),
      gl.STATIC_DRAW);
    const numComponents = 3;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = 0;
    const offset = 0;
    gl.vertexAttribPointer(
      programInfo.attribLocations.vertexPosition,
      numComponents,
      type,
      normalize,
      stride,
      offset);
    gl.enableVertexAttribArray(
      programInfo.attribLocations.vertexPosition);

    const elementBuffer = gl.createBuffer();
    if (!elementBuffer) {
      console.log('Failed to create the buffer object');
    }
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, elementBuffer);  
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(triangles), gl.STATIC_DRAW);

    
  }

  // Tell WebGL to use our program when drawing

  gl.useProgram(programInfo.program);

  // Set the shader uniforms

  gl.uniformMatrix4fv(
    programInfo.uniformLocations.projectionMatrix,
    false,
    projectionMatrix);
  gl.uniformMatrix4fv(
    programInfo.uniformLocations.modelMatrix,
    false,
    modelMatrix);
  gl.uniformMatrix4fv(
    programInfo.uniformLocations.viewMatrix,
    false,
    viewMatrix);
  console.log(modelMatrix)
  console.log(viewMatrix)
  console.log(projectionMatrix)


  {
    const offset = 0;
    gl.drawElements(gl.TRIANGLES,
      3,
      //  (grid_size-1)*(grid_size-1)*6, 
       gl.UNSIGNED_SHORT, offset);
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

main();


//
//
// Start here
//
function main() {
  const canvas = document.querySelector('#glcanvas');
  const gl = canvas.getContext('webgl');
  // canvas.addEventListener('click', e => {

  //   const pos = getNoPaddingNoBorderCanvasRelativeMousePosition(e, gl.canvas);
  //   console.log(pos)
  //   if (Px.length >= degree + 1) {
  //     if (internalKnots.length > 0) {
  //       internalKnots.push(internalKnots[internalKnots.length - 1])
  //     } else {
  //       internalKnots.push(0.5)
  //     }
  //   }
  //   console.log("Dastan:")
  //   resetKnots()
  //   console.log(internalKnots)
  //   console.log(knots)
  //   Px.push(pos.x)
  //   Py.push(pos.y)
  //   reloadSliders()
  // })

  // If we don't have a GL context, give up now

  if (!gl) {
    alert('Unable to initialize WebGL. Your browser or machine may not support it.');
    return;
  }

  // Vertex shader program

  const vsSource = `
    attribute vec3 aPos;
    
    uniform mat4 model;
    uniform mat4 view;
    uniform mat4 projection;
    
    varying vec4 FragPos;
    
    void main() {
        FragPos = model * vec4(aPos, 1.0);
        gl_Position = projection * view * FragPos;
    }
  `;

  // Fragment shader program

  const fsSource = `
    #ifdef GL_ES
    precision mediump float;
    #endif
    varying vec4 FragPos;
    
    varying vec4 fragColor;
        
    void main() {
        //ambinet
        vec3 lightColor = vec3(1.0, 1.0, 0.0);
        float ambientStrength = 0.2;
        vec3 ambientLight = ambientStrength * lightColor;
    
    
        //depth cueing
        vec3 lightPos = vec3(10.0, 10.0, 10.0);
        float lightPow = max(1.0 / min(length(distance(lightPos, vec3(FragPos))), 1.0), 1.0);
        vec3 cueingLight = lightColor * lightPow;

    
        vec4 fragColor = min(vec4(cueingLight + ambientLight, 1.0), vec4(1.0, 1.0, 1.0, 1.0));
        fragColor = vec4(1.0, 0.0, 0.0, 1.0);
        gl_FragColor = fragColor;
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
      vertexPosition: gl.getAttribLocation(shaderProgram, 'aPos'),
    },
    uniformLocations: {
      modelMatrix: gl.getUniformLocation(shaderProgram, 'model'),
      viewMatrix: gl.getUniformLocation(shaderProgram, 'view'),
      projectionMatrix: gl.getUniformLocation(shaderProgram, 'projection'),
    },
  };

  // Here's where we call the routine that builds all the
  // objects we'll be drawing.

  function draw() {
    // Draw the scene
    drawScene(gl, programInfo);
  }

  setInterval(draw, 10000);
  draw()
}