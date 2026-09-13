import React from "react";
import { useNavigate } from "react-router-dom";

export default function OperationsHub() {

  const navigate = useNavigate();

  const cards = [

    {
      title: "Órdenes",
      description: "Gestión y entrada de pedidos",
      path: "/core/orders",
      color: "bg-blue-600"
    },

    {
      title: "Fulfillment",
      description: "Allocation y creación de waves",
      path: "/core/fulfillment",
      color: "bg-indigo-600"
    },

    {
      title: "Picking",
      description: "Ejecución de picking en bodega",
      path: "/core/operations/picking",
      color: "bg-orange-600"
    },

    {
      title: "Packing",
      description: "Preparación de pedidos",
      path: "/core/operations/packing",
      color: "bg-green-600"
    },

    {
      title: "Shipping",
      description: "Despacho y transporte",
      path: "/core/operations/shipping",
      color: "bg-purple-600"
    },

    {
      title: "Control Tower",
      description: "Visión global de la operación",
      path: "/core/control-tower",
      color: "bg-gray-700"
    },

    {
      title: "TMS — Transporte",
      description: "Cargas, despacho y seguimiento de flota",
      path: "/core/tms",
      color: "bg-sky-600"
    },

    {
      title: "Flota y Transportistas",
      description: "Transportistas, vehículos y conductores",
      path: "/core/tms/flota",
      color: "bg-cyan-700"
    },

    {
      title: "Yard Management",
      description: "Control de patio: muelles y check-in/out",
      path: "/core/yard",
      color: "bg-amber-600"
    },

    {
      title: "Diseñador de Layout",
      description: "Diseña y visualiza el layout de la bodega",
      path: "/core/wms/layout-designer",
      color: "bg-teal-600"
    },

    {
      title: "Análisis ABC/XYZ",
      description: "Clasificación de SKUs por rotación y variabilidad",
      path: "/analisis/abc-xyz",
      color: "bg-rose-600"
    }

  ];

  return (

    <div className="min-h-screen bg-gray-900 text-white p-10">

      <h1 className="text-3xl font-bold mb-10 text-orange-400">
        📦 Centro Operacional WMS
      </h1>

      <div className="grid grid-cols-3 gap-6">

        {cards.map((card, index) => (

          <div
            key={index}
            onClick={() => navigate(card.path)}
            className={`${card.color} p-6 rounded-xl shadow cursor-pointer hover:scale-105 transition`}
          >

            <h2 className="text-xl font-bold mb-2">
              {card.title}
            </h2>

            <p className="text-sm opacity-80">
              {card.description}
            </p>

          </div>

        ))}

      </div>

    </div>

  );

}