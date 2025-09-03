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
   FILTRO POR ÁREA EN REPORTES
   Modificaciones a las funciones existentes
   =================================== */

// Variables adicionales para filtros
let areasDisponibles = [];
let areaSeleccionada = '';

// Modificar la función configurarSelectorFecha() existente
function configurarSelectorFecha() {
    const mesSelect = document.getElementById('selectorMes');
    const anoSelect = document.getElementById('selectorAno');
    const areaSelect = document.getElementById('selectorArea'); // NUEVO
    
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
    
    // NUEVO: Cargar áreas disponibles
    if (areaSelect) {
        cargarAreasDisponibles();
    }
}

// NUEVA función para cargar áreas
async function cargarAreasDisponibles() {
    try {
        const { data: areas, error } = await supabaseAdmin
            .from('usuarios')
            .select('departamento')
            .not('departamento', 'is', null);
            
        if (error) throw error;
        
        // Obtener áreas únicas
        areasDisponibles = [...new Set(areas.map(u => u.departamento))].sort();
        
        const areaSelect = document.getElementById('selectorArea');
        let htmlAreas = '<option value="">📂 Todas las áreas</option>';
        
        areasDisponibles.forEach(area => {
            htmlAreas += `<option value="${area}">${area}</option>`;
        });
        
        areaSelect.innerHTML = htmlAreas;
        
    } catch (error) {
        console.error('Error cargando áreas:', error);
    }
}

// Modificar la función obtenerDatosReporte() existente
async function obtenerDatosReporte(mes, ano, areaFiltro = '') {
    try {
        // Fechas del mes
        const fechaInicio = `${ano}-${mes.toString().padStart(2, '0')}-01`;
        const fechaFin = new Date(ano, mes, 0).toISOString().split('T')[0];
        
        // Query base
        let query = supabaseAdmin
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
        
        const { data: solicitudes, error } = await query;
        if (error) throw error;
        
        // Filtrar por área después de la consulta (más flexible)
        let solicitudesFiltradas = solicitudes || [];
        if (areaFiltro) {
            solicitudesFiltradas = solicitudesFiltradas.filter(s => 
                s.usuarios?.departamento === areaFiltro
            );
        }
        
        return procesarDatosReporte(solicitudesFiltradas);
        
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

// Modificar la función generarReporteMes() existente
async function generarReporteMes() {
    try {
        // Mostrar loading
        document.getElementById('reporteLoading').style.display = 'block';
        document.getElementById('reporteContent').style.display = 'none';
        
        mesActualReporte = parseInt(document.getElementById('selectorMes').value);
        anoActualReporte = parseInt(document.getElementById('selectorAno').value);
        areaSeleccionada = document.getElementById('selectorArea').value; // NUEVO
        
        // Obtener datos del mes seleccionado con filtro de área
        const datosReporte = await obtenerDatosReporte(mesActualReporte, anoActualReporte, areaSeleccionada);
        
        // Obtener datos del mes anterior para comparación
        let mesAnterior = mesActualReporte - 1;
        let anoAnterior = anoActualReporte;
        if (mesAnterior === 0) {
            mesAnterior = 12;
            anoAnterior = anoActualReporte - 1;
        }
        
        const datosComparacion = await obtenerDatosReporte(mesAnterior, anoAnterior, areaSeleccionada);
        
        reporteData = {
            actual: datosReporte,
            anterior: datosComparacion,
            mes: mesActualReporte,
            ano: anoActualReporte,
            area: areaSeleccionada // NUEVO
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

// Modificar renderizarReporteCompleto() para mostrar filtro activo
async function renderizarReporteCompleto() {
    const container = document.getElementById('reporteContent');
    if (!container || !reporteData) return;
    
    const mesNombre = obtenerNombreMes(reporteData.mes);
    const mesAnteriorNombre = obtenerNombreMes(reporteData.mes === 1 ? 12 : reporteData.mes - 1);
    
    // Título dinámico según filtros
    let tituloReporte = `Reporte de ${mesNombre} ${reporteData.ano}`;
    if (reporteData.area) {
        tituloReporte += ` - ${reporteData.area}`;
    }
    
    let html = `
        <div class="reporte-header">
            <h3>📊 ${tituloReporte}</h3>
            <p>Comparación con ${mesAnteriorNombre}</p>
            ${reporteData.area ? `<small class="filtro-activo">Filtrado por área: ${reporteData.area}</small>` : ''}
        </div>
        
        <!-- Resumen Ejecutivo -->
        <div class="reporte-seccion">
            <h4>📈 Resumen Ejecutivo</h4>
            <div class="stats-comparison">
                <div class="stat-comparison">
                    <span class="stat-label">Total Solicitudes</span>
                    <span class="stat-actual">${reporteData.actual.totalSolicitudes}</span>
                    <span class="stat-change ${getChangeClass(reporteData.actual.totalSolicitudes, reporteData.anterior.totalSolicitudes)}">
                        ${calcularCambioMejorado(reporteData.actual.totalSolicitudes, reporteData.anterior.totalSolicitudes)}
                    </span>
                </div>
            </div>
        </div>
        
        <!-- Solo mostrar "por área" si NO hay filtro de área específica -->
        ${!reporteData.area ? `
        <div class="reporte-seccion">
            <h4>🏢 Solicitudes por Área</h4>
            <div class="reporte-tabla-container">
                <div class="chart-container">
                    <canvas id="graficoAreas" width="400" height="300"></canvas>
                </div>
                ${renderizarTablaPorArea()}
            </div>
        </div>
        ` : ''}
        
        <!-- Insumos Más Solicitados -->
        <div class="reporte-seccion">
            <h4>📦 Insumos Más Solicitados ${reporteData.area ? `(${reporteData.area})` : ''}</h4>
            <div class="reporte-tabla-container">
                <div class="chart-container">
                    <canvas id="graficoInsumos" width="400" height="300"></canvas>
                </div>
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
        if (!reporteData.area) {
            generarGraficoAreas(); // Solo si no hay filtro de área
        }
        generarGraficoInsumos();
    }, 100);
}

// NUEVA función mejorada para cálculos
function calcularCambioMejorado(actual, anterior) {
    // Validaciones robustas
    if (anterior === null || anterior === undefined || anterior === 0) {
        return actual > 0 ? `+${actual} (nuevo)` : '0';
    }
    
    const diferencia = actual - anterior;
    
    if (diferencia === 0) {
        return '0 (sin cambio)';
    }
    
    const porcentaje = Math.abs((diferencia / anterior) * 100).toFixed(1);
    
    if (diferencia > 0) {
        return `+${diferencia} (+${porcentaje}%)`;
    } else {
        return `${diferencia} (-${porcentaje}%)`;
    }
}

function getChangeClass(actual, anterior) {
    if (!anterior || anterior === 0) return 'neutral';
    
    const diferencia = actual - anterior;
    if (diferencia > 0) return 'positivo';
    if (diferencia < 0) return 'negativo';
    return 'neutral';
}




// ===================================
// MANEJO DE ERRORES GLOBALES
// ===================================

window.addEventListener('error', function (e) {
    console.error('Error global:', e.error);
    showNotificationAdmin('Error en la aplicación', 'error');
});

console.log('Admin.js cargado correctamente');