export interface PaperPose {
  tiltX: number;
  tiltY: number;
  bendX: number;
  bendY: number;
  grabX: number;
  grabY: number;
  lift: number;
  roll?: number;
}

export interface PaperFrame {
  width: number;
  height: number;
  paperWidth: number;
  paperHeight: number;
  pose: PaperPose;
}

export interface PaperRenderer {
  render(frame: PaperFrame): void;
  dispose(): void;
}

export interface PaperGeometry {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  backUvs: Float32Array;
  indices: Uint16Array;
  columns: number;
  rows: number;
}

const COLUMNS = 64;
const ROWS = 28;
const INTEGRATION_STEPS = 512;

function finite(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

/**
 * A developable generalized cylinder, rather than a stretched height field.
 * Integrating unit-length tangents preserves surface distances and text proportions.
 * Its oblique bend axis lets a grabbed corner curl while the untouched paper stays flat.
 * grabY uses screen coordinates (top -1); positions use world coordinates (up +Y).
 */
export function createPaperGeometry(
  paperWidth: number,
  paperHeight: number,
  pose: PaperPose,
  columns = COLUMNS,
  rows = ROWS,
): PaperGeometry {
  const width = Math.max(1, finite(paperWidth, 1));
  const height = Math.max(1, finite(paperHeight, 1));
  columns = Math.round(clamp(finite(columns, COLUMNS), 2, 128));
  rows = Math.round(clamp(finite(rows, ROWS), 2, 96));
  const count = (columns + 1) * (rows + 1);
  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  const uvs = new Float32Array(count * 2);
  const backUvs = new Float32Array(count * 2);
  const indices = new Uint16Array(columns * rows * 6);
  const bendX = clamp(finite(pose.bendX), -1.2, 1.2);
  const bendY = clamp(finite(pose.bendY), -1.2, 1.2);
  const grabX = clamp(finite(pose.grabX), -1, 1);
  const grabY = -clamp(finite(pose.grabY), -1, 1);
  const grabLength = Math.hypot(grabX, grabY);
  const bendLength = Math.hypot(bendX, bendY);
  const directionX = grabLength > 0.08 ? grabX / grabLength : bendLength > 0 ? bendX / bendLength : 1;
  const directionY = grabLength > 0.08 ? grabY / grabLength : bendLength > 0 ? -bendY / bendLength : 0;
  const projectedBend = bendX * directionX - bendY * directionY;
  // Signed projection crosses zero continuously when the pull changes direction.
  const angle = clamp(projectedBend, -1.2, 1.2);
  const extent = (Math.abs(directionX) * width + Math.abs(directionY) * height) / 2;
  const grabbedPosition = (grabX * width * directionX + grabY * height * directionY) / 2;
  const start = clamp(grabbedPosition - extent * 1.05, -extent * 0.76, extent * 0.64);
  const span = Math.max(1, extent - start);
  const step = span / INTEGRATION_STEPS;
  const integratedX = new Float64Array(INTEGRATION_STEPS + 1);
  const integratedZ = new Float64Array(INTEGRATION_STEPS + 1);
  for (let sample = 1; sample <= INTEGRATION_STEPS; sample++) {
    const localAngle = angle * Math.pow((sample - 0.5) / INTEGRATION_STEPS, 1.5);
    integratedX[sample] = integratedX[sample - 1] + Math.cos(localAngle) * step;
    integratedZ[sample] = integratedZ[sample - 1] + Math.sin(localAngle) * step;
  }

  for (let row = 0; row <= rows; row++) {
    for (let column = 0; column <= columns; column++) {
      const vertex = row * (columns + 1) + column;
      const x = (column / columns - 0.5) * width;
      const y = (row / rows - 0.5) * height;
      const u = x * directionX + y * directionY;
      const v = -x * directionY + y * directionX;
      const fraction = clamp((u - start) / span, 0, 1);
      const sample = fraction * INTEGRATION_STEPS;
      const lower = Math.min(INTEGRATION_STEPS - 1, Math.floor(sample));
      const remainder = sample - lower;
      const curvedU =
        u <= start ? u : start + integratedX[lower] + (integratedX[lower + 1] - integratedX[lower]) * remainder;
      const z = u <= start ? 0 : integratedZ[lower] + (integratedZ[lower + 1] - integratedZ[lower]) * remainder;
      const localAngle = angle * Math.pow(fraction, 1.5);
      positions.set([directionX * curvedU - directionY * v, directionY * curvedU + directionX * v, z], vertex * 3);
      normals.set(
        [-directionX * Math.sin(localAngle), -directionY * Math.sin(localAngle), Math.cos(localAngle)],
        vertex * 3,
      );
      uvs.set([column / columns, row / rows], vertex * 2);
      // The backside is viewed from the opposite direction; keep its lettering readable.
      backUvs.set([1 - column / columns, row / rows], vertex * 2);
      if (row < rows && column < columns) {
        const above = vertex + columns + 1;
        indices.set([vertex, vertex + 1, above, vertex + 1, above + 1, above], (row * columns + column) * 6);
      }
    }
  }
  return { positions, normals, uvs, backUvs, indices, columns, rows };
}

const vertexSource = `
attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec2 aUv;
attribute vec2 aBackUv;
uniform mat3 uRotation;
uniform vec2 uViewport;
uniform float uCamera;
uniform float uFar;
uniform float uLift;
uniform bool uShadow;
uniform float uSpread;
varying vec3 vNormal;
varying vec2 vUv;
varying vec2 vBackUv;
void main() {
  vec3 position = uRotation * aPosition;
  position.z += uLift;
  vNormal = uRotation * aNormal;
  vUv = aUv;
  vBackUv = aBackUv;
  if (uShadow) {
    float separation = max(0.0, position.z + 24.0);
    position.xy += vec2(0.20, -0.30) * separation;
    position.xy += normalize(position.xy + vec2(0.0001)) * uSpread;
    position.z = -24.0;
  }
  float distance = uCamera - position.z;
  float depth = (uFar + 1.0) / (uFar - 1.0) * distance - 2.0 * uFar / (uFar - 1.0);
  gl_Position = vec4(position.xy * 2.0 * uCamera / uViewport, depth, distance);
}
`;

const fragmentSource = `
precision mediump float;
uniform sampler2D uTexture;
uniform sampler2D uBackTexture;
uniform bool uShadow;
uniform float uShadowOpacity;
uniform vec2 uPaperSize;
varying vec3 vNormal;
varying vec2 vUv;
varying vec2 vBackUv;
float noise(vec2 point) {
  return fract(sin(dot(point, vec2(12.9898, 78.233))) * 43758.5453);
}
void main() {
  if (uShadow) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, uShadowOpacity);
    return;
  }
  vec3 normal = normalize(vNormal);
  if (!gl_FrontFacing) normal = -normal;
  vec3 key = normalize(vec3(-0.35, 0.55, 1.0));
  vec3 fill = normalize(vec3(0.50, -0.15, 0.75));
  float lighting = 0.72 + 0.23 * max(0.0, dot(normal, key)) + 0.08 * max(0.0, dot(normal, fill));
  vec4 texel = gl_FrontFacing ? texture2D(uTexture, vUv) : texture2D(uBackTexture, vBackUv);
  vec3 paper = texel.rgb;
  vec2 grainPoint = floor(vUv * uPaperSize * 1.5);
  float grain = (noise(grainPoint) - 0.5) * 0.006;
  float fiber = (noise(vec2(floor(grainPoint.x * 0.13), grainPoint.y)) - 0.5) * 0.003;
  gl_FragColor = vec4(paper * lighting + grain + fiber, texel.a);
}
`;

/** Column-major rotation: local X/Y tilt, then CSS-compatible clockwise roll. */
export function paperRotation(pose: PaperPose): Float32Array {
  const radians = Math.PI / 180;
  // Preserve complete turns while keeping trigonometry stable after repeated dragging.
  const x = (finite(pose.tiltX) % 360) * radians;
  const y = (finite(pose.tiltY) % 360) * radians;
  const z = -(finite(pose.roll ?? 0) % 360) * radians;
  const cx = Math.cos(x);
  const sx = Math.sin(x);
  const cy = Math.cos(y);
  const sy = Math.sin(y);
  const cz = Math.cos(z);
  const sz = Math.sin(z);
  return new Float32Array([
    cz * cy,
    sz * cy,
    -sy,
    cz * sy * sx - sz * cx,
    sz * sy * sx + cz * cx,
    cy * sx,
    cz * sy * cx + sz * sx,
    sz * sy * cx - cz * sx,
    cy * cx,
  ]);
}

/** Draw-on-demand WebGL1 renderer; the caller owns the animation/spring clock. */
export function createPaperRenderer(
  canvas: HTMLCanvasElement,
  texture: HTMLCanvasElement,
  backTexture?: HTMLCanvasElement,
): PaperRenderer | null {
  let gl: WebGLRenderingContext | null = null;
  let program: WebGLProgram | null = null;
  const shaders: WebGLShader[] = [];
  const buffers: WebGLBuffer[] = [];
  const textures: WebGLTexture[] = [];
  let disposed = false;
  function dispose() {
    if (disposed) {
      return;
    }
    disposed = true;
    if (!gl) {
      return;
    }
    for (const buffer of buffers) {
      gl.deleteBuffer(buffer);
    }
    for (const shader of shaders) {
      gl.deleteShader(shader);
    }
    for (const texture of textures) {
      gl.deleteTexture(texture);
    }
    if (program) {
      gl.deleteProgram(program);
    }
  }
  try {
    gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: true,
      depth: true,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
    });
    if (
      !gl ||
      texture.width < 1 ||
      texture.height < 1 ||
      (backTexture && (backTexture.width < 1 || backTexture.height < 1))
    ) {
      dispose();
      return null;
    }
    const context = gl;
    program = context.createProgram();
    if (!program) {
      throw new Error('Paper shader program unavailable');
    }
    for (const [type, source] of [
      [context.VERTEX_SHADER, vertexSource],
      [context.FRAGMENT_SHADER, fragmentSource],
    ] as const) {
      const shader = context.createShader(type);
      if (!shader) {
        throw new Error('Paper shader unavailable');
      }
      shaders.push(shader);
      context.shaderSource(shader, source);
      context.compileShader(shader);
      if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) {
        throw new Error('Paper shader compilation failed');
      }
      context.attachShader(program, shader);
    }
    context.linkProgram(program);
    if (!context.getProgramParameter(program, context.LINK_STATUS)) {
      throw new Error('Paper shader linking failed');
    }
    const shaderProgram = program;
    const vertexBuffer = context.createBuffer();
    if (!vertexBuffer) {
      throw new Error('Paper vertex buffer unavailable');
    }
    buffers.push(vertexBuffer);
    const indexBuffer = context.createBuffer();
    if (!indexBuffer) {
      throw new Error('Paper index buffer unavailable');
    }
    buffers.push(indexBuffer);
    const maximumTextureSize = context.getParameter(context.MAX_TEXTURE_SIZE) as number;
    if (!Number.isFinite(maximumTextureSize) || maximumTextureSize < 1) {
      throw new Error('Paper texture capacity unavailable');
    }
    function uploadPaperTexture(source: HTMLCanvasElement | undefined, unit: number) {
      const handle = context.createTexture();
      if (!handle) {
        throw new Error('Paper texture unavailable');
      }
      textures.push(handle);
      context.activeTexture(context.TEXTURE0 + unit);
      context.bindTexture(context.TEXTURE_2D, handle);
      context.pixelStorei(context.UNPACK_FLIP_Y_WEBGL, true);
      context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE);
      context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE);
      context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.LINEAR);
      context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.LINEAR);
      if (source) {
        let uploadTexture = source;
        if (Math.max(source.width, source.height) > maximumTextureSize) {
          const scale = maximumTextureSize / Math.max(source.width, source.height);
          const resized = canvas.ownerDocument.createElement('canvas');
          resized.width = Math.max(1, Math.floor(source.width * scale));
          resized.height = Math.max(1, Math.floor(source.height * scale));
          const painter = resized.getContext('2d');
          if (!painter) {
            throw new Error('Paper texture resize unavailable');
          }
          painter.drawImage(source, 0, 0, resized.width, resized.height);
          uploadTexture = resized;
        }
        context.texImage2D(context.TEXTURE_2D, 0, context.RGBA, context.RGBA, context.UNSIGNED_BYTE, uploadTexture);
      } else {
        // Older callers retain an opaque, warm-paper reverse without duplicating front ink.
        context.texImage2D(
          context.TEXTURE_2D,
          0,
          context.RGBA,
          1,
          1,
          0,
          context.RGBA,
          context.UNSIGNED_BYTE,
          new Uint8Array([245, 242, 234, 255]),
        );
      }
      if (context.getError() !== context.NO_ERROR) {
        throw new Error('Paper texture upload failed');
      }
      return handle;
    }
    const paperTexture = uploadPaperTexture(texture, 0);
    const paperBackTexture = uploadPaperTexture(backTexture, 1);
    const attributes = {
      position: context.getAttribLocation(shaderProgram, 'aPosition'),
      normal: context.getAttribLocation(shaderProgram, 'aNormal'),
      uv: context.getAttribLocation(shaderProgram, 'aUv'),
      backUv: context.getAttribLocation(shaderProgram, 'aBackUv'),
    };
    const uniforms = Object.fromEntries(
      [
        'Rotation',
        'Viewport',
        'Camera',
        'Far',
        'Lift',
        'Shadow',
        'Spread',
        'ShadowOpacity',
        'Texture',
        'BackTexture',
        'PaperSize',
      ].map((name) => [name, context.getUniformLocation(shaderProgram, `u${name}`)]),
    );
    const vertexData = new Float32Array((COLUMNS + 1) * (ROWS + 1) * 10);
    let indicesUploaded = false;
    return {
      dispose,
      render(frame) {
        if (disposed || context.isContextLost()) {
          return;
        }
        const width = Math.max(1, finite(frame.width, 1));
        const height = Math.max(1, finite(frame.height, 1));
        const pixelRatio = clamp(finite(globalThis.devicePixelRatio, 1), 1, 2);
        const pixelWidth = Math.max(1, Math.round(width * pixelRatio));
        const pixelHeight = Math.max(1, Math.round(height * pixelRatio));
        if (canvas.width !== pixelWidth) {
          canvas.width = pixelWidth;
        }
        if (canvas.height !== pixelHeight) {
          canvas.height = pixelHeight;
        }
        context.viewport(0, 0, pixelWidth, pixelHeight);
        context.clearColor(0, 0, 0, 0);
        context.clear(context.COLOR_BUFFER_BIT | context.DEPTH_BUFFER_BIT);
        const geometry = createPaperGeometry(frame.paperWidth, frame.paperHeight, frame.pose);
        for (let vertex = 0; vertex < geometry.positions.length / 3; vertex++) {
          vertexData.set(geometry.positions.subarray(vertex * 3, vertex * 3 + 3), vertex * 10);
          vertexData.set(geometry.normals.subarray(vertex * 3, vertex * 3 + 3), vertex * 10 + 3);
          vertexData.set(geometry.uvs.subarray(vertex * 2, vertex * 2 + 2), vertex * 10 + 6);
          vertexData.set(geometry.backUvs.subarray(vertex * 2, vertex * 2 + 2), vertex * 10 + 8);
        }
        context.useProgram(shaderProgram);
        context.bindBuffer(context.ARRAY_BUFFER, vertexBuffer);
        context.bufferData(context.ARRAY_BUFFER, vertexData, context.DYNAMIC_DRAW);
        context.bindBuffer(context.ELEMENT_ARRAY_BUFFER, indexBuffer);
        if (!indicesUploaded) {
          context.bufferData(context.ELEMENT_ARRAY_BUFFER, geometry.indices, context.STATIC_DRAW);
          indicesUploaded = true;
        }
        for (const [location, size, offset] of [
          [attributes.position, 3, 0],
          [attributes.normal, 3, 12],
          [attributes.uv, 2, 24],
          [attributes.backUv, 2, 32],
        ]) {
          context.enableVertexAttribArray(location);
          context.vertexAttribPointer(location, size, context.FLOAT, false, 40, offset);
        }
        // A short landscape viewport must not place the lens inside the curled sheet.
        const camera = Math.max(
          height / (2 * Math.tan(Math.PI / 8)),
          Math.max(frame.paperWidth, frame.paperHeight) * 1.3,
        );
        context.uniformMatrix3fv(uniforms.Rotation, false, paperRotation(frame.pose));
        context.uniform2f(uniforms.Viewport, width, height);
        context.uniform1f(uniforms.Camera, camera);
        context.uniform1f(uniforms.Far, camera + Math.max(width, height, frame.paperWidth, frame.paperHeight) * 4);
        context.uniform1f(uniforms.Lift, clamp(finite(frame.pose.lift), -camera * 0.3, camera * 0.25));
        context.uniform2f(uniforms.PaperSize, frame.paperWidth, frame.paperHeight);
        context.activeTexture(context.TEXTURE0);
        context.bindTexture(context.TEXTURE_2D, paperTexture);
        context.uniform1i(uniforms.Texture, 0);
        context.activeTexture(context.TEXTURE1);
        context.bindTexture(context.TEXTURE_2D, paperBackTexture);
        context.uniform1i(uniforms.BackTexture, 1);
        context.disable(context.CULL_FACE);
        context.enable(context.BLEND);
        context.blendFuncSeparate(
          context.SRC_ALPHA,
          context.ONE_MINUS_SRC_ALPHA,
          context.ONE,
          context.ONE_MINUS_SRC_ALPHA,
        );
        context.disable(context.DEPTH_TEST);
        context.uniform1i(uniforms.Shadow, 1);
        // Nested silhouettes approximate a soft area-light shadow without an FBO.
        for (let layer = 6; layer >= 0; layer--) {
          context.uniform1f(uniforms.Spread, layer * 2.2);
          context.uniform1f(uniforms.ShadowOpacity, 0.025 + (6 - layer) * 0.006);
          context.drawElements(context.TRIANGLES, geometry.indices.length, context.UNSIGNED_SHORT, 0);
        }
        context.enable(context.DEPTH_TEST);
        context.depthFunc(context.LEQUAL);
        context.uniform1i(uniforms.Shadow, 0);
        context.drawElements(context.TRIANGLES, geometry.indices.length, context.UNSIGNED_SHORT, 0);
      },
    };
  } catch {
    dispose();
    return null;
  }
}
