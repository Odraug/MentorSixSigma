// src/pages/VSM/VsmFlow.jsx
//
// VSM interactivo: un solo canvas (React Flow) con nodos de Proceso,
// Inventario, Proveedor y Cliente. Reemplaza las páginas viejas Vsm.jsx
// (tabla + cálculo en el navegador) y VsmBuilder.jsx (canvas con texto
// libre) — ahora los datos y el diagrama son la misma cosa, y el Lead
// Time / %Valor Agregado se calculan en el backend a partir del grafo.

import React, { useCallback, useEffect, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
} from "reactflow";
import "reactflow/dist/style.css";
import { useNavigate } from "react-router-dom";
import { apiGet, apiPut } from "../../utils/api";
import { vsmNodeTypes } from "./VsmNodeTypes";
import { defaultA3 } from "../../constants/a3Defaults";

let uid = 0;
const nextId = (prefijo) => `${prefijo}_${Date.now()}_${uid++}`;

const NODO_DEFAULTS = {
  proceso: { nombre: "Nuevo proceso", ct: 0, co: 0, uptime: 100, operadores: 1, valorAgregado: true },
  inventario: { nombre: "Inventario", dias: 0 },
  proveedor: { nombre: "Proveedor", tipo: "proveedor" },
  cliente: { nombre: "Cliente", tipo: "cliente" },
};

export default function VsmFlow() {
  const navigate = useNavigate();

  const [mapaId, setMapaId] = useState(null);
  const [nombreMapa, setNombreMapa] = useState("Mapa de Flujo de Valor");
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [status, setStatus] = useState("");

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;
  const selectedEdge = edges.find((e) => e.id === selectedEdgeId) || null;

  useEffect(() => {
    const cargar = async () => {
      try {
        setCargando(true);
        const resp = await apiGet("/vsm/mapa");
        if (resp?.ok && resp.mapa) {
          setMapaId(resp.mapa.id);
          setNombreMapa(resp.mapa.nombre || "Mapa de Flujo de Valor");
          setNodes(resp.mapa.layout?.nodes || []);
          setEdges(resp.mapa.layout?.edges || []);
          setMetrics(resp.metrics || null);
        }
      } catch (err) {
        console.error("❌ Error cargando VSM:", err);
        setStatus("❌ No se pudo cargar el VSM");
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, []);

  const onConnect = useCallback(
    (params) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            id: nextId("edge"),
            type: "smoothstep",
            data: { tipo: "material" },
            style: { stroke: "#22d3ee", strokeWidth: 2 },
            markerEnd: { type: "arrowclosed", color: "#22d3ee" },
          },
          eds
        )
      ),
    [setEdges]
  );

  const agregarNodo = (tipoNodo) => {
    const nuevo = {
      id: nextId(tipoNodo),
      type: tipoNodo,
      position: { x: 80 + nodes.length * 40, y: 120 + (nodes.length % 4) * 90 },
      data: { ...NODO_DEFAULTS[tipoNodo] },
    };
    setNodes((prev) => [...prev, nuevo]);
    setSelectedNodeId(nuevo.id);
    setSelectedEdgeId(null);
  };

  const actualizarDataNodo = (campo, valor) => {
    if (!selectedNodeId) return;
    setNodes((prev) =>
      prev.map((n) => (n.id === selectedNodeId ? { ...n, data: { ...n.data, [campo]: valor } } : n))
    );
  };

  const eliminarNodoSeleccionado = () => {
    if (!selectedNodeId) return;
    setNodes((prev) => prev.filter((n) => n.id !== selectedNodeId));
    setEdges((prev) => prev.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId));
    setSelectedNodeId(null);
  };

  // Arranca un A3 nuevo con el borrador precargado desde este proceso del
  // VSM (mismo mecanismo que usa CreateA3.jsx: leer/escribir localStorage
  // "a3-draft" — no requiere tocar el backend de A3 para nada).
  const crearA3DesdeProceso = () => {
    if (!selectedNode || selectedNode.type !== "proceso") return;

    const confirmar = window.confirm(
      "Esto inicia un borrador de A3 nuevo con los datos de este proceso. Si ya tenías un borrador de A3 sin guardar, se va a reemplazar. ¿Continuar?"
    );
    if (!confirmar) return;

    const d = selectedNode.data;
    const detalle = `C/T: ${d.ct ?? 0} min | C/O: ${d.co ?? 0} min | Uptime: ${d.uptime ?? 0}% | Operadores: ${d.operadores ?? 0}`;
    const nota = d.valorAgregado === false ? "\n⚠️ Marcado en el VSM como actividad SIN valor agregado." : "";

    const borrador = {
      ...defaultA3,
      meta: { ...defaultA3.meta, titulo: `Mejora: ${d.nombre || "Proceso"} (VSM ${nombreMapa})` },
      problema: {
        ...defaultA3.problema,
        descripcion: `Proceso identificado en el VSM "${nombreMapa}": ${d.nombre || "Proceso"}.\n${detalle}${nota}`,
        condicionActual: detalle,
      },
    };

    localStorage.setItem("a3-draft", JSON.stringify(borrador));
    navigate("/a3/nuevo");
  };

  const cambiarTipoEdge = (tipoFlujo) => {
    if (!selectedEdgeId) return;
    const esInfo = tipoFlujo === "informacion";
    setEdges((prev) =>
      prev.map((e) =>
        e.id === selectedEdgeId
          ? {
              ...e,
              data: { tipo: tipoFlujo },
              style: {
                stroke: esInfo ? "#f59e0b" : "#22d3ee",
                strokeWidth: 2,
                strokeDasharray: esInfo ? "6,4" : undefined,
              },
              markerEnd: { type: "arrowclosed", color: esInfo ? "#f59e0b" : "#22d3ee" },
            }
          : e
      )
    );
  };

  const eliminarEdgeSeleccionado = () => {
    if (!selectedEdgeId) return;
    setEdges((prev) => prev.filter((e) => e.id !== selectedEdgeId));
    setSelectedEdgeId(null);
  };

  const guardar = async () => {
    if (!mapaId) return;
    try {
      setGuardando(true);
      await apiPut(`/vsm/mapa/${mapaId}`, { nombre: nombreMapa });
      const resp = await apiPut(`/vsm/mapa/${mapaId}/layout`, { nodes, edges });
      if (resp?.ok) {
        setMetrics(resp.metrics || null);
        setStatus("✅ VSM guardado");
      } else {
        setStatus("⚠️ No se pudo guardar el VSM");
      }
    } catch (err) {
      console.error("❌ Error guardando VSM:", err);
      setStatus("❌ Error guardando el VSM");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col">
      <div className="flex flex-wrap items-center gap-3 p-4 border-b border-gray-700">
        <button
          onClick={() => navigate("/vsm/intro")}
          className="bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded text-sm"
        >
          ← Menú VSM
        </button>
        <input
          value={nombreMapa}
          onChange={(e) => setNombreMapa(e.target.value)}
          className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm min-w-[220px]"
        />
        <button
          onClick={guardar}
          disabled={guardando || !mapaId}
          className="bg-green-600 hover:bg-green-700 disabled:opacity-60 px-4 py-2 rounded text-sm font-semibold"
        >
          {guardando ? "Guardando..." : "💾 Guardar"}
        </button>
        {status && <span className="text-sm text-gray-400">{status}</span>}

        {metrics && (
          <div className="flex flex-wrap gap-4 ml-auto text-xs bg-gray-800 rounded-lg px-4 py-2">
            <div>
              <p className="text-gray-400">Tiempo de Entrega</p>
              <p className="font-bold text-cyan-300">{metrics.leadTimeDias} días</p>
            </div>
            <div>
              <p className="text-gray-400">Procesamiento</p>
              <p className="font-bold text-white">{metrics.tiempoProcesamientoTotalMin} min</p>
            </div>
            <div>
              <p className="text-gray-400">Inventario</p>
              <p className="font-bold text-amber-400">{metrics.diasInventarioTotal} días</p>
            </div>
            <div>
              <p className="text-gray-400">PCE (%VA)</p>
              <p className="font-bold text-green-400">{metrics.pce}%</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Panel izquierdo: agregar elementos */}
        <div className="w-52 shrink-0 bg-gray-800 p-3 space-y-2 overflow-y-auto">
          <p className="text-xs text-gray-400 uppercase font-semibold mb-2">Agregar</p>
          <button onClick={() => agregarNodo("proceso")} className="w-full bg-slate-700 hover:bg-slate-600 py-2 rounded text-sm text-left px-3">
            ⚙️ Proceso
          </button>
          <button onClick={() => agregarNodo("inventario")} className="w-full bg-amber-700 hover:bg-amber-600 py-2 rounded text-sm text-left px-3">
            🔺 Inventario
          </button>
          <button onClick={() => agregarNodo("proveedor")} className="w-full bg-red-900 hover:bg-red-800 py-2 rounded text-sm text-left px-3">
            🏭 Proveedor
          </button>
          <button onClick={() => agregarNodo("cliente")} className="w-full bg-blue-900 hover:bg-blue-800 py-2 rounded text-sm text-left px-3">
            🏬 Cliente
          </button>

          <div className="border-t border-gray-700 pt-3 mt-3 text-[11px] text-gray-500 leading-relaxed">
            Arrastrá desde el borde de un nodo hacia otro para conectarlos. Clic en la conexión para elegir si es flujo de material o de información.
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 min-w-0">
          {cargando ? (
            <div className="flex items-center justify-center h-full text-gray-400">Cargando VSM...</div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={vsmNodeTypes}
              onNodeClick={(_, node) => {
                setSelectedNodeId(node.id);
                setSelectedEdgeId(null);
              }}
              onEdgeClick={(_, edge) => {
                setSelectedEdgeId(edge.id);
                setSelectedNodeId(null);
              }}
              onPaneClick={() => {
                setSelectedNodeId(null);
                setSelectedEdgeId(null);
              }}
              fitView
            >
              <Background color="#334155" gap={20} />
              <Controls />
              <MiniMap nodeColor="#475569" maskColor="rgba(15,23,42,0.7)" />
            </ReactFlow>
          )}
        </div>

        {/* Panel derecho: edición del elemento seleccionado */}
        {(selectedNode || selectedEdge) && (
          <div className="w-72 shrink-0 bg-gray-800 p-4 space-y-3 overflow-y-auto border-l border-gray-700">
            {selectedNode && (
              <>
                <p className="text-sm text-gray-300 font-semibold">Editar {selectedNode.type}</p>
                <input
                  value={selectedNode.data.nombre || ""}
                  onChange={(e) => actualizarDataNodo("nombre", e.target.value)}
                  placeholder="Nombre"
                  className="w-full p-2 rounded bg-gray-900 text-white border border-gray-700 text-sm"
                />

                {selectedNode.type === "proceso" && (
                  <>
                    <label className="block text-xs text-gray-400">
                      Tiempo de Ciclo (C/T, min)
                      <input
                        type="number"
                        value={selectedNode.data.ct ?? 0}
                        onChange={(e) => actualizarDataNodo("ct", Number(e.target.value) || 0)}
                        className="w-full p-2 rounded bg-gray-900 text-white border border-gray-700 text-sm mt-1"
                      />
                    </label>
                    <label className="block text-xs text-gray-400">
                      Tiempo de Cambio (C/O, min)
                      <input
                        type="number"
                        value={selectedNode.data.co ?? 0}
                        onChange={(e) => actualizarDataNodo("co", Number(e.target.value) || 0)}
                        className="w-full p-2 rounded bg-gray-900 text-white border border-gray-700 text-sm mt-1"
                      />
                    </label>
                    <label className="block text-xs text-gray-400">
                      Uptime (%)
                      <input
                        type="number"
                        value={selectedNode.data.uptime ?? 0}
                        onChange={(e) => actualizarDataNodo("uptime", Number(e.target.value) || 0)}
                        className="w-full p-2 rounded bg-gray-900 text-white border border-gray-700 text-sm mt-1"
                      />
                    </label>
                    <label className="block text-xs text-gray-400">
                      Operadores
                      <input
                        type="number"
                        value={selectedNode.data.operadores ?? 0}
                        onChange={(e) => actualizarDataNodo("operadores", Number(e.target.value) || 0)}
                        className="w-full p-2 rounded bg-gray-900 text-white border border-gray-700 text-sm mt-1"
                      />
                    </label>
                    <label className="flex items-center gap-2 text-xs text-gray-300">
                      <input
                        type="checkbox"
                        checked={selectedNode.data.valorAgregado !== false}
                        onChange={(e) => actualizarDataNodo("valorAgregado", e.target.checked)}
                      />
                      Es valor agregado
                    </label>
                  </>
                )}

                {selectedNode.type === "inventario" && (
                  <label className="block text-xs text-gray-400">
                    Inventario (días)
                    <input
                      type="number"
                      value={selectedNode.data.dias ?? 0}
                      onChange={(e) => actualizarDataNodo("dias", Number(e.target.value) || 0)}
                      className="w-full p-2 rounded bg-gray-900 text-white border border-gray-700 text-sm mt-1"
                    />
                  </label>
                )}

                {selectedNode.type === "proceso" && (
                  <button
                    onClick={crearA3DesdeProceso}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 py-2 rounded text-sm mt-2"
                  >
                    📋 Crear A3 desde este proceso
                  </button>
                )}

                <button
                  onClick={eliminarNodoSeleccionado}
                  className="w-full bg-red-600 hover:bg-red-700 py-2 rounded text-sm"
                >
                  🗑️ Eliminar
                </button>
              </>
            )}

            {selectedEdge && (
              <>
                <p className="text-sm text-gray-300 font-semibold">Editar conexión</p>
                <label className="block text-xs text-gray-400">
                  Tipo de flujo
                  <select
                    value={selectedEdge.data?.tipo || "material"}
                    onChange={(e) => cambiarTipoEdge(e.target.value)}
                    className="w-full p-2 rounded bg-gray-900 text-white border border-gray-700 text-sm mt-1"
                  >
                    <option value="material">Flujo de material</option>
                    <option value="informacion">Flujo de información</option>
                  </select>
                </label>
                <button
                  onClick={eliminarEdgeSeleccionado}
                  className="w-full bg-red-600 hover:bg-red-700 py-2 rounded text-sm mt-2"
                >
                  🗑️ Eliminar conexión
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
