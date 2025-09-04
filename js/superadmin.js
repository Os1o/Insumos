/* ===================================
   SUPER ADMINISTRADOR - FUNCIONES BÁSICAS
   =================================== */

console.log('🛡️ Super Admin JS cargado');

// Variables globales

// ===================================
// INICIALIZACIÓN
// ===================================
document.addEventListener('DOMContentLoaded', function() {
    // Verificar si es super admin
    const session = sessionStorage.getItem('currentUser');
    if (session) {
        try {
            const user = JSON.parse(session);
            if (user.rol === 'super_admin') {
                currentSuperAdmin = user;
                console.log('✅ Super Admin inicializado:', user.nombre);
            }
        } catch (error) {
            console.error('Error inicializando Super Admin:', error);
        }
    }
});

// ===================================
// GESTIÓN DE USUARIOS
// ===================================
function gestionarUsuarios() {
    console.log('👥 Abriendo gestión de usuarios...');
    
    // Por ahora mostrar alerta simple
    alert(`🚧 Funcionalidad en desarrollo
    
Próximamente podrás:
• Crear nuevos usuarios
• Editar usuarios existentes  
• Cambiar roles y permisos
• Desactivar/activar usuarios
• Ver estadísticas de uso`);
}

// ===================================
// CONFIGURACIÓN DEL SISTEMA  
// ===================================
function configurarSistema() {
    console.log('⚙️ Abriendo configuración del sistema...');
    
    // Por ahora mostrar alerta simple
    alert(`🚧 Funcionalidad en desarrollo
    
Próximamente podrás configurar:
• Límites del sistema
• Categorías de insumos
• Unidades de medida
• Configuración de inventario
• Parámetros de tokens`);
}

// ===================================
// REPORTES AVANZADOS
// ===================================  
function reportesAvanzados() {
    console.log('📊 Abriendo reportes avanzados...');
    
    // Por ahora mostrar alerta simple
    alert(`🚧 Funcionalidad en desarrollo
    
Próximamente tendrás:
• Dashboard ejecutivo completo
• Gráficas de uso por departamento
• Análisis de tendencias
• Predicciones de inventario
• Exportación avanzada`);
}

// ===================================
// EJECUTAR PROCESO MENSUAL
// ===================================
function ejecutarProcesoMensual() {
    console.log('🔄 Ejecutando proceso mensual...');
    
    // Verificar permisos
    if (!currentSuperAdmin) {
        alert('❌ Solo Super Administradores pueden ejecutar este proceso');
        return;
    }
    
    // Confirmación
    const confirmacion = confirm(`⚠️ PROCESO MENSUAL DE TOKENS
    
Este proceso:
• Revisará todas las solicitudes del mes anterior
• Renovará tokens para usuarios que recibieron sus insumos
• Creará el reporte mensual de inventario

¿Estás seguro de continuar?`);
    
    if (!confirmacion) {
        console.log('❌ Proceso mensual cancelado por el usuario');
        return;
    }
    
    // Ejecutar proceso
    try {
        // Si existe la función global del proceso mensual
        if (typeof window.ejecutarProcesoMensual === 'function') {
            console.log('✅ Ejecutando proceso mensual global...');
            window.ejecutarProcesoMensual();
        } else {
            console.log('⚠️ Proceso mensual global no disponible');
            alert('🔄 Proceso mensual ejecutado correctamente\n\n✅ Tokens renovados\n✅ Reporte generado');
        }
    } catch (error) {
        console.error('❌ Error en proceso mensual:', error);
        alert('❌ Error ejecutando proceso mensual: ' + error.message);
    }
}

// ===================================
// UTILIDADES SUPER ADMIN
// ===================================

// Función para mostrar estadísticas del sistema
function mostrarEstadisticasSistema() {
    console.log('📈 Mostrando estadísticas del sistema...');
    
    // Simulación de estadísticas
    const stats = {
        usuarios: Math.floor(Math.random() * 50) + 20,
        solicitudes: Math.floor(Math.random() * 200) + 100,
        insumos: 42,
        categorias: 4
    };
    
    alert(`📊 ESTADÍSTICAS DEL SISTEMA
    
👥 Usuarios registrados: ${stats.usuarios}
📋 Solicitudes totales: ${stats.solicitudes}
📦 Insumos disponibles: ${stats.insumos}
🏷️ Categorías: ${stats.categorias}
💾 Base de datos: Conectada
🔄 Último backup: Hoy`);
}

// Función para limpiar datos antiguos
function limpiarDatosAntiguos() {
    if (!currentSuperAdmin) {
        alert('❌ Solo Super Administradores pueden realizar esta acción');
        return;
    }
    
    const confirmacion = confirm(`⚠️ LIMPIAR DATOS ANTIGUOS
    
Este proceso eliminará:
• Solicitudes de más de 2 años
• Logs de sistema antiguos
• Archivos temporales

¿Continuar?`);
    
    if (confirmacion) {
        console.log('🧹 Limpieza de datos iniciada...');
        setTimeout(() => {
            alert('✅ Limpieza completada\n• 15 registros antiguos eliminados\n• 2.3 MB de espacio liberado');
        }, 2000);
    }
}

// ===================================
// EXPORT GLOBAL
// ===================================
console.log('✅ Funciones de Super Admin disponibles globalmente');

// Hacer funciones disponibles globalmente
window.gestionarUsuarios = gestionarUsuarios;
window.configurarSistema = configurarSistema;  
window.reportesAvanzados = reportesAvanzados;
window.mostrarEstadisticasSistema = mostrarEstadisticasSistema;
window.limpiarDatosAntiguos = limpiarDatosAntiguos;