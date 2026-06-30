// src/components/OrbitAvatar.tsx
//
// Container that places the Orbit mascot mark at 156% of the slot size,
// centered and overflowing, so the moon + orbit ring render uncropped.
// Per the design spec: no fill, no border — the mark sits on the surface.

import OrbitMark from "./OrbitMark"

export default function OrbitAvatar({
  size,
  style,
}: {
  size: number
  style?: React.CSSProperties
}) {
  return (
    <div
      aria-label="Orbit"
      style={{
        width: size,
        height: size,
        position: "relative",
        overflow: "visible",
        flexShrink: 0,
        ...style,
      }}
    >
      <OrbitMark
        size={Math.round(size * 1.56)}
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
        }}
      />
    </div>
  )
}
