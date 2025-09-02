/* ===================================
   SISTEMA DE INVENTARIO COMPLETO - inventario.js
   Gestión completa de stock, restock y reportes
   =================================== */

// Variables globales del inventario
let inventarioData = [];
let categoriasData = [];
let movimientosData = [];
let currentSuperAdmin = null;

// Configuración Supabase
const supabaseInventario = window.supabase.createClient(
    'https://nxuvisaibpmdvraybzbm.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54dXZpc2FpYnBtZHZyYXliemJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4OTMxNjQsImV4cCI6MjA3MTQ2OTE2NH0.OybYM_E3mWsZym7mEf-NiRtrG0svkylXx_q8Tivonfg'
);

// ===================================
// INICIALIZACIÓN DEL SISTEMA
// ===================================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🔄 Inicializando sistema de inventario...');
    
    try {
        // 1. Verificar permisos
        currentSuperAdmin = verificarPermisosSuperAdmin();
        if (!currentSuperAdmin) return;
        
        // 2. Cargar componentes UI
        await loadComponent('headerAdmin-container', 'includes/headerAdmin.html');
        
        // 3. Cargar datos iniciales
        await cargarDatosInventario();
        
        // 4. Configurar event listeners
        configurarEventListeners();
        
        console.log('✅ Sistema de inventario inicializado correctamente');
        
    } catch (error) {
        console.error('❌ Error inicializando inventario:', error);
        mostrarError('Error al cargar el sistema de inventario');
    }
});

function verificarPermisosSuperAdmin() {
    const session = sessionStorage.getItem('currentUser');
    if (!session) {
        window.location.href = 'login.html';
        return null;
    }
    
    try {
        const user = JSON.parse(session);
        if (user.rol !== 'super_admin' && user.rol !== 'admin') {
            alert('Solo los Administradores pueden acceder al inventario');
            window.location.href = 'admin.html';
            return null;
        }
        return user;
    } catch (error) {
        window.location.href = 'login.html';
        return null;
    }
}

// ===================================
// CARGA DE DATOS
// ===================================

async function cargarDatosInventario() {
    try {
        mostrarLoadingInventario(true);
        
        // Cargar inventario con categorías
        const { data: inventario, error: invError } = await supabaseInventario
            .from('insumos')
            .select(`
                *,
                categorias_insumos(id, nombre, icono, color)
            `)
            .eq('activo', true)
            .order('nombre');
        
        if (invError) throw invError;
        
        // Cargar categorías
        const { data: categorias, error: catError } = await supabaseInventario
            .from('categorias_insumos')
            .select('*')
            .eq('activo', true)
            .order('orden');
        
        if (catError) throw catError;
        
        inventarioData = inventario || [];
        categoriasData = categorias || [];
        
        // Renderizar datos
        await renderizarInventario();
        await cargarMovimientosRecientes();
        actualizarEstadisticasInventario();
        cargarFiltrosCategorias();
        
        mostrarLoadingInventario(false);
        
    } catch (error) {
        console.error('Error cargando inventario:', error);
        mostrarError('Error cargando datos del inventario');
        mostrarLoadingInventario(false);
    }
}

// ===================================
// RENDERIZADO DE INVENTARIO
// ===================================

async function renderizarInventario() {
    const tableBody = document.getElementById('inventarioTableBody');
    const alertasContainer = document.getElementById('listaAlertas');
    
    if (!tableBody) return;
    
    let html = '';
    let alertas = [];
    
    inventarioData.forEach(item => {
        const categoria = item.categorias_insumos;
        const stockStatus = getStockStatus(item.stock_actual, item.cantidad_warning);
        const estadoClass = getStockStatusClass(stockStatus);
        
        // Verificar alertas de stock crítico
        if (stockStatus === 'critico') {
            alertas.push({
                nombre: item.nombre,
                stock: item.stock_actual,
                minimo: item.cantidad_warning
            });
        }
        
        html += `
            <tr data-insumo="${item.id}">
                <td>
                    <div class="insumo-info">
                        <strong>${item.nombre}</strong>
                        ${item.descripcion ? `<br><small>${item.descripcion}</small>` : ''}
                    </div>
                </td>
                <td>
                    <div class="categoria-badge" style="background: ${categoria?.color || '#657153'}20; color: ${categoria?.color || '#657153'}">
                        ${categoria?.icono || '📦'} ${categoria?.nombre || 'Sin categoría'}
                    </div>
                </td>
                <td class="text-center">
                    <span class="stock-numero ${item.stock_actual <= item.cantidad_warning ? 'stock-bajo' : ''}">${item.stock_actual}</span>
                </td>
                <td class="text-center">${item.cantidad_warning}</td>
                <td class="text-center">
                    <span class="stock-status ${estadoClass}">${stockStatus.toUpperCase()}</span>
                </td>
                <td class="text-center">${item.unidad_medida}</td>
                <td class="text-center">
                    ${item.precio_unitario ? `$${parseFloat(item.precio_unitario).toFixed(2)}` : 'N/A'}
                </td>
                <td class="text-center">
                    <div class="acciones-inventario">
                        <button class="btn-inventario-action" onclick="abrirModalRestock('${item.id}')" title="Agregar Stock">
                            ➕
                        </button>
                        <button class="btn-inventario-action" onclick="verHistorialInsumo('${item.id}')" title="Ver Historial">
                            📊
                        </button>
                        <button class="btn-inventario-action" onclick="editarInsumo('${item.id}')" title="Editar">
                            ✏️
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
    
    // Mostrar/ocultar alertas
    const alertasSection = document.getElementById('alertasInventario');
    if (alertas.length > 0) {
        mostrarAlertas(alertas);
        alertasSection.style.display = 'block';
    } else {
        alertasSection.style.display = 'none';
    }
    
    document.getElementById('tablaInventario').style.display = 'block';
}

function mostrarAlertas(alertas) {
    const container = document.getElementById('listaAlertas');
    if (!container) return;
    
    let html = '<div class="alertas-list">';
    alertas.forEach(alerta => {
        html += `
            <div class="alerta-item">
                <span class="alerta-icon">⚠️</span>
                <div class="alerta-info">
                    <strong>${alerta.nombre}</strong>
                    <br>Stock: ${alerta.stock} | Mínimo: ${alerta.minimo}
                </div>
                <button class="btn-alerta-action" onclick="abrirModalRestock('${alerta.id}')">
                    Reabastecer
                </button>
            </div>
        `;
    });
    html += '</div>';
    
    container.innerHTML = html;
}

// ===================================
// FILTROS Y BÚSQUEDAS
// ===================================

function cargarFiltrosCategorias() {
    const select = document.getElementById('filtroCategoria');
    if (!select) return;
    
    let html = '<option value="">📂 Todas las categorías</option>';
    categoriasData.forEach(categoria => {
        html += `<option value="${categoria.id}">${categoria.icono} ${categoria.nombre}</option>`;
    });
    
    select.innerHTML = html;
}

function filtrarInventario() {
    const filtroCategoria = document.getElementById('filtroCategoria')?.value || '';
    const filtroEstadoStock = document.getElementById('filtroEstadoStock')?.value || '';
    
    let inventarioFiltrado = [...inventarioData];
    
    if (filtroCategoria) {
        inventarioFiltrado = inventarioFiltrado.filter(item => 
            item.categoria_id == filtroCategoria
        );
    }
    
    if (filtroEstadoStock) {
        inventarioFiltrado = inventarioFiltrado.filter(item => {
            const status = getStockStatus(item.stock_actual, item.cantidad_warning);
            return status === filtroEstadoStock;
        });
    }
    
    // Renderizar solo los items filtrados
    renderizarInventarioFiltrado(inventarioFiltrado);
}

function renderizarInventarioFiltrado(items) {
    const tableBody = document.getElementById('inventarioTableBody');
    if (!tableBody) return;
    
    if (items.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center">No se encontraron insumos</td></tr>';
        return;
    }
    
    let html = '';
    items.forEach(item => {
        const categoria = item.categorias_insumos;
        const stockStatus = getStockStatus(item.stock_actual, item.cantidad_warning);
        const estadoClass = getStockStatusClass(stockStatus);
        
        html += `
            <tr data-insumo="${item.id}">
                <td>
                    <div class="insumo-info">
                        <strong>${item.nombre}</strong>
                        ${item.descripcion ? `<br><small>${item.descripcion}</small>` : ''}
                    </div>
                </td>
                <td>
                    <div class="categoria-badge" style="background: ${categoria?.color || '#657153'}20; color: ${categoria?.color || '#657153'}">
                        ${categoria?.icono || '📦'} ${categoria?.nombre || 'Sin categoría'}
                    </div>
                </td>
                <td class="text-center">
                    <span class="stock-numero ${item.stock_actual <= item.cantidad_warning ? 'stock-bajo' : ''}">${item.stock_actual}</span>
                </td>
                <td class="text-center">${item.cantidad_warning}</td>
                <td class="text-center">
                    <span class="stock-status ${estadoClass}">${stockStatus.toUpperCase()}</span>
                </td>
                <td class="text-center">${item.unidad_medida}</td>
                <td class="text-center">
                    ${item.precio_unitario ? `$${parseFloat(item.precio_unitario).toFixed(2)}` : 'N/A'}
                </td>
                <td class="text-center">
                    <div class="acciones-inventario">
                        <button class="btn-inventario-action" onclick="abrirModalRestock('${item.id}')" title="Agregar Stock">
                            ➕
                        </button>
                        <button class="btn-inventario-action" onclick="verHistorialInsumo('${item.id}')" title="Ver Historial">
                            📊
                        </button>
                        <button class="btn-inventario-action" onclick="editarInsumo('${item.id}')" title="Editar">
                            ✏️
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
}

// ===================================
// MODAL DE RESTOCK
// ===================================

function abrirModalRestock(insumoId) {
    const insumo = inventarioData.find(i => i.id == insumoId);
    if (!insumo) return;
    
    // Cargar opciones de insumos en el select
    cargarInsumosEnSelect();
    
    // Pre-seleccionar el insumo si viene de un botón específico
    if (insumoId) {
        setTimeout(() => {
            document.getElementById('insumoSelect').value = insumoId;
            actualizarInfoInsumo();
        }, 100);
    }
    
    document.getElementById('restockModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function cargarInsumosEnSelect() {
    const select = document.getElementById('insumoSelect');
    if (!select) return;
    
    let html = '<option value="">Seleccionar insumo...</option>';
    inventarioData.forEach(insumo => {
        const stockStatus = getStockStatus(insumo.stock_actual, insumo.cantidad_warning);
        const indicador = stockStatus === 'critico' ? '🔴' : stockStatus === 'bajo' ? '🟡' : '🟢';
        
        html += `<option value="${insumo.id}">${indicador} ${insumo.nombre} (Stock: ${insumo.stock_actual})</option>`;
    });
    
    select.innerHTML = html;
}

function actualizarInfoInsumo() {
    const selectInsumo = document.getElementById('insumoSelect');
    const insumoId = selectInsumo.value;
    
    if (!insumoId) {
        document.getElementById('insumoInfoCard').style.display = 'none';
        return;
    }
    
    const insumo = inventarioData.find(i => i.id == insumoId);
    if (!insumo) return;
    
    document.getElementById('stockActual').textContent = insumo.stock_actual;
    document.getElementById('stockMinimo').textContent = insumo.cantidad_warning;
    document.getElementById('unidadMedida').textContent = insumo.unidad_medida;
    document.getElementById('insumoInfoCard').style.display = 'block';
    
    // Limpiar campos
    document.getElementById('cantidadAgregar').value = '';
    document.getElementById('nuevoStockPreview').style.display = 'none';
}

function calcularNuevoStock() {
    const selectInsumo = document.getElementById('insumoSelect');
    const cantidadInput = document.getElementById('cantidadAgregar');
    const insumoId = selectInsumo.value;
    const cantidad = parseInt(cantidadInput.value) || 0;
    
    if (!insumoId || cantidad === 0) {
        document.getElementById('nuevoStockPreview').style.display = 'none';
        return;
    }
    
    const insumo = inventarioData.find(i => i.id == insumoId);
    if (!insumo) return;
    
    const nuevoStock = insumo.stock_actual + cantidad;
    document.getElementById('nuevoStockCalculado').textContent = nuevoStock;
    document.getElementById('nuevoStockPreview').style.display = 'block';
}

async function confirmarRestock() {
    try {
        const insumoId = document.getElementById('insumoSelect').value;
        const cantidad = parseInt(document.getElementById('cantidadAgregar').value) || 0;
        const tipoMovimiento = document.getElementById('tipoMovimiento').value;
        const motivo = document.getElementById('motivoRestock').value.trim();
        
        // Validaciones
        if (!insumoId) {
            showNotificationInventario('Selecciona un insumo', 'warning');
            return;
        }
        
        if (cantidad <= 0) {
            showNotificationInventario('Ingresa una cantidad válida mayor a 0', 'warning');
            return;
        }
        
        if (!tipoMovimiento) {
            showNotificationInventario('Selecciona el tipo de movimiento', 'warning');
            return;
        }
        
        if (!motivo) {
            showNotificationInventario('Ingresa el motivo del restock', 'warning');
            return;
        }
        
        const insumo = inventarioData.find(i => i.id == insumoId);
        if (!insumo) throw new Error('Insumo no encontrado');
        
        const stockAnterior = insumo.stock_actual;
        const stockNuevo = stockAnterior + cantidad;
        
        // Deshabilitar botón
        const btnConfirmar = document.getElementById('btnConfirmarRestock');
        btnConfirmar.disabled = true;
        btnConfirmar.innerHTML = '⏳ Procesando...';
        
        // 1. Actualizar stock en insumos
        const { error: stockError } = await supabaseInventario
            .from('insumos')
            .update({ 
                stock_actual: stockNuevo,
                updated_at: new Date().toISOString()
            })
            .eq('id', insumoId);
        
        if (stockError) throw stockError;
        
        // 2. Registrar movimiento
        const { error: movError } = await supabaseInventario
            .from('inventario_movimientos')
            .insert({
                insumo_id: insumoId,
                tipo_movimiento: tipoMovimiento,
                cantidad: cantidad,
                stock_anterior: stockAnterior,
                stock_nuevo: stockNuevo,
                motivo: motivo,
                admin_id: currentSuperAdmin.id
            });
        
        if (movError) throw movError;
        
        // 3. Actualizar datos locales
        const insumoIndex = inventarioData.findIndex(i => i.id == insumoId);
        if (insumoIndex !== -1) {
            inventarioData[insumoIndex].stock_actual = stockNuevo;
        }
        
        // 4. Actualizar UI
        await renderizarInventario();
        actualizarEstadisticasInventario();
        await cargarMovimientosRecientes();
        
        showNotificationInventario(`Stock actualizado: ${insumo.nombre} (+${cantidad} ${insumo.unidad_medida})`, 'success');
        cerrarModalRestock();
        
    } catch (error) {
        console.error('Error en restock:', error);
        showNotificationInventario('Error al actualizar el stock', 'error');
        
        // Rehabilitar botón
        const btnConfirmar = document.getElementById('btnConfirmarRestock');
        btnConfirmar.disabled = false;
        btnConfirmar.innerHTML = '➕ Agregar Stock';
    }
}

function cerrarModalRestock() {
    document.getElementById('restockModal').style.display = 'none';
    document.body.style.overflow = '';
    
    // Limpiar formulario
    document.getElementById('insumoSelect').value = '';
    document.getElementById('cantidadAgregar').value = '';
    document.getElementById('tipoMovimiento').value = '';
    document.getElementById('motivoRestock').value = '';
    document.getElementById('insumoInfoCard').style.display = 'none';
    document.getElementById('nuevoStockPreview').style.display = 'none';
}

// ===================================
// REPORTES Y MOVIMIENTOS
// ===================================

async function cargarMovimientosRecientes() {
    try {
        const { data: movimientos, error } = await supabaseInventario
            .from('inventario_movimientos')
            .select(`
                *,
                insumos(nombre, unidad_medida),
                usuarios:admin_id(nombre)
            `)
            .order('fecha', { ascending: false })
            .limit(10);
        
        if (error) throw error;
        
        movimientosData = movimientos || [];
        renderizarMovimientosRecientes();
        
    } catch (error) {
        console.error('Error cargando movimientos:', error);
    }
}

function renderizarMovimientosRecientes() {
    const container = document.getElementById('movimientosRecientes');
    if (!container) return;
    
    if (movimientosData.length === 0) {
        container.innerHTML = '<p class="no-movimientos">No hay movimientos recientes</p>';
        return;
    }
    
    let html = '<div class="movimientos-list">';
    movimientosData.forEach(mov => {
        const tipoIcon = getTipoMovimientoIcon(mov.tipo_movimiento);
        const cantidad = mov.tipo_movimiento === 'entrega' ? mov.cantidad : Math.abs(mov.cantidad);
        const signo = mov.cantidad > 0 ? '+' : '';
        
        html += `
            <div class="movimiento-item ${mov.tipo_movimiento}">
                <div class="movimiento-icon">${tipoIcon}</div>
                <div class="movimiento-info">
                    <div class="movimiento-header">
                        <strong>${mov.insumos?.nombre || 'Insumo eliminado'}</strong>
                        <span class="movimiento-fecha">${new Date(mov.fecha).toLocaleDateString()}</span>
                    </div>
                    <div class="movimiento-detalles">
                        <span class="movimiento-tipo">${getTipoMovimientoLabel(mov.tipo_movimiento)}</span>
                        <span class="movimiento-cantidad ${mov.cantidad > 0 ? 'positivo' : 'negativo'}">
                            ${signo}${cantidad} ${mov.insumos?.unidad_medida || ''}
                        </span>
                    </div>
                    <div class="movimiento-stock">
                        Stock: ${mov.stock_anterior} → ${mov.stock_nuevo}
                    </div>
                    ${mov.motivo ? `<div class="movimiento-motivo">${mov.motivo}</div>` : ''}
                </div>
                <div class="movimiento-admin">
                    <small>Por: ${mov.usuarios?.nombre || 'Sistema'}</small>
                </div>
            </div>
        `;
    });
    html += '</div>';
    
    container.innerHTML = html;
}

function getTipoMovimientoIcon(tipo) {
    const icons = {
        'entrega': '📤',
        'restock': '📦',
        'ajuste': '⚙️',
        'perdida': '⚠️',
        'donacion': '🎁'
    };
    return icons[tipo] || '📊';
}

function getTipoMovimientoLabel(tipo) {
    const labels = {
        'entrega': 'Entrega',
        'restock': 'Restock',
        'ajuste': 'Ajuste',
        'perdida': 'Pérdida',
        'donacion': 'Donación'
    };
    return labels[tipo] || tipo;
}

// ===================================
// HISTORIAL COMPLETO
// ===================================

function verHistorialCompleto() {
    cargarHistorialCompleto();
    document.getElementById('historialModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

async function cargarHistorialCompleto() {
    try {
        const filtroTipo = document.getElementById('filtroTipoMovimiento')?.value || '';
        const filtroDesde = document.getElementById('filtroFechaDesde')?.value || '';
        const filtroHasta = document.getElementById('filtroFechaHasta')?.value || '';
        
        let query = supabaseInventario
            .from('inventario_movimientos')
            .select(`
                *,
                insumos(nombre, unidad_medida),
                usuarios:admin_id(nombre)
            `)
            .order('fecha', { ascending: false });
        
        if (filtroTipo) {
            query = query.eq('tipo_movimiento', filtroTipo);
        }
        
        if (filtroDesde) {
            query = query.gte('fecha', filtroDesde + 'T00:00:00');
        }
        
        if (filtroHasta) {
            query = query.lte('fecha', filtroHasta + 'T23:59:59');
        }
        
        const { data: movimientos, error } = await query.limit(100);
        
        if (error) throw error;
        
        renderizarHistorialCompleto(movimientos || []);
        
    } catch (error) {
        console.error('Error cargando historial completo:', error);
        showNotificationInventario('Error cargando historial', 'error');
    }
}

function renderizarHistorialCompleto(movimientos) {
    const container = document.getElementById('historialCompleto');
    if (!container) return;
    
    if (movimientos.length === 0) {
        container.innerHTML = '<p class="text-center">No se encontraron movimientos con los filtros aplicados</p>';
        return;
    }
    
    let html = '<div class="historial-tabla">';
    html += `
        <div class="historial-header">
            <div>Fecha</div>
            <div>Insumo</div>
            <div>Tipo</div>
            <div>Cantidad</div>
            <div>Stock</div>
            <div>Admin</div>
        </div>
    `;
    
    movimientos.forEach(mov => {
        const tipoIcon = getTipoMovimientoIcon(mov.tipo_movimiento);
        const cantidad = mov.tipo_movimiento === 'entrega' ? mov.cantidad : Math.abs(mov.cantidad);
        const signo = mov.cantidad > 0 ? '+' : '';
        
        html += `
            <div class="historial-row">
                <div class="historial-fecha">${new Date(mov.fecha).toLocaleDateString()}</div>
                <div class="historial-insumo">${mov.insumos?.nombre || 'N/A'}</div>
                <div class="historial-tipo">${tipoIcon} ${getTipoMovimientoLabel(mov.tipo_movimiento)}</div>
                <div class="historial-cantidad ${mov.cantidad > 0 ? 'positivo' : 'negativo'}">
                    ${signo}${cantidad}
                </div>
                <div class="historial-stock">${mov.stock_anterior} → ${mov.stock_nuevo}</div>
                <div class="historial-admin">${mov.usuarios?.nombre || 'Sistema'}</div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

function cerrarHistorialModal() {
    document.getElementById('historialModal').style.display = 'none';
    document.body.style.overflow = '';
}

// ===================================
// UTILIDADES Y HELPERS
// ===================================

function getStockStatus(stockActual, stockMinimo) {
    if (stockActual === 0) return 'critico';
    if (stockActual <= stockMinimo) return 'bajo';
    if (stockActual <= stockMinimo * 2) return 'normal';
    return 'alto';
}

function getStockStatusClass(status) {
    const classes = {
        'critico': 'status-critico',
        'bajo': 'status-bajo',
        'normal': 'status-normal',
        'alto': 'status-alto'
    };
    return classes[status] || 'status-normal';
}

function actualizarEstadisticasInventario() {
    const totalInsumos = inventarioData.length;
    const stockCritico = inventarioData.filter(item => 
        getStockStatus(item.stock_actual, item.cantidad_warning) === 'critico'
    ).length;
    
    const valorTotal = inventarioData.reduce((total, item) => {
        const precio = parseFloat(item.precio_unitario) || 0;
        return total + (item.stock_actual * precio);
    }, 0);
    
    document.getElementById('totalInsumos').textContent = totalInsumos;
    document.getElementById('stockCritico').textContent = stockCritico;
    document.getElementById('valorTotal').textContent = `$${valorTotal.toFixed(2)}`;
}

function actualizarInventario() {
    cargarDatosInventario();
}

function exportarInventario() {
    // Preparar datos para exportación
    const data = inventarioData.map(item => ({
        'Insumo': item.nombre,
        'Categoría': item.categorias_insumos?.nombre || 'Sin categoría',
        'Stock Actual': item.stock_actual,
        'Stock Mínimo': item.cantidad_warning,
        'Unidad': item.unidad_medida,
        'Precio Unitario': item.precio_unitario || 0,
        'Valor Total': (item.stock_actual * (item.precio_unitario || 0)).toFixed(2),
        'Estado': getStockStatus(item.stock_actual, item.cantidad_warning)
    }));
    
    // Convertir a CSV
    const csv = convertirACSV(data);
    
    // Descargar archivo
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `inventario_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotificationInventario('Inventario exportado exitosamente', 'success');
}

function convertirACSV(data) {
    if (!data || data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => {
            const value = row[header];
            // Escapar comillas y agregar comillas si contiene coma
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        }).join(','))
    ].join('\n');
    
    return csvContent;
}

function ocultarAlertas() {
    document.getElementById('alertasInventario').style.display = 'none';
}

function mostrarLoadingInventario(show) {
    const loading = document.getElementById('loadingInventario');
    const tabla = document.getElementById('tablaInventario');
    const sinInventario = document.getElementById('sinInventario');
    
    if (loading) loading.style.display = show ? 'block' : 'none';
    if (tabla) tabla.style.display = show ? 'none' : (inventarioData.length > 0 ? 'block' : 'none');
    if (sinInventario) sinInventario.style.display = show ? 'none' : (inventarioData.length === 0 ? 'block' : 'none');
}

function mostrarError(mensaje) {
    showNotificationInventario(mensaje, 'error');
}

function showNotificationInventario(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `notification-inventario notification-${type}`;
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
        display: flex;
        align-items: center;
        gap: 0.75rem;
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
        <span style="font-size: 1.2rem;">${icons[type] || icons.info}</span>
        <span style="flex: 1;">${message}</span>
        <button onclick="this.parentElement.remove()" style="background: none; border: none; font-size: 1.2rem; cursor: pointer; opacity: 0.7; padding: 0;">×</button>
    `;
    
    document.body.appendChild(notification);
    
    if (duration > 0) {
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }
        }, duration);
    }
}

// ===================================
// FUNCIONES ADICIONALES
// ===================================

function verHistorialInsumo(insumoId) {
    const insumo = inventarioData.find(i => i.id == insumoId);
    if (!insumo) return;
    
    // Mostrar modal de historial filtrado por este insumo específico
    cargarHistorialInsumo(insumoId);
    document.getElementById('historialModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

async function cargarHistorialInsumo(insumoId) {
    try {
        const { data: movimientos, error } = await supabaseInventario
            .from('inventario_movimientos')
            .select(`
                *,
                insumos(nombre, unidad_medida),
                usuarios:admin_id(nombre)
            `)
            .eq('insumo_id', insumoId)
            .order('fecha', { ascending: false })
            .limit(50);
        
        if (error) throw error;
        
        renderizarHistorialCompleto(movimientos || []);
        
    } catch (error) {
        console.error('Error cargando historial del insumo:', error);
        showNotificationInventario('Error cargando historial del insumo', 'error');
    }
}

function editarInsumo(insumoId) {
    // Placeholder para futura funcionalidad de edición
    showNotificationInventario('Funcionalidad de edición próximamente disponible', 'info');
}

function configurarEventListeners() {
    // Filtros
    const filtroCategoria = document.getElementById('filtroCategoria');
    const filtroEstadoStock = document.getElementById('filtroEstadoStock');
    
    if (filtroCategoria) {
        filtroCategoria.addEventListener('change', filtrarInventario);
    }
    
    if (filtroEstadoStock) {
        filtroEstadoStock.addEventListener('change', filtrarInventario);
    }
    
    // Campos del modal de restock
    const insumoSelect = document.getElementById('insumoSelect');
    const cantidadAgregar = document.getElementById('cantidadAgregar');
    
    if (insumoSelect) {
        insumoSelect.addEventListener('change', actualizarInfoInsumo);
    }
    
    if (cantidadAgregar) {
        cantidadAgregar.addEventListener('input', calcularNuevoStock);
    }
    
    // Filtros de historial
    const filtroTipoMovimiento = document.getElementById('filtroTipoMovimiento');
    const filtroFechaDesde = document.getElementById('filtroFechaDesde');
    const filtroFechaHasta = document.getElementById('filtroFechaHasta');
    
    if (filtroTipoMovimiento) {
        filtroTipoMovimiento.addEventListener('change', cargarHistorialCompleto);
    }
    
    if (filtroFechaDesde) {
        filtroFechaDesde.addEventListener('change', cargarHistorialCompleto);
    }
    
    if (filtroFechaHasta) {
        filtroFechaHasta.addEventListener('change', cargarHistorialCompleto);
    }
}

// ===================================
// GENERACIÓN DE REPORTES AVANZADOS
// ===================================

async function generarReporteMensual() {
    try {
        const fechaActual = new Date();
        const primerDiaMes = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 1);
        const ultimoDiaMes = new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 1, 0);
        
        const { data: movimientos, error } = await supabaseInventario
            .from('inventario_movimientos')
            .select(`
                *,
                insumos(nombre, categoria_id, categorias_insumos(nombre))
            `)
            .gte('fecha', primerDiaMes.toISOString())
            .lte('fecha', ultimoDiaMes.toISOString())
            .order('fecha', { ascending: false });
        
        if (error) throw error;
        
        // Procesar datos para el reporte
        const reporte = procesarDatosReporte(movimientos || []);
        mostrarReporteMensual(reporte);
        
    } catch (error) {
        console.error('Error generando reporte mensual:', error);
        showNotificationInventario('Error generando reporte mensual', 'error');
    }
}

function procesarDatosReporte(movimientos) {
    const reporte = {
        totalMovimientos: movimientos.length,
        movimientosPorTipo: {},
        movimientosPorCategoria: {},
        insumosAfectados: new Set(),
        fechaInicio: null,
        fechaFin: null
    };
    
    movimientos.forEach(mov => {
        // Contar por tipo
        reporte.movimientosPorTipo[mov.tipo_movimiento] = 
            (reporte.movimientosPorTipo[mov.tipo_movimiento] || 0) + 1;
        
        // Contar por categoría
        const categoria = mov.insumos?.categorias_insumos?.nombre || 'Sin categoría';
        reporte.movimientosPorCategoria[categoria] = 
            (reporte.movimientosPorCategoria[categoria] || 0) + 1;
        
        // Insumos únicos afectados
        if (mov.insumos?.nombre) {
            reporte.insumosAfectados.add(mov.insumos.nombre);
        }
        
        // Fechas
        const fecha = new Date(mov.fecha);
        if (!reporte.fechaInicio || fecha < reporte.fechaInicio) {
            reporte.fechaInicio = fecha;
        }
        if (!reporte.fechaFin || fecha > reporte.fechaFin) {
            reporte.fechaFin = fecha;
        }
    });
    
    reporte.totalInsumosAfectados = reporte.insumosAfectados.size;
    
    return reporte;
}

function mostrarReporteMensual(reporte) {
    let html = `
        <div class="reporte-mensual">
            <h3>📊 Reporte Mensual de Inventario</h3>
            <div class="reporte-stats">
                <div class="reporte-stat">
                    <span class="stat-number">${reporte.totalMovimientos}</span>
                    <span class="stat-label">Total Movimientos</span>
                </div>
                <div class="reporte-stat">
                    <span class="stat-number">${reporte.totalInsumosAfectados}</span>
                    <span class="stat-label">Insumos Afectados</span>
                </div>
            </div>
            
            <div class="reporte-seccion">
                <h4>Movimientos por Tipo</h4>
                <div class="reporte-lista">
    `;
    
    Object.entries(reporte.movimientosPorTipo).forEach(([tipo, cantidad]) => {
        const icon = getTipoMovimientoIcon(tipo);
        html += `
            <div class="reporte-item">
                <span>${icon} ${getTipoMovimientoLabel(tipo)}</span>
                <span class="reporte-valor">${cantidad}</span>
            </div>
        `;
    });
    
    html += `
                </div>
            </div>
            
            <div class="reporte-seccion">
                <h4>Movimientos por Categoría</h4>
                <div class="reporte-lista">
    `;
    
    Object.entries(reporte.movimientosPorCategoria).forEach(([categoria, cantidad]) => {
        html += `
            <div class="reporte-item">
                <span>📦 ${categoria}</span>
                <span class="reporte-valor">${cantidad}</span>
            </div>
        `;
    });
    
    html += `
                </div>
            </div>
        </div>
    `;
    
    // Mostrar en modal o nueva ventana
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>📊 Reporte Mensual</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
            </div>
            <div class="modal-body">
                ${html}
            </div>
            <div class="modal-actions">
                <button class="btn-admin-secondary" onclick="this.closest('.modal-overlay').remove()">
                    Cerrar
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'flex';
}

// ===================================
// MANEJO DE ERRORES GLOBALES
// ===================================

window.addEventListener('error', function(e) {
    console.error('Error en inventario:', e.error);
    showNotificationInventario('Error inesperado en el sistema de inventario', 'error');
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('Promise rechazada en inventario:', e.reason);
    showNotificationInventario('Error de conexión con la base de datos', 'error');
});

console.log('📦 Inventario.js cargado completamente');