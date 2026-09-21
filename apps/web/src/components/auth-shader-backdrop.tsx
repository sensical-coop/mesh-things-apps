import * as React from "react";

/**
 * The dithered ribbon behind the sign-in card.
 *
 * Written by hand rather than pulled from a shader library because the ready
 * made `Dithering` shader has no threshold: its noise field sits at a mid
 * value across the whole canvas, and an ordered dither renders that as "half
 * the pixels lit" everywhere — a static dot grid, not a roaming form. The
 * `smoothstep` below is the whole point: outside the ribbon the field is
 * exactly zero, so no pixel fires and the canvas is genuinely empty.
 */

const VERTEX = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAGMENT = `
precision highp float;

uniform vec2  u_resolution;
uniform float u_time;
uniform vec3  u_color;
uniform float u_cell;   // dither cell size, css px
uniform float u_dpr;
uniform float u_scale;  // noise feature size
uniform float u_low;    // field value where the ribbon starts to exist
uniform float u_high;   // field value where it is fully solid
uniform float u_alpha;  // how strongly the lit pixels read

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float total = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    total += valueNoise(p) * amp;
    p *= 2.0;
    amp *= 0.5;
  }
  return total;
}

// Ordered 8x8 Bayer threshold, built from nested 2x2s.
float bayer2(vec2 a) {
  a = floor(a);
  return fract(a.x / 2.0 + a.y * a.y * 0.75);
}
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
float bayer8(vec2 a) { return bayer4(0.5 * a) * 0.25 + bayer2(a); }

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float aspect = u_resolution.x / u_resolution.y;

  // Drift right-to-left; the vertical term keeps it from looking like a
  // conveyor belt by slowly folding the field as it travels.
  vec2 p = vec2(uv.x * aspect, uv.y) * u_scale;
  p.x += u_time * 0.05;

  // Domain warp — this is what makes the form organic instead of a sine.
  vec2 q = vec2(fbm(p), fbm(p + vec2(5.2, 1.3)));
  float field = fbm(p + 1.9 * q + vec2(0.0, u_time * 0.01));

  // The threshold. Below u_low nothing exists at all.
  float v = smoothstep(u_low, u_high, field);

  // Hold it to a horizontal ribbon.
  float band = 1.0 - smoothstep(0.10, 0.62, abs(uv.y - 0.5));
  v *= band * band;

  if (v <= 0.001) discard;

  // Dither against a screen-anchored matrix, in css px so the texture keeps
  // its size on retina rather than doubling in resolution.
  vec2 cell = gl_FragCoord.xy / (u_cell * u_dpr);
  if (v < bayer8(cell)) discard;

  gl_FragColor = vec4(u_color * u_alpha, u_alpha);
}
`;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function accentColor(): [number, number, number] {
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--oa-primary").trim();
  const hex = raw.startsWith("#") ? raw.slice(1) : "";
  if (hex.length === 6) {
    return [
      Number.parseInt(hex.slice(0, 2), 16) / 255,
      Number.parseInt(hex.slice(2, 4), 16) / 255,
      Number.parseInt(hex.slice(4, 6), 16) / 255,
    ];
  }
  return [0xff / 255, 0x49 / 255, 0x5f / 255];
}

/**
 * Boots WebGL on the canvas and starts the loop.
 * Returns a teardown, or `null` if the context could not be had yet.
 */
function init(canvas: HTMLCanvasElement): (() => void) | null {
  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: false,
    premultipliedAlpha: true,
  });
  if (!gl || gl.isContextLost()) return null;

  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
  const program = gl.createProgram();
  if (!(vertex && fragment && program)) return null;

  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);

  // One full-screen triangle pair.
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW
  );
  const position = gl.getAttribLocation(program, "a_pos");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  // The fragment writes premultiplied colour, so blend the matching way —
  // without this the lit pixels overwrite rather than compose, and the edges
  // of the ribbon read harder than the alpha says they should.
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  const uniform = (name: string) => gl.getUniformLocation(program, name);
  const uResolution = uniform("u_resolution");
  const uTime = uniform("u_time");
  const uColor = uniform("u_color");

  // Premultiplied, so the pixels sit back into the page rather than reading
  // as full-strength brand.
  gl.uniform1f(uniform("u_alpha"), 0.58);
  gl.uniform1f(uniform("u_cell"), 2.2);
  gl.uniform1f(uniform("u_scale"), 2.6);
  // The gap between these two is the ribbon's edge softness; raising both
  // shrinks it to a thinner, rarer form.
  gl.uniform1f(uniform("u_low"), 0.52);
  gl.uniform1f(uniform("u_high"), 0.72);

  const dpr = Math.min(2, window.devicePixelRatio || 1);
  gl.uniform1f(uniform("u_dpr"), dpr);

  /** False until the element actually has a box to draw into. */
  const resize = () => {
    const width = Math.floor(canvas.clientWidth * dpr);
    const height = Math.floor(canvas.clientHeight * dpr);
    if (width <= 0 || height <= 0) return false;
    // Only touch the backing store when it actually changed — assigning to
    // canvas.width reallocates and clears it.
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    // Viewport and resolution are re-sent unconditionally, and that is not
    // redundant: uniforms belong to a *program*, not to the canvas. This
    // function used to set them only when the size changed, so a second boot
    // over an already-correctly-sized canvas — exactly what React's
    // development double-mount does — left the new program's u_resolution at
    // (0,0). Dividing by that discards every fragment, which is a blank page
    // with no error anywhere.
    gl.viewport(0, 0, width, height);
    gl.uniform2f(uResolution, width, height);
    return true;
  };

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const observer = new ResizeObserver(() => resize());
  observer.observe(canvas);

  // A lost context stops producing frames silently; taking the restore event
  // is what lets the backdrop come back without a reload.
  let lost = false;
  const onLost = (event: Event) => {
    event.preventDefault();
    lost = true;
  };
  const onRestored = () => {
    lost = false;
  };
  canvas.addEventListener("webglcontextlost", onLost);
  canvas.addEventListener("webglcontextrestored", onRestored);

  let frame = 0;
  const startedAt = performance.now();
  const draw = () => {
    frame = requestAnimationFrame(draw);
    // The canvas can exist a frame or two before layout gives it a size.
    // Drawing then would divide by a zero resolution and paint nothing, so
    // skip until the box is real — the loop keeps asking.
    if (lost || !resize()) return;
    const elapsed = reduced.matches ? 0 : (performance.now() - startedAt) / 1000;
    gl.uniform1f(uTime, elapsed);
    gl.uniform3fv(uColor, accentColor());
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

  };
  draw();

  return () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
    canvas.removeEventListener("webglcontextlost", onLost);
    canvas.removeEventListener("webglcontextrestored", onRestored);
    gl.deleteProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    gl.deleteBuffer(buffer);
    // Browsers cap how many live WebGL contexts a document may hold, so a real
    // unmount hands this one back — otherwise every visit leaks one until none
    // is granted at all. Deferred, because effect cleanups run before the node
    // leaves the DOM: a task later `isConnected` tells the truth, and
    // development's mount → cleanup → mount cycle has re-attached by then.
    setTimeout(() => {
      if (!canvas.isConnected) {
        gl.getExtension("WEBGL_lose_context")?.loseContext();
      }
    }, 0);
  };
}

export function ShaderBackdrop() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;
    let attempts = 0;
    let teardown: (() => void) | null = null;
    let frame = 0;

    /**
     * An effect, not a ref callback. A ref fires during commit — before the
     * browser has laid the element out — so on a client-side navigation the
     * context gets asked for while the canvas still has no box. Effects run
     * after paint, so everything below sees a real element.
     */
    const start = () => {
      if (disposed) return;
      teardown = init(canvas);
      if (teardown) return;
      // Context creation can be refused transiently (GPU process restarting,
      // tab still warming up). Retry for a second or so rather than leaving
      // the page permanently flat.
      if (attempts < 60) {
        attempts += 1;
        frame = requestAnimationFrame(start);
      }
    };
    start();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      teardown?.();
    };
  }, []);

  return (
    // Viewport-*sized* but page-*anchored*: `h-svh` keeps the canvas's box
    // independent of the parent's not-yet-settled layout during a
    // client-side navigation (the reason this used to be `fixed` — the
    // shader bands its ribbon around the canvas's vertical centre, and a
    // wrong height lands it off-screen). `absolute` is the change: on a
    // page tall enough to scroll (mobile onboarding), a fixed backdrop
    // glued itself to the viewport and followed the reader down the page,
    // which read as a smudge behind the card the whole way. Anchored to the
    // page's first screenful, it scrolls away with the content instead.
    <canvas
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 h-svh w-full"
      ref={canvasRef}
    />
  );
}
