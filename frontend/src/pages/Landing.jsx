// src/pages/Landing.jsx
import React from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import logoprincipal from "../img/LogoMentorSuites2.png";
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
          alt="MentorSuites"
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
          Somos un equipo apasionado por la mejora continua. MentorSuites nace
          con el propósito de digitalizar las metodologías de excelencia
          operacional y facilitar la toma de decisiones basada en datos. Nuestra
          misión es transformar la cultura de mejora en una experiencia digital,
          colaborativa e intuitiva.
        </p>
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
            text: "Ser la suite líder en transformación digital de procesos Lean y mejora continua en Latinoamérica y el mundo.",
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
        <h2 className="text-3xl font-bold mb-12 text-indigo-600 dark:text-indigo-400">
          Tus módulos de Excelencia Operacional
        </h2>

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
