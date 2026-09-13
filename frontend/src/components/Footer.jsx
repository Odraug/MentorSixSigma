// src/components/Footer.jsx
import React from "react";

const Footer = () => {
  return (
    <footer className="p-6 text-center bg-white dark:bg-gray-900 mt-12 border-t border-gray-200 dark:border-gray-700 text-gray-600 dark:text-white">
          <p> ODRAUG SMART LOGISTICS - Todos los derechos reservados © 2025</p>
      <div className="flex justify-center space-x-4 mt-2">
        <a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400">Política de privacidad</a>
        <a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400">Términos</a>
        <a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400">Redes sociales</a>
      </div>
    </footer>
  );
};

export default Footer;

