/* ===================================
   HISTORIAL DE SOLICITUDES - LÓGICA
   =================================== */

// Variables globales del historial
let solicitudesUsuario = [];
let solicitudSeleccionada = null;

// Configuración Supabase (usar misma que script.js)
const SUPABASE_CONFIG = {
    url: 'https://nxuvisaibpmdvraybzbm.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54dXZpc2FpYnBtZHZyYXliemJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4OTMxNjQsImV4cCI6MjA3MTQ2OTE2NH0.OybYM_E3mWsZym7mEf-NiRtrG0svkylXx_q8Tivonfg'
};

const supabaseHistorial = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

// ===================================
// INICIALIZACIÓN DE HISTORIAL
// ===================================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('Inicializando página de historial...');
    
    // Verificar autenticación
    const user = verificarSesion();
    if (!user) return;
    
    // Cargar componentes del header/footer
    await cargarComponentesHistorial();
    
    // Cargar estado del token del usuario
    actualizarEstadoToken();
    
    // Cargar historial de solicitudes
    await cargarHistorialSolicitudes();
});

function verificarSesion() {
    const session = sessionStorage.getItem('currentUser');
    if (!session) {
        console.log('No hay sesión, redirigiendo al login');
        window.location.replace('/login.html');
        return null;
    }
    
    try {
        return JSON.parse(session);
    } catch (error) {
        console.error('Error en sesión:', error);
        window.location.replace('/login.html');
        return null;
    }
}

async function cargarComponentesHistorial() {
    try {
        await Promise.all([
            loadComponent('header-container', 'includes/header.html'),
            loadComponent('footer-container', 'includes/footer.html')
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
// GESTIÓN DE TOKEN Y ESTADO
// ===================================

function actualizarEstadoToken() {
    const session = sessionStorage.getItem('currentUser');
    if (!session) return;
    
    const user = JSON.parse(session);
    const tokenStatus = document.getElementById('userTokenStatus');
    const tokenMessage = document.getElementById('tokenMessage');
    
    if (tokenStatus) {
        tokenStatus.textContent = user.token_disponible;
        tokenStatus.className = user.token_disponible === 1 ? 'token-available' : 'token-used';
    }
    
    if (tokenMessage) {
        if (user.token_disponible === 0) {
            tokenMessage.textContent = 'Marca tus solicitudes cerradas como "recibidas" para reactivar tu token';
            tokenMessage.style.color = '#e74c3c';
        } else {
            tokenMessage.textContent = 'Token disponible para solicitudes ordinarias';
            tokenMessage.style.color = '#27ae60';
        }
    }
}

// ===================================
// CARGA DE SOLICITUDES
// ===================================

async function cargarHistorialSolicitudes() {
    try {
        mostrarLoading(true);
        
        const session = sessionStorage.getItem('currentUser');
        const user = JSON.parse(session);
        
        // Obtener solicitudes del usuario con sus detalles
        const { data: solicitudes, error } = await supabaseHistorial
            .from('solicitudes')
            .select(`
                id,
                tipo,
                estado,
                fecha_solicitud,
                total_items,
                token_usado,
                admin_asignado,
                fecha_cerrado,
                notas_admin,
                solicitud_detalles!inner(
                    cantidad_solicitada,
                    cantidad_aprobada,
                    insumos(nombre, unidad_medida)
                )
            `)
            .eq('usuario_id', user.id)
            .order('fecha_solicitud', { ascending: false });
        
        if (error) throw error;
        
        solicitudesUsuario = solicitudes || [];
        
        // Renderizar solicitudes
        renderizarSolicitudes(solicitudesUsuario);
        
        mostrarLoading(false);
        
    } catch (error) {
        console.error('Error cargando historial:', error);
        mostrarError('Error al cargar el historial. Intenta nuevamente.');
        mostrarLoading(false);
    }
}

function mostrarLoading(show) {
    const loading = document.getElementById('loadingHistorial');
    const lista = document.getElementById('solicitudesLista');
    const vacio = document.getElementById('historialVacio');
    
    if (loading) loading.style.display = show ? 'block' : 'none';
    if (lista) lista.style.display = show ? 'none' : 'block';
    if (vacio) vacio.style.display = 'none';
}

function mostrarError(mensaje) {
    const lista = document.getElementById('solicitudesLista');
    if (lista) {
        lista.innerHTML = `
            <div class="error-message">
                <p>⚠️ ${mensaje}</p>
                <button onclick="cargarHistorialSolicitudes()" class="btn-secondary">Reintentar</button>
            </div>
        `;
    }
}

// ===================================
// RENDERIZADO DE SOLICITUDES
// ===================================

function renderizarSolicitudes(solicitudes) {
    const lista = document.getElementById('solicitudesLista');
    const vacio = document.getElementById('historialVacio');
    
    if (!solicitudes || solicitudes.length === 0) {
        lista.style.display = 'none';
        vacio.style.display = 'block';
        return;
    }
    
    lista.style.display = 'block';
    vacio.style.display = 'none';
    
    let html = '';
    
    solicitudes.forEach(solicitud => {
        const estadoClass = getEstadoClass(solicitud.estado);
        const tipoLabel = solicitud.tipo === 'ordinaria' ? 'Ordinaria' : 'Para Juntas';
        const fechaFormatted = new Date(solicitud.fecha_solicitud).toLocaleString('es-ES');
        
        // Verificar si puede marcar como recibido
        const puedeMarcarRecibido = solicitud.estado === 'cerrado' && !yaEstaRecibido(solicitud.id);
        
        html += `
            <div class="solicitud-item" data-solicitud="${solicitud.id}">
                <div class="solicitud-header">
                    <div class="solicitud-info">
                        <span class="solicitud-id">#${solicitud.id.substring(0, 8)}</span>
                        <span class="solicitud-tipo tipo-${solicitud.tipo}">${tipoLabel}</span>
                        <span class="solicitud-estado estado-${estadoClass}">${getEstadoLabel(solicitud.estado)}</span>
                    </div>
                    <div class="solicitud-fecha">
                        ${fechaFormatted}
                    </div>
                </div>
                
                <div class="solicitud-body">
                    <div class="solicitud-detalles">
                        <p><strong>Total de items:</strong> ${solicitud.total_items}</p>
                        ${solicitud.token_usado ? '<span class="token-usado">Token utilizado</span>' : ''}
                    </div>
                    
                    <div class="solicitud-insumos">
                        <h5>Insumos solicitados:</h5>
                        <ul class="insumos-list">
                            ${solicitud.solicitud_detalles.map(detalle => `
                                <li class="insumo-detalle">
                                    <span class="insumo-nombre">${detalle.insumos.nombre}</span>
                                    <span class="cantidades">
                                        Solicitado: ${detalle.cantidad_solicitada} ${detalle.insumos.unidad_medida}
                                        ${detalle.cantidad_aprobada ? 
                                            `| Entregado: ${detalle.cantidad_aprobada} ${detalle.insumos.unidad_medida}` : 
                                            ''
                                        }
                                    </span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                </div>
                
                <div class="solicitud-actions">
                    ${puedeMarcarRecibido ? `
                        <button class="btn-recibido" onclick="abrirModalRecibido('${solicitud.id}')">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M9 12l2 2 4-4"/>
                                <circle cx="12" cy="12" r="10"/>
                            </svg>
                            Marcar como Recibido
                        </button>
                    ` : ''}
                    
                    <button class="btn-secondary btn-sm" onclick="toggleDetalles('${solicitud.id}')">
                        Ver Detalles
                    </button>
                </div>
            </div>
        `;
    });
    
    lista.innerHTML = html;
}

// ===================================
// FUNCIONES DE UTILIDAD
// ===================================

function getEstadoClass(estado) {
    const estados = {
        'pendiente': 'pendiente',
        'en_revision': 'revision',
        'cerrado': 'cerrado',
        'cancelado': 'cancelado'
    };
    return estados[estado] || 'pendiente';
}

function getEstadoLabel(estado) {
    const labels = {
        'pendiente': 'Pendiente',
        'en_revision': 'En Revisión', 
        'cerrado': 'Cerrado',
        'cancelado': 'Cancelado'
    };
    return labels[estado] || 'Desconocido';
}

function yaEstaRecibido(solicitudId) {
    // TODO: Verificar en tabla solicitudes_recibidos
    return false;
}

// ===================================
// GESTIÓN DE FILTROS
// ===================================

function filtrarSolicitudes() {
    const filtroTipo = document.getElementById('filtroTipo').value;
    const filtroEstado = document.getElementById('filtroEstado').value;
    
    let solicitudesFiltradas = [...solicitudesUsuario];
    
    if (filtroTipo) {
        solicitudesFiltradas = solicitudesFiltradas.filter(s => s.tipo === filtroTipo);
    }
    
    if (filtroEstado) {
        solicitudesFiltradas = solicitudesFiltradas.filter(s => s.estado === filtroEstado);
    }
    
    renderizarSolicitudes(solicitudesFiltradas);
}

function recargarHistorial() {
    cargarHistorialSolicitudes();
}

// ===================================
// MARCAR COMO RECIBIDO
// ===================================

function abrirModalRecibido(solicitudId) {
    const solicitud = solicitudesUsuario.find(s => s.id === solicitudId);
    if (!solicitud) return;
    
    solicitudSeleccionada = solicitud;
    
    // Actualizar resumen en modal
    const resumen = document.getElementById('resumenSolicitud');
    if (resumen) {
        resumen.innerHTML = `
            <div class="resumen-content">
                <p><strong>Solicitud:</strong> #${solicitud.id.substring(0, 8)}</p>
                <p><strong>Tipo:</strong> ${solicitud.tipo === 'ordinaria' ? 'Ordinaria' : 'Para Juntas'}</p>
                <p><strong>Total items:</strong> ${solicitud.total_items}</p>
                <p><strong>Fecha:</strong> ${new Date(solicitud.fecha_solicitud).toLocaleString('es-ES')}</p>
            </div>
        `;
    }
    
    // Mostrar modal
    const modal = document.getElementById('recibido-modal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function cerrarModalRecibido() {
    const modal = document.getElementById('recibido-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
    solicitudSeleccionada = null;
}

async function confirmarRecibido() {
    if (!solicitudSeleccionada) return;
    
    try {
        const session = sessionStorage.getItem('currentUser');
        const user = JSON.parse(session);
        
        // Marcar como recibido en BD
        const { error: recibidoError } = await supabaseHistorial
            .from('solicitudes_recibidos')
            .insert({
                solicitud_id: solicitudSeleccionada.id,
                usuario_id: user.id,
                fecha_marcado_recibido: new Date().toISOString(),
                token_reactivado: solicitudSeleccionada.token_usado || false
            });
            
        if (recibidoError) throw recibidoError;
        
        // Si la solicitud usó token, reactivarlo inmediatamente
        if (solicitudSeleccionada.token_usado) {
            const { error: tokenError } = await supabaseHistorial
                .from('usuarios')
                .update({ token_disponible: 1 })
                .eq('id', user.id);
                
            if (tokenError) throw tokenError;
            
            // Actualizar sesión local
            user.token_disponible = 1;
            sessionStorage.setItem('currentUser', JSON.stringify(user));
            
            // Mostrar mensaje especial de reactivación
            showNotificationHistorial('¡Token reactivado! Ya puedes hacer nuevas solicitudes ordinarias', 'success');
        } else {
            showNotificationHistorial('Solicitud marcada como recibida exitosamente', 'success');
        }
        
        // Cerrar modal
        cerrarModalRecibido();
        
        // Actualizar estado del token
        actualizarEstadoToken();
        
        // Recargar historial
        setTimeout(() => {
            cargarHistorialSolicitudes();
        }, 1000);
        
    } catch (error) {
        console.error('Error marcando como recibido:', error);
        showNotificationHistorial('Error al marcar como recibido. Intenta nuevamente.', 'error');
    }
}

// ===================================
// FUNCIONES DE UI
// ===================================

function toggleDetalles(solicitudId) {
    const item = document.querySelector(`[data-solicitud="${solicitudId}"]`);
    if (!item) return;
    
    const insumos = item.querySelector('.solicitud-insumos');
    if (!insumos) return;
    
    if (insumos.style.display === 'none' || !insumos.style.display) {
        insumos.style.display = 'block';
    } else {
        insumos.style.display = 'none';
    }
}

function showNotificationHistorial(message, type = 'info', duration = 3000) {
    // Crear notificación similar a la del script.js
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
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
    
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span style="font-size: 1.2rem;">${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}</span>
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; font-size: 1.2rem; cursor: pointer; margin-left: auto;">×</button>
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
    console.error('Error en historial:', e.error);
});

console.log('Historial.js cargado completamente');