import dotenv from "dotenv";
dotenv.config({ path: "C:/1OdraugSmartLogistics/a3mentor/backend/.env" });

import { GoogleGenAI } from "@google/genai";

if (!process.env.GEMINI_API_KEY) {
  console.error("❌ No se encontró GEMINI_API_KEY en el archivo .env");
  process.exit(1);
}

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function testGemini() {
  try {
    console.log("🚀 Enviando solicitud a Gemini (modelo 3.6-flash)...");

    const result = await genAI.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [{ role: "user", text: "Hola Gemini, prueba desde Node.js" }],
    });

    // ✅ Forma segura y limpia de acceder al texto
    const texto = result?.candidates?.[0]?.content?.parts?.[0]?.text || "Sin respuesta de Gemini";

    console.log("✅ Conexión correcta. Respuesta:");
    console.log(texto);
  } catch (error) {
    console.error("❌ ERROR desde Gemini:");
    console.error(error.message || error);
  }
}

testGemini();
