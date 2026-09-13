// backend/services/supabaseClient.js
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // ← CORRECTO

// Supabase solo se usa hoy para subir evidencias fotográficas de 5S — no es
// un requisito para que el resto del backend funcione, así que si no está
// configurado avisamos por consola pero no tiramos abajo todo el servidor.
export const supabase =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : (console.warn(
        "⚠️ Supabase no está configurado (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY). La subida de evidencias 5S no va a funcionar hasta que se configure."
      ),
      null);
