// backend/api/geminiIA.js
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🧩 Cargar .env DEL BACKEND siempre, sin depender del server.js
dotenv.config({ path: path.join(__dirname, "..", ".env") });

// 👇 Asegúrate de tener GEMINI_API_KEY en backend/.env
const apiKey = process.env.GEMINI_API_KEY;

// DEBUG SEGURO (solo primeras letras, sin exponerla completa)
console.log("🔐 GEMINI_API_KEY (parcial):", apiKey ? apiKey.slice(0, 8) + "..." : "NO DEFINIDA");

if (!apiKey) {
  console.warn(
    "⚠️ GEMINI_API_KEY no está definida en backend/.env. La IA no podrá responder."
  );
}

let model = null;
if (apiKey) {
  const genAI = new GoogleGenerativeAI(apiKey);
  model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });
}

/**
 * Helper genérico para llamar a Gemini
 * @param {Object} opts
 * @param {string} opts.prompt  Texto a enviar
 * @param {string} [opts.engine="gemini"]
 * @param {string} [opts.contexto=""]  Etiqueta para logs
 */
export async function generarConGemini({
  prompt,
  engine = "gemini",
  contexto = "",
} = {}) {
  console.log("📩 Prompt Gemini:", { prompt, engine, contexto });

  if (!apiKey || !model) {
    const msg =
      "⚠️ GEMINI_API_KEY no está configurada. Define la variable en backend/.env.";
    console.error(msg);
    return msg;
  }

  try {
    const textPrompt =
      typeof prompt === "string" ? prompt : JSON.stringify(prompt, null, 2);

    console.log("🚀 Enviando solicitud a Gemini 3.6 Flash...");

    // Gemini a veces devuelve 503 "high demand" en picos de tráfico — es
    // transitorio, así que reintentamos un par de veces con espera antes de
    // darlo por fallado.
    const INTENTOS_MAX = 3;
    let result;
    for (let intento = 1; intento <= INTENTOS_MAX; intento++) {
      try {
        result = await model.generateContent(textPrompt);
        break;
      } catch (error) {
        const saturado = /503|overloaded|high demand|UNAVAILABLE/i.test(error?.message || "");
        if (saturado && intento < INTENTOS_MAX) {
          console.warn(`⚠️ Gemini saturado, reintentando (${intento}/${INTENTOS_MAX})...`);
          await new Promise((r) => setTimeout(r, intento * 3000));
          continue;
        }
        throw error;
      }
    }

    const response = result?.response;

    let text = "";
    if (response?.text) {
      text = response.text();
    } else if (response?.candidates?.length) {
      text = response.candidates
        .flatMap((c) => c.content?.parts || [])
        .map((p) => p.text || "")
        .join("");
    }

    return text || "La IA no devolvió contenido.";
  } catch (error) {
    const logEntry =
      `❌ ERROR GEMINI (${new Date().toLocaleString()}):\n` +
      `Nombre: ${error.name || "Error"}\n` +
      `Mensaje: ${error.message || error}\n` +
      `Stack: ${error.stack || "sin stack"}\n` +
      "------------------------\n";

    const logPath = path.join(__dirname, "..", "error.log");
    try {
      fs.appendFileSync(logPath, logEntry, "utf8");
      console.log("⚠️ Error guardado en backend/error.log");
    } catch (fsErr) {
      console.error("⚠️ No se pudo escribir en error.log:", fsErr);
    }

    return (
      "⚠️ No se pudo generar el análisis automático con IA.\n" +
      "Detalle técnico: " +
      (error.message || "Error desconocido en Gemini. Revisa backend/error.log.")
    );
  }
}
