// ============================================
// 🌐 IMPORTS PRINCIPALES
// ============================================
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute.jsx";
import ProtectedLayout from "./layouts/ProtectedLayout.jsx";

// ============================================
// 🌍 PÁGINAS PÚBLICAS
// ============================================
import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx"; // usado como Contacto

// ============================================
// 🧭 PÁGINAS GENERALES
// ============================================
import Inicio from "./pages/Inicio.jsx";
import Home from "./pages/Home.jsx";

// ============================================
// 🧑‍💼 ADMINISTRACIÓN
// ============================================
import AdminDashboard from "./pages/Admin/AdminDashboard.jsx";
import Empresas from "./pages/Admin/Empresas.jsx";
import Usuarios from "./pages/Admin/Usuarios.jsx";
import Roles from "./pages/Admin/Roles.jsx";
import Modulos from "./pages/Admin/Modulos.jsx";
import Consultas from "./pages/Admin/Consultas.jsx";

// ============================================
// 📘 A3
// ============================================
import A3Intro from "./pages/A3/A3Intro.jsx";
import ListA3 from "./pages/A3/ListA3.jsx";
import CreateA3 from "./pages/A3/CreateA3.jsx";

// ============================================
// 🧭 5S
// ============================================
import FiveSIntro from "./pages/5S/5sIntro.jsx";
import FiveSProyectos from "./pages/5S/5sProyectos.jsx";
import FiveSImplementacion from "./pages/5S/5sImplementacion.jsx";
import FiveSSeguimiento from "./pages/5S/5sSeguimiento.jsx";
import FiveSAuditoria from "./pages/5S/5sAuditoria.jsx";

// ============================================
// 🚶 GEMBA WALK
// ============================================
import GembaIntro from "./pages/GembaWalk/GwIntro.jsx";
import GwPlan from "./pages/GembaWalk/GwPlan.jsx";
import GembaEjecucion from "./pages/GembaWalk/GwEjecucion.jsx";
import GembaReporte from "./pages/GembaWalk/GwReporte.jsx";
import GwListado from "./pages/GembaWalk/GwListado.jsx";


// ============================================
// 🗺️ VSM
// ============================================
import VsmIntro from "./pages/VSM/VsmIntro.jsx";
import VsmFlow from "./pages/VSM/VsmFlow.jsx";

// ============================================
// 🔗 SIPOC
// ============================================
import SipocIntro from "./pages/SIPOC/SipocIntro";
import SipocList from "./pages/SIPOC/SipocList";
import SipocBuilder from "./pages/SIPOC/SipocBuilder";
import DiagnosticoRapido from "./pages/Diagnostico/DiagnosticoRapido";
import DiagnosticoLista from "./pages/Diagnostico/DiagnosticoLista";
import SipocResumen from "./pages/SIPOC/SipocResumen"



// ============================================
// 📊 KPI
// ============================================
import KpiDashboard from "./pages/KPI/KpiDashboard.jsx";
import KpiKaizen from "./pages/KPI/KpiKaizen.jsx";
// ============================================
// ⚙️ OEE / OOE / TEEP
// ============================================
import OeeIntro from "./pages/OEE/OeeIntro.jsx";
import OeeBuilder from "./pages/OEE/OeeBuilder.jsx";
import OeeAnalysis from "./pages/OEE/OeeAnalysis.jsx";
import OeeDashboard from "./pages/OEE/OeeDashboard.jsx";

import OoeIntro from "./pages/OOE/OoeIntro.jsx";
import OoeBuilder from "./pages/OOE/OoeBuilder.jsx";
import OoeDashboard from "./pages/OOE/OoeDashboard.jsx";

import TeepIntro from "./pages/TEEP/TeepIntro.jsx";
import TeepBuilder from "./pages/TEEP/TeepBuilder.jsx";
import TeepDashboard from "./pages/TEEP/TeepDashboard.jsx";

// ============================================
// 👥 LEADS / CONTACTOS
// ============================================
import Leads from "./pages/Leads.jsx";


// ============================================
// DRP
// ============================================
import DrpIntro from "./pages/DRP/DrpIntro.jsx";
import DrpProyectos from "./pages/DRP/DrpProyectos.jsx";
import DrpEscenarios from "./pages/DRP/DrpEscenarios.jsx";
import DrpDemanda from "./pages/DRP/DrpDemanda.jsx";
import DrpCapacidad from "./pages/DRP/DrpCapacidad.jsx";
import DrpDashboard from "./pages/DRP/DrpDashboard.jsx";
import DrpPlan from "./pages/DRP/DrpPlan.jsx";
import DrpControlTower from "./pages/DRP/DrpControlTower.jsx";
import DrpSkuLogistics from "./pages/DRP/DrpSkuLogistics.jsx";
import DrpUpload from "./pages/DRP/DrpUpload.jsx";
import DrpInventory from "./pages/DRP/DrpInventory.jsx";

import MTCPDashboard from "./pages/MTCPDashboard.jsx";
import KpiMtcp from "./pages/KPI/KpiMtcp.jsx";


import PurchaseOrdersList from "./modules/core/purchasing/PurchaseOrdersList.jsx";
import ReceivePurchaseOrder from "./modules/core/purchasing/ReceivePurchaseOrder.jsx";
import SalesOrdersList from "./modules/core/sales/SalesOrdersList.jsx";
import OperationsDashboard from "./modules/core/operations/PickingDashboard.jsx";
import PackingDashboard from "./modules/core/operations/PackingDashboard.jsx";
import ShippingDashboard from "./modules/core/operations/ShippingDashboard.jsx";
import ControlTowerDashboard from "./modules/core/operations/ControlTowerDashboard.jsx";
import FulfillmentDashboard from "./modules/core/fulfillment/FulfillmentDashboard.jsx";
import WaveManager from "./modules/core/fulfillment/WaveManager.jsx";
import PickingMonitor from "./modules/core/operations/PickingMonitor.jsx";
import PickingRoute from "./modules/core/operations/PickingRoute.jsx";

import SalesOrdersPage from "./modules/core/sales/SalesOrdersPage";
import SalesOrderDetail from "./modules/core/sales/SalesOrderDetail";
import OperationsHub from "./modules/core/operations/OperationsHub.jsx";

import WarehouseLayout from "./modules/core/wms/WarehouseLayout.jsx";
import WarehouseLayoutDesigner from "./modules/core/wms/WarehouseLayoutDesigner.jsx";
import AbcXyzAnalysis from "./pages/ABCXYZ/AbcXyzAnalysis.jsx";
import TmsDashboard from "./modules/core/tms/TmsDashboard.jsx";
import CarriersFleetManager from "./modules/core/tms/CarriersFleetManager.jsx";
import YardBoard from "./modules/core/yard/YardBoard.jsx";

import PermisosMatrix from "./modules/admin/PermisosMatrix.jsx";

// ============================================
// 🚀 APP ROUTES
// ============================================
export default function App() {
  return (
    <Routes>

      {/* ======================================
          🌍 RUTAS PÚBLICAS
      ====================================== */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/contacto" element={<Navigate to="/register" replace />} />

      {/* ======================================
          🔒 ZONA PROTEGIDA (con Navbar y Footer)
      ====================================== */}
      <Route
        element={
          <ProtectedRoute>
            <ProtectedLayout />
          </ProtectedRoute>
        }
      >
        {/* Inicio */}
        <Route path="/inicio" element={<Inicio />} />

        {/* Admin */}
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/empresas" element={<Empresas />} />
        <Route path="/admin/usuarios" element={<Usuarios />} />
        <Route path="/admin/roles" element={<Roles />} />
        <Route path="/admin/modulos" element={<Modulos />} />
        <Route path="/admin/consultas" element={<Consultas />} />

        {/* A3 */}
        <Route path="/a3/intro" element={<A3Intro />} />
        <Route path="/a3/list" element={<ListA3 />} />
        <Route path="/a3/nuevo" element={<CreateA3 />} />
        <Route path="/a3/:id" element={<CreateA3 />} />

        {/* 5S */}
        <Route path="/5s/intro" element={<FiveSIntro />} />
        <Route path="/5s/proyectos" element={<FiveSProyectos />} />
        <Route path="/5s/implementacion/:id" element={<FiveSImplementacion />} />
        <Route path="/5s/seguimiento/:id" element={<FiveSSeguimiento />} />
        <Route path="/5s/auditoria/:id" element={<FiveSAuditoria />} />

        {/* Gemba */}
       <Route path="/gemba/intro" element={<GembaIntro />} />
       <Route path="/gemba/plan" element={<GwPlan />} />
       <Route path="/gemba/ejecucion" element={<GembaEjecucion />} />
       <Route path="/gemba/reporte" element={<GembaReporte />} />
       <Route path="/gemba/listado" element={<GwListado />} /> 
        {/* VSM */}
        <Route path="/vsm/intro" element={<VsmIntro />} />
        <Route path="/vsm/builder" element={<VsmFlow />} />
        <Route path="/vsm/vsm" element={<VsmFlow />} />

        {/* SIPOC */}
        <Route path="/diagnostico" element={<DiagnosticoRapido />} />
        <Route path="/diagnostico/lista" element={<DiagnosticoLista />} />
        <Route path="/diagnostico/:id" element={<DiagnosticoRapido />} />
        <Route path="/sipoc/intro" element={<SipocIntro /> } />
        <Route path="/sipoc/lista" element={<SipocList /> } />
        <Route path="/sipoc/builder" element={<SipocBuilder />}/>
        <Route path="/sipoc/builder/:id" element={<SipocBuilder />}/>
        <Route path="/sipoc/resumen/:id" element={<SipocResumen /> }/>


        {/* KPI */}
        <Route path="/kpi/dashboard" element={<KpiDashboard />} />
        <Route path="/kpi/aizen" element={<KpiKaizen />} />


        {/* OEE / OOE / TEEP */}
        <Route path="/oee/intro" element={<OeeIntro />} />
        <Route path="/oee/builder" element={<OeeBuilder />} />
        <Route path="/oee/analysis" element={<OeeAnalysis />} />
        <Route path="/oee/dashboard" element={<OeeDashboard />} />

        <Route path="/ooe/intro" element={<OoeIntro />} />
        <Route path="/ooe/builder" element={<OoeBuilder />} />
        <Route path="/ooe/dashboard" element={<OoeDashboard />} />

        <Route path="/teep/intro" element={<TeepIntro />} />
        <Route path="/teep/builder" element={<TeepBuilder />} />
        <Route path="/teep/dashboard" element={<TeepDashboard />} />


        {/* DRP */}
        <Route path="/drp/intro" element={<DrpIntro />} />
        <Route path="/drp/proyectos" element={<DrpProyectos />} />
        <Route path="/drp/escenarios" element={<DrpEscenarios />} />
        <Route path="/drp/demanda" element={<DrpDemanda />} />
        <Route path="/drp/capacidad" element={<DrpCapacidad />}/>
        <Route path="/drp/dashboard" element={<DrpDashboard />} />
        <Route path="/drp/plan" element={<DrpPlan />} />
        <Route path="/drp/control-tower" element={<DrpControlTower />} />
        <Route path="/drp/demanda" element={<DrpDemanda />} />
        <Route path="/drp/sku-logistics" element={<DrpSkuLogistics />} />
        <Route path="/drp/upload" element={<DrpUpload />} />
        <Route path="/drp/inventory" element={<DrpInventory />} />


        <Route path="/mtcp/dashboard" element={<MTCPDashboard />} />
        <Route path="/kpi-mtcp" element={<KpiMtcp />} />

        <Route path="/core/purchasing" element={<PurchaseOrdersList />} />
        <Route path="/core/purchasing/receive/:id" element={<ReceivePurchaseOrder />} />
        <Route path="/core/sales" element={<SalesOrdersList />} />
        <Route path="/core/operations" element={<OperationsDashboard />} />
        <Route path="/core/operations/packing" element={<PackingDashboard/>} />
        <Route path="/core/operations/shipping" element={<ShippingDashboard />} />
        <Route path="/core/control-tower" element={<ControlTowerDashboard />} />
        <Route path="/core/fulfillment" element={<FulfillmentDashboard />} />
        <Route path="/core/waves" element={<WaveManager />} />
        <Route path="/core/picking-monitor" element={<PickingMonitor />} />
        <Route path="/core/picking-route/:waveId" element={<PickingRoute />} />

        <Route path="/core/sales" element={<SalesOrdersPage />} />
        <Route path="/core/sales/order/:id" element={<SalesOrderDetail />} />  
        <Route path="/core/operations" element={<OperationsHub />} />

        <Route path="/core/wms/layout" element={<WarehouseLayout />} />
        <Route path="/core/wms/layout-designer" element={<WarehouseLayoutDesigner />} />
        <Route path="/analisis/abc-xyz" element={<AbcXyzAnalysis />} />
        <Route path="/core/tms" element={<TmsDashboard />} />
        <Route path="/core/tms/flota" element={<CarriersFleetManager />} />
        <Route path="/core/yard" element={<YardBoard />} />

        <Route path="/admin/permisos" element={<PermisosMatrix />} />
        {/* Leads */}
        <Route path="/leads" element={<Leads />} />

      </Route>

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />

    </Routes>
  );
}
