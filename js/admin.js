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
        console.log('Abriendo modal para solicitud:', solicitudId);

        const { data: solicitud, error } = await supabaseAdmin
            .from('solicitudes')
            .select(`
                *,
                usuarios:usuario_id(nombre, departamento),
                solicitud_detalles(
                    id,
                    cantidad_solicitada,
                    cantidad_aprobada,
                    notas,
                    insumos(id, nombre, unidad_medida, stock_actual)
                )
            `)
            .eq('id', solicitudId)
            .single();

        if (error) throw error;
        if (!solicitud) {
            showNotificationAdmin('Solicitud no encontrada', 'error');
            return;
        }

        const modalContent = `
            <div class="revision-completa">
                <!-- Información del solicitante -->
                <div class="usuario-info">
                    <h4>👤 Solicitud de: ${solicitud.usuarios?.nombre || 'N/A'}</h4>
                    <p><strong>Área:</strong> ${solicitud.usuarios?.departamento || 'N/A'}</p>
                    <p><strong>Fecha:</strong> ${new Date(solicitud.fecha_solicitud).toLocaleDateString()}</p>
                </div>

                <!-- Detalles del ticket -->
                <div class="ticket-info">
                    <h4>🎫 Detalles del ticket</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                        <div><strong>ID:</strong> ${solicitud.id.substring(0, 8)}</div>
                        <div><strong>Tipo:</strong> ${solicitud.tipo}</div>
                        <div><strong>Estado:</strong> 
                            <select id="nuevoEstado" style="margin-left: 0.5rem;">
                                <option value="pendiente" ${solicitud.estado === 'pendiente' ? 'selected' : ''}>⏳ Pendiente</option>
                                <option value="en_revision" ${solicitud.estado === 'en_revision' ? 'selected' : ''}>👀 En Revisión</option>
                                <option value="cerrado" ${solicitud.estado === 'cerrado' ? 'selected' : ''}>✅ Cerrado</option>                              
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Insumos solicitados con tabla como la imagen -->
                <div class="insumos-solicitados">
                    <h4>📦 Insumos solicitados</h4>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 1rem;">
                        <thead>
                            <tr style="background: #f8f9fa; text-align: left;">
                                <th style="padding: 0.5rem; border: 1px solid #ddd;">Nombre del producto</th>
                                <th style="padding: 0.5rem; border: 1px solid #ddd;">Cantidad solicitada</th>
                                <th style="padding: 0.5rem; border: 1px solid #ddd;">En inventario</th>
                                <th style="padding: 0.5rem; border: 1px solid #ddd;">Cantidad aprobada</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${solicitud.solicitud_detalles.map((detalle, index) => `
                                <tr>
                                    <td style="padding: 0.5rem; border: 1px solid #ddd;">
                                        <strong>${detalle.insumos?.nombre || 'N/A'}</strong>
                                    </td>
                                    <td style="padding: 0.5rem; border: 1px solid #ddd; text-align: center;">
                                        ${detalle.cantidad_solicitada}
                                    </td>
                                    <td style="padding: 0.5rem; border: 1px solid #ddd; text-align: center;">
                                        <span style="color: ${detalle.insumos.stock_actual >= detalle.cantidad_solicitada ? 'green' : 'red'};">
                                            ${detalle.insumos.stock_actual >= detalle.cantidad_solicitada ? '✓' : '⚠️'}
                                        </span> ${detalle.insumos.stock_actual}                                    </td>
                                    <td style="padding: 0.5rem; border: 1px solid #ddd;">
                                        <input type="number" 
                                            id="cantidad-${detalle.id}" 
                                            value="${detalle.cantidad_aprobada || Math.min(detalle.cantidad_solicitada, detalle.insumos.stock_actual)}" 
                                            min="0" 
                                            max="${detalle.insumos.stock_actual}"
                                            style="width: 80px; padding: 0.25rem; border: 1px solid #ddd; border-radius: 4px;"
                                            onchange="validarStock(this, ${detalle.insumos.stock_actual})">
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <!-- Información de juntas si aplica -->
                ${solicitud.datos_junta ? `
                    <div class="junta-info">
                        <h4>📅 Información del Evento</h4>
                        <p><strong>Fecha:</strong> ${solicitud.datos_junta.fecha_evento}</p>
                        <p><strong>Hora:</strong> ${solicitud.datos_junta.hora_evento}</p>
                        <p><strong>Participantes:</strong> ${solicitud.datos_junta.num_participantes}</p>
                        <p><strong>Ubicación:</strong> ${solicitud.datos_junta.sala_ubicacion}</p>
                        ${solicitud.datos_junta.descripcion ? `<p><strong>Descripción:</strong> ${solicitud.datos_junta.descripcion}</p>` : ''}
                    </div>
                ` : ''}
                

                <!-- Acciones -->
                <div class="acciones-ticket">
                    <button class="btn-admin-primary" onclick="guardarCambiosCompletos('${solicitud.id}')">
                        💾 Guardar Cambios
                    </button>
                    <button class="btn-admin-secondary" onclick="cerrarModalRevision()">
                        ❌ Cerrar
                    </button>
                </div>
            </div>
        `;

        document.getElementById('detallesSolicitud').innerHTML = modalContent;
        document.getElementById('modalRevision').style.display = 'flex';
        // Deshabilitar campos si ya está cerrado
        // Solo deshabilitar inputs de cantidad si está cerrado
        if (solicitud.estado === 'cerrado') {
            setTimeout(() => {
                document.querySelectorAll('[id^="cantidad-"]').forEach(input => {
                    input.disabled = true;
                    input.style.backgroundColor = '#f5f5f5';
                    input.title = 'No se pueden modificar cantidades de tickets cerrados';
                });
            }, 100);
        }

    } catch (error) {
        console.error('Error abriendo modal:', error);
        showNotificationAdmin('Error al cargar detalles', 'error');
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
        const tipo = s.tipo === 'juntas' ? '👥 Juntas' : '📅 Ordinaria';

        html += `
            <div class="solicitud-simple-card" onclick="abrirModalRevision('${s.id}')">
                <div class="solicitud-header">
                    <span class="solicitud-id">#${s.id.substring(0, 8)}</span>
                    <span class="solicitud-tipo ${s.tipo}">${tipo}</span>
                </div>
                <div class="solicitud-body">
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



async function guardarCambiosCompletos(solicitudId) {
    try {
        const nuevoEstado = document.getElementById('nuevoEstado').value;

        // Verificar estado actual del ticket
        const { data: solicitudActual, error: checkError } = await supabaseAdmin
            .from('solicitudes')
            .select('estado')
            .eq('id', solicitudId)
            .single();

        if (checkError) throw checkError;

        const yaEstabaCerrado = solicitudActual.estado === 'cerrado';
        const ahoraSeraCerrado = nuevoEstado === 'cerrado';

        // 1. Siempre actualizar el estado (sin restricciones)
        const updateData = { estado: nuevoEstado };

        if (nuevoEstado === 'en_revision') {
            updateData.fecha_revision = new Date().toISOString();
        }
        if (nuevoEstado === 'cerrado') {
            updateData.fecha_cerrado = new Date().toISOString();
        }

        const { error: solicitudError } = await supabaseAdmin
            .from('solicitudes')
            .update(updateData)
            .eq('id', solicitudId);

        if (solicitudError) throw solicitudError;

        // 2. Actualizar cantidades aprobadas (solo si no está deshabilitado)
        const detalles = document.querySelectorAll('[id^="cantidad-"]');
        for (const input of detalles) {
            if (!input.disabled) {
                const detalleId = input.id.replace('cantidad-', '');
                const cantidadAprobada = parseInt(input.value) || 0;

                const { error: detalleError } = await supabaseAdmin
                    .from('solicitud_detalles')
                    .update({ cantidad_aprobada: cantidadAprobada })
                    .eq('id', detalleId);

                if (detalleError) throw detalleError;
            }
        }

        // 3. SOLO descontar inventario si: NO estaba cerrado antes Y ahora SÍ está cerrado
        if (ahoraSeraCerrado && !yaEstabaCerrado) {
            await descontarInventario(solicitudId);
            showNotificationAdmin('Ticket cerrado e inventario actualizado', 'success');
        } else {
            showNotificationAdmin('Cambios guardados exitosamente', 'success');
        }

        cerrarModalRevision();
        recargarSolicitudes();

    } catch (error) {
        console.error('Error guardando:', error);
        showNotificationAdmin('Error al guardar cambios', 'error');
    }
}

async function descontarInventario(solicitudId) {
    try {
        // Query separada para obtener detalles con stock actual
        const { data: detalles } = await supabaseAdmin
            .from('solicitud_detalles')
            .select(`
                id,
                insumo_id,
                cantidad_aprobada,
                insumos!inner(stock_actual)
            `)
            .eq('solicitud_id', solicitudId);

        for (const detalle of detalles) {
            if (detalle.cantidad_aprobada > 0) {
                const stockAnterior = detalle.insumos.stock_actual;
                const stockNuevo = stockAnterior - detalle.cantidad_aprobada;

                // Actualizar stock
                await supabaseAdmin
                    .from('insumos')
                    .update({ stock_actual: stockNuevo })
                    .eq('id', detalle.insumo_id);

                // Registrar movimiento
                await supabaseAdmin
                    .from('inventario_movimientos')
                    .insert({
                        insumo_id: detalle.insumo_id,
                        tipo_movimiento: 'entrega',
                        cantidad: -detalle.cantidad_aprobada,
                        stock_anterior: stockAnterior,
                        stock_nuevo: stockNuevo,
                        referencia_id: solicitudId,
                        admin_id: currentAdmin.id
                    });
            }
        }
    } catch (error) {
        console.error('Error descontando inventario:', error);
        throw error;
    }
}


function validarStock(input, stockDisponible) {
    const cantidad = parseInt(input.value) || 0;
    if (cantidad > stockDisponible) {
        input.style.borderColor = 'red';
        showNotificationAdmin(`No hay suficiente stock. Disponible: ${stockDisponible}`, 'warning');
        input.value = stockDisponible; // Se queda en el máximo permitido
    } else {
        input.style.borderColor = '#ddd';
    }
}

// ===================================
// FILTRADO Y BÚSQUEDAS
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


/* ===================================
   EXPORTACIÓN Y REPORTES DE SOLICITUDES
   Adaptado de tu función de inventario
   =================================== */

// ===================================
// EXPORTACIÓN DE SOLICITUDES
// ===================================

async function exportarDatos() {
    try {
        const solicitudesParaExportar = solicitudesFiltradas.length > 0 ? solicitudesFiltradas : todasLasSolicitudes;
        
        if (!solicitudesParaExportar || solicitudesParaExportar.length === 0) {
            showNotificationAdmin('No hay solicitudes para exportar', 'warning');
            return;
        }

        // Mostrar loading
        const btnExportar = document.querySelector('[onclick="exportarDatos()"]');
        if (btnExportar) {
            btnExportar.innerHTML = '⏳ Exportando...';
            btnExportar.disabled = true;
        }

        // Obtener datos completos con detalles
        const solicitudesCompletas = await obtenerSolicitudesCompletas(solicitudesParaExportar);
        
        // Preparar datos para exportación
        const data = solicitudesCompletas.map(solicitud => ({
            'ID Solicitud': solicitud.id,
            'Fecha Solicitud': new Date(solicitud.fecha_solicitud).toLocaleDateString(),
            'Usuario': solicitud.usuarios?.nombre || 'N/A',
            'Área/Departamento': solicitud.usuarios?.departamento || 'N/A',
            'Tipo Solicitud': solicitud.tipo === 'juntas' ? 'Para Juntas' : 'Ordinaria',
            'Estado': getEstadoLabel(solicitud.estado),
            'Total Items': solicitud.solicitud_detalles?.length || 0,
            'Items Detallados': obtenerItemsDetallados(solicitud.solicitud_detalles),
            'Token Usado': solicitud.token_usado ? 'Sí' : 'No',
            'Fecha Revisión': solicitud.fecha_revision ? new Date(solicitud.fecha_revision).toLocaleDateString() : '',
            'Fecha Cerrado': solicitud.fecha_cerrado ? new Date(solicitud.fecha_cerrado).toLocaleDateString() : '',
            'Evento (si aplica)': solicitud.datos_junta ? `${solicitud.datos_junta.fecha_evento} - ${solicitud.datos_junta.descripcion || 'Sin descripción'}` : '',
            'Participantes': solicitud.datos_junta?.num_participantes || '',
            'Ubicación': solicitud.datos_junta?.sala_ubicacion || ''
        }));
        
        // Convertir a CSV usando tu función existente
        const csvContent = convertirACSV(data);
        
        // Agregar BOM para UTF-8 (como en tu función)
        const BOM = '\uFEFF';
        const contentWithBOM = BOM + csvContent;
        
        // Crear blob y descargar
        const blob = new Blob([contentWithBOM], { 
            type: 'text/csv;charset=utf-8;' 
        });
        
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        const fechaExportacion = new Date().toISOString().split('T')[0];
        const filtroActivo = obtenerDescripcionFiltros();
        
        link.setAttribute('href', url);
        link.setAttribute('download', `solicitudes_${filtroActivo}_${fechaExportacion}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Liberar memoria
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        showNotificationAdmin(`${data.length} solicitudes exportadas exitosamente`, 'success');
        
    } catch (error) {
        console.error('Error exportando solicitudes:', error);
        showNotificationAdmin('Error al exportar los datos', 'error');
    } finally {
        // Restaurar botón
        const btnExportar = document.querySelector('[onclick="exportarDatos()"]');
        if (btnExportar) {
            btnExportar.innerHTML = '📊 Exportar Datos';
            btnExportar.disabled = false;
        }
    }
}

async function obtenerSolicitudesCompletas(solicitudes) {
    try {
        const ids = solicitudes.map(s => s.id);
        
        const { data, error } = await supabaseAdmin
            .from('solicitudes')
            .select(`
                *,
                usuarios:usuario_id(nombre, departamento),
                solicitud_detalles(
                    cantidad_solicitada,
                    cantidad_aprobada,
                    insumos(nombre, unidad_medida)
                )
            `)
            .in('id', ids);
            
        if (error) throw error;
        return data || [];
        
    } catch (error) {
        console.error('Error obteniendo solicitudes completas:', error);
        return solicitudes; // Devolver datos básicos si falla
    }
}

function obtenerItemsDetallados(detalles) {
    if (!detalles || detalles.length === 0) return '';
    
    return detalles.map(detalle => 
        `${detalle.insumos?.nombre || 'N/A'}: ${detalle.cantidad_solicitada} ${detalle.insumos?.unidad_medida || ''}`
    ).join(' | ');
}

function obtenerDescripcionFiltros() {
    const filtroEstado = document.getElementById('filtroEstadoAdmin')?.value || '';
    const filtroTipo = document.getElementById('filtroTipoAdmin')?.value || '';
    
    let descripcion = 'todas';
    
    if (filtroEstado && filtroTipo) {
        descripcion = `${filtroEstado}_${filtroTipo}`;
    } else if (filtroEstado) {
        descripcion = filtroEstado;
    } else if (filtroTipo) {
        descripcion = filtroTipo;
    }
    
    return descripcion;
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
// REPORTE MENSUAL CON GRÁFICOS
// ===================================

let reporteData = null;
let mesActualReporte = new Date().getMonth() + 1;
let anoActualReporte = new Date().getFullYear();

function generarReporte() {
    // Mostrar modal de reporte
    document.getElementById('reporteModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    // Configurar selector de mes/año
    configurarSelectorFecha();
    
    // Generar reporte del mes actual
    generarReporteMes();
}

function configurarSelectorFecha() {
    const mesSelect = document.getElementById('selectorMes');
    const anoSelect = document.getElementById('selectorAno');
    
    if (mesSelect) {
        const meses = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        
        let htmlMeses = '';
        meses.forEach((mes, index) => {
            const selected = (index + 1) === mesActualReporte ? 'selected' : '';
            htmlMeses += `<option value="${index + 1}" ${selected}>${mes}</option>`;
        });
        mesSelect.innerHTML = htmlMeses;
    }
    
    if (anoSelect) {
        const anoActual = new Date().getFullYear();
        let htmlAnos = '';
        for (let ano = anoActual - 2; ano <= anoActual; ano++) {
            const selected = ano === anoActualReporte ? 'selected' : '';
            htmlAnos += `<option value="${ano}" ${selected}>${ano}</option>`;
        }
        anoSelect.innerHTML = htmlAnos;
    }
}

async function generarReporteMes() {
    try {
        // Mostrar loading
        document.getElementById('reporteLoading').style.display = 'block';
        document.getElementById('reporteContent').style.display = 'none';
        
        mesActualReporte = parseInt(document.getElementById('selectorMes').value);
        anoActualReporte = parseInt(document.getElementById('selectorAno').value);
        
        // Obtener datos del mes seleccionado
        const datosReporte = await obtenerDatosReporte(mesActualReporte, anoActualReporte);
        
        // Obtener datos del mes anterior para comparación
        let mesAnterior = mesActualReporte - 1;
        let anoAnterior = anoActualReporte;
        if (mesAnterior === 0) {
            mesAnterior = 12;
            anoAnterior = anoActualReporte - 1;
        }
        
        const datosComparacion = await obtenerDatosReporte(mesAnterior, anoAnterior);
        
        reporteData = {
            actual: datosReporte,
            anterior: datosComparacion,
            mes: mesActualReporte,
            ano: anoActualReporte
        };
        
        // Renderizar reporte
        await renderizarReporteCompleto();
        
        document.getElementById('reporteLoading').style.display = 'none';
        document.getElementById('reporteContent').style.display = 'block';
        
    } catch (error) {
        console.error('Error generando reporte:', error);
        showNotificationAdmin('Error generando reporte mensual', 'error');
    }
}

async function obtenerDatosReporte(mes, ano) {
    try {
        // Fechas del mes
        const fechaInicio = `${ano}-${mes.toString().padStart(2, '0')}-01`;
        const fechaFin = new Date(ano, mes, 0).toISOString().split('T')[0];
        
        // Solicitudes del mes
        const { data: solicitudes, error } = await supabaseAdmin
            .from('solicitudes')
            .select(`
                *,
                usuarios:usuario_id(departamento),
                solicitud_detalles(
                    cantidad_solicitada,
                    insumos(nombre, categoria_id, categorias_insumos(nombre))
                )
            `)
            .gte('fecha_solicitud', fechaInicio + 'T00:00:00')
            .lte('fecha_solicitud', fechaFin + 'T23:59:59');
        
        if (error) throw error;
        
        return procesarDatosReporte(solicitudes || []);
        
    } catch (error) {
        console.error('Error obteniendo datos de reporte:', error);
        return {
            totalSolicitudes: 0,
            solicitudesPorArea: {},
            solicitudesPorTipo: {},
            insumosMasSolicitados: {},
            estadisticas: {}
        };
    }
}

function procesarDatosReporte(solicitudes) {
    const reporte = {
        totalSolicitudes: solicitudes.length,
        solicitudesPorArea: {},
        solicitudesPorTipo: {
            'ordinaria': 0,
            'juntas': 0
        },
        solicitudesPorEstado: {
            'pendiente': 0,
            'en_revision': 0,
            'cerrado': 0,
            'cancelado': 0
        },
        insumosMasSolicitados: {},
        categoriasMasSolicitadas: {}
    };
    
    solicitudes.forEach(solicitud => {
        // Por área
        const area = solicitud.usuarios?.departamento || 'Sin área';
        reporte.solicitudesPorArea[area] = (reporte.solicitudesPorArea[area] || 0) + 1;
        
        // Por tipo
        reporte.solicitudesPorTipo[solicitud.tipo] = (reporte.solicitudesPorTipo[solicitud.tipo] || 0) + 1;
        
        // Por estado
        reporte.solicitudesPorEstado[solicitud.estado] = (reporte.solicitudesPorEstado[solicitud.estado] || 0) + 1;
        
        // Insumos más solicitados
        if (solicitud.solicitud_detalles) {
            solicitud.solicitud_detalles.forEach(detalle => {
                const insumo = detalle.insumos?.nombre || 'N/A';
                const cantidad = detalle.cantidad_solicitada || 0;
                reporte.insumosMasSolicitados[insumo] = (reporte.insumosMasSolicitados[insumo] || 0) + cantidad;
                
                // Por categoría
                const categoria = detalle.insumos?.categorias_insumos?.nombre || 'Sin categoría';
                reporte.categoriasMasSolicitadas[categoria] = (reporte.categoriasMasSolicitadas[categoria] || 0) + cantidad;
            });
        }
    });
    
    return reporte;
}

async function renderizarReporteCompleto() {
    const container = document.getElementById('reporteContent');
    if (!container || !reporteData) return;
    
    const mesNombre = obtenerNombreMes(reporteData.mes);
    const mesAnteriorNombre = obtenerNombreMes(reporteData.mes === 1 ? 12 : reporteData.mes - 1);
    
    let html = `
        <div class="reporte-header">
            <h3>📊 Reporte de ${mesNombre} ${reporteData.ano}</h3>
            <p>Comparación con ${mesAnteriorNombre}</p>
        </div>
        
        <!-- Resumen Ejecutivo -->
        <div class="reporte-seccion">
            <h4>📈 Resumen Ejecutivo</h4>
            <div class="stats-comparison">
                <div class="stat-comparison">
                    <span class="stat-label">Total Solicitudes</span>
                    <span class="stat-actual">${reporteData.actual.totalSolicitudes}</span>
                    <span class="stat-change">${calcularCambio(reporteData.actual.totalSolicitudes, reporteData.anterior.totalSolicitudes)}</span>
                </div>
            </div>
        </div>
        
        <!-- Solicitudes por Área -->
        <div class="reporte-seccion">
            <h4>🏢 Solicitudes por Área</h4>
            <div class="reporte-tabla-container">
                <canvas id="graficoAreas" width="400" height="200"></canvas>
                ${renderizarTablaPorArea()}
            </div>
        </div>
        
        <!-- Insumos Más Solicitados -->
        <div class="reporte-seccion">
            <h4>📦 Insumos Más Solicitados</h4>
            <div class="reporte-tabla-container">
                <canvas id="graficoInsumos" width="400" height="200"></canvas>
                ${renderizarTablaInsumos()}
            </div>
        </div>
        
        <!-- Análisis por Tipo -->
        <div class="reporte-seccion">
            <h4>📋 Análisis por Tipo de Solicitud</h4>
            ${renderizarTablaTipos()}
        </div>
        
        <!-- Acciones del Reporte -->
        <div class="reporte-acciones">
            <button class="btn-admin-primary" onclick="exportarReporte()">
                📊 Exportar Reporte Completo
            </button>
            <button class="btn-admin-secondary" onclick="generarReporteMes()">
                🔄 Actualizar Datos
            </button>
        </div>
    `;
    
    container.innerHTML = html;
    
    // Generar gráficos después de que el HTML esté renderizado
    setTimeout(() => {
        generarGraficoAreas();
        generarGraficoInsumos();
    }, 100);
}

function renderizarTablaPorArea() {
    const areas = Object.entries(reporteData.actual.solicitudesPorArea)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10); // Top 10 áreas
    
    let html = `
        <div class="reporte-tabla">
            <div class="tabla-header">
                <div>Área/Departamento</div>
                <div>Solicitudes</div>
                <div>Cambio vs Mes Anterior</div>
            </div>
    `;
    
    areas.forEach(([area, cantidad]) => {
        const cantidadAnterior = reporteData.anterior.solicitudesPorArea[area] || 0;
        const cambio = calcularCambio(cantidad, cantidadAnterior);
        
        html += `
            <div class="tabla-row">
                <div class="area-nombre">${area}</div>
                <div class="area-cantidad">${cantidad}</div>
                <div class="area-cambio ${cambio.startsWith('+') ? 'positivo' : cambio.startsWith('-') ? 'negativo' : 'neutral'}">${cambio}</div>
            </div>
        `;
    });
    
    html += '</div>';
    return html;
}

function renderizarTablaInsumos() {
    const insumos = Object.entries(reporteData.actual.insumosMasSolicitados)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15); // Top 15 insumos
    
    let html = `
        <div class="reporte-tabla">
            <div class="tabla-header">
                <div>Insumo</div>
                <div>Cantidad Total</div>
                <div>Cambio vs Mes Anterior</div>
            </div>
    `;
    
    insumos.forEach(([insumo, cantidad]) => {
        const cantidadAnterior = reporteData.anterior.insumosMasSolicitados[insumo] || 0;
        const cambio = calcularCambio(cantidad, cantidadAnterior);
        
        html += `
            <div class="tabla-row">
                <div class="insumo-nombre">${insumo}</div>
                <div class="insumo-cantidad">${cantidad}</div>
                <div class="insumo-cambio ${cambio.startsWith('+') ? 'positivo' : cambio.startsWith('-') ? 'negativo' : 'neutral'}">${cambio}</div>
            </div>
        `;
    });
    
    html += '</div>';
    return html;
}

function renderizarTablaTipos() {
    const tipoActual = reporteData.actual.solicitudesPorTipo;
    const tipoAnterior = reporteData.anterior.solicitudesPorTipo;
    
    return `
        <div class="reporte-tabla">
            <div class="tabla-header">
                <div>Tipo de Solicitud</div>
                <div>Cantidad</div>
                <div>Porcentaje</div>
                <div>Cambio vs Mes Anterior</div>
            </div>
            <div class="tabla-row">
                <div>📅 Ordinarias</div>
                <div>${tipoActual.ordinaria}</div>
                <div>${((tipoActual.ordinaria / reporteData.actual.totalSolicitudes) * 100).toFixed(1)}%</div>
                <div class="cambio">${calcularCambio(tipoActual.ordinaria, tipoAnterior.ordinaria || 0)}</div>
            </div>
            <div class="tabla-row">
                <div>👥 Para Juntas</div>
                <div>${tipoActual.juntas}</div>
                <div>${((tipoActual.juntas / reporteData.actual.totalSolicitudes) * 100).toFixed(1)}%</div>
                <div class="cambio">${calcularCambio(tipoActual.juntas, tipoAnterior.juntas || 0)}</div>
            </div>
        </div>
    `;
}

function calcularCambio(actual, anterior) {
    if (anterior === 0) {
        return actual > 0 ? `+${actual} (nuevo)` : '0';
    }
    
    const diferencia = actual - anterior;
    const porcentaje = ((diferencia / anterior) * 100).toFixed(1);
    
    if (diferencia > 0) {
        return `+${diferencia} (+${porcentaje}%)`;
    } else if (diferencia < 0) {
        return `${diferencia} (${porcentaje}%)`;
    } else {
        return '0 (=)';
    }
}

function obtenerNombreMes(numeroMes) {
    const meses = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return meses[numeroMes - 1] || 'Mes inválido';
}

// ===================================
// GRÁFICOS CON CHART.JS
// ===================================

function generarGraficoAreas() {
    const canvas = document.getElementById('graficoAreas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const areas = Object.entries(reporteData.actual.solicitudesPorArea)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8); // Top 8 áreas
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: areas.map(([area]) => area),
            datasets: [{
                label: 'Solicitudes',
                data: areas.map(([, cantidad]) => cantidad),
                backgroundColor: 'rgba(101, 113, 83, 0.7)',
                borderColor: 'rgba(101, 113, 83, 1)',
                borderWidth: 2,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Solicitudes por Área'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

function generarGraficoInsumos() {
    const canvas = document.getElementById('graficoInsumos');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const insumos = Object.entries(reporteData.actual.insumosMasSolicitados)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10); // Top 10 insumos
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: insumos.map(([insumo]) => insumo.length > 20 ? insumo.substring(0, 17) + '...' : insumo),
            datasets: [{
                data: insumos.map(([, cantidad]) => cantidad),
                backgroundColor: [
                    'rgba(101, 113, 83, 0.8)',
                    'rgba(138, 170, 121, 0.8)',
                    'rgba(177, 182, 194, 0.8)',
                    'rgba(131, 117, 105, 0.8)',
                    'rgba(52, 152, 219, 0.8)',
                    'rgba(155, 89, 182, 0.8)',
                    'rgba(241, 196, 15, 0.8)',
                    'rgba(230, 126, 34, 0.8)',
                    'rgba(231, 76, 60, 0.8)',
                    'rgba(46, 204, 113, 0.8)'
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Insumos Más Solicitados'
                },
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// ===================================
// EXPORTACIÓN DEL REPORTE
// ===================================

function exportarReporte() {
    if (!reporteData) {
        showNotificationAdmin('No hay datos de reporte para exportar', 'warning');
        return;
    }
    
    // Preparar datos del reporte para exportación
    const dataExportacion = [];
    
    // Resumen
    dataExportacion.push({
        'Sección': 'RESUMEN',
        'Concepto': 'Total Solicitudes',
        'Valor': reporteData.actual.totalSolicitudes,
        'Mes Anterior': reporteData.anterior.totalSolicitudes,
        'Cambio': calcularCambio(reporteData.actual.totalSolicitudes, reporteData.anterior.totalSolicitudes)
    });
    
    dataExportacion.push({}); // Fila vacía
    
    // Solicitudes por área
    dataExportacion.push({
        'Sección': 'POR ÁREA',
        'Concepto': '',
        'Valor': '',
        'Mes Anterior': '',
        'Cambio': ''
    });
    
    Object.entries(reporteData.actual.solicitudesPorArea)
        .sort((a, b) => b[1] - a[1])
        .forEach(([area, cantidad]) => {
            const anterior = reporteData.anterior.solicitudesPorArea[area] || 0;
            dataExportacion.push({
                'Sección': '',
                'Concepto': area,
                'Valor': cantidad,
                'Mes Anterior': anterior,
                'Cambio': calcularCambio(cantidad, anterior)
            });
        });
    
    dataExportacion.push({}); // Fila vacía
    
    // Insumos más solicitados
    dataExportacion.push({
        'Sección': 'INSUMOS MÁS SOLICITADOS',
        'Concepto': '',
        'Valor': '',
        'Mes Anterior': '',
        'Cambio': ''
    });
    
    Object.entries(reporteData.actual.insumosMasSolicitados)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .forEach(([insumo, cantidad]) => {
            const anterior = reporteData.anterior.insumosMasSolicitados[insumo] || 0;
            dataExportacion.push({
                'Sección': '',
                'Concepto': insumo,
                'Valor': cantidad,
                'Mes Anterior': anterior,
                'Cambio': calcularCambio(cantidad, anterior)
            });
        });
    
    // Usar tu función de exportación
    const csvContent = convertirACSV(dataExportacion);
    const BOM = '\uFEFF';
    const contentWithBOM = BOM + csvContent;
    
    const blob = new Blob([contentWithBOM], { 
        type: 'text/csv;charset=utf-8;' 
    });
    
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const mesNombre = obtenerNombreMes(reporteData.mes);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_${mesNombre}_${reporteData.ano}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => URL.revokeObjectURL(url), 100);
    
    showNotificationAdmin('Reporte exportado exitosamente', 'success');
}

function cerrarReporteModal() {
    document.getElementById('reporteModal').style.display = 'none';
    document.body.style.overflow = '';
}

// ===================================
// MANEJO DE ERRORES GLOBALES
// ===================================

window.addEventListener('error', function (e) {
    console.error('Error global:', e.error);
    showNotificationAdmin('Error en la aplicación', 'error');
});

console.log('Admin.js cargado correctamente');