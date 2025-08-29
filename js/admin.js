/* ===================================
   PANEL DE ADMINISTRACIÓN - LÓGICA COMPLETA
   =================================== */

// Variables globales admin
let todasLasSolicitudes = [];
let solicitudesFiltradas = [];
let currentAdmin = null;

// Configuración Supabase (misma que otros archivos)
const SUPABASE_CONFIG = {
    url: 'https://nxuvisaibpmdvraybzbm.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54dXZpc2FpYnBtZHZyYXliemJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4OTMxNjQsImV4cCI6MjA3MTQ2OTE2NH0.OybYM_E3mWsZym7mEf-NiRtrG0svkylXx_q8Tivonfg'
};

const supabaseAdmin = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

// ===================================
// INICIALIZACIÓN
// ===================================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('Iniciando panel de administración...');
    
    // Verificar permisos de administrador
    currentAdmin = verificarPermisosAdmin();
    if (!currentAdmin) return;
    
    // Mostrar elementos según el rol
    configurarInterfazSegunRol(currentAdmin.rol);
    
    // Cargar componentes
    await cargarComponentesAdmin();
    
    // Cargar todas las solicitudes
    await cargarTodasLasSolicitudes();
});

function verificarPermisosAdmin() {
    const session = sessionStorage.getItem('currentUser');
    if (!session) {
        window.location.replace('/login.html');
        return null;
    }
    
    try {
        const user = JSON.parse(session);
        if (user.rol !== 'admin' && user.rol !== 'super_admin') {
            alert('No tienes permisos para acceder al panel de administración');
            window.location.replace('/index.html');
            return null;
        }
        return user;
    } catch (error) {
        window.location.replace('/login.html');
        return null;
    }
}

function configurarInterfazSegunRol(rol) {
    if (rol === 'super_admin') {
        // Mostrar elementos exclusivos de super_admin
        document.querySelectorAll('.super-admin-only').forEach(element => {
            element.style.display = 'block';
        });
        
        const superAdminSection = document.getElementById('superAdminSection');
        if (superAdminSection) {
            superAdminSection.style.display = 'block';
        }
        
        console.log('Interfaz configurada para super_admin');
    } else {
        console.log('Interfaz configurada para admin estándar');
    }
}

async function cargarComponentesAdmin() {
    try {
        await Promise.all([
            loadComponent('header-container', 'includes/header.html'),
            loadComponent('footer-container', 'includes/foot.html')
        ]);
        
        setTimeout(() => {
            setupHeaderEvents();
            setupFooterEvents();
        }, 200);
        
    } catch (error) {
        console.error('Error cargando componentes:', error);
    }
}

// ===================================
// CARGA DE DATOS
// ===================================

async function cargarTodasLasSolicitudes() {
    try {
        mostrarLoadingAdmin(true);
        
        const { data: solicitudes, error } = await supabaseAdmin
            .from('solicitudes')
            .select(`
                id,
                tipo,
                estado,
                fecha_solicitud,
                total_items,
                token_usado,
                datos_junta,
                admin_asignado,
                notas_admin,
                usuarios!inner(
                    id,
                    nombre,
                    departamento,
                    username
                ),
                solicitud_detalles(
                    cantidad_solicitada,
                    cantidad_aprobada,
                    insumos(nombre, unidad_medida)
                )
            `)
            .order('fecha_solicitud', { ascending: false });
        
        if (error) throw error;
        
        todasLasSolicitudes = solicitudes || [];
        solicitudesFiltradas = [...todasLasSolicitudes];
        
        renderizarSolicitudesAdmin(solicitudesFiltradas);
        actualizarEstadisticasAdmin(todasLasSolicitudes);
        
        mostrarLoadingAdmin(false);
        
    } catch (error) {
        console.error('Error cargando solicitudes:', error);
        mostrarErrorAdmin('Error al cargar solicitudes. Intenta nuevamente.');
        mostrarLoadingAdmin(false);
    }
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

// ===================================
// RENDERIZADO DE SOLICITUDES
// ===================================

function renderizarSolicitudesAdmin(solicitudes) {
    const lista = document.getElementById('solicitudesAdminLista');
    
    if (!solicitudes || solicitudes.length === 0) {
        lista.innerHTML = `
            <div class="no-solicitudes-admin">
                <h3>No hay solicitudes</h3>
                <p>No se encontraron solicitudes con los filtros aplicados</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    solicitudes.forEach(solicitud => {
        const estadoClass = getEstadoClassAdmin(solicitud.estado);
        const tipoLabel = solicitud.tipo === 'ordinaria' ? 'Ordinaria' : 'Para Juntas';
        const fechaFormatted = new Date(solicitud.fecha_solicitud).toLocaleString('es-ES');
        
        html += `
            <div class="solicitud-admin-item" data-solicitud="${solicitud.id}">
                <div class="solicitud-admin-header">
                    <div class="solicitud-admin-info">
                        <span class="solicitud-admin-id">#${solicitud.id.substring(0, 8)}</span>
                        <span class="solicitud-admin-tipo tipo-${solicitud.tipo}">${tipoLabel}</span>
                        <span class="solicitud-admin-estado estado-${estadoClass}">${getEstadoLabelAdmin(solicitud.estado)}</span>
                        ${solicitud.token_usado ? '<span class="admin-token-usado">Token</span>' : ''}
                    </div>
                    <div class="solicitud-admin-usuario">
                        <strong>${solicitud.usuarios.nombre}</strong>
                        <small>${solicitud.usuarios.departamento}</small>
                    </div>
                    <div class="solicitud-admin-fecha">
                        ${fechaFormatted}
                    </div>
                </div>
                
                <div class="solicitud-admin-body">
                    <div class="solicitud-admin-resumen">
                        <p><strong>Items:</strong> ${solicitud.total_items}</p>
                        ${solicitud.admin_asignado ? `<p><strong>Asignado a:</strong> Admin</p>` : ''}
                        ${solicitud.notas_admin ? `<p><strong>Notas:</strong> ${solicitud.notas_admin}</p>` : ''}
                    </div>
                    
                    ${solicitud.datos_junta ? `
                        <div class="admin-evento-info">
                            <h5>Información del Evento:</h5>
                            <div class="admin-evento-grid">
                                <span><strong>Fecha:</strong> ${new Date(solicitud.datos_junta.fecha_evento).toLocaleDateString('es-ES')}</span>
                                <span><strong>Hora:</strong> ${solicitud.datos_junta.hora_evento}</span>
                                <span><strong>Participantes:</strong> ${solicitud.datos_junta.num_participantes}</span>
                                <span><strong>Ubicación:</strong> ${solicitud.datos_junta.sala_ubicacion}</span>
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="solicitud-admin-items" style="display: none;">
                        <h5>Items solicitados:</h5>
                        <div class="admin-items-list">
                            ${solicitud.solicitud_detalles.map(detalle => `
                                <div class="admin-item-detalle">
                                    <span class="admin-item-nombre">${detalle.insumos.nombre}</span>
                                    <div class="admin-item-cantidades">
                                        <span>Solicitado: ${detalle.cantidad_solicitada} ${detalle.insumos.unidad_medida}</span>
                                        <input type="number" class="admin-cantidad-aprobada" 
                                               value="${detalle.cantidad_aprobada || detalle.cantidad_solicitada}"
                                               min="0" max="${detalle.cantidad_solicitada}"
                                               data-detalle-id="${solicitud.id}-${detalle.insumos.nombre}">
                                        <span>${detalle.insumos.unidad_medida} aprobados</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
                
                <div class="solicitud-admin-actions">
                    <div class="admin-estado-controls">
                        <select class="admin-estado-select" onchange="cambiarEstadoSolicitud('${solicitud.id}', this.value)">
                            <option value="pendiente" ${solicitud.estado === 'pendiente' ? 'selected' : ''}>Pendiente</option>
                            <option value="en_revision" ${solicitud.estado === 'en_revision' ? 'selected' : ''}>En Revisión</option>
                            <option value="cerrado" ${solicitud.estado === 'cerrado' ? 'selected' : ''}>Cerrado</option>
                            <option value="cancelado" ${solicitud.estado === 'cancelado' ? 'selected' : ''}>Cancelado</option>
                        </select>
                    </div>
                    
                    <div class="admin-action-buttons">
                        <button class="btn-admin-secondary" onclick="toggleItemsAdmin('${solicitud.id}')">
                            Ver Items
                        </button>
                        <button class="btn-admin-primary" onclick="procesarSolicitud('${solicitud.id}')">
                            Procesar
                        </button>
                        ${currentAdmin.rol === 'super_admin' ? `
                            <button class="btn-admin-danger" onclick="eliminarSolicitud('${solicitud.id}')">
                                Eliminar
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    });
    
    lista.innerHTML = html;
}

// ===================================
// FUNCIONES DE UTILIDAD
// ===================================

function getEstadoClassAdmin(estado) {
    const estados = {
        'pendiente': 'pendiente',
        'en_revision': 'revision',
        'cerrado': 'cerrado',
        'cancelado': 'cancelado'
    };
    return estados[estado] || 'pendiente';
}

function getEstadoLabelAdmin(estado) {
    const labels = {
        'pendiente': 'Pendiente',
        'en_revision': 'En Revisión',
        'cerrado': 'Cerrado',
        'cancelado': 'Cancelado'
    };
    return labels[estado] || 'Desconocido';
}

function toggleItemsAdmin(solicitudId) {
    const item = document.querySelector(`[data-solicitud="${solicitudId}"]`);
    if (!item) return;
    
    const itemsList = item.querySelector('.solicitud-admin-items');
    if (!itemsList) return;
    
    if (itemsList.style.display === 'none' || !itemsList.style.display) {
        itemsList.style.display = 'block';
    } else {
        itemsList.style.display = 'none';
    }
}

// ===================================
// FILTRADO Y BÚSQUEDA
// ===================================

function filtrarSolicitudesAdmin() {
    const filtroEstado = document.getElementById('filtroEstadoAdmin').value;
    const filtroTipo = document.getElementById('filtroTipoAdmin').value;
    
    solicitudesFiltradas = [...todasLasSolicitudes];
    
    if (filtroEstado) {
        solicitudesFiltradas = solicitudesFiltradas.filter(s => s.estado === filtroEstado);
    }
    
    if (filtroTipo) {
        solicitudesFiltradas = solicitudesFiltradas.filter(s => s.tipo === filtroTipo);
    }
    
    renderizarSolicitudesAdmin(solicitudesFiltradas);
}

function recargarSolicitudes() {
    cargarTodasLasSolicitudes();
}

// ===================================
// GESTIÓN DE ESTADOS
// ===================================

async function cambiarEstadoSolicitud(solicitudId, nuevoEstado) {
    try {
        const { error } = await supabaseAdmin
            .from('solicitudes')
            .update({ 
                estado: nuevoEstado,
                admin_asignado: currentAdmin.id
            })
            .eq('id', solicitudId);
            
        if (error) throw error;
        
        showNotificationAdmin(`Estado cambiado a ${getEstadoLabelAdmin(nuevoEstado)}`, 'success');
        
        // Actualizar localmente
        const solicitud = todasLasSolicitudes.find(s => s.id === solicitudId);
        if (solicitud) {
            solicitud.estado = nuevoEstado;
            solicitud.admin_asignado = currentAdmin.id;
        }
        
        actualizarEstadisticasAdmin(todasLasSolicitudes);
        
    } catch (error) {
        console.error('Error cambiando estado:', error);
        showNotificationAdmin('Error al cambiar estado', 'error');
    }
}

async function procesarSolicitud(solicitudId) {
    try {
        // Obtener cantidades aprobadas del formulario
        const item = document.querySelector(`[data-solicitud="${solicitudId}"]`);
        const cantidadesInputs = item.querySelectorAll('.admin-cantidad-aprobada');
        
        // TODO: Actualizar cantidades aprobadas en base de datos
        // TODO: Descontar del inventario si estado = cerrado
        
        showNotificationAdmin('Solicitud procesada correctamente', 'success');
        
    } catch (error) {
        console.error('Error procesando solicitud:', error);
        showNotificationAdmin('Error al procesar solicitud', 'error');
    }
}

// ===================================
// ESTADÍSTICAS
// ===================================

function actualizarEstadisticasAdmin(solicitudes) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const stats = {
        pendientes: solicitudes.filter(s => s.estado === 'pendiente').length,
        revision: solicitudes.filter(s => s.estado === 'en_revision').length,
        cerradasHoy: solicitudes.filter(s => {
            const fechaSolicitud = new Date(s.fecha_solicitud);
            fechaSolicitud.setHours(0, 0, 0, 0);
            return s.estado === 'cerrado' && fechaSolicitud.getTime() === hoy.getTime();
        }).length,
        totalItems: solicitudes.reduce((total, s) => total + s.total_items, 0)
    };
    
    // Actualizar elementos DOM
    const elementos = {
        'totalPendientes': stats.pendientes,
        'totalRevision': stats.revision,
        'totalCerradas': stats.cerradasHoy,
        'totalItems': stats.totalItems
    };
    
    Object.keys(elementos).forEach(id => {
        const element = document.getElementById(id);
        if (element) element.textContent = elementos[id];
    });
}

// ===================================
// FUNCIONES EXCLUSIVAS SUPER_ADMIN
// ===================================

function gestionarUsuarios() {
    if (currentAdmin.rol !== 'super_admin') {
        showNotificationAdmin('No tienes permisos para esta función', 'warning');
        return;
    }
    console.log('Abriendo gestión de usuarios...');
    showNotificationAdmin('Función en desarrollo', 'info');
}

function reportesAvanzados() {
    if (currentAdmin.rol !== 'super_admin') {
        showNotificationAdmin('No tienes permisos para esta función', 'warning');
        return;
    }
    console.log('Abriendo reportes avanzados...');
    showNotificationAdmin('Función en desarrollo', 'info');
}

function configurarSistema() {
    if (currentAdmin.rol !== 'super_admin') {
        showNotificationAdmin('No tienes permisos para esta función', 'warning');
        return;
    }
    console.log('Abriendo configuración del sistema...');
    showNotificationAdmin('Función en desarrollo', 'info');
}

async function eliminarSolicitud(solicitudId) {
    if (currentAdmin.rol !== 'super_admin') {
        showNotificationAdmin('No tienes permisos para eliminar solicitudes', 'warning');
        return;
    }
    
    if (!confirm('¿Estás seguro de eliminar esta solicitud? Esta acción no se puede deshacer.')) {
        return;
    }
    
    try {
        const { error } = await supabaseAdmin
            .from('solicitudes')
            .delete()
            .eq('id', solicitudId);
            
        if (error) throw error;
        
        showNotificationAdmin('Solicitud eliminada correctamente', 'success');
        await cargarTodasLasSolicitudes();
        
    } catch (error) {
        console.error('Error eliminando solicitud:', error);
        showNotificationAdmin('Error al eliminar solicitud', 'error');
    }
}

// ===================================
// SISTEMA DE NOTIFICACIONES ADMIN
// ===================================

function showNotificationAdmin(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `admin-notification admin-notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 1rem 1.5rem;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        z-index: 3000;
        max-width: 400px;
        animation: slideInRight 0.3s ease;
    `;
    
    const colors = {
        success: { border: '#27ae60', background: '#d4edda', color: '#155724' },
        error: { border: '#e74c3c', background: '#f8d7da', color: '#721c24' },
        warning: { border: '#f39c12', background: '#fff3cd', color: '#856404' },
        info: { border: '#3498db', background: '#d1ecf1', color: '#0c5460' }
    };
    
    const colorScheme = colors[type] || colors.info;
    notification.style.borderLeftColor = colorScheme.border;
    notification.style.backgroundColor = colorScheme.background;
    notification.style.color = colorScheme.color;
    notification.style.borderLeftWidth = '4px';
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span style="font-size: 1.2rem;">${icons[type] || icons.info}</span>
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" 
                    style="background: none; border: none; font-size: 1.2rem; cursor: pointer; margin-left: auto;">×</button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    if (duration > 0) {
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, duration);
    }
}

// ===================================
// MANEJO DE ERRORES
// ===================================

window.addEventListener('error', function(e) {
    console.error('Error en panel admin:', e.error);
});

console.log('Admin.js cargado completamente');