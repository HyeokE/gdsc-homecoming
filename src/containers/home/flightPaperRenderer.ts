import { createPaperGrid } from './flightPaperMath';

const VERTEX_SHADER = `
attribute vec2 a_uv;
uniform vec2 u_size;
uniform float u_time;
uniform float u_flex;
uniform float u_inertia;
uniform float u_direction;
varying mediump vec2 v_uv;
varying mediump float v_shade;
void main() {
  float phase = a_uv.x * 4.2 - u_time * 1.4;
  float center = sin(2.1 - u_time * 1.4);
  float trailing = mix(a_uv.x, 1.0 - a_uv.x, smoothstep(-6.0, 0.0, u_direction));
  float edge = trailing * trailing - 0.25;
  float z = u_flex * u_size.x * (0.075 * (sin(phase) - center) + 0.15 * u_inertia * edge);
  float corner = pow(trailing, 3.0) * pow(a_uv.y, 2.0);
  float curl = u_flex * (0.72 + 0.16 * sin(u_time * 0.9) + 0.2 * abs(u_inertia));
  z += u_size.x * 0.24 * curl * corner;
  vec2 point = (a_uv - 0.5) * u_size;
  point.x *= 1.0 - 0.025 * u_flex;
  point.x += u_flex * u_size.x * 0.025 * u_inertia * edge;
  point.x += (0.5 - a_uv.x) * u_size.x * 0.11 * curl * corner;
  point.y -= u_size.y * 0.35 * curl * corner;
  point.y += z * 0.25 + u_flex * (a_uv.x - 0.5) * point.y * 0.12 * sin(u_time * 0.8);
  point *= 1000.0 / (1000.0 - z);
  gl_Position = vec4(point.x / (u_size.x * 0.7), -point.y / (u_size.y * 1.2), 0.0, 1.0);
  v_uv = a_uv;
  v_shade = 1.0 - u_flex * 0.035 * (0.5 + 0.5 * cos(phase)) - 0.045 * curl * corner;
}`;

const FRAGMENT_SHADER = `
precision mediump float;
uniform sampler2D u_texture;
varying mediump vec2 v_uv;
varying mediump float v_shade;
void main() {
  vec4 paper = texture2D(u_texture, v_uv);
  gl_FragColor = vec4(paper.rgb * v_shade, paper.a);
}`;

export interface PaperRenderer {
  setTexture: (texture: HTMLCanvasElement, width: number, height: number) => void;
  draw: (time: number, flex: number, inertia: number, direction: number) => void;
  dispose: () => void;
}

/** One static indexed mesh, one texture, one draw call. No per-frame buffer uploads. */
export function createPaperRenderer(canvas: HTMLCanvasElement): PaperRenderer | null {
  const gl = canvas.getContext('webgl', { alpha: true, antialias: true, depth: false, stencil: false });
  if (!gl) {
    return null;
  }
  const shaders: WebGLShader[] = [];
  const program = gl.createProgram();
  const vertexBuffer = gl.createBuffer();
  const indexBuffer = gl.createBuffer();
  const texture = gl.createTexture();
  const dispose = () => {
    shaders.forEach((shader) => gl.deleteShader(shader));
    gl.deleteProgram(program);
    gl.deleteBuffer(vertexBuffer);
    gl.deleteBuffer(indexBuffer);
    gl.deleteTexture(texture);
  };
  if (!program || !vertexBuffer || !indexBuffer || !texture) {
    dispose();
    return null;
  }
  for (const [type, source] of [
    [gl.VERTEX_SHADER, VERTEX_SHADER],
    [gl.FRAGMENT_SHADER, FRAGMENT_SHADER],
  ] as const) {
    const shader = gl.createShader(type);
    if (!shader) {
      dispose();
      return null;
    }
    shaders.push(shader);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    gl.attachShader(program, shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    dispose();
    return null;
  }
  const grid = createPaperGrid();
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, grid.vertices, gl.STATIC_DRAW);
  const attribute = gl.getAttribLocation(program, 'a_uv');
  gl.enableVertexAttribArray(attribute);
  gl.vertexAttribPointer(attribute, 2, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, grid.indices, gl.STATIC_DRAW);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.clearColor(0, 0, 0, 0);
  gl.enable(gl.BLEND);
  gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  const uniforms = {
    size: gl.getUniformLocation(program, 'u_size'),
    time: gl.getUniformLocation(program, 'u_time'),
    flex: gl.getUniformLocation(program, 'u_flex'),
    inertia: gl.getUniformLocation(program, 'u_inertia'),
    direction: gl.getUniformLocation(program, 'u_direction'),
  };
  return {
    setTexture(image, width, height) {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.ceil(width * 1.4 * ratio);
      canvas.height = Math.ceil(height * 2.4 * ratio);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      gl.uniform2f(uniforms.size, width, height);
    },
    draw(time, flex, inertia, direction) {
      gl.uniform1f(uniforms.time, time);
      gl.uniform1f(uniforms.flex, flex);
      gl.uniform1f(uniforms.inertia, inertia);
      gl.uniform1f(uniforms.direction, direction);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawElements(gl.TRIANGLES, grid.indices.length, gl.UNSIGNED_SHORT, 0);
    },
    dispose,
  };
}
