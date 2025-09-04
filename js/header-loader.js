/* ===================================
   HEADER LOADER - GESTIÓN INTELIGENTE DE HEADERS
   Con auto-inicialización segura y actualización de stats
   =================================== */

console.log('📦 Header-loader.js cargado');

// Función principal para cargar headers
async function loadAppropriateHeader() {
    console.log('🎯 Ejecutando loadAppropriateHeader...');
    
    const session = sessionStorage.getItem('currentUser');
    const currentPage = window.location.pathname;
    
    console.log('📄 Página actual:', currentPage);
    
    const isAdminPage = currentPage.includes('admin.html') || currentPage.includes('inventario.html');
    
    if (!session) {
        console.log('👤 Sin sesión - cargando header normal');
        return await loadUserHeader();
    }
    
    try {
        const user = JSON.parse(session);
        console.log('👤 Usuario detectado:', user.rol);
        
        if (isAdminPage) {
            if (user.rol === 'super_admin') {
                console.log('🛡️ Cargando Super Admin header');
                return await loadSuperAdminHeader();
            } else if (user.rol === 'admin') {
                console.log('👨‍💼 Cargando Admin header');
                return await loadAdminHeader();
            } else {
                console.log('❌ Usuario sin permisos admin - redirigiendo');
                window.location.href = 'index.html';
                return;
            }
        } else {
            console.log('👤 Página normal - header usuario');
            return await loadUserHeader();
        }
        
    } catch (error) {
        console.error('Error detectando usuario:', error);
        return await loadUserHeader();
    }
}

// Función simple para cargar componente
async function loadComponent(containerId, filePath) {
    try {
        const container = document.getElementById(containerId);
        if (!container) {
            throw new Error(`Contenedor ${containerId} no encontrado`);
        }
        
        console.log(`🔄 Cargando ${filePath}...`);
        const response = await fetch(filePath);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const html = await response.text();
        container.innerHTML = html;
        
        console.log(`✅ ${filePath} cargado exitosamente`);
        return true;
        
    } catch (error) {
        console.error(`❌ Error cargando ${filePath}:`, error);
        throw error;
    }
}

// Cargar headers específicos
async function loadSuperAdminHeader() {
    try {
        await loadComponent('header-container', 'includes/headerSuperAdmin.html');
        initializeSuperAdminHeader();
        return true;
    } catch (error) {
        console.log('⚠️ Super Admin header no disponible, usando admin normal');
        return await loadAdminHeader();
    }
}

async function loadAdminHeader() {
    try {
        await loadComponent('header-container', 'includes/headerAdmin.html');
        initializeAdminHeader();
        return true;
    } catch (error) {
        console.log('⚠️ Admin header no disponible, usando header normal');
        return await loadUserHeader();
    }
}

async function loadUserHeader() {
    try {
        await loadComponent('header-container', 'includes/header.html');
        initializeUserHeader();
        return true;
    } catch (error) {
        console.error('❌ No se pudo cargar ningún header');
        return false;
    }
}

// Funciones de inicialización
function initializeSuperAdminHeader() {
    console.log('⚡ Inicializando Super Admin header');
    updateUserInfo();
    
    // Cargar superadmin.js si no está cargado
    if (typeof gestionarUsuarios === 'undefined') {
        loadSuperAdminScript();
    }
    
    // Actualizar stats si están disponibles
    setTimeout(updateAdminStats, 500);
}

function initializeAdminHeader() {
    console.log('⚡ Inicializando Admin header');
    updateUserInfo();
    
    // Actualizar stats rápidas
    setTimeout(updateAdminStats, 500);
}

function initializeUserHeader() {
    console.log('⚡ Inicializando User header');
    updateUserInfo();
}

// Función para actualizar info de usuario
function updateUserInfo() {
    const session = sessionStorage.getItem('currentUser');
    if (!session) return;
    
    try {
        const user = JSON.parse(session);
        console.log('📝 Actualizando info de usuario:', user.nombre);
        
        // Actualizar elementos con data attributes
        document.querySelectorAll('[data-user-name]').forEach(el => {
            el.textContent = user.nombre;
        });
        
        document.querySelectorAll('[data-user-role]').forEach(el => {
            el.textContent = user.rol === 'super_admin' ? 'Super Administrador' : 
                            user.rol === 'admin' ? 'Administrador' : 'Usuario';
        });
        
        // Actualizar email si existe
        document.querySelectorAll('.user-email').forEach(el => {
            el.textContent = user.username + '@empresa.com';
        });
        
    } catch (error) {
        console.error('Error actualizando info usuario:', error);
    }
}

// Función para actualizar estadísticas admin
async function updateAdminStats() {
    // Solo en páginas admin
    const isAdminPage = window.location.pathname.includes('admin.html');
    if (!isAdminPage) return;
    
    try {
        // Si existe la función de admin.js para obtener stats
        if (typeof todasLasSolicitudes !== 'undefined' && Array.isArray(todasLasSolicitudes)) {
            const stats = {
                pendientes: todasLasSolicitudes.filter(s => s.estado === 'pendiente').length,
                revision: todasLasSolicitudes.filter(s => s.estado === 'en_revision').length,
                cerradas: todasLasSolicitudes.filter(s => s.estado === 'cerrado').length
            };
            
            // Actualizar quick stats si existe la función
            if (typeof updateQuickStats === 'function') {
                updateQuickStats(stats);
            }
        }
    } catch (error) {
        console.log('No se pudieron actualizar stats:', error);
    }
}

// Cargar script de Super Admin dinámicamente
function loadSuperAdminScript() {
    // Verificar si ya está cargado
    if (typeof gestionarUsuarios === 'function') {
        console.log('✅ Super Admin script ya disponible');
        return;
    }
    
    console.log('📦 Cargando superadmin.js...');
    const script = document.createElement('script');
    script.src = 'js/superadmin.js';
    script.type = 'text/javascript'; // Especificar tipo
    script.onload = () => {
        console.log('✅ Super Admin script cargado exitosamente');
        // Reinicializar funciones si es necesario
    };
    script.onerror = () => {
        console.log('⚠️ Super Admin script no disponible - usando funciones básicas');
        // Crear funciones básicas inline si el archivo no existe
        createBasicSuperAdminFunctions();
    };
    document.head.appendChild(script);
}

// Crear funciones básicas si superadmin.js no se puede cargar
function createBasicSuperAdminFunctions() {
    window.gestionarUsuarios = () => alert('Gestión de usuarios próximamente');
    window.configurarSistema = () => alert('Configuración del sistema próximamente');
    window.reportesAvanzados = () => alert('Reportes avanzados próximamente');
    console.log('✅ Funciones básicas de Super Admin creadas');
}

// Función global para recargar header (útil para desarrollo)
window.reloadHeader = function() {
    console.log('🔄 Recargando header...');
    loadAppropriateHeader();
};

// Función para actualizar stats manualmente
window.updateHeaderStats = function(stats) {
    if (typeof updateQuickStats === 'function') {
        updateQuickStats(stats);
    }
};

console.log('✅ Header-loader.js listo para usar');

// AUTO-INICIALIZACIÓN para páginas que lo necesiten
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        // Solo auto-inicializar en páginas admin si no se ha inicializado manualmente
        const isAdminPage = window.location.pathname.includes('admin.html') || 
                           window.location.pathname.includes('inventario.html');
        
        if (isAdminPage) {
            console.log('🔄 Auto-inicialización detectada para página admin');
            setTimeout(() => {
                if (document.getElementById('header-container').innerHTML.trim() === '') {
                    console.log('🚀 Ejecutando auto-inicialización...');
                    loadAppropriateHeader();
                }
            }, 50);
        }
    });
}