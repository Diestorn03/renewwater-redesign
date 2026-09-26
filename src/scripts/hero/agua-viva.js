/*
  "Agua Viva" — the hero's living-water background (spec §6.1, SIG-1).
  Raw WebGL1, one full-screen triangle, original GLSL (no Shadertoy code).
  2-octave fbm with domain warp flowing downward, mapped through the logo's 4 brand stops over navy,
  light shafts, caustic contour lines, a rare amber glint, a pointer push that heals in ~0.8 s and u_depth driven by the hero pin.
  Loaded with import() only behind the desktop gate. The poster under the canvas is the fallback:
  if 10 frames in a row take >32 ms the canvas fades out and the context is released.
  The same fragment shader rendered public/img/hero/poster.webp (one frame, exported once).
*/
const VERT = 'attribute vec2 a;varying vec2 v_uv;void main(){v_uv=a*.5+.5;gl_Position=vec4(a,0.,1.);}';

export const FRAG = `
precision highp float;
uniform vec2 u_res;      // canvas box in CSS px
uniform float u_time;    // seconds
uniform vec2 u_pointer;  // CSS px, y down
uniform float u_vel;     // 0..1, pointer speed (decays: the water heals)
uniform float u_depth;   // 0..1, hero pin progress
varying vec2 v_uv;

float hash(vec2 p){ p = fract(p * vec2(234.34, 435.345)); p += dot(p, p + 34.23); return fract(p.x * p.y); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p), u = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1., 0.)), u.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), u.x), u.y);
}
float fbm(vec2 p){ return noise(p) * .64 + noise(mat2(1.6, 1.2, -1.2, 1.6) * p + 7.3) * .36; }

// aqua #00D0D0 → mint #00D08C → leaf #00CC60 → lime #98C400
vec3 ramp(float t){
  vec3 c = mix(vec3(0., .816, .816), vec3(0., .816, .549), smoothstep(0., .38, t));
  c = mix(c, vec3(0., .8, .376), smoothstep(.38, .68, t));
  return mix(c, vec3(.596, .769, 0.), smoothstep(.68, 1., t));
}

void main(){
  vec2 px = vec2(v_uv.x, 1. - v_uv.y) * u_res;
  vec2 d = px - u_pointer;
  float g = exp(-dot(d, d) / 64800.) * u_vel;             // gaussian, sigma = 180 px
  vec2 p = (px + (d + vec2(-d.y, d.x) * .6) * g * .5) / u_res.y;   // push + swirl the domain around the pointer
  float y = v_uv.y;                                       // 1 = top (the surface)

  float t = u_time * .04;                                 // downward drift, 0.04 u/s
  vec2 q = p * 1.6;
  vec2 w = vec2(fbm(q + vec2(0., -t * 2.)), fbm(q * 1.3 + vec2(5.2, 1.3) + vec2(t, -t * 3.)));
  float n = fbm(q + 2.2 * w + vec2(0., -t * 4.));

  vec3 navy = vec3(0., .11, .22), abyss = vec3(0., .043, .094);
  vec3 col = mix(abyss, navy, clamp(.3 + y * .8 - u_depth * .85, 0., 1.));

  // brand ramp runs diagonally (aqua upper left → lime lower right), bent by the warp
  vec3 tint = ramp(clamp(.12 + p.x * .32 + (1. - y) * .3 + (w.x - .5) * .9, 0., 1.));
  float fade = 1. - .6 * u_depth;
  float lit = smoothstep(.34, .9, n) * (.35 + .65 * y) * (.5 + .5 * v_uv.x) * fade;
  col += tint * (pow(lit, 2.) * .95 + lit * .12);

  // light shafts from the surface, slanting and drifting
  float sh = noise(vec2(p.x * 4.2 - p.y * 1.1, u_time * .07)) * noise(vec2(p.x * 9. - p.y * 2.3 + 3.1, u_time * .05));
  col += tint * pow(sh, 1.8) * smoothstep(.15, 1., y) * .3 * fade;

  // caustics: bright rims along the currents plus a faint finer web (their scale grows with depth)
  float k = 18. / (1. + .8 * u_depth);
  float c = pow(abs(sin(n * k + u_time * .45)), 12.) * .35 * fade;
  float r = fbm(p * 3.4 + 1.4 * w + vec2(0., -t * 6.));
  float c2 = pow(abs(sin(r * k + u_time * .3)), 12.) * .35 * fade;
  vec3 rim = mix(vec3(.8, 1., .98), tint, .45);
  col += rim * (c * (.12 + 1.6 * lit) + c2 * (.05 + .6 * lit) * y);

  float sp = noise(p * 26. + vec2(u_time * .12, -u_time * .5)) * (.8 + .2 * sin(u_time * 1.7 + p.y * 9.));
  col += vec3(.973, .753, 0.) * smoothstep(.985, 1., sp) * (.4 + lit) * 1.4;   // rare amber glint

  col += tint * g * .12;                                  // faint light where the pointer stirs
  col += (hash(px + fract(u_time)) - .5) * .02;           // grain, kills banding
  gl_FragColor = vec4(col, 1.);
}`;

/**
 * createAguaViva(canvas, { onDegrade }) → api | null
 * api: start(), stop(), setDepth(0..1), pointer(clientX, clientY), pulse(x, y), destroy()
 */
export function createAguaViva(canvas, { onDegrade } = {}) {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: 'low-power' });
  if (!gl) return null;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.warn('[agua-viva]', gl.getProgramInfoLog(prog)); return null; }
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const U = Object.fromEntries(['u_res', 'u_time', 'u_pointer', 'u_vel', 'u_depth'].map((n) => [n, gl.getUniformLocation(prog, n)]));

  let w = 0, h = 0, raf = 0, last = 0, since = 0, time = 70, slow = 0, dead = false;
  let depth = 0, vel = 0, velTarget = 0;
  const ptr = { x: -9999, y: -9999, tx: -9999, ty: -9999, lx: 0, ly: 0, lt: 0 };

  const resize = () => {
    w = canvas.clientWidth; h = canvas.clientHeight;
    const s = 0.5 * Math.min(window.devicePixelRatio || 1, 1);   // half resolution, CSS scales it up
    canvas.width = Math.max(1, Math.round(w * s)); canvas.height = Math.max(1, Math.round(h * s));
    gl.viewport(0, 0, canvas.width, canvas.height);
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  const frame = (now) => {
    raf = requestAnimationFrame(frame);
    const dt = last ? Math.min((now - last) / 1000, .1) : 1 / 60;
    // auto-degrade: 10 frames in a row over 32 ms. Ignores the first 2.5 s after each (re)start (shader compile,
    // page boot, image decode) and tab-resume spikes, so a busy page load never costs the visitor the shader.
    if (last && now - since > 2500) {
      slow = now - last > 32 && now - last < 1000 ? slow + 1 : 0;
      if (slow >= 10) { degrade(); return; }
    }
    last = now; time += dt;
    const k = (r) => 1 - Math.pow(1 - r, dt * 60);          // frame-rate independent lerp
    ptr.x += (ptr.tx - ptr.x) * k(.08); ptr.y += (ptr.ty - ptr.y) * k(.08);
    velTarget *= Math.exp(-dt / .22);
    vel += (velTarget - vel) * k(.15);
    gl.uniform2f(U.u_res, w, h);
    gl.uniform1f(U.u_time, time);
    gl.uniform2f(U.u_pointer, ptr.x, ptr.y);
    gl.uniform1f(U.u_vel, vel);
    gl.uniform1f(U.u_depth, depth);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  const start = () => { if (!raf && !dead) { last = 0; slow = 0; since = performance.now(); raf = requestAnimationFrame(frame); } };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };
  const release = () => { stop(); ro.disconnect(); gl.getExtension('WEBGL_lose_context')?.loseContext(); };
  function degrade() { if (dead) return; dead = true; release(); onDegrade?.(); }

  return {
    start, stop,
    setDepth(v) { depth = v; },
    pointer(clientX, clientY) {
      const r = canvas.getBoundingClientRect();
      const x = clientX - r.left, y = clientY - r.top, t = performance.now();
      if (ptr.x < -999) { ptr.x = x; ptr.y = y; }
      const dtm = Math.max(8, t - ptr.lt);
      velTarget = Math.min(1, Math.max(velTarget, Math.hypot(x - ptr.lx, y - ptr.ly) / dtm / 1.6));
      ptr.tx = x; ptr.ty = y; ptr.lx = x; ptr.ly = y; ptr.lt = t;
    },
    pulse(x, y) { ptr.x = ptr.tx = x; ptr.y = ptr.ty = y; velTarget = 1; },
    destroy() { dead = true; release(); },
  };
}
