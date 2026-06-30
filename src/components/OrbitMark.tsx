// src/components/OrbitMark.tsx
//
// Orbit mascot mark — the planet-with-face-and-orbit-ring SVG.
// Converted from wireframes/orbit-mark.js (the approved M4 build).
//
// Geometry:
//   viewBox 0 0 240 240; planet centered at (120,120) r=74.
//   Orbit ring: ellipse cx=120 cy=120 rx=106 ry=42 rotated −18°.
//   Moon: cx≈185.26 cy≈86.90 r=13.5 (θ=−52° on the orbit ellipse).
//
// Usage: wrap in an OrbitAvatar container so the overflow ring and moon
// display cleanly (the SVG intentionally overflows its bounding box).

"use client"
import { useId } from "react"

export default function OrbitMark({
  size = 36,
  style,
}: {
  size?: number
  style?: React.CSSProperties
}) {
  const rawId = useId()
  const uid = rawId.replace(/[^a-zA-Z0-9]/g, "z")
  const gid = `osph${uid}`
  const cid = `omc${uid}`

  return (
    <svg
      viewBox="0 0 240 240"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Orbit"
      style={{ display: "block", overflow: "visible", ...style }}
    >
      <defs>
        <radialGradient id={gid} cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#c2f878" />
          <stop offset="55%" stopColor="#a4ef4e" />
          <stop offset="100%" stopColor="#8ad53b" />
        </radialGradient>
        <clipPath id={cid}>
          {/* mouth clip — same arc as the mouth border path */}
          <path d="M100 136 L140 136 A 20 22 0 0 1 100 136 Z" />
        </clipPath>
      </defs>

      {/* Orbit ring */}
      <g transform="rotate(-18 120 120)">
        <ellipse cx="120" cy="120" rx="106" ry="42" fill="none" stroke="#8b99ad" strokeWidth="4.5" />
      </g>

      {/* Planet body */}
      <circle cx="120" cy="120" r="74" fill={`url(#${gid})`} stroke="#181c12" strokeWidth="9" />

      {/* Shine highlight */}
      <circle cx="92" cy="86" r="7" fill="#eaffc9" opacity="0.85" />

      {/* Eyes */}
      <circle cx="96"  cy="116" r="16" fill="#1c2218" />
      <circle cx="144" cy="116" r="16" fill="#1c2218" />

      {/* Eye highlights */}
      <circle cx="101.5" cy="109.5" r="5.5" fill="#fff" />
      <circle cx="149.5" cy="109.5" r="5.5" fill="#fff" />

      {/* Left cheek blush */}
      <circle cx="83" cy="129" r="5" fill="#45a6ff" />

      {/* Mouth — dark fill */}
      <path d="M100 136 L140 136 A 20 22 0 0 1 100 136 Z" fill="#1c2218" />

      {/* Tongue — coral ellipse clipped to mouth */}
      <g clipPath={`url(#${cid})`}>
        <ellipse cx="120" cy="158" rx="14" ry="11" fill="#ff8f7a" />
      </g>

      {/* Mouth outline */}
      <path
        d="M100 136 L140 136 A 20 22 0 0 1 100 136 Z"
        fill="none"
        stroke="#181c12"
        strokeWidth="6"
        strokeLinejoin="round"
      />

      {/* Moon on orbit path */}
      <g transform="rotate(-18 120 120)">
        <circle cx="185.26" cy="86.90" r="13.5" fill="#45a6ff" stroke="#181c12" strokeWidth="6" />
      </g>
    </svg>
  )
}
