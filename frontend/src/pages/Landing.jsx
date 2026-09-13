// src/pages/Landing.jsx
import React from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import logoprincipal from "../img/Logo_ODRAUG_transparent.png";
import logoMentorSuites from "../img/Logo_Login_transparent.png";
import iconA3 from "../img/modulos/icon-a3.png";
import icon5s from "../img/modulos/icon-5s.png";
import iconGemba from "../img/modulos/icon-gemba.png";
import iconVsm from "../img/modulos/icon-vsm.png";
import iconSipoc from "../img/modulos/icon-sipoc.png";
import iconOee from "../img/modulos/icon-oee.png";
import iconDashboard from "../img/modulos/icon-dashboard.png";
import iconIa from "../img/modulos/icon-ia.png";
import iconMision from "../img/modulos/icon-mision.png";
import iconVision from "../img/modulos/icon-vision.png";
import iconValores from "../img/modulos/icon-valores.png";
import Footer from "../components/Footer";
import PublicNavbar from "../components/PublicNavbar";

const Landing = () => {
  const { scrollY } = useScroll();
  const logoScale = useTransform(scrollY, [0, 600], [1, 0.35]);
  const logoOpacity = useTransform(scrollY, [0, 600], [1, 0.18]);
  const logoY = useTransform(scrollY, [0, 600], [0, -120]);

  const modulosPreview = [
    {
      title: "A3 Problem Solving",
      text: "Estructura proyectos de mejora continua con enfoque visual.",
      icon: iconA3,
    },
    {
      title: "5S Digital",
      text: "Aplica orden, limpieza y estandarización de manera colaborativa.",
      icon: icon5s,
    },
    {
      title: "Gemba Walk",
      text: "Registra observaciones en terreno para la mejora directa.",
      icon: iconGemba,
    },
    {
      title: "VSM – Mapa de Valor",
      text: "Visualiza flujos de valor y detecta cuellos de botella.",
      icon: iconVsm,
    },
    {
      title: "SIPOC",
      text: "Define procesos, entradas y salidas con claridad.",
      icon: iconSipoc,
    },
    {
      title: "OEE / OOE / TEEP",
      text: "Mide la eficiencia real de tus equipos y plantas.",
      icon: iconOee,
    },
    {
      title: "Dashboard Integral",
      text: "Centraliza KPIs clave y monitorea tu desempeño.",
      icon: iconDashboard,
    },
    {
      title: "IA Asistida",
      text: "Recibe análisis inteligentes y sugerencias automáticas.",
      icon: iconIa,
    },
  ];

  return (
    <>
      <PublicNavbar />

      {/* 🔹 LOGO PRINCIPAL: protagonista del hero, fijo en pantalla, se achica y transparenta al hacer scroll */}
      <div className="fixed inset-0 z-10 flex items-center justify-center pt-16 pointer-events-none">
        <motion.img
          src={logoprincipal}
          alt="ODRAUG Smart Logistics"
          style={{ scale: logoScale, opacity: logoOpacity, y: logoY }}
          className="h-[calc(100vh-4rem)] w-[96vw] object-contain select-none drop-shadow-2xl"
        />
      </div>

      {/* 🔹 HERO DE PRESENTACIÓN: el logo ocupa el protagonismo, sin texto duplicado */}
      <section className="min-h-screen bg-white dark:bg-gray-900" />

      {/* 💼 QUIÉNES SOMOS */}
      <section className="py-24 px-8 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-center">
        <h2 className="text-4xl font-bold mb-10 text-indigo-600 dark:text-indigo-400">Quiénes Somos</h2>
        <p className="max-w-3xl mx-auto text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
          Somos ODRAUG SMART LOGISTICS, una empresa de tecnología dedicada a
          conectar operaciones, personas y datos. Desarrollamos plataformas
          digitales como MentorSuites y SGP para transformar la manera en que
          las empresas gestionan sus procesos, su gente y su mejora continua.
        </p>
      </section>

      {/* 🧩 NUESTRAS PLATAFORMAS */}
      <section className="py-24 px-8 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-center">
        <h2 className="text-4xl font-bold mb-4 text-indigo-600 dark:text-indigo-400">Nuestras Plataformas</h2>
        <p className="max-w-2xl mx-auto text-gray-600 dark:text-gray-300 mb-14">
          Un ecosistema digital para tus operaciones y tu gente. Cada plataforma resuelve un problema distinto — juntas, transforman tu gestión.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <motion.div
            whileHover={{ scale: 1.03, y: -5 }}
            className="p-8 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-transparent rounded-2xl shadow-lg text-left"
          >
            <img src={logoMentorSuites} alt="MentorSuites" className="h-16 w-auto mb-4" />
            <h3 className="text-2xl font-bold text-indigo-600 dark:text-indigo-300 mb-2">MentorSuites</h3>
            <p className="text-sm uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
              Excelencia Operacional
            </p>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Digitaliza Lean, Six Sigma y mejora continua: A3, 5S, Gemba Walk, VSM, SIPOC, OEE y más — guiado paso a paso.
            </p>
            <Link
              to="/login"
              className="inline-block bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-indigo-700 transition"
            >
              Entrar →
            </Link>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.03, y: -5 }}
            className="p-8 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-transparent rounded-2xl shadow-lg text-left"
          >
            <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-blue-500 to-green-400 flex items-center justify-center text-white font-bold text-xl mb-4">
              SGP
            </div>
            <h3 className="text-2xl font-bold text-indigo-600 dark:text-indigo-300 mb-2">SGP</h3>
            <p className="text-sm uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
              Gestión de Personas
            </p>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Asistencia, turnos, nómina y gestión documental de tu equipo, con trazabilidad completa.
            </p>
            <span className="inline-block bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-6 py-2.5 rounded-lg font-semibold cursor-not-allowed">
              Próximamente
            </span>
          </motion.div>
        </div>
      </section>

      {/* 🧭 MISIÓN / VISIÓN / VALORES */}
      <section className="bg-white dark:bg-gray-900 py-20 px-8 grid grid-cols-1 md:grid-cols-3 gap-10 text-center text-gray-900 dark:text-white">
        {[
          {
            title: "Misión",
            text: "Facilitar la adopción de prácticas de excelencia operacional mediante herramientas digitales accesibles y potentes.",
            icon: iconMision,
          },
          {
            title: "Visión",
            text: "Ser el ecosistema tecnológico líder en transformación digital de operaciones, personas y logística en Latinoamérica.",
            icon: iconVision,
          },
          {
            title: "Valores",
            text: "Innovación, colaboración, aprendizaje continuo y compromiso con la mejora diaria.",
            icon: iconValores,
          },
        ].map(({ title, text, icon }, i) => (
          <motion.div
            key={i}
            whileHover={{ scale: 1.05, y: -5 }}
            className="p-6 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-transparent rounded-xl shadow-md dark:shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <img src={icon} alt="" className="h-20 w-20 mx-auto mb-4" />
            <h3 className="text-2xl font-semibold text-indigo-600 dark:text-indigo-300 mb-2">{title}</h3>
            <p className="text-gray-600 dark:text-gray-300">{text}</p>
          </motion.div>
        ))}
      </section>

      {/* 💼 DEMO DE MÓDULOS (del Home.jsx) */}
      <section className="py-24 px-6 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-center">
        <h2 className="text-3xl font-bold mb-2 text-indigo-600 dark:text-indigo-400">
          Módulos de MentorSuites
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-10">Tu plataforma de Excelencia Operacional</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 max-w-6xl mx-auto">
          {modulosPreview.map(({ title, text, icon }, i) => (
            <motion.div
              key={i}
              whileHover={{ scale: 1.05, y: -5 }}
              className="p-6 bg-white dark:bg-gray-700 border border-gray-200 dark:border-transparent rounded-xl shadow-md dark:shadow-lg hover:shadow-lg dark:hover:bg-gray-600 transition duration-300"
            >
              <img src={icon} alt="" className="h-24 w-24 mx-auto mb-4" />
              <h3 className="text-2xl font-semibold mb-2 text-indigo-600 dark:text-indigo-300">{title}</h3>
              <p className="text-gray-600 dark:text-gray-300">{text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 🤝 CTA FINAL */}
      <section className="py-20 px-8 text-center bg-indigo-600 text-white">
        <h2 className="text-4xl font-bold mb-6">Transforma tu gestión hoy</h2>
        <p className="text-lg mb-8 max-w-2xl mx-auto">
          Únete a la comunidad de empresas que ya optimizan sus procesos con MentorSuites.
        </p>
        <Link
          to="/register"
          className="bg-white text-indigo-600 px-10 py-4 rounded-lg font-semibold hover:bg-gray-100 transition"
        >
          Contactanos
        </Link>
      </section>

      <Footer />
    </>
  );
};

export default Landing;
