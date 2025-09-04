/* ===================================
   HEADER LOADER - GESTIÓN INTELIGENTE DE HEADERS
   Compatible con script.js existente
   =================================== */

// Función principal para cargar headers de forma inteligente
function loadAppropriateHeader() {
    const session = sessionStorage.getItem('currentUser');
    const currentPage = window.location.pathname;
    
    console.log('📊 Detectando contexto para header...');
    console.log('📄 Página actual:', currentPage);
    
    // Verificar si estamos en páginas de admin
    const isAdminPage = currentPage.includes('admin.html') || currentPage.includes('inventario.html');
    
    if (!session) {
        // Sin sesión - usar header normal
        loadUserHeader();
        return;
    }
    
    try {
        const user = JSON.parse(session);
        console.log('👤 Usuario detectado:', user.rol);
        
        if (isAdminPage) {
            // Estamos en páginas de administración
            if (user.rol === 'super_admin') {
                loadSuperAdminHeader();
            } else if (user.rol === 'admin') {
                loadAdminHeader();
            } else {
                // Usuario normal en página admin - redirigir
                window.location.href = 'index.html';
            }
        } else {
            // Páginas normales - usar header estándar
            loadUserHeader();
        }
        
    } catch (error) {
        console.error('Error detectando usuario:', error);
        loadUserHeader();
    }
}

// Cargar header de Super Admin
function loadSuperAdminHeader() {
    console.log('🛡️ Cargando header Super Admin...');
    loadComponent('header-container', 'includes/headerSuperAdmin.html')
        .then(() => {
            console.log('✅ Header Super Admin cargado');
            initializeSuperAdminHeader();
        })
        .catch(() => {
            // Fallback a header admin normal
            loadAdminHeader();
        });
}

// Cargar header de Admin
function loadAdminHeader() {
    console.log('👨‍💼 Cargando header Admin...');
    loadComponent('header-container', 'includes/headerAdmin.html')
        .then(() => {
            console.log('✅ Header Admin cargado');
            initializeAdminHeader();
        })
        .catch(() => {
            // Fallback a header normal
            loadUserHeader();
        });
}

// Cargar header normal
function loadUserHeader() {
    console.log('👤 Cargando header Usuario...');
    loadComponent('header-container', 'includes/header.html')
        .then(() => {
            console.log('✅ Header Usuario cargado');
            // Usar las funciones existentes de script.js
            if (typeof setupHeaderEvents === 'function') {
                setupHeaderEvents();
            }
        })
        .catch(error => {
            console.error('❌ Error cargando header:', error);
        });
}

// Reutilizar la función loadComponent de script.js o crearla si no existe
if (typeof loadComponent === 'undefined') {
    async function loadComponent(containerId, filePath) {
        try {
            const container = document.getElementById(containerId);
            if (!container) {
                throw new Error(`Contenedor ${containerId} no encontrado`);
            }
            
            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const html = await response.text();
            container.innerHTML = html;
            
            console.log(`✅ Componente cargado: ${filePath}`);
            
        } catch (error) {
            console.error(`❌ Error cargando ${filePath}:`, error);
            throw error;
        }
    }
}

// Funciones de inicialización de headers
function initializeSuperAdminHeader() {
    // Lógica específica del Super Admin
    updateUserInfo();
    setupSuperAdminEvents();
    // Cargar superadmin.js si no está cargado
    if (typeof gestionarUsuarios === 'undefined') {
        loadSuperAdminScript();
    }
}

function initializeAdminHeader() {
    // Lógica específica del Admin
    updateUserInfo();
    setupAdminEvents();
}

// Cargar script de Super Admin dinámicamente
function loadSuperAdminScript() {
    const script = document.createElement('script');
    script.src = 'js/superadmin.js';
    script.onload = () => console.log('✅ Super Admin script cargado');
    script.onerror = () => console.error('❌ Error cargando Super Admin script');
    document.head.appendChild(script);
}

// Función universal para actualizar info de usuario
function updateUserInfo() {
    const session = sessionStorage.getItem('currentUser');
    if (!session) return;
    
    try {
        const user = JSON.parse(session);
        
        // Actualizar elementos comunes
        const nameElements = document.querySelectorAll('[data-user-name]');
        const roleElements = document.querySelectorAll('[data-user-role]');
        
        nameElements.forEach(el => el.textContent = user.nombre);
        roleElements.forEach(el => el.textContent = user.rol);
        
        // Lógica específica según el tipo de header
        if (typeof updateAdminUserInfo === 'function') {
            updateAdminUserInfo();
        }
        
    } catch (error) {
        console.error('Error actualizando info usuario:', error);
    }
}

// Event listeners para diferentes tipos de admin
function setupSuperAdminEvents() {
    console.log('⚡ Configurando eventos Super Admin');
    // Eventos específicos de Super Admin
}

function setupAdminEvents() {
    console.log('⚡ Configurando eventos Admin');
    // Eventos específicos de Admin
}