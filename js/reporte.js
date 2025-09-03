/* ===================================
   SISTEMA DE REPORTES - DESDE CERO
   js/reportes.js - Funcional y limpio
   =================================== */

// Variables específicas del sistema de reportes
let datosReporte = null;
let mesSeleccionado = new Date().getMonth() + 1;
let anoSeleccionado = new Date().getFullYear();
let areaSeleccionada = '';
let areasDisponibles = [];

// Configuración Supabase (reutilizar conexión)
const supabaseReportes = window.supabase.createClient(
    'https://nxuvisaibpmdvraybzbm.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54dXZpc2FpYnBtZHZyYXliemJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4OTMxNjQsImV4cCI6MjA3MTQ2OTE2NH0.OybYM_E3mWsZym7mEf-NiRtrG0svkylXx_q8Tivonfg'
);

// ===================================
// INICIALIZACIÓN DEL SISTEMA
// ===================================

function inicializarReportes() {
    console.log('Inicializando sistema de reportes...');
    
    // Configurar selectores iniciales
    configurarSelectores();
    
    // Cargar áreas disponibles
    cargarAreas();
}

function configurarSelectores() {
    // Configurar selector de mes
    const selectorMes = document.getElementById('selectorMes');
    if (selectorMes) {
        const meses = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        
        let html = '';
        meses.forEach((nombre, index) => {
            const valor = index + 1;
            const selected = valor === mesSeleccionado ? 'selected' : '';
            html += `<option value="${valor}" ${selected}>${nombre}</option>`;
        });
        
        selectorMes.innerHTML = html;
    }
    
    // Configurar selector de año
    const selectorAno = document.getElementById('selectorAno');
    if (selectorAno) {
        const anoActual = new Date().getFullYear();
        let html = '';
        
        for (let ano = anoActual - 2; ano <= anoActual; ano++) {
            const selected = ano === anoSeleccionado ? 'selected' : '';
            html += `<option value="${ano}" ${selected}>${ano}</option>`;
        }
        
        selectorAno.innerHTML = html;
    }
}

async function cargarAreas() {
    try {
        const { data: usuarios, error } = await supabaseReportes
            .from('usuarios')
            .select('departamento')
            .not('departamento', 'is', null);
        
        if (error) throw error;
        
        // Extraer departamentos únicos
        areasDisponibles = [...new Set(usuarios.map(u => u.departamento))].sort();
        
        const selectorArea = document.getElementById('selectorArea');
        if (selectorArea) {
            let html = '<option value="">Todas las áreas</option>';
            areasDisponibles.forEach(area => {
                html += `<option value="${area}">${area}</option>`;
            });
            selectorArea.innerHTML = html;
        }
        
    } catch (error) {
        console.error('Error cargando áreas:', error);
    }
}

// ===================================
// GENERACIÓN DEL REPORTE
// ===================================

async function ejecutarReporte() {
    try {
        // Obtener valores de los selectores
        mesSeleccionado = parseInt(document.getElementById('selectorMes').value);
        anoSeleccionado = parseInt(document.getElementById('selectorAno').value);
        areaSeleccionada = document.getElementById('selectorArea').value;
        
        // Mostrar loading
        mostrarLoadingReporte(true);
        
        // Obtener datos del período seleccionado
        const datosActual = await consultarSolicitudesPeriodo(mesSeleccionado, anoSeleccionado, areaSeleccionada);
        
        // Obtener datos del mes anterior para comparación
        let mesAnterior = mesSeleccionado - 1;
        let anoAnterior = anoSeleccionado;
        
        if (mesAnterior === 0) {
            mesAnterior = 12;
            anoAnterior = anoAnterior - 1;
        }
        
        const datosAnterior = await consultarSolicitudesPeriodo(mesAnterior, anoAnterior, areaSeleccionada);
        
        // Procesar datos para el reporte
        datosReporte = {
            periodo: {
                mes: mesSeleccionado,
                ano: anoSeleccionado,
                area: areaSeleccionada
            },
            actual: datosActual,
            anterior: datosAnterior
        };
        
        // Renderizar el reporte
        renderizarReporte();
        
        // Generar gráficos
        setTimeout(() => {
            crearGraficos();
        }, 200);
        
        mostrarLoadingReporte(false);
        
    } catch (error) {
        console.error('Error ejecutando reporte:', error);
        mostrarErrorReporte('Error generando el reporte');
        mostrarLoadingReporte(false);
    }
}

async function consultarSolicitudesPeriodo(mes, ano, area) {
    try {
        // Crear fechas del período
        const primerDia = new Date(ano, mes - 1, 1);
        const ultimoDia = new Date(ano, mes, 0);
        
        const fechaInicio = primerDia.toISOString().split('T')[0] + 'T00:00:00';
        const fechaFin = ultimoDia.toISOString().split('T')[0] + 'T23:59:59';
        
        // Consulta base a Supabase
        const { data: solicitudes, error } = await supabaseReportes
            .from('solicitudes')
            .select(`
                id,
                tipo,
                estado,
                fecha_solicitud,
                token_usado,
                usuarios:usuario_id(departamento),
                solicitud_detalles(
                    cantidad_solicitada,
                    cantidad_aprobada,
                    insumos(nombre)
                )
            `)
            .gte('fecha_solicitud', fechaInicio)
            .lte('fecha_solicitud', fechaFin);
        
        if (error) throw error;
        
        // Filtrar por área si está seleccionada
        let solicitudesFiltradas = solicitudes || [];
        if (area) {
            solicitudesFiltradas = solicitudesFiltradas.filter(s => 
                s.usuarios && s.usuarios.departamento === area
            );
        }
        
        return procesarSolicitudes(solicitudesFiltradas);
        
    } catch (error) {
        console.error('Error consultando solicitudes:', error);
        return getEstadisticasVacias();
    }
}

function procesarSolicitudes(solicitudes) {
    const estadisticas = {
        total: solicitudes.length,
        porArea: {},
        porTipo: { ordinaria: 0, juntas: 0 },
        porEstado: { pendiente: 0, en_revision: 0, cerrado: 0, cancelado: 0 },
        insumosSolicitados: {},
        tokenUsados: 0
    };
    
    solicitudes.forEach(solicitud => {
        // Contar por área
        const area = solicitud.usuarios?.departamento || 'Sin área';
        estadisticas.porArea[area] = (estadisticas.porArea[area] || 0) + 1;
        
        // Contar por tipo
        estadisticas.porTipo[solicitud.tipo] = (estadisticas.porTipo[solicitud.tipo] || 0) + 1;
        
        // Contar por estado
        estadisticas.porEstado[solicitud.estado] = (estadisticas.porEstado[solicitud.estado] || 0) + 1;
        
        // Contar tokens usados
        if (solicitud.token_usado) {
            estadisticas.tokenUsados++;
        }
        
        // Contar insumos solicitados
        if (solicitud.solicitud_detalles) {
            solicitud.solicitud_detalles.forEach(detalle => {
                const insumo = detalle.insumos?.nombre || 'Insumo desconocido';
                const cantidad = detalle.cantidad_solicitada || 0;
                estadisticas.insumosSolicitados[insumo] = (estadisticas.insumosSolicitados[insumo] || 0) + cantidad;
            });
        }
    });
    
    return estadisticas;
}

function getEstadisticasVacias() {
    return {
        total: 0,
        porArea: {},
        porTipo: { ordinaria: 0, juntas: 0 },
        porEstado: { pendiente: 0, en_revision: 0, cerrado: 0, cancelado: 0 },
        insumosSolicitados: {},
        tokenUsados: 0
    };
}

// ===================================
// RENDERIZADO DEL REPORTE
// ===================================

function renderizarReporte() {
    const container = document.getElementById('reporteContenido');
    if (!container || !datosReporte) return;
    
    const nombreMes = obtenerNombreMes(datosReporte.periodo.mes);
    const tituloArea = datosReporte.periodo.area ? ` - ${datosReporte.periodo.area}` : '';
    
    let html = `
        <!-- Header del reporte -->
        <div class="reporte-titulo">
            <h3>Reporte de ${nombreMes} ${datosReporte.periodo.ano}${tituloArea}</h3>
            <p>Comparación con mes anterior</p>
        </div>
        
        <!-- Estadísticas principales -->
        <div class="estadisticas-principales">
            ${crearTarjetaEstadistica('Total Solicitudes', datosReporte.actual.total, datosReporte.anterior.total)}
            ${crearTarjetaEstadistica('Tokens Usados', datosReporte.actual.tokenUsados, datosReporte.anterior.tokenUsados)}
            ${crearTarjetaEstadistica('Solicitudes Cerradas', datosReporte.actual.porEstado.cerrado, datosReporte.anterior.porEstado.cerrado)}
        </div>
        
        <!-- Solo mostrar por área si no hay filtro específico -->
        ${!datosReporte.periodo.area ? `
        <div class="seccion-reporte">
            <h4>Solicitudes por Área</h4>
            <div class="contenido-mixto">
                <div class="tabla-datos">
                    ${crearTablaPorAreas()}
                </div>
                <div class="grafico-container">
                    <canvas id="graficoAreas"></canvas>
                </div>
            </div>
        </div>
        ` : ''}
        
        <!-- Insumos más solicitados -->
        <div class="seccion-reporte">
            <h4>Insumos Más Solicitados</h4>
            <div class="contenido-mixto">
                <div class="tabla-datos">
                    ${crearTablaInsumos()}
                </div>
                <div class="grafico-container">
                    <canvas id="graficoInsumos"></canvas>
                </div>
            </div>
        </div>
        
        <!-- Acciones -->
        <div class="acciones-reporte">
            <button class="btn-reporte-exportar" onclick="exportarReporteCompleto()">
                Exportar Reporte CSV
            </button>
            <button class="btn-reporte-actualizar" onclick="ejecutarReporte()">
                Actualizar Datos
            </button>
        </div>
    `;
    
    container.innerHTML = html;
}

function crearTarjetaEstadistica(titulo, actual, anterior) {
    const cambio = calcularCambioSeguro(actual, anterior);
    const claseCambio = cambio.startsWith('+') ? 'positivo' : cambio.startsWith('-') ? 'negativo' : 'neutral';
    
    return `
        <div class="tarjeta-estadistica">
            <div class="estadistica-titulo">${titulo}</div>
            <div class="estadistica-numero">${actual}</div>
            <div class="estadistica-cambio ${claseCambio}">${cambio}</div>
        </div>
    `;
}

function crearTablaAnalisisTipo() {
    const tipoActual = datosReporte.actual.porTipo;
    const tipoAnterior = datosReporte.anterior.porTipo;
    const total = datosReporte.actual.total;
    
    return `
        <table class="tabla-reporte">
            <thead>
                <tr>
                    <th>Tipo</th>
                    <th>Cantidad</th>
                    <th>%</th>
                    <th>Cambio</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Ordinarias</td>
                    <td>${tipoActual.ordinaria}</td>
                    <td>${total > 0 ? ((tipoActual.ordinaria / total) * 100).toFixed(1) : 0}%</td>
                    <td class="cambio">${calcularCambioSeguro(tipoActual.ordinaria, tipoAnterior.ordinaria)}</td>
                </tr>
                <tr>
                    <td>Para Juntas</td>
                    <td>${tipoActual.juntas}</td>
                    <td>${total > 0 ? ((tipoActual.juntas / total) * 100).toFixed(1) : 0}%</td>
                    <td class="cambio">${calcularCambioSeguro(tipoActual.juntas, tipoAnterior.juntas)}</td>
                </tr>
            </tbody>
        </table>
    `;
}

function crearTablaPorAreas() {
    const areasOrdenadas = Object.entries(datosReporte.actual.porArea)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8); // Top 8 áreas
    
    let tbody = '';
    areasOrdenadas.forEach(([area, cantidad]) => {
        const anterior = datosReporte.anterior.porArea[area] || 0;
        const cambio = calcularCambioSeguro(cantidad, anterior);
        
        tbody += `
            <tr>
                <td class="area-nombre">${area}</td>
                <td class="area-cantidad">${cantidad}</td>
                <td class="area-cambio">${cambio}</td>
            </tr>
        `;
    });
    
    return `
        <table class="tabla-reporte">
            <thead>
                <tr>
                    <th>Área/Departamento</th>
                    <th>Solicitudes</th>
                    <th>Cambio</th>
                </tr>
            </thead>
            <tbody>
                ${tbody}
            </tbody>
        </table>
    `;
}

function crearTablaInsumos() {
    const insumosOrdenados = Object.entries(datosReporte.actual.insumosSolicitados)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10); // Top 10 insumos
    
    let tbody = '';
    insumosOrdenados.forEach(([insumo, cantidad]) => {
        const anterior = datosReporte.anterior.insumosSolicitados[insumo] || 0;
        const cambio = calcularCambioSeguro(cantidad, anterior);
        
        tbody += `
            <tr>
                <td class="insumo-nombre">${insumo}</td>
                <td class="insumo-cantidad">${cantidad}</td>
                <td class="insumo-cambio">${cambio}</td>
            </tr>
        `;
    });
    
    return `
        <table class="tabla-reporte">
            <thead>
                <tr>
                    <th>Insumo</th>
                    <th>Cantidad</th>
                    <th>Cambio</th>
                </tr>
            </thead>
            <tbody>
                ${tbody}
            </tbody>
        </table>
    `;
}

// ===================================
// GRÁFICOS CON CHART.JS
// ===================================

function crearGraficos() {
    if (!datosReporte.periodo.area) {
        crearGraficoAreas();
    }
    crearGraficoInsumos();
}


function crearGraficoAreas() {
    const canvas = document.getElementById('graficoAreas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const areas = Object.entries(datosReporte.actual.porArea)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6);
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: areas.map(([area]) => area),
            datasets: [{
                label: 'Solicitudes',
                data: areas.map(([, cantidad]) => cantidad),
                backgroundColor: '#657153',
                borderColor: '#8aaa79',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Solicitudes por Área'
                }
            }
        }
    });
}

function crearGraficoInsumos() {
    const canvas = document.getElementById('graficoInsumos');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const insumos = Object.entries(datosReporte.actual.insumosSolicitados)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);
    
    if (insumos.length === 0) {
        ctx.fillText('No hay datos de insumos', 50, 50);
        return;
    }
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: insumos.map(([insumo]) => insumo.length > 15 ? insumo.substring(0, 12) + '...' : insumo),
            datasets: [{
                data: insumos.map(([, cantidad]) => cantidad),
                backgroundColor: [
                    '#657153', '#8aaa79', '#b7b6c2', '#837569',
                    '#2c3e50', '#34495e', '#16a085', '#f39c12'
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
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
// EXPORTACIÓN
// ===================================

function exportarReporteCompleto() {
    if (!datosReporte) {
        alert('No hay datos para exportar');
        return;
    }
    
    const nombreMes = obtenerNombreMes(datosReporte.periodo.mes);
    const sufijo = datosReporte.periodo.area ? `_${datosReporte.periodo.area}` : '_todas_areas';
    
    // Preparar datos de exportación
    const datosExportacion = [];
    
    // Información del reporte
    datosExportacion.push({
        'Sección': 'INFORMACIÓN',
        'Concepto': 'Período',
        'Valor': `${nombreMes} ${datosReporte.periodo.ano}`,
        'Observaciones': datosReporte.periodo.area || 'Todas las áreas'
    });
    
    datosExportacion.push({
        'Sección': '',
        'Concepto': 'Total Solicitudes',
        'Valor': datosReporte.actual.total,
        'Observaciones': calcularCambioSeguro(datosReporte.actual.total, datosReporte.anterior.total)
    });
    
    datosExportacion.push({}); // Línea vacía
    
    // Datos por tipo
    datosExportacion.push({ 'Sección': 'POR TIPO', 'Concepto': '', 'Valor': '', 'Observaciones': '' });
    datosExportacion.push({
        'Sección': '',
        'Concepto': 'Ordinarias',
        'Valor': datosReporte.actual.porTipo.ordinaria,
        'Observaciones': calcularCambioSeguro(datosReporte.actual.porTipo.ordinaria, datosReporte.anterior.porTipo.ordinaria)
    });
    datosExportacion.push({
        'Sección': '',
        'Concepto': 'Para Juntas',
        'Valor': datosReporte.actual.porTipo.juntas,
        'Observaciones': calcularCambioSeguro(datosReporte.actual.porTipo.juntas, datosReporte.anterior.porTipo.juntas)
    });
    
    datosExportacion.push({}); // Línea vacía
    
    // Top insumos
    datosExportacion.push({ 'Sección': 'TOP INSUMOS', 'Concepto': '', 'Valor': '', 'Observaciones': '' });
    Object.entries(datosReporte.actual.insumosSolicitados)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .forEach(([insumo, cantidad]) => {
            const anterior = datosReporte.anterior.insumosSolicitados[insumo] || 0;
            datosExportacion.push({
                'Sección': '',
                'Concepto': insumo,
                'Valor': cantidad,
                'Observaciones': calcularCambioSeguro(cantidad, anterior)
            });
        });
    
    // Exportar usando la función existente
    exportarCSV(datosExportacion, `reporte_${nombreMes}_${datosReporte.periodo.ano}${sufijo}`);
}

function exportarCSV(data, nombreArchivo) {
    // Reutilizar tu función convertirACSV existente
    const csvContent = convertirACSV(data);
    const BOM = '\uFEFF';
    const contentWithBOM = BOM + csvContent;
    
    const blob = new Blob([contentWithBOM], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${nombreArchivo}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => URL.revokeObjectURL(url), 100);
    
    if (window.showNotificationAdmin) {
        showNotificationAdmin('Reporte exportado exitosamente', 'success');
    }
}


// Función faltante para convertir datos a CSV
function convertirACSV(data) {
    if (!data || data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => {
            const value = row[header];
            if (value === null || value === undefined) {
                return '';
            }
            
            const stringValue = value.toString();
            // Escapar comillas y caracteres problemáticos
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
                return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
        }).join(','))
    ].join('\r\n'); // \r\n para compatibilidad con Windows/Excel
    
    return csvContent;
}

// ===================================
// UTILIDADES
// ===================================

function obtenerNombreMes(numeroMes) {
    const meses = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return meses[numeroMes - 1] || `Mes ${numeroMes}`;
}

function calcularCambioSeguro(actual, anterior) {
    if (!anterior || anterior === 0) {
        return actual > 0 ? `+${actual}` : '0';
    }
    
    const diferencia = actual - anterior;
    if (diferencia === 0) return '0';
    
    const porcentaje = Math.abs((diferencia / anterior) * 100).toFixed(1);
    return diferencia > 0 ? `+${diferencia} (+${porcentaje}%)` : `${diferencia} (-${porcentaje}%)`;
}

function mostrarLoadingReporte(mostrar) {
    const loading = document.getElementById('reporteLoading');
    const contenido = document.getElementById('reporteContenido');
    
    if (loading) loading.style.display = mostrar ? 'block' : 'none';
    if (contenido) contenido.style.display = mostrar ? 'none' : 'block';
}

function mostrarErrorReporte(mensaje) {
    const contenido = document.getElementById('reporteContenido');
    if (contenido) {
        contenido.innerHTML = `
            <div class="error-reporte">
                <h4>Error generando reporte</h4>
                <p>${mensaje}</p>
                <button onclick="ejecutarReporte()">Reintentar</button>
            </div>
        `;
    }
}

function cerrarReporteModal() {
    document.getElementById('reporteModal').style.display = 'none';
    document.body.style.overflow = '';
}
// Función para abrir el modal (llamar desde admin.html)
function abrirReportes() {
    document.getElementById('reporteModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
    inicializarReportes();
}

function cerrarReportes() {
    document.getElementById('reporteModal').style.display = 'none';
    document.body.style.overflow = '';
}

console.log('Sistema de reportes cargado correctamente');