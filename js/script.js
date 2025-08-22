/* ===================================
   SISTEMA SOLICITUDES DE INSUMOS - SCRIPT.JS
   Sistema de gestión de solicitudes
   =================================== */

// ===================================
// CONFIGURACIÓN GLOBAL
// ===================================

const APP_CONFIG = {
    name: 'Sistema de Solicitudes de Insumos',
    version: '1.0.0',
    description: 'Plataforma digital para gestión de solicitudes',
    company: 'Empresa Corporativa',
    email: 'soporte@empresa.com',
    phone: '+52 55 1234 5678'
};

// Variables globales
let currentUser = {
    name: 'Usuario Actual',
    email: 'usuario@empresa.com',
    department: 'Administración',
    avatar: null
};

let solicitudes = JSON.parse(localStorage.getItem('solicitudes')) || [];
let currentSolicitudType = '';

// ===================================
// SISTEMA DE INCLUDES/COMPONENTES
// ===================================

// Función para cargar componentes dinámicamente
async function loadComponent(containerId, filePath) {
    try {
        const response = await fetch(filePath);
        
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        const html = await response.text();
        const container = document.getElementById(containerId);
        
        if (container) {
            container.innerHTML = html;
            console.log(`✅ Componente cargado: ${filePath}`);
            
            // Ejecutar scripts específicos después de cargar
            if (filePath.includes('header')) {
                setupHeaderEvents();
            } else if (filePath.includes('footer')) {
                setupFooterEvents();
                updateFooterStats();
            }
        } else {
            console.error(`❌ Container no encontrado: ${containerId}`);
        }
    } catch (error) {
        console.error(`❌ Error cargando ${filePath}:`, error);
        
        // Mostrar error en el container
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 1rem; background: #fee; border: 1px solid #fcc; border-radius: 8px; color: #c33;">
                    ⚠️ Error cargando ${filePath}<br>
                    <small>Verifique que el archivo existe en la ubicación correcta</small>
                </div>
            `;
        }
    }
}

// Función para actualizar información dinámica
function updateDynamicInfo() {
    // Actualizar año actual
    const yearElements = document.querySelectorAll('#currentYear, .current-year');
    yearElements.forEach(el => {
        if (el) el.textContent = new Date().getFullYear();
    });
    
    // Actualizar última actualización
    const updateElements = document.querySelectorAll('#lastUpdate, .last-updated');
    updateElements.forEach(el => {
        if (el) el.textContent = new Date().toLocaleTimeString();
    });
    
    // Actualizar información del usuario
    updateUserInfo();
}

// ===================================
// INICIALIZACIÓN DE LA APLICACIÓN
// ===================================

document.addEventListener('DOMContentLoaded', async function() {
    console.log(APP_CONFIG.name + ' v' + APP_CONFIG.version + ' iniciando...');
    
    try {
        // Cargar componentes del sistema
        await loadComponent('header-container', 'includes/header.html');
        await loadComponent('footer-container', 'includes/footer.html');
        
        // Actualizar información dinámica
        updateDynamicInfo();
        
        // Configurar eventos principales
        setTimeout(setupAllEventListeners, 200);
        
        // Cargar datos iniciales
        setTimeout(loadInitialData, 500);
        
        console.log('✅ Aplicación inicializada correctamente');
        
    } catch (error) {
        console.error('❌ Error durante la inicialización:', error);
        showNotification('Error al inicializar la aplicación', 'error');
    }
});

// ===================================
// GESTIÓN DE EVENTOS
// ===================================

function setupAllEventListeners() {
    console.log('Configurando event listeners...');
    
    // Event listeners del header
    setupHeaderEvents();
    
    // Event listeners del footer
    setupFooterEvents();
    
    // Event listeners del modal
    setupModalEvents();
    
    // Event listeners generales
    setupGeneralEvents();
}

function setupHeaderEvents() {
    // Cerrar dropdowns al hacer click fuera
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.user-menu')) {
            closeUserDropdown();
        }
    });
    
    // Eventos de navegación móvil
    const mobileOverlay = document.getElementById('mobileOverlay');
    if (mobileOverlay) {
        mobileOverlay.addEventListener('click', closeMobileMenus);
    }
}

function setupFooterEvents() {
    // Botón de scroll to top
    const scrollBtn = document.querySelector('.footer-btn[onclick="scrollToTop()"]');
    if (scrollBtn) {
        scrollBtn.onclick = scrollToTop;
    }
}

function setupModalEvents() {
    const modal = document.getElementById('solicitud-modal');
    const form = document.getElementById('solicitud-form');
    
    if (modal) {
        // Cerrar modal al hacer click en el overlay
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                cerrarModal();
            }
        });
    }
    
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
}

function setupGeneralEvents() {
    // Navegación con teclado
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            cerrarModal();
            closeMobileMenus();
            closeUserDropdown();
        }
    });
    
    // Prevenir submit por defecto en formularios sin handler
    document.addEventListener('submit', function(e) {
        if (!e.target.hasAttribute('data-handled')) {
            e.preventDefault();
        }
    });
}

// ===================================
// FUNCIONES DEL HEADER
// ===================================

// Toggle del menú de usuario
function toggleUserMenu() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        const isVisible = dropdown.style.display !== 'none';
        if (isVisible) {
            closeUserDropdown();
        } else {
            dropdown.style.display = 'block';
            dropdown.style.animation = 'modalSlideIn 0.2s ease';
        }
    }
}

// Cerrar dropdown de usuario
function closeUserDropdown() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        dropdown.style.display = 'none';
    }
}

// Toggle del menú móvil
function toggleMobileMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    const mobileOverlay = document.getElementById('mobileOverlay');
    
    if (mobileMenu && mobileOverlay) {
        const isVisible = mobileMenu.style.display !== 'none';
        
        if (isVisible) {
            closeMobileMenus();
        } else {
            mobileMenu.style.display = 'block';
            mobileOverlay.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }
    }
}

// Cerrar menús móviles
function closeMobileMenus() {
    const mobileMenu = document.getElementById('mobileMenu');
    const mobileOverlay = document.getElementById('mobileOverlay');
    
    if (mobileMenu) mobileMenu.style.display = 'none';
    if (mobileOverlay) mobileOverlay.style.display = 'none';
    document.body.style.overflow = '';
}

// Actualizar información del usuario en el UI
function updateUserInfo() {
    const userNameElements = document.querySelectorAll('.user-name, .user-display-name');
    const userEmailElements = document.querySelectorAll('.user-email');
    
    userNameElements.forEach(el => {
        if (el) el.textContent = currentUser.name;
    });
    
    userEmailElements.forEach(el => {
        if (el) el.textContent = currentUser.email;
    });
}

// ===================================
// FUNCIONES DEL FOOTER
// ===================================

// Scroll to top
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Actualizar estadísticas del footer
function updateFooterStats() {
    const totalSolicitudesEl = document.getElementById('totalSolicitudes');
    const solicitudesActivasEl = document.getElementById('solicitudesActivas');
    
    if (totalSolicitudesEl) {
        totalSolicitudesEl.textContent = solicitudes.length;
    }
    
    if (solicitudesActivasEl) {
        const activeSolicitudes = solicitudes.filter(s => 
            s.estado === 'pendiente' || s.estado === 'en_proceso'
        ).length;
        solicitudesActivasEl.textContent = activeSolicitudes;
    }
}

// ===================================
// FUNCIONES DEL MODAL DE SOLICITUDES
// ===================================

// Abrir modal de solicitud
function abrirSolicitud(tipo) {
    currentSolicitudType = tipo;
    const modal = document.getElementById('solicitud-modal');
    const modalTitle = document.getElementById('modal-title');
    const fechaEventoGroup = document.getElementById('fecha-evento-group');
    
    if (modal && modalTitle) {
        // Configurar título según el tipo
        const titles = {
            'ordinaria': 'Nueva Solicitud Mensual/Ordinaria',
            'juntas': 'Nueva Solicitud para Juntas'
        };
        
        modalTitle.textContent = titles[tipo] || 'Nueva Solicitud';
        
        // Mostrar/ocultar campo de fecha según el tipo
        if (fechaEventoGroup) {
            fechaEventoGroup.style.display = tipo === 'juntas' ? 'block' : 'none';
            
            const fechaInput = document.getElementById('fecha-evento');
            if (fechaInput && tipo === 'juntas') {
                fechaInput.required = true;
                // Establecer fecha mínima como hoy
                const today = new Date();
                today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
                fechaInput.min = today.toISOString().slice(0, 16);
            } else if (fechaInput) {
                fechaInput.required = false;
            }
        }
        
        // Mostrar modal
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Focus en el primer campo
        const firstInput = modal.querySelector('input, select, textarea');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }
}

// Cerrar modal
function cerrarModal() {
    const modal = document.getElementById('solicitud-modal');
    const form = document.getElementById('solicitud-form');
    
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
    
    if (form) {
        form.reset();
    }
    
    currentSolicitudType = '';
}

// Manejar envío del formulario
function handleFormSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    
    // Validar formulario
    if (!validateForm(form)) {
        return;
    }
    
    // Crear objeto de solicitud
    const solicitud = {
        id: generateId(),
        tipo: currentSolicitudType,
        solicitante: formData.get('solicitante'),
        departamento: formData.get('departamento'),
        descripcion: formData.get('descripcion'),
        justificacion: formData.get('justificacion') || '',
        prioridad: formData.get('prioridad'),
        fecha_evento: formData.get('fecha_evento') || null,
        fecha_solicitud: new Date().toISOString(),
        estado: 'pendiente',
        usuario: currentUser.email
    };
    
    // Guardar solicitud
    saveSolicitud(solicitud);
    
    // Mostrar confirmación
    showNotification('Solicitud enviada exitosamente', 'success');
    
    // Cerrar modal
    cerrarModal();
    
    // Actualizar estadísticas
    updateFooterStats();
}

// ===================================
// FUNCIONES DE VALIDACIÓN
// ===================================

function validateForm(form) {
    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;
    
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            showFieldError(field, 'Este campo es obligatorio');
            isValid = false;
        } else {
            clearFieldError(field);
        }
    });
    
    // Validaciones específicas
    const email = form.querySelector('input[type="email"]');
    if (email && email.value && !isValidEmail(email.value)) {
        showFieldError(email, 'Ingrese un email válido');
        isValid = false;
    }
    
    const fechaEvento = document.getElementById('fecha-evento');
    if (fechaEvento && fechaEvento.required && fechaEvento.value) {
        const fechaSeleccionada = new Date(fechaEvento.value);
        const ahora = new Date();
        
        if (fechaSeleccionada <= ahora) {
            showFieldError(fechaEvento, 'La fecha del evento debe ser futura');
            isValid = false;
        }
    }
    
    return isValid;
}

function showFieldError(field, message) {
    clearFieldError(field);
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error';
    errorDiv.style.color = '#e74c3c';
    errorDiv.style.fontSize = '0.9rem';
    errorDiv.style.marginTop = '0.25rem';
    errorDiv.textContent = message;
    
    field.style.borderColor = '#e74c3c';
    field.parentNode.appendChild(errorDiv);
}

function clearFieldError(field) {
    const existingError = field.parentNode.querySelector('.field-error');
    if (existingError) {
        existingError.remove();
    }
    field.style.borderColor = '';
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// ===================================
// GESTIÓN DE DATOS
// ===================================

// Cargar datos iniciales
function loadInitialData() {
    // Cargar solicitudes desde localStorage
    solicitudes = JSON.parse(localStorage.getItem('solicitudes')) || [];
    
    // Cargar configuración de usuario
    const savedUser = JSON.parse(localStorage.getItem('currentUser'));
    if (savedUser) {
        currentUser = { ...currentUser, ...savedUser };
        updateUserInfo();
    }
    
    // Actualizar estadísticas
    updateFooterStats();
    
    console.log(`📊 Datos cargados: ${solicitudes.length} solicitudes`);
}

// Guardar solicitud
function saveSolicitud(solicitud) {
    solicitudes.push(solicitud);
    localStorage.setItem('solicitudes', JSON.stringify(solicitudes));
    
    console.log('💾 Solicitud guardada:', solicitud);
}

// Generar ID único
function generateId() {
    return 'SOL-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

// ===================================
// SISTEMA DE NOTIFICACIONES
// ===================================

function showNotification(message, type = 'info', duration = 3000) {
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
        display: flex;
        align-items: center;
        gap: 0.75rem;
    `;
    
    // Colores según el tipo
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
    
    // Icono según el tipo
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
    
    // Auto-remove
    if (duration > 0) {
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }
        }, duration);
    }
    
    return notification;
}

// ===================================
// UTILIDADES
// ===================================

// Formatear fecha
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle function
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// ===================================
// FUNCIONES DE NAVEGACIÓN
// ===================================

// Ir a historial (si existe la página)
function irAHistorial() {
    if (solicitudes.length === 0) {
        showNotification('No tienes solicitudes registradas', 'info');
        return;
    }
    
    // Si existe la página de historial, navegar
    window.location.href = 'historial.html';
}

// ===================================
// MANEJO DE ERRORES GLOBAL
// ===================================

window.addEventListener('error', function(e) {
    console.error('Error global capturado:', e.error);
    showNotification('Ha ocurrido un error inesperado', 'error');
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('Promise rechazada:', e.reason);
    showNotification('Error de conexión o procesamiento', 'error');
});

// ===================================
// ANIMACIONES CSS DINÁMICAS
// ===================================

// Agregar estilos de animación al head
const animationStyles = document.createElement('style');
animationStyles.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(animationStyles);

// ===================================
// DEBUG Y DESARROLLO
// ===================================

function debugInfo() {
    console.log('=== DEBUG INFO ===');
    console.log('Solicitudes:', solicitudes.length);
    console.log('Usuario actual:', currentUser);
    console.log('Tipo de solicitud actual:', currentSolicitudType);
    console.log('Configuración:', APP_CONFIG);
    console.log('=================');
}

// Exponer funciones para debug en desarrollo
if (window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1')) {
    window.debugSolicitudes = {
        debugInfo,
        solicitudes: () => solicitudes,
        clearSolicitudes: () => {
            localStorage.removeItem('solicitudes');
            solicitudes = [];
            updateFooterStats();
            console.log('Solicitudes limpiadas');
        },
        addTestData: () => {
            const testSolicitud = {
                id: generateId(),
                tipo: 'ordinaria',
                solicitante: 'Usuario de Prueba',
                departamento: 'Sistemas',
                descripcion: 'Solicitud de prueba para testing',
                justificacion: 'Solo para pruebas del sistema',
                prioridad: 'media',
                fecha_solicitud: new Date().toISOString(),
                estado: 'pendiente',
                usuario: 'test@empresa.com'
            };
            saveSolicitud(testSolicitud);
            updateFooterStats();
            console.log('Datos de prueba agregados');
        }
    };
}

// ===================================
// INICIALIZACIÓN FINAL
// ===================================

console.log('Script.js cargado completamente - ' + APP_CONFIG.name);