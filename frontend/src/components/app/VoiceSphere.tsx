"use client";

import { useState, useEffect } from "react";

type SphereMode = "idle" | "listening" | "speaking";

interface VoiceSphereProps {
  mode?: SphereMode;
  size?: number;
  autoLoop?: boolean;
}

const THEMES: Record<SphereMode, { bg: string; glow: string; speed: string }> = {
  idle: {
    bg: "radial-gradient(ellipse at 30% 30%, #d4d4d8 0%, #a1a1aa 40%, #71717a 100%)",
    glow: "sphereGlow",
    speed: "5s",
  },
  listening: {
    bg: "radial-gradient(ellipse at 30% 30%, #67e8f9 0%, #22d3ee 25%, #3b82f6 55%, #6366f1 100%)",
    glow: "sphereGlow",
    speed: "3s",
  },
  speaking: {
    bg: "radial-gradient(ellipse at 30% 30%, #c084fc 0%, #a855f7 30%, #7c3aed 60%, #6d28d9 100%)",
    glow: "sphereGlowSpeaking",
    speed: "1.5s",
  },
};

// Color layers for the smooth autoLoop gradient cycle
const AUTO_LOOP_LAYERS = [
  { // Grey
    bg: "radial-gradient(ellipse at 30% 30%, #d4d4d8 0%, #a1a1aa 40%, #71717a 100%)",
    animationName: "sphereColorGrey",
  },
  { // Blue
    bg: "radial-gradient(ellipse at 30% 30%, #67e8f9 0%, #22d3ee 25%, #3b82f6 55%, #6366f1 100%)",
    animationName: "sphereColorBlue",
  },
  { // Purple
    bg: "radial-gradient(ellipse at 30% 30%, #c084fc 0%, #a855f7 30%, #7c3aed 60%, #6d28d9 100%)",
    animationName: "sphereColorPurple",
  },
  { // Green
    bg: "radial-gradient(ellipse at 30% 30%, #6ee7b7 0%, #34d399 25%, #10b981 55%, #059669 100%)",
    animationName: "sphereColorGreen",
  },
  { // Yellow
    bg: "radial-gradient(ellipse at 30% 30%, #fde68a 0%, #fbbf24 25%, #f59e0b 55%, #d97706 100%)",
    animationName: "sphereColorYellow",
  },
];

const LOOP_DURATION = "15s"; // total cycle

export function VoiceSphere({ mode = "idle", size = 160, autoLoop = false }: VoiceSphereProps) {
  const [currentMode, setCurrentMode] = useState<SphereMode>(mode);

  useEffect(() => {
    if (autoLoop) return; // autoLoop uses CSS-only animation, no mode switching
    setCurrentMode(mode);
  }, [autoLoop, mode]);

  const theme = THEMES[currentMode];
  const isSpeaking = currentMode === "speaking";
  const isListening = currentMode === "listening";
  const isActive = isSpeaking || isListening;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size * 1.75, height: size * 1.75 }}>
      {/* Outer ambient glow */}
      <div
        className="absolute"
        style={{
          width: size * 1.75,
          height: size * 1.75,
          borderRadius: "50%",
          background: autoLoop
            ? "radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)"
            : isSpeaking
              ? "radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 70%)"
              : isListening
                ? "radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)"
                : "radial-gradient(circle, rgba(0,0,0,0.02) 0%, transparent 70%)",
          animation: autoLoop
            ? `spherePulse 5s ease-in-out infinite, sphereAutoGlow ${LOOP_DURATION} ease-in-out infinite`
            : `spherePulse ${theme.speed} ease-in-out infinite`,
          transition: "background 0.8s ease",
        }}
      />

      {/* Orbital ring for autoLoop */}
      {autoLoop && (
        <div
          className="absolute"
          style={{
            width: size * 1.25,
            height: size * 1.25,
            borderRadius: "50%",
            border: "1px solid rgba(139,92,246,0.15)",
            animation: `orbitalRing 8s linear infinite, sphereAutoRingColor ${LOOP_DURATION} ease-in-out infinite`,
          }}
        >
          <div
            className="absolute"
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "#a855f7",
              top: -2.5,
              left: "50%",
              marginLeft: -2.5,
              boxShadow: "0 0 8px 2px rgba(168,85,247,0.3)",
              animation: `sphereAutoDotColor ${LOOP_DURATION} ease-in-out infinite`,
            }}
          />
        </div>
      )}

      {/* Orbital ring for non-autoLoop active modes */}
      {!autoLoop && isActive && (
        <div
          className="absolute"
          style={{
            width: size * 1.25,
            height: size * 1.25,
            borderRadius: "50%",
            border: `1px solid ${isSpeaking ? "rgba(168,85,247,0.2)" : "rgba(59,130,246,0.15)"}`,
            animation: `orbitalRing ${isSpeaking ? "3s" : "8s"} linear infinite`,
            transition: "border-color 0.5s ease",
          }}
        >
          <div
            className="absolute"
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: isSpeaking ? "#a855f7" : "#3b82f6",
              top: -3,
              left: "50%",
              marginLeft: -3,
              boxShadow: isSpeaking
                ? "0 0 8px 2px rgba(168,85,247,0.4)"
                : "0 0 8px 2px rgba(59,130,246,0.3)",
            }}
          />
        </div>
      )}

      {/* Main sphere */}
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          overflow: "hidden",
          position: "relative",
          animation: autoLoop
            ? `morphSphere 5s ease-in-out infinite, sphereFloat 4s ease-in-out infinite, sphereAutoBoxGlow ${LOOP_DURATION} ease-in-out infinite`
            : `morphSphere ${isSpeaking ? "2s" : "5s"} ease-in-out infinite, sphereFloat 4s ease-in-out infinite, ${theme.glow} ${theme.speed} ease-in-out infinite`,
          transition: "box-shadow 0.8s ease",
        }}
      >
        {autoLoop ? (
          /* AutoLoop: stacked color layers with staggered opacity animations */
          <>
            {AUTO_LOOP_LAYERS.map((layer, i) => (
              <div
                key={i}
                className="absolute inset-0"
                style={{
                  borderRadius: "inherit",
                  background: layer.bg,
                  animation: `${layer.animationName} ${LOOP_DURATION} ease-in-out infinite`,
                }}
              />
            ))}
          </>
        ) : (
          /* Static mode: single gradient */
          <div
            className="absolute inset-0"
            style={{
              borderRadius: "inherit",
              background: theme.bg,
              transition: "background 0.8s ease",
            }}
          />
        )}

        {/* Shimmer overlay */}
        <div
          className="absolute inset-0"
          style={{
            borderRadius: "inherit",
            background: "linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 40%, transparent 60%, rgba(255,255,255,0.1) 100%)",
          }}
        />

        {/* Rotating highlight */}
        <div
          className="absolute inset-2"
          style={{
            borderRadius: "inherit",
            background: "conic-gradient(from 0deg, transparent, rgba(255,255,255,0.12), transparent, transparent)",
            animation: `rotateSphereGradient ${autoLoop ? "6s" : isSpeaking ? "2s" : "6s"} linear infinite`,
          }}
        />

        {/* Inner glow */}
        <div
          className="absolute inset-0"
          style={{
            borderRadius: "inherit",
            background: "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.2) 0%, transparent 50%)",
          }}
        />
      </div>
    </div>
  );
}
