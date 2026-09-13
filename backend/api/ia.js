import express from "express";
import fs from "fs";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { prompt, engine } = req.body;
    console.log("📩 Prompt recibido:", prompt);
    console.log("⚙️ Motor solicitado:", engine || "auto");

    if (!prompt) {
      return res.status(400).json({ error: "Falta el campo 'prompt'." });
    }

    // Detecta qué motores están disponibles según .env
    const openaiKey = process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    // Prioriza el motor solicitado o el primero disponible
    const selectedEngine =
      engine ||
      (openaiKey ? "openai" : geminiKey ? "gemini" : null);

    if (!selectedEngine) {
      return res.status(500).json({
        error: "No hay motores IA disponibles. Verifica las claves en el archivo .env",
      });
    }

    let texto = "Sin respuesta generada.";

    // 🚀 Ejecuta según motor seleccionado
    if (selectedEngine === "openai" && openaiKey) {
      console.log("🧠 Usando OpenAI GPT-4o-mini...");
      const client = new OpenAI({ apiKey: openaiKey });

      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Eres un experto en Lean, 5S y Kaizen." },
          { role: "user", content: prompt },
        ],
      });

      texto = completion.choices?.[0]?.message?.content || texto;
    } else if (selectedEngine === "gemini" && geminiKey) {
      console.log("🤖 Usando Gemini 3.6 Flash...");
      const genAI = new GoogleGenAI({ apiKey: geminiKey });

      const result = await genAI.models.generateContent({
        model: "gemini-3.6-flash",
        contents: [{ role: "user", text: prompt }],
      });

      texto = result?.candidates?.[0]?.content?.parts?.[0]?.text || texto;
    } else {
      throw new Error("No se pudo inicializar ningún motor IA válido.");
    }

    console.log(`✅ Respuesta generada por ${selectedEngine}:`, texto);
    res.json({ motor: selectedEngine, sugerencia: texto });
  } catch (error) {
    const errorInfo = `
❌ ERROR IA (${new Date().toLocaleString()}):
Nombre: ${error.name}
Mensaje: ${error.message}
Stack: ${error.stack}
------------------------
`;
    fs.appendFileSync("./error.log", errorInfo);
    console.error("⚠️ Error guardado en backend/error.log");
    res.status(500).json({ error: "Error al generar sugerencia IA" });
  }
});

export default router;
