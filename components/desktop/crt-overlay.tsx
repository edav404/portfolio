"use client";

import { useEffect, useRef } from "react";

const vertex = `attribute vec2 position; void main(){gl_Position=vec4(position,0.0,1.0);}`;
const fragment = `
precision mediump float;
uniform vec2 resolution;
uniform float time;
void main(){
  vec2 uv=gl_FragCoord.xy/resolution.xy;
  vec2 p=uv*2.0-1.0;
  float curve=dot(p,p)*0.018;
  vec2 curved=uv+p*curve;
  float edge=smoothstep(0.0,.035,curved.x)*smoothstep(0.0,.035,curved.y)*smoothstep(0.0,.035,1.0-curved.x)*smoothstep(0.0,.035,1.0-curved.y);
  float scan=.025*sin(curved.y*resolution.y*1.35);
  float flicker=.012*sin(time*13.0);
  gl_FragColor=vec4(vec3(scan+flicker), (1.0-edge)*.42 + .11);
}`;

export function CrtOverlay({ enabled }: { enabled: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    const gl = canvas?.getContext("webgl", { alpha: true });
    if (!canvas || !gl) return;
    const shader = (type: number, source: string) => {
      const item = gl.createShader(type);
      if (!item) return null;
      gl.shaderSource(item, source); gl.compileShader(item); return item;
    };
    const program = gl.createProgram();
    const vs = shader(gl.VERTEX_SHADER, vertex); const fs = shader(gl.FRAGMENT_SHADER, fragment);
    if (!program || !vs || !fs) return;
    gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program); gl.useProgram(program);
    const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "position"); gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const resolution = gl.getUniformLocation(program, "resolution"); const time = gl.getUniformLocation(program, "time");
    let frame = 0;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const draw = (now: number) => {
      const ratio = Math.min(window.devicePixelRatio, 1.5); const width = innerWidth * ratio; const height = innerHeight * ratio;
      if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
      gl.viewport(0, 0, canvas.width, canvas.height); gl.uniform2f(resolution, canvas.width, canvas.height); gl.uniform1f(time, reduceMotion ? 0 : now / 1000); gl.drawArrays(gl.TRIANGLES, 0, 6);
      if (!reduceMotion) frame = requestAnimationFrame(draw);
    };
    draw(0);
    return () => { cancelAnimationFrame(frame); gl.deleteProgram(program); };
  }, [enabled]);

  if (!enabled) return null;
  return <canvas ref={canvasRef} className="os-crt-canvas" aria-hidden="true"/>;
}
