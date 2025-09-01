/* ===================================
   PANEL DE ADMINISTRACIÓN - LÓGICA COMPLETA
   =================================== */

// Variables globales admin
let todasLasSolicitudes = [];
let solicitudesFiltradas = [];
let currentAdmin = null;

// Configuración Supabase
const SUPABASE_URL = 'https://nxuvisaibpmdvraybzbm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54dXZpc2FpYnBtZHZyYXliemJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4OTMxNjQsImV4cCI6MjA3MTQ2OTE2NH0.OybYM_E3mWsZym7mEf-NiRtrG0svkylXx_q8Tivonfg';

const supabaseAdmin = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===================================
// INICIALIZACIÓN
// ===================================

document.addEventListener('DOMContentLoaded', async function () {
    console.log('Iniciando panel de administración...');

    // Verificar permisos de administrador
    currentAdmin = verificarPermisosAdmin();
    if (!currentAdmin) return;

    // Mostrar elementos según el rol
    configurarInterfazSegunRol(currentAdmin.rol);

    // Cargar todas las solicitudes
    await cargarTodasLasSolicitudes();

    // Configurar event listeners
    configurarEventListeners();
});

function verificarPermisosAdmin() {
    const session = sessionStorage.getItem('currentUser');
    if (!session) {
        window.location.href = 'login.html';
        return null;
    }

    try {
        const user = JSON.parse(session);
        if (user.rol !== 'admin' && user.rol !== 'super_admin') {
            alert('No tienes permisos para acceder al panel de administración');
            window.location.href = 'index.html';
            return null;
        }
        return user;
    } catch (error) {
        window.location.href = 'login.html';
        return null;
    }
}

function configurarInterfazSegunRol(rol) {
    if (rol === 'super_admin') {
        // Mostrar elementos exclusivos de super_admin
        document.querySelectorAll('.super-admin-only').forEach(element => {
            element.style.display = 'block';
        });
        console.log('Interfaz configurada para super_admin');
    }
}

function configurarEventListeners() {
    const filtroEstado = document.getElementById('filtroEstadoAdmin');
    const filtroTipo = document.getElementById('filtroTipoAdmin');
    const btnRecargar = document.getElementById('btnRecargarAdmin');

    if (filtroEstado) filtroEstado.addEventListener('change', filtrarSolicitudesAdmin);
    if (filtroTipo) filtroTipo.addEventListener('change', filtrarSolicitudesAdmin);
    if (btnRecargar) btnRecargar.addEventListener('click', recargarSolicitudes);
}

// ===================================
// CARGA DE DATOS (VERSIÓN SIMPLIFICADA FUNCIONAL)
// ===================================

async function cargarTodasLasSolicitudes() {
    try {
        console.log('Cargando solicitudes...');
        mostrarLoadingAdmin(true);

        // Query SUPER simplificada para debug
        const { data: solicitudes, error } = await supabaseAdmin
            .from('solicitudes')
            .select('*')
            .order('fecha_solicitud', { ascending: false });

        if (error) {
            console.error('Error de Supabase:', error);
            throw error;
        }

        console.log('Solicitudes cargadas:', solicitudes);

        todasLasSolicitudes = solicitudes || [];
        solicitudesFiltradas = [...todasLasSolicitudes];

        // Renderizar versión simple
        renderizarSolicitudesSimples(solicitudesFiltradas);
        actualizarEstadisticasAdmin(todasLasSolicitudes);

        mostrarLoadingAdmin(false);

    } catch (error) {
        console.error('Error completo:', error);
        mostrarErrorAdmin('Error al cargar solicitudes');
        mostrarLoadingAdmin(false);
    }
}

function renderizarSolicitudesSimples(solicitudes) {
    const lista = document.getElementById('solicitudesAdminLista');
    if (!lista) return;

    if (!solicitudes || solicitudes.length === 0) {
        lista.innerHTML = '<div class="no-solicitudes-admin"><p>No hay solicitudes</p></div>';
        return;
    }

    let html = '<div class="solicitudes-simples">';
    solicitudes.forEach(s => {
        html += `
            <div class="solicitud-simple" onclick="abrirModalRevision('${s.id}')" style="cursor: pointer;">
                <strong>#${s.id ? s.id.substring(0, 8) : 'N/A'}</strong> - 
                ${s.tipo || 'N/A'} - 
                <span class="estado-${s.estado || 'pendiente'}">${s.estado || 'N/A'}</span> -
                ${s.fecha_solicitud ? new Date(s.fecha_solicitud).toLocaleDateString() : 'N/A'}
            </div>
        `;
    });
    html += '</div>';

    lista.innerHTML = html;
}

function mostrarLoadingAdmin(show) {
    const loading = document.getElementById('loadingAdmin');
    const lista = document.getElementById('solicitudesAdminLista');

    if (loading) loading.style.display = show ? 'block' : 'none';
    if (lista) lista.style.display = show ? 'none' : 'block';
}

function mostrarErrorAdmin(mensaje) {
    const lista = document.getElementById('solicitudesAdminLista');
    if (lista) {
        lista.innerHTML = `
            <div class="error-admin">
                <p>${mensaje}</p>
                <button onclick="cargarTodasLasSolicitudes()" class="btn-admin-primary">Reintentar</button>
            </div>
        `;
    }
}



//FUNCION PARA ABRIR MODALES
async function abrirModalRevision(solicitudId) {
    try {
        console.log('Abriendo modal para:', solicitudId);
        
        // CONSULTA ESPECÍFICA CORREGIDA
        const { data: solicitud, error } = await supabaseAdmin
            .from('solicitudes')
            .select(`
                *,
                usuarios!solicitudes_usuario_id_fkey (
                    nombre,
                    departamento
                ),
                solicitud_detalles (
                    cantidad_solicitada,
                    cantidad_aprobada,
                    insumos!solicitud_detalles_insumo_id_fkey (
                        nombre,
                        unidad_medida
                    )
                )
            `)
            .eq('id', solicitudId)
            .single();

        if (error) throw error;
        if (!solicitud) {
            showNotificationAdmin('Solicitud no encontrada', 'error');
            return;
        }

        // RENDERIZADO CORRECTO
        const modalContent = `
            <div class="revision-completa">
                <!-- Información del usuario -->
                <div class="usuario-info">
                    <h4>👤 Información del Solicitante</h4>
                    <p><strong>Usuario:</strong> ${solicitud.usuarios?.nombre || 'N/A'}</p>
                    <p><strong>Área:</strong> ${solicitud.usuarios?.departamento || 'N/A'}</p>
                    <p><strong>Fecha Solicitud:</strong> ${new Date(solicitud.fecha_solicitud).toLocaleString()}</p>
                </div>

                <!-- Información del ticket -->
                <div class="ticket-info">
                    <h4>🎫 Detalles del Ticket</h4>
                    <p><strong>ID:</strong> ${solicitud.id.substring(0, 8)}</p>
                    <p><strong>Tipo:</strong> ${solicitud.tipo}</p>
                    <p><strong>Estado:</strong> ${solicitud.estado}</p>
                    <p><strong>Token Usado:</strong> ${solicitud.token_usado ? 'Sí' : 'No'}</p>
                    <p><strong>Total Items:</strong> ${solicitud.total_items}</p>
                </div>

                <!-- Insumos solicitados -->
                <div class="insumos-solicitados">
                    <h4>📦 Insumos Solicitados</h4>
                    ${solicitud.solicitud_detalles && solicitud.solicitud_detalles.length > 0 ? 
                        solicitud.solicitud_detalles.map(detalle => `
                            <div class="insumo-detalle">
                                <strong>${detalle.insumos?.nombre || 'Insumo'}:</strong>
                                ${detalle.cantidad_solicitada} ${detalle.insumos?.unidad_medida || 'unidades'}
                                ${detalle.cantidad_aprobada ? ` (Aprobado: ${detalle.cantidad_aprobada})` : ''}
                            </div>
                        `).join('') : 
                        '<p>No hay insumos registrados</p>'
                    }
                </div>

                <!-- Datos de juntas si aplica -->
                ${solicitud.datos_junta ? `
                    <div class="junta-info">
                        <h4>📅 Información del Evento</h4>
                        ${solicitud.datos_junta.fecha_evento ? `<p><strong>Fecha:</strong> ${solicitud.datos_junta.fecha_evento}</p>` : ''}
                        ${solicitud.datos_junta.hora_evento ? `<p><strong>Hora:</strong> ${solicitud.datos_junta.hora_evento}</p>` : ''}
                        ${solicitud.datos_junta.num_participantes ? `<p><strong>Participantes:</strong> ${solicitud.datos_junta.num_participantes}</p>` : ''}
                        ${solicitud.datos_junta.sala_ubicacion ? `<p><strong>Ubicación:</strong> ${solicitud.datos_junta.sala_ubicacion}</p>` : ''}
                        ${solicitud.datos_junta.descripcion ? `<p><strong>Descripción:</strong> ${solicitud.datos_junta.descripcion}</p>` : ''}
                    </div>
                ` : ''}

                <!-- Acciones -->
                <div class="acciones-ticket">
                    <button class="btn-admin-primary" onclick="cambiarEstadoSolicitud('${solicitud.id}', 'cerrado')">
                        ✅ Cerrar Ticket
                    </button>
                    <button class="btn-admin-secondary" onclick="cerrarModalRevision()">
                        ❌ Cerrar
                    </button>
                </div>
            </div>
        `;

        document.getElementById('detallesSolicitud').innerHTML = modalContent;
        document.getElementById('modalRevision').style.display = 'flex';

    } catch (error) {
        console.error('Error abriendo modal:', error);
        showNotificationAdmin('Error al cargar detalles de la solicitud', 'error');
    }
}


function cerrarModalRevision() {
    document.getElementById('modalRevision').style.display = 'none';
}

//ACTUALIZAR RENDERIZADO DE TARJETAS

function renderizarSolicitudesSimples(solicitudes) {
    const lista = document.getElementById('solicitudesAdminLista');
    if (!lista) return;
    
    if (!solicitudes || solicitudes.length === 0) {
        lista.innerHTML = '<div class="no-solicitudes-admin"><p>No hay solicitudes</p></div>';
        return;
    }
    
    let html = '<div class="solicitudes-simples">';
    
    solicitudes.forEach(s => {
        const fecha = s.fecha_solicitud ? new Date(s.fecha_solicitud).toLocaleDateString() : 'N/A';
        const tipoIcon = s.tipo === 'juntas' ? '👥' : '📅';
        const userName = s.usuarios?.nombre || 'Usuario';
        const userDepto = s.usuarios?.departamento || 'N/A';
        
        html += `
            <div class="solicitud-simple-card" onclick="abrirModalRevision('${s.id}')">
                <div class="solicitud-header">
                    <span class="solicitud-id">#${s.id.substring(0, 8)}</span>
                    <span class="solicitud-tipo ${s.tipo}">${tipoIcon} ${s.tipo}</span>
                </div>
                
                <div class="solicitud-body">
                    <p class="solicitud-usuario">${userName} (${userDepto})</p>
                    <p class="solicitud-estado estado-${s.estado}">${s.estado}</p>
                    <p class="solicitud-fecha">${fecha}</p>
                    <p class="solicitud-items">${s.total_items || 0} items</p>
                </div>
                
                <div class="solicitud-footer">
                    <span class="token-indicator ${s.token_usado ? 'used' : 'available'}">
                        ${s.token_usado ? '🔴 Token usado' : '🟢 Token disponible'}
                    </span>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    lista.innerHTML = html;
}


function getEstadoLabel(estado) {
    const labels = {
        'pendiente': 'Pendiente',
        'en_revision': 'En Revisión',
        'cerrado': 'Cerrado', 
        'cancelado': 'Cancelado'
    };
    return labels[estado] || estado;
}

// ===================================
// GESTIÓN DE ESTADOS DE SOLICITUDES
// ===================================

async function cambiarEstadoSolicitud(solicitudId, nuevoEstado) {
    try {
        console.log(`Cambiando estado de solicitud ${solicitudId} a: ${nuevoEstado}`);
        
        // Obtener el usuario admin actual desde sessionStorage
        const session = sessionStorage.getItem('currentUser');
        if (!session) {
            showNotificationAdmin('Sesión expirada. Por favor, inicia sesión again.', 'error');
            window.location.href = 'login.html';
            return;
        }
        
        const currentAdmin = JSON.parse(session);
        
        // Preparar datos de actualización
        const updateData = {
            estado: nuevoEstado,
            admin_asignado: currentAdmin.id,
            updated_at: new Date().toISOString()
        };
        
        // Agregar timestamps específicos según el estado
        if (nuevoEstado === 'en_revision') {
            updateData.fecha_revision = new Date().toISOString();
        } else if (nuevoEstado === 'cerrado') {
            updateData.fecha_cerrado = new Date().toISOString();
        }
        
        // Actualizar en la base de datos
        const { error } = await supabaseAdmin
            .from('solicitudes')
            .update(updateData)
            .eq('id', solicitudId);
            
        if (error) {
            console.error('Error de Supabase:', error);
            throw error;
        }
        
        // Mostrar notificación de éxito
        const estadoLabels = {
            'pendiente': 'Pendiente',
            'en_revision': 'En Revisión', 
            'cerrado': 'Cerrado',
            'cancelado': 'Cancelado'
        };
        
        showNotificationAdmin(`Estado cambiado a: ${estadoLabels[nuevoEstado] || nuevoEstado}`, 'success');
        
        // Actualizar los datos locales
        const solicitudIndex = todasLasSolicitudes.findIndex(s => s.id === solicitudId);
        if (solicitudIndex !== -1) {
            todasLasSolicitudes[solicitudIndex] = {
                ...todasLasSolicitudes[solicitudIndex],
                ...updateData
            };
            
            // Actualizar también en las solicitudes filtradas
            const filteredIndex = solicitudesFiltradas.findIndex(s => s.id === solicitudId);
            if (filteredIndex !== -1) {
                solicitudesFiltradas[filteredIndex] = {
                    ...solicitudesFiltradas[filteredIndex],
                    ...updateData
                };
            }
        }
        
        // Re-renderizar la lista
        renderizarSolicitudesSimples(solicitudesFiltradas);
        actualizarEstadisticasAdmin(todasLasSolicitudes);
        
        // Cerrar el modal después de cambiar el estado
        setTimeout(() => {
            cerrarModalRevision();
        }, 1000);
        
    } catch (error) {
        console.error('Error completo cambiando estado:', error);
        showNotificationAdmin('Error al cambiar el estado de la solicitud', 'error');
    }
}

// ===================================
// FILTRADO Y BÚSQUEDA
// ===================================

function filtrarSolicitudesAdmin() {
    const filtroEstado = document.getElementById('filtroEstadoAdmin');
    const filtroTipo = document.getElementById('filtroTipoAdmin');

    if (!filtroEstado || !filtroTipo) return;

    const estado = filtroEstado.value;
    const tipo = filtroTipo.value;

    solicitudesFiltradas = todasLasSolicitudes.filter(s => {
        let match = true;
        if (estado) match = match && s.estado === estado;
        if (tipo) match = match && s.tipo === tipo;
        return match;
    });

    renderizarSolicitudesSimples(solicitudesFiltradas);
}

function recargarSolicitudes() {
    cargarTodasLasSolicitudes();
}

// ===================================
// ESTADÍSTICAS
// ===================================

function actualizarEstadisticasAdmin(solicitudes) {
    if (!solicitudes) return;

    const stats = {
        pendientes: solicitudes.filter(s => s.estado === 'pendiente').length,
        revision: solicitudes.filter(s => s.estado === 'en_revision').length,
        cerradas: solicitudes.filter(s => s.estado === 'cerrado').length,
        total: solicitudes.length
    };

    // Actualizar elementos DOM si existen
    const updateElement = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    };

    updateElement('totalPendientes', stats.pendientes);
    updateElement('totalRevision', stats.revision);
    updateElement('totalCerradas', stats.cerradas);
    updateElement('totalItems', stats.total);
}

// ===================================
// NOTIFICACIONES
// ===================================

function showNotificationAdmin(message, type = 'info', duration = 3000) {
    // Crear notificación simple
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'error' ? '#ffebee' : '#e8f5e8'};
        color: ${type === 'error' ? '#c62828' : '#2e7d32'};
        padding: 12px 16px;
        border-radius: 4px;
        border: 1px solid ${type === 'error' ? '#ef5350' : '#66bb6a'};
        z-index: 10000;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, duration);
}

// ===================================
// MANEJO DE ERRORES GLOBALES
// ===================================

window.addEventListener('error', function (e) {
    console.error('Error global:', e.error);
    showNotificationAdmin('Error en la aplicación', 'error');
});

console.log('Admin.js cargado correctamente');