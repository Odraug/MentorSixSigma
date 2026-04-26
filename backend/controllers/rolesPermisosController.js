import pool from "../db.js";

export const getRolesPermisosMatrix = async (req, res) => {
  try {

    const roles = await pool.query(`
      SELECT id, nombre
      FROM roles
      ORDER BY id
    `);

    const modulos = await pool.query(`
      SELECT id, nombre
      FROM modulos
      ORDER BY nombre
    `);

    const permisos = await pool.query(`
      SELECT rol_id, modulo_id
      FROM roles_modulos
      WHERE activo = true
    `);

    res.json({
      roles: roles.rows,
      modulos: modulos.rows,
      permisos: permisos.rows
    });

  } catch (err) {

    console.error(err);
    res.status(500).json({ error: "matrix error" });

  }
};

export const togglePermiso = async (req, res) => {

  const { rol_id, modulo_id } = req.body;

  try {

    const existe = await pool.query(`
      SELECT id
      FROM roles_modulos
      WHERE rol_id=$1 AND modulo_id=$2
    `,[rol_id, modulo_id]);

    if(existe.rows.length === 0){

      await pool.query(`
        INSERT INTO roles_modulos (rol_id, modulo_id, activo)
        VALUES ($1,$2,true)
      `,[rol_id, modulo_id]);

    }else{

      await pool.query(`
        UPDATE roles_modulos
        SET activo = NOT activo
        WHERE rol_id=$1 AND modulo_id=$2
      `,[rol_id, modulo_id]);

    }

    res.json({ok:true});

  } catch (err) {

    console.error(err);
    res.status(500).json({error:"toggle permiso error"});

  }

};