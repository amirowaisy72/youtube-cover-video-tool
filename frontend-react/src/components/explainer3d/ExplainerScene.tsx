// React wrapper around the framework-free ExplainerScene engine.
//
// Playback contract:
//  - `playing` runs a rAF loop advancing LOCAL time (the only place a
//    clock exists — the engine itself is a pure function of seek(t)).
//  - `time` (seconds) seeks whenever it changes (paused scrubbing /
//    preview-at-40% / headless render route).
//  - `onReady(scene)` hands the engine instance to the parent. The
//    /explainer3d route in render mode (?render=1) uses it to wire
//    window.__x3d_ready / __x3d_seek / __x3d_duration for the
//    backend's frame capture — this component only exposes the hook.

import { useEffect, useRef, type CSSProperties } from "react";
import { ExplainerScene } from "./scene";
import type { Shot } from "./templates";

export interface ExplainerSceneProps {
  shot: Shot;
  width: number;
  height: number;
  playing?: boolean;
  time?: number;
  assetsBase?: string;
  quality?: "low" | "medium" | "high";
  onReady?: (scene: ExplainerScene) => void;
  className?: string;
  style?: CSSProperties;
}

export default function ExplainerSceneView(props: ExplainerSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<ExplainerScene | null>(null);
  const localTime = useRef(0);
  const propsRef = useRef(props);
  propsRef.current = props;

  // create engine once
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new ExplainerScene(canvas, {
      width: propsRef.current.width,
      height: propsRef.current.height,
      quality: propsRef.current.quality,
    });
    sceneRef.current = engine;
    engine.setShot(propsRef.current.shot, propsRef.current.assetsBase ?? "");
    localTime.current = propsRef.current.time ?? 0;
    engine.seek(localTime.current);
    propsRef.current.onReady?.(engine);
    return () => {
      engine.dispose();
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // shot / size changes
  useEffect(() => {
    sceneRef.current?.setSize(props.width, props.height);
  }, [props.width, props.height]);

  useEffect(() => {
    const engine = sceneRef.current;
    if (!engine) return;
    engine.setShot(props.shot, props.assetsBase ?? "");
    engine.seek(props.time ?? localTime.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.shot, props.assetsBase]);

  // external seek
  useEffect(() => {
    if (props.time === undefined || props.playing) return;
    localTime.current = props.time;
    sceneRef.current?.seek(props.time);
  }, [props.time, props.playing]);

  // playback loop
  useEffect(() => {
    if (!props.playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const engine = sceneRef.current;
      if (engine) {
        localTime.current += (now - last) / 1000;
        if (localTime.current > engine.duration) localTime.current = 0; // loop previews
        engine.seek(localTime.current);
      }
      last = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [props.playing]);

  return (
    <canvas
      ref={canvasRef}
      width={props.width}
      height={props.height}
      className={props.className}
      style={{ width: "100%", height: "auto", display: "block", background: "#04101f", ...props.style }}
    />
  );
}
