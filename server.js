require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PUERTO = process.env.PORT || 3000;

// Conexión a Neon
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Middleware para verificar token
const verificarToken = (req, res, next) => {
  const cabecera = req.headers['authorization'];
  if (!cabecera) return res.status(403).json({ error: 'Token requerido' });
  const token = cabecera.split(' ')[1];
  try {
    const datos = jwt.verify(token, process.env.JWT_SECRET);
    req.usuarioId = datos.id;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

// --- Autenticación ---
app.post('/api/registro', async (req, res) => {
  try {
    const { usuario, contrasena } = req.body;
    const hash = await bcrypt.hash(contrasena, 10);
    const resultado = await pool.query(
      'INSERT INTO usuarios (usuario, contrasena) VALUES ($1, $2) RETURNING id, usuario',
      [usuario, hash]
    );
    res.status(201).json(resultado.rows[0]);
  } catch (e) {
    res.status(400).json({ error: 'Usuario ya existe o datos inválidos' });
  }
});

app.post('/api/login', async (req, res) => {
  const { usuario, contrasena } = req.body;
  const resultado = await pool.query('SELECT * FROM usuarios WHERE usuario = $1', [usuario]);
  if (resultado.rows.length === 0) return res.status(401).json({ error: 'Usuario no encontrado' });
  
  const usuarioDB = resultado.rows[0];
  const valido = await bcrypt.compare(contrasena, usuarioDB.contrasena);
  if (!valido) return res.status(401).json({ error: 'Contraseña incorrecta' });
  
  const token = jwt.sign({ id: usuarioDB.id, usuario: usuarioDB.usuario }, process.env.JWT_SECRET, { expiresIn: '1d' });
  res.json({ token, usuario: usuarioDB.usuario });
});

// --- Acciones CRUD ---
app.get('/api/acciones', verificarToken, async (req, res) => {
  const resultado = await pool.query(
    'SELECT * FROM acciones WHERE usuario_id = $1 ORDER BY fecha DESC',
    [req.usuarioId]
  );
  res.json(resultado.rows);
});

app.post('/api/acciones', verificarToken, async (req, res) => {
  const { tipo_accion, descripcion, fecha, impacto } = req.body;
  const resultado = await pool.query(
    `INSERT INTO acciones (usuario_id, tipo_accion, descripcion, fecha, impacto)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [req.usuarioId, tipo_accion, descripcion, fecha, impacto]
  );
  res.status(201).json(resultado.rows[0]);
});

app.put('/api/acciones/:id', verificarToken, async (req, res) => {
  const { id } = req.params;
  const { tipo_accion, descripcion, fecha, impacto } = req.body;
  const resultado = await pool.query(
    `UPDATE acciones SET tipo_accion=$1, descripcion=$2, fecha=$3, impacto=$4
     WHERE id=$5 AND usuario_id=$6 RETURNING *`,
    [tipo_accion, descripcion, fecha, impacto, id, req.usuarioId]
  );
  if (resultado.rows.length === 0) return res.status(404).json({ error: 'Acción no encontrada' });
  res.json(resultado.rows[0]);
});

app.delete('/api/acciones/:id', verificarToken, async (req, res) => {
  const resultado = await pool.query(
    'DELETE FROM acciones WHERE id=$1 AND usuario_id=$2 RETURNING *',
    [req.params.id, req.usuarioId]
  );
  if (resultado.rows.length === 0) return res.status(404).json({ error: 'Acción no encontrada' });
  res.json({ mensaje: 'Eliminado correctamente' });
});

// --- Estadísticas ---
app.get('/api/estadisticas', verificarToken, async (req, res) => {
  const acciones = await pool.query(
    'SELECT * FROM acciones WHERE usuario_id = $1', [req.usuarioId]
  );
  
  let agua = 0, co2 = 0, materiales = 0, accionesReg = acciones.rows.length;
  
  acciones.rows.forEach(a => {
    const valor = parseFloat(a.impacto) || 0;
    if (a.tipo_accion === 'Ahorro de agua') agua += valor;
    if (a.tipo_accion === 'Transporte') co2 += valor;
    if (a.tipo_accion === 'Reciclaje') materiales += valor;
  });

  res.json({
    accionesRegistradas: accionesReg,
    litrosAgua: Math.round(agua),
    materialesReciclados: Math.round(materiales),
    kgCO2: Math.round(co2)
  });
});

app.listen(PUERTO, () => console.log(`Servidor en puerto ${PUERTO}`));