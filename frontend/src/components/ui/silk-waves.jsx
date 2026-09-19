import React, { useEffect, useRef } from 'react';

/**
 * Silk Waves - React Bits Pro compatible component
 * High-performance WebGL shader with cached uniform locations and zero-restart render loop.
 * Pure blend of cream, off-white, and lighter shades of brown (zero yellow).
 */

export const THEME_BROWN_COLORS = [
  '#ffffff', // Radiant pure white crest
  '#fcfaf6', // Luminous off-white
  '#f2e5d5', // Warm light-tan transition
  '#e4ceb7', // Rich light brown fold (intensified warmth)
  '#fffdfa', // Brilliant white-silk crest
  '#e9d7c3', // Defined café-au-lait fold
  '#fbf8f2', // Luminous cream
  '#ffffff', // Pure white loop
];

function hexToRgb(hex) {
  let c = String(hex).replace('#', '').trim();
  if (c.length === 3) {
    c = c.split('').map((x) => x + x).join('');
  }
  const num = parseInt(c, 16);
  if (isNaN(num)) return [0.92, 0.86, 0.8];
  return [
    ((num >> 16) & 255) / 255,
    ((num >> 8) & 255) / 255,
    (num & 255) / 255,
  ];
}

const VS_SOURCE = `
attribute vec2 position;
void main() {
    gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FS_SOURCE = `
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_speed;
uniform float u_scale;
uniform float u_distortion;
uniform float u_curve;
uniform float u_contrast;
uniform float u_rotation;
uniform vec2 u_offset;
uniform float u_brightness;
uniform float u_opacity;
uniform float u_frequency;

uniform vec3 u_c0;
uniform vec3 u_c1;
uniform vec3 u_c2;
uniform vec3 u_c3;
uniform vec3 u_c4;
uniform vec3 u_c5;
uniform vec3 u_c6;
uniform vec3 u_c7;

mat2 rotate2D(float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat2(c, -s, s, c);
}

vec3 getSilkColor(float val) {
    float t = clamp(val, 0.0, 1.0) * 7.0;
    if (t < 1.0) return mix(u_c0, u_c1, smoothstep(0.0, 1.0, t));
    if (t < 2.0) return mix(u_c1, u_c2, smoothstep(0.0, 1.0, t - 1.0));
    if (t < 3.0) return mix(u_c2, u_c3, smoothstep(0.0, 1.0, t - 2.0));
    if (t < 4.0) return mix(u_c3, u_c4, smoothstep(0.0, 1.0, t - 3.0));
    if (t < 5.0) return mix(u_c4, u_c5, smoothstep(0.0, 1.0, t - 4.0));
    if (t < 6.0) return mix(u_c5, u_c6, smoothstep(0.0, 1.0, t - 5.0));
    return mix(u_c6, u_c7, smoothstep(0.0, 1.0, t - 6.0));
}

void main() {
    vec2 st = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
    st = rotate2D(radians(u_rotation)) * st;
    st = st * (2.6 / max(u_scale, 0.1)) + u_offset;
    
    float t = u_time * u_speed * 0.45;
    
    // Domain warping simulating fluid silk ripples
    vec2 q = vec2(
        sin(st.x * u_frequency + t * 0.4 + st.y * u_curve * 0.8),
        cos(st.y * u_frequency - t * 0.32 + st.x * u_curve * 0.8)
    );
    
    vec2 r = vec2(
        sin(st.x + 2.0 * q.x + t * 0.35 + 0.45 * st.y),
        cos(st.y + 2.0 * q.y + t * 0.26 + 0.45 * st.x)
    );
    
    vec2 p = st + u_distortion * r;
    
    // Multi-octave wave harmonics
    float wave = 0.0;
    wave += 0.44 * (0.5 + 0.5 * sin(p.x * 1.15 * u_frequency + t * 0.65 + p.y * 0.85 * u_curve));
    p = rotate2D(0.42) * p * 1.28 + q * 0.42;
    
    wave += 0.28 * (0.5 + 0.5 * sin(p.x * 1.55 * u_frequency + t * 0.82 + p.y * 1.15 * u_curve));
    p = rotate2D(0.68) * p * 1.26 + q * 0.38;
    
    wave += 0.18 * (0.5 + 0.5 * sin(p.x * 2.05 * u_frequency + t * 1.05 + p.y * 1.45 * u_curve));
    p = rotate2D(0.92) * p * 1.24 + q * 0.32;
    
    wave += 0.10 * (0.5 + 0.5 * sin(p.x * 2.65 * u_frequency + t * 1.28 + p.y * 1.85 * u_curve));
    
    // Silk luster and contrast
    float silk = pow(clamp(wave, 0.0, 1.0), u_contrast * 1.18);
    
    vec3 col = getSilkColor(silk) * u_brightness;
    gl_FragColor = vec4(col, u_opacity);
}
`;

export function SilkWaves({
  speed = 0.55,
  scale = 1.8,
  distortion = 0.8,
  curve = 1.15,
  contrast = 1.0,
  colors = THEME_BROWN_COLORS,
  rotation = 0,
  offsetX = 0,
  offsetY = 0,
  brightness = 1.0,
  opacity = 0.95,
  complexity = 1.1,
  frequency = 0.95,
  className = '',
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  // Store latest props in a ref so the continuous animation loop reads them without restarting
  const propsRef = useRef({});
  propsRef.current = {
    speed,
    scale,
    distortion,
    curve,
    contrast,
    colors,
    rotation,
    offsetX,
    offsetY,
    brightness,
    opacity,
    complexity,
    frequency,
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let gl = null;
    try {
      gl =
        canvas.getContext('webgl', {
          alpha: true,
          antialias: true,
          powerPreference: 'high-performance',
        }) || canvas.getContext('experimental-webgl');
    } catch {
      gl = null;
    }

    let isWebGL = false;
    let program = null;
    let positionBuffer = null;
    let vs = null;
    let fs = null;
    let uniforms = {};

    if (gl) {
      function compileShader(glCtx, type, src) {
        const s = glCtx.createShader(type);
        glCtx.shaderSource(s, src);
        glCtx.compileShader(s);
        if (!glCtx.getShaderParameter(s, glCtx.COMPILE_STATUS)) {
          console.warn('WebGL shader compile error:', glCtx.getShaderInfoLog(s));
          glCtx.deleteShader(s);
          return null;
        }
        return s;
      }

      vs = compileShader(gl, gl.VERTEX_SHADER, VS_SOURCE);
      fs = compileShader(gl, gl.FRAGMENT_SHADER, FS_SOURCE);

      if (vs && fs) {
        program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);

        if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
          isWebGL = true;
          gl.useProgram(program);

          positionBuffer = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
          const quad = new Float32Array([
            -1, -1,
             1, -1,
            -1,  1,
            -1,  1,
             1, -1,
             1,  1,
          ]);
          gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);

          const posLoc = gl.getAttribLocation(program, 'position');
          gl.enableVertexAttribArray(posLoc);
          gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

          // Cache all uniform locations ONCE on mount
          uniforms = {
            uResolution: gl.getUniformLocation(program, 'u_resolution'),
            uTime: gl.getUniformLocation(program, 'u_time'),
            uSpeed: gl.getUniformLocation(program, 'u_speed'),
            uScale: gl.getUniformLocation(program, 'u_scale'),
            uDistortion: gl.getUniformLocation(program, 'u_distortion'),
            uCurve: gl.getUniformLocation(program, 'u_curve'),
            uContrast: gl.getUniformLocation(program, 'u_contrast'),
            uRotation: gl.getUniformLocation(program, 'u_rotation'),
            uOffset: gl.getUniformLocation(program, 'u_offset'),
            uBrightness: gl.getUniformLocation(program, 'u_brightness'),
            uOpacity: gl.getUniformLocation(program, 'u_opacity'),
            uFrequency: gl.getUniformLocation(program, 'u_frequency'),
            uColors: [
              gl.getUniformLocation(program, 'u_c0'),
              gl.getUniformLocation(program, 'u_c1'),
              gl.getUniformLocation(program, 'u_c2'),
              gl.getUniformLocation(program, 'u_c3'),
              gl.getUniformLocation(program, 'u_c4'),
              gl.getUniformLocation(program, 'u_c5'),
              gl.getUniformLocation(program, 'u_c6'),
              gl.getUniformLocation(program, 'u_c7'),
            ],
          };
        }
      }
    }

    let ctx2d = null;
    if (!isWebGL) {
      ctx2d = canvas.getContext('2d');
    }

    function updateSize() {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.floor((rect.width || window.innerWidth) * dpr));
      const h = Math.max(1, Math.floor((rect.height || window.innerHeight) * dpr));

      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      if (isWebGL && gl) {
        gl.viewport(0, 0, w, h);
      }
    }

    updateSize();
    window.addEventListener('resize', updateSize);

    // Continuous time tracker that NEVER resets
    let animId = null;
    const startTime = performance.now();

    function loop(now) {
      const p = propsRef.current;
      const elapsed = (now - startTime) * 0.001;

      if (isWebGL && gl && program) {
        gl.useProgram(program);

        gl.uniform2f(uniforms.uResolution, canvas.width, canvas.height);
        gl.uniform1f(uniforms.uTime, elapsed);
        gl.uniform1f(uniforms.uSpeed, p.speed);
        gl.uniform1f(uniforms.uScale, p.scale);
        gl.uniform1f(uniforms.uDistortion, p.distortion);
        gl.uniform1f(uniforms.uCurve, p.curve);
        gl.uniform1f(uniforms.uContrast, p.contrast);
        gl.uniform1f(uniforms.uRotation, p.rotation);
        gl.uniform2f(uniforms.uOffset, p.offsetX, p.offsetY);
        gl.uniform1f(uniforms.uBrightness, p.brightness);
        gl.uniform1f(uniforms.uOpacity, p.opacity);
        gl.uniform1f(uniforms.uFrequency, p.frequency);

        const activeColors = p.colors || THEME_BROWN_COLORS;
        for (let i = 0; i < 8; i++) {
          const loc = uniforms.uColors[i];
          if (loc) {
            const rgb = hexToRgb(activeColors[i] || THEME_BROWN_COLORS[i]);
            gl.uniform3f(loc, rgb[0], rgb[1], rgb[2]);
          }
        }

        gl.drawArrays(gl.TRIANGLES, 0, 6);
      } else if (ctx2d) {
        const w = canvas.width;
        const h = canvas.height;
        ctx2d.clearRect(0, 0, w, h);

        const activeColors = p.colors || THEME_BROWN_COLORS;
        const bgGrad = ctx2d.createLinearGradient(0, 0, w, h);
        bgGrad.addColorStop(0, activeColors[0] || THEME_BROWN_COLORS[0]);
        bgGrad.addColorStop(0.5, activeColors[2] || THEME_BROWN_COLORS[2]);
        bgGrad.addColorStop(1, activeColors[1] || THEME_BROWN_COLORS[1]);
        ctx2d.fillStyle = bgGrad;
        ctx2d.fillRect(0, 0, w, h);

        const layers = [
          { color: activeColors[4] || THEME_BROWN_COLORS[4], speedMul: 0.6, amp: 80, freq: 0.0015 },
          { color: activeColors[5] || THEME_BROWN_COLORS[5], speedMul: 0.8, amp: 100, freq: 0.0018 },
          { color: activeColors[3] || THEME_BROWN_COLORS[3], speedMul: 0.5, amp: 70, freq: 0.0012 },
          { color: activeColors[6] || THEME_BROWN_COLORS[6], speedMul: 0.9, amp: 110, freq: 0.0022 },
          { color: activeColors[7] || THEME_BROWN_COLORS[7], speedMul: 0.7, amp: 90, freq: 0.0016 },
        ];

        ctx2d.globalAlpha = p.opacity * 0.45;
        layers.forEach((l, idx) => {
          ctx2d.beginPath();
          ctx2d.moveTo(0, h);
          const tVal = elapsed * p.speed * l.speedMul;
          for (let x = 0; x <= w; x += 15) {
            const y =
              h * (0.35 + idx * 0.12) +
              Math.sin(x * l.freq + tVal) * l.amp * p.distortion +
              Math.cos(x * l.freq * 0.6 - tVal * 0.8) * (l.amp * 0.5);
            ctx2d.lineTo(x, y);
          }
          ctx2d.lineTo(w, h);
          ctx2d.closePath();
          ctx2d.fillStyle = l.color;
          ctx2d.fill();
        });
        ctx2d.globalAlpha = 1.0;
      }

      animId = requestAnimationFrame(loop);
    }

    animId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', updateSize);
      if (animId) {
        cancelAnimationFrame(animId);
      }
      if (isWebGL && gl) {
        if (positionBuffer) gl.deleteBuffer(positionBuffer);
        if (program) gl.deleteProgram(program);
        if (vs) gl.deleteShader(vs);
        if (fs) gl.deleteShader(fs);
      }
    };
  }, []); // Run ONLY once on mount so it NEVER restarts or freezes on parent renders

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 w-full h-full overflow-hidden pointer-events-none ${className}`}
      style={{ width: '100%', height: '100%' }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block pointer-events-none"
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
    </div>
  );
}

export default SilkWaves;
