// backend/middleware/tenantScope.js
//
// Corrige el hallazgo de seguridad: varios endpoints reciben `companyId` desde
// el cliente (query/body/params) y lo usan directo en el SQL, sin verificar
// que sea la empresa del usuario autenticado. Con esto, cualquier usuario
// autenticado podía, en teoría, leer datos de OTRA empresa cambiando ese valor.
//
// Uso: agrega este middleware DESPUÉS de verifyToken en cualquier ruta que
// reciba companyId (query, params o body).
//
//   router.get("/abc-xyz", verifyToken, enforceTenantScope, calcularAbcXyz);
//
// Si tu usuario superadmin necesita ver cualquier empresa, se contempla con
// el rol "superadmin" (ajusta el nombre del rol si en tu app se llama distinto).

export const enforceTenantScope = (req, res, next) => {
  const companyIdSolicitado =
    req.query.companyId || req.params.companyId || req.body?.companyId;

  const empresaDelToken = req.user?.empresa_id;

  // Si la ruta no pide companyId, no aplica esta validación.
  if (!companyIdSolicitado) return next();

  // Permite a superadmin operar sobre cualquier empresa.
  if (req.user?.rol === "superadmin") return next();

  if (String(companyIdSolicitado) !== String(empresaDelToken)) {
    return res.status(403).json({
      error: "No tienes permiso para consultar datos de esta empresa",
    });
  }

  next();
};
