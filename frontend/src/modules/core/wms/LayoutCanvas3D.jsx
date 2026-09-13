// src/modules/core/wms/LayoutCanvas3D.jsx
//
// Vista 3D del layout: mismos elementos que el canvas 2D (misma fuente de
// datos, mismas coordenadas x/y guardadas), pero renderizados en three.js.
// Los racks se arman como una estructura real de estantería (postes +
// vigas por nivel y por bahía) en vez de una caja sólida, para que se lea
// como un rack y no como un bloque. El resto de los elementos (pasillo,
// muelle, zona, oficina) sí son volúmenes sólidos simples.
//
// El elemento seleccionado se mueve arrastrando el gizmo (TransformControls,
// restringido al plano del piso) en vez de escribir coordenadas a mano.

import React, { useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, TransformControls, Grid, Html } from "@react-three/drei";

const SCALE = 30; // píxeles (2D) por unidad 3D
const NIVEL_HEIGHT = 0.55; // altura 3D de cada nivel de rack
const ALTURA_BASE = { pasillo: 0.04, muelle: 0.9, zona: 0.6, oficina: 1.1 };
const COLOR_POSTE = "#1e293b";

function aUnidades3D(el, canvasWidth, canvasHeight) {
  const width3D = Math.max(el.width / SCALE, 0.2);
  const depth3D = Math.max(el.height / SCALE, 0.2);
  const x3D = (el.x + el.width / 2 - canvasWidth / 2) / SCALE;
  const z3D = (el.y + el.height / 2 - canvasHeight / 2) / SCALE;
  const height3D =
    el.tipo === "rack"
      ? Math.max(1, Number(el.niveles) || 1) * NIVEL_HEIGHT
      : ALTURA_BASE[el.tipo] ?? 0.6;
  return { x3D, z3D, width3D, depth3D, height3D };
}

// Arma la geometría de un rack real: postes verticales en cada extremo de
// bahía (frente y fondo) y un par de vigas horizontales (frente/fondo) por
// cada nivel y cada bahía, dejando el resto del volumen abierto.
function construirEstructuraRack(el, width3D, depth3D, height3D) {
  const niveles = Math.max(1, Number(el.niveles) || 1);
  const bahias = Math.max(1, Number(el.posiciones_horizontales) || 1);
  const grosorPoste = 0.06;
  const grosorViga = 0.07;
  const xStep = width3D / bahias;

  const postes = [];
  for (let i = 0; i <= bahias; i++) {
    const x = -width3D / 2 + i * xStep;
    for (const z of [-depth3D / 2, depth3D / 2]) {
      postes.push({ position: [x, height3D / 2, z], size: [grosorPoste, height3D, grosorPoste] });
    }
  }

  const vigas = [];
  for (let n = 1; n <= niveles; n++) {
    const y = (n / niveles) * height3D;
    for (let i = 0; i < bahias; i++) {
      const xCentro = -width3D / 2 + (i + 0.5) * xStep;
      for (const z of [-depth3D / 2, depth3D / 2]) {
        vigas.push({
          position: [xCentro, y, z],
          size: [Math.max(xStep - 0.05, 0.1), grosorViga, grosorPoste],
        });
      }
    }
  }

  return { postes, vigas };
}

function ElementoMesh({ el, seleccionado, color, subtitulo, canvasWidth, canvasHeight, onSelect, onMove, orbitRef }) {
  const objRef = useRef();
  const transformRef = useRef();
  const [listo, setListo] = useState(false);
  const { x3D, z3D, width3D, depth3D, height3D } = aUnidades3D(el, canvasWidth, canvasHeight);
  const esRack = el.tipo === "rack";
  const { postes, vigas } = esRack ? construirEstructuraRack(el, width3D, depth3D, height3D) : { postes: [], vigas: [] };

  useEffect(() => {
    const controls = transformRef.current;
    if (!controls) return;

    const alArrastrar = (e) => {
      if (orbitRef.current) orbitRef.current.enabled = !e.value;
    };

    const alSoltar = () => {
      if (!objRef.current) return;
      const pos = objRef.current.position;
      const nuevoX = Math.round(pos.x * SCALE - el.width / 2 + canvasWidth / 2);
      const nuevoY = Math.round(pos.z * SCALE - el.height / 2 + canvasHeight / 2);
      onMove(el.id, nuevoX, nuevoY);
    };

    controls.addEventListener("dragging-changed", alArrastrar);
    controls.addEventListener("mouseUp", alSoltar);
    return () => {
      controls.removeEventListener("dragging-changed", alArrastrar);
      controls.removeEventListener("mouseUp", alSoltar);
    };
  }, [listo, el.id, el.width, el.height, canvasWidth, canvasHeight, onMove, orbitRef]);

  const seleccionar = (e) => {
    e.stopPropagation();
    onSelect(el.id);
  };

  return (
    <>
      <group
        ref={(node) => {
          objRef.current = node;
          if (node && !listo) setListo(true);
        }}
        position={[x3D, 0, z3D]}
      >
        {esRack ? (
          <>
            {postes.map((p, i) => (
              <mesh key={`poste-${i}`} position={p.position} castShadow receiveShadow onClick={seleccionar}>
                <boxGeometry args={p.size} />
                <meshStandardMaterial color={COLOR_POSTE} />
              </mesh>
            ))}
            {vigas.map((v, i) => (
              <mesh key={`viga-${i}`} position={v.position} castShadow receiveShadow onClick={seleccionar}>
                <boxGeometry args={v.size} />
                <meshStandardMaterial color={color} />
              </mesh>
            ))}
          </>
        ) : (
          <mesh position={[0, height3D / 2, 0]} castShadow receiveShadow onClick={seleccionar}>
            <boxGeometry args={[width3D, height3D, depth3D]} />
            <meshStandardMaterial color={color} />
          </mesh>
        )}

        <Html position={[0, height3D + 0.35, 0]} center distanceFactor={12}>
          <div
            style={{
              color: "white",
              fontSize: 11,
              background: "rgba(15,23,42,0.8)",
              padding: "2px 6px",
              borderRadius: 4,
              whiteSpace: "nowrap",
              pointerEvents: "none",
            }}
          >
            {el.label}
            {subtitulo && <div style={{ fontSize: 9, opacity: 0.85, marginTop: 1 }}>{subtitulo}</div>}
          </div>
        </Html>
      </group>
      {seleccionado && listo && (
        <TransformControls ref={transformRef} object={objRef.current} mode="translate" showY={false} />
      )}
    </>
  );
}

export default function LayoutCanvas3D({
  elements,
  selectedId,
  onSelect,
  onMove,
  colorDeElemento,
  obtenerSubtitulo,
  canvasWidth = 900,
  canvasHeight = 600,
}) {
  const orbitRef = useRef();
  const groundWidth = canvasWidth / SCALE + 6;
  const groundDepth = canvasHeight / SCALE + 6;

  return (
    <div
      className="relative bg-slate-950 border border-slate-700 rounded"
      style={{ width: canvasWidth, height: canvasHeight }}
    >
      <Canvas
        shadows
        camera={{ position: [16, 14, 16], fov: 50 }}
        onPointerMissed={() => onSelect(null)}
      >
        <ambientLight intensity={0.55} />
        <directionalLight
          position={[10, 16, 8]}
          intensity={1.1}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />

        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[groundWidth, groundDepth]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
        <Grid
          args={[groundWidth, groundDepth]}
          cellColor="#1e293b"
          sectionColor="#334155"
          fadeDistance={40}
          position={[0, 0.005, 0]}
        />

        {elements.map((el) => (
          <ElementoMesh
            key={el.id}
            el={el}
            seleccionado={el.id === selectedId}
            color={colorDeElemento(el)}
            subtitulo={obtenerSubtitulo ? obtenerSubtitulo(el) : null}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            onSelect={onSelect}
            onMove={onMove}
            orbitRef={orbitRef}
          />
        ))}

        <OrbitControls ref={orbitRef} makeDefault />
      </Canvas>

      <div className="absolute bottom-2 left-2 text-[11px] text-slate-400 bg-slate-900/70 px-2 py-1 rounded pointer-events-none">
        Clic para seleccionar · arrastrá el gizmo para mover · mouse para rotar/zoom la cámara
      </div>
    </div>
  );
}
