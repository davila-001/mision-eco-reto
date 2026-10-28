const URL_API = '/api';
let token = localStorage.getItem('token');

// --- Navegación entre secciones ---
document.querySelectorAll('.enlace-nav').forEach(enlace => {
  enlace.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelectorAll('.enlace-nav').forEach(el => el.classList.remove('activo'));
    enlace.classList.add('activo');
    
    const pagina = enlace.dataset.pagina;
    document.querySelectorAll('.seccion').forEach(s => s.classList.remove('activa'));
    document.getElementById(`seccion-${pagina}`).classList.add('activa');
    
    if (pagina === 'mis-acciones') cargarAcciones();
    if (pagina === 'inicio' || pagina === 'estadisticas') cargarEstadisticas();
  });
});

// --- Cambiar entre Login y Registro ---
function mostrarRegistro() {
  document.getElementById('form-login').style.display = 'none';
  document.getElementById('form-registro').style.display = 'block';
  document.getElementById('mensaje-error').textContent = '';
}
function mostrarLogin() {
  document.getElementById('form-registro').style.display = 'none';
  document.getElementById('form-login').style.display = 'block';
  document.getElementById('mensaje-error').textContent = '';
}

// --- Registrarse ---
async function registrarse() {
  const usuario = document.getElementById('nuevo-usuario').value;
  const contrasena = document.getElementById('nueva-contrasena').value;
  try {
    const res = await fetch(`${URL_API}/registro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario, contrasena })
    });
    const datos = await res.json();
    if (res.ok) {
      alert('¡Cuenta creada con éxito! Ahora inicia sesión ✅');
      mostrarLogin();
    } else {
      document.getElementById('mensaje-error').textContent = datos.error;
    }
  } catch {
    document.getElementById('mensaje-error').textContent = 'Error de conexión, revisa tu servidor';
  }
}

// --- Iniciar sesión ---
async function iniciarSesion() {
  const usuario = document.getElementById('usuario').value;
  const contrasena = document.getElementById('contrasena').value;
  const res = await fetch(`${URL_API}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usuario, contrasena })
  });
  const datos = await res.json();
  if (res.ok) {
    token = datos.token;
    localStorage.setItem('token', token);
    document.getElementById('pagina-login').classList.remove('activa');
    document.getElementById('pagina-principal').classList.add('activa');
    cargarEstadisticas();
  } else {
    document.getElementById('mensaje-error').textContent = datos.error;
  }
}

// --- Cerrar sesión ---
function cerrarSesion() {
  localStorage.removeItem('token');
  token = null;
  document.getElementById('pagina-principal').classList.remove('activa');
  document.getElementById('pagina-login').classList.add('activa');
  mostrarLogin();
}

// --- Cargar lista de acciones ---
async function cargarAcciones() {
  const res = await fetch(`${URL_API}/acciones`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const acciones = await res.json();
  const lista = document.getElementById('lista-acciones');
  lista.innerHTML = '';
  acciones.forEach(a => {
    lista.innerHTML += `
      <tr>
        <td>${a.id}</td>
        <td>${a.fecha}</td>
        <td>${a.tipo_accion}</td>
        <td>${a.descripcion}</td>
        <td>${a.impacto}</td>
        <td>
          <button class="btn-accion btn-editar" onclick="editarAccion(${a.id})">✏️</button>
          <button class="btn-accion btn-eliminar" onclick="eliminarAccion(${a.id})">🗑️</button>
        </td>
      </tr>`;
  });
}

// --- Guardar nueva acción ---
async function guardarAccion(e) {
  e.preventDefault();
  const datos = {
    tipo_accion: document.getElementById('tipo-accion').value,
    descripcion: document.getElementById('descripcion').value,
    fecha: document.getElementById('fecha').value,
    impacto: document.getElementById('impacto').value
  };
  await fetch(`${URL_API}/acciones`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(datos)
  });
  alert('✅ Acción guardada correctamente');
  e.target.reset();
  cargarEstadisticas();
  cargarAcciones();
}

// --- Preparar edición ---
async function editarAccion(id) {
  const res = await fetch(`${URL_API}/acciones`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const acciones = await res.json();
  const accion = acciones.find(a => a.id === id);
  
  document.getElementById('editar-id').value = accion.id;
  document.getElementById('editar-tipo').value = accion.tipo_accion;
  document.getElementById('editar-descripcion').value = accion.descripcion;
  document.getElementById('editar-fecha').value = accion.fecha;
  document.getElementById('editar-impacto').value = accion.impacto;
  
  document.querySelectorAll('.seccion').forEach(s => s.classList.remove('activa'));
  document.getElementById('seccion-editar').classList.add('activa');
}

// --- Actualizar acción editada ---
async function actualizarAccion(e) {
  e.preventDefault();
  const id = document.getElementById('editar-id').value;
  const datos = {
    tipo_accion: document.getElementById('editar-tipo').value,
    descripcion: document.getElementById('editar-descripcion').value,
    fecha: document.getElementById('editar-fecha').value,
    impacto: document.getElementById('editar-impacto').value
  };
  await fetch(`${URL_API}/acciones/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(datos)
  });
  alert('✅ Acción actualizada');
  document.querySelectorAll('.seccion').forEach(s => s.classList.remove('activa'));
  document.getElementById('seccion-mis-acciones').classList.add('activa');
  cargarAcciones();
  cargarEstadisticas();
}

// --- Cancelar edición ---
function cancelarEdicion() {
  document.querySelectorAll('.seccion').forEach(s => s.classList.remove('activa'));
  document.getElementById('seccion-mis-acciones').classList.add('activa');
}

// --- Eliminar acción ---
async function eliminarAccion(id) {
  if (!confirm('¿Seguro que quieres eliminar esta acción?')) return;
  await fetch(`${URL_API}/acciones/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  cargarAcciones();
  cargarEstadisticas();
}

// --- Cargar estadísticas ---
async function cargarEstadisticas() {
  if (!token) return;
  const res = await fetch(`${URL_API}/estadisticas`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const est = await res.json();
  
  // Tarjetas de inicio
  document.getElementById('est-acciones').textContent = est.accionesRegistradas;
  document.getElementById('est-agua').textContent = est.litrosAgua;
  document.getElementById('est-materiales').textContent = est.materialesReciclados;
  document.getElementById('est-co2').textContent = `${est.kgCO2} kg`;
  
  // Página de estadísticas
  document.getElementById('stat-acciones').textContent = est.accionesRegistradas;
  document.getElementById('stat-agua').textContent = `${est.litrosAgua} litros`;
  document.getElementById('stat-co2').textContent = `${est.kgCO2} kg`;
  document.getElementById('stat-materiales').textContent = `${est.materialesReciclados} kg`;
}

// --- Mantener sesión si ya se inició ---
if (token) {
  document.getElementById('pagina-login').classList.remove('activa');
  document.getElementById('pagina-principal').classList.add('activa');
  cargarEstadisticas();
}