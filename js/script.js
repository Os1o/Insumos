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

// Variables globales para carrito
let categorias = [];
let insumos = [];
let carritoItems = [];


// Configuración Supabase
const SUPABASE_CONFIG = {
    url: 'https://nxuvisaibpmdvraybzbm.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54dXZpc2FpYnBtZHZyYXliemJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4OTMxNjQsImV4cCI6MjA3MTQ2OTE2NH0.OybYM_E3mWsZym7mEf-NiRtrG0svkylXx_q8Tivonfg'
};

// Función para verificar token disponible
function verificarTokenDisponible() {
    const session = sessionStorage.getItem('currentUser');
    if (!session) return false;
    
    try {
        const user = JSON.parse(session);
        return user.token_disponible === 1;
    } catch (error) {
        console.error('Error verificando token:', error);
        return false;
    }
}

// Función para cargar datos del carrito
async function cargarDatosCarrito() {
    try {
        console.log('Cargando categorías e insumos...');
        
        // Cargar categorías
        const { data: categorias, error: catError } = await supabase
            .from('categorias_insumos')
            .select('*')
            .eq('activo', true)
            .order('orden');
            
        if (catError) throw catError;
        
        // Determinar qué insumos puede ver el usuario
        const session = sessionStorage.getItem('currentUser');
        const user = JSON.parse(session);
        
        const departamentosConAccesoCompleto = [
            'Dirección Jurídica',
            'Coordinación Administrativa'
        ];
        
        let insumosQuery = supabase
            .from('insumos')
            .select('*')
            .eq('activo', true);
            
        // Filtrar por acceso si no es coordinación privilegiada
        if (!departamentosConAccesoCompleto.includes(user.departamento)) {
            insumosQuery = insumosQuery.eq('acceso_tipo', 'todos');
        }
        
        const { data: insumos, error: insError } = await insumosQuery.order('nombre');
        
        if (insError) throw insError;
        
        // Guardar datos globalmente
        categorias = categorias;
        insumos = insumos;
        
        // Renderizar interfaz
        renderizarCategorias();
        renderizarInsumos(categorias[0]?.id || 1);
        
    } catch (error) {
        console.error('Error cargando datos del carrito:', error);
        showNotification('Error cargando datos. Intenta nuevamente.', 'error');
    }
}

// Actualizar información del usuario en el modal
function actualizarInfoUsuarioModal() {
    const session = sessionStorage.getItem('currentUser');
    if (!session) return;
    
    try {
        const user = JSON.parse(session);
        
        // Actualizar nombre del usuario
        const usuarioNombre = document.querySelector('.usuario-nombre');
        if (usuarioNombre) {
            usuarioNombre.textContent = user.nombre;
        }
        
        // Actualizar departamento
        const usuarioDepto = document.querySelector('.usuario-depto');
        if (usuarioDepto) {
            usuarioDepto.textContent = user.departamento;
        }
        
        // Actualizar token status
        const tokenStatus = document.getElementById('tokenStatus');
        if (tokenStatus) {
            tokenStatus.textContent = user.token_disponible;
        }
        
    } catch (error) {
        console.error('Error actualizando info del usuario:', error);
    }
}

// Renderizar pestañas de categorías
function renderizarCategorias() {
    const container = document.getElementById('categoriasTabsContainer');
    if (!container) return;
    
    let html = '';
    categorias.forEach((categoria, index) => {
        const isActive = index === 0 ? 'active' : '';
        html += `
            <button class="categoria-tab ${isActive}" 
                    data-categoria="${categoria.id}" 
                    onclick="cambiarCategoria(${categoria.id})"
                    style="border-color: ${categoria.color}">
                <span class="categoria-icon">${categoria.icono}</span>
                <span class="categoria-nombre">${categoria.nombre}</span>
            </button>
        `;
    });
    
    container.innerHTML = html;
}

// Renderizar insumos de una categoría
function renderizarInsumos(categoriaId) {
    const container = document.getElementById('insumosListaContainer');
    if (!container) return;
    
    const insumosFiltrados = insumos.filter(insumo => insumo.categoria_id === categoriaId);
    
    let html = '';
    insumosFiltrados.forEach(insumo => {
        html += `
            <div class="insumo-item" data-insumo="${insumo.id}">
                <div class="insumo-info">
                    <span class="insumo-nombre">${insumo.nombre}</span>
                    <span class="insumo-unidad">${insumo.unidad_medida}</span>
                </div>
                <div class="insumo-controls">
                    <button class="btn-cantidad" onclick="cambiarCantidad(${insumo.id}, -1)">-</button>
                    <span class="cantidad-display" id="cantidad-${insumo.id}">0</span>
                    <button class="btn-cantidad" onclick="cambiarCantidad(${insumo.id}, 1)">+</button>
                    <button class="btn-agregar" onclick="agregarAlCarrito(${insumo.id})">Agregar</button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html || '<p class="no-insumos">No hay insumos en esta categoría</p>';
}

// Cambiar de categoría
function cambiarCategoria(categoriaId) {
    // Actualizar tabs activos
    document.querySelectorAll('.categoria-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-categoria="${categoriaId}"]`).classList.add('active');
    
    // Renderizar insumos de la nueva categoría
    renderizarInsumos(categoriaId);
}


// Variables para cantidades temporales
let cantidadesTemp = {};

// Cambiar cantidad de un insumo
function cambiarCantidad(insumoId, cambio) {
    const actual = cantidadesTemp[insumoId] || 0;
    const nueva = Math.max(0, Math.min(100, actual + cambio));
    
    cantidadesTemp[insumoId] = nueva;
    
    const display = document.getElementById(`cantidad-${insumoId}`);
    if (display) {
        display.textContent = nueva;
    }
    
    // Warning para cantidades altas
    if (nueva > 50) {
        display.style.color = '#e74c3c';
        display.title = 'Cantidad alta - puede que no se entregue completa';
    } else {
        display.style.color = '';
        display.title = '';
    }
}

// Agregar insumo al carrito
function agregarAlCarrito(insumoId) {
    const cantidad = cantidadesTemp[insumoId] || 0;
    
    if (cantidad === 0) {
        showNotification('Selecciona una cantidad mayor a 0', 'warning');
        return;
    }
    
    const insumo = insumosData.find(i => i.id === insumoId);
    if (!insumo) return;
    
    // Verificar si ya está en el carrito
    const existingIndex = carritoItems.findIndex(item => item.insumo_id === insumoId);
    
    if (existingIndex >= 0) {
        // Actualizar cantidad
        carritoItems[existingIndex].cantidad = cantidad;
    } else {
        // Agregar nuevo item
        carritoItems.push({
            insumo_id: insumoId,
            nombre: insumo.nombre,
            cantidad: cantidad,
            unidad_medida: insumo.unidad_medida
        });
    }
    
    // Limpiar cantidad temporal
    cantidadesTemp[insumoId] = 0;
    const display = document.getElementById(`cantidad-${insumoId}`);
    if (display) display.textContent = '0';
    
    // Actualizar vista del carrito
    actualizarVistaCarrito();
    
    showNotification(`${insumo.nombre} agregado al carrito`, 'success');
}

// Actualizar vista del carrito
function actualizarVistaCarrito() {
    const container = document.getElementById('carritoItems');
    const count = document.getElementById('carritoCount');
    
    if (carritoItems.length === 0) {
        container.innerHTML = '<p class="carrito-vacio">Agrega insumos a tu carrito</p>';
        count.textContent = '0';
        document.getElementById('btnEnviar').disabled = true;
        return;
    }
    
    let html = '';
    carritoItems.forEach((item, index) => {
        html += `
            <div class="carrito-item">
                <span class="item-nombre">${item.nombre}</span>
                <span class="item-cantidad">${item.cantidad} ${item.unidad_medida}</span>
                <button class="btn-remove" onclick="removerDelCarrito(${index})">×</button>
            </div>
        `;
    });
    
    container.innerHTML = html;
    count.textContent = carritoItems.length;
    document.getElementById('btnEnviar').disabled = false;
}
// ===================================
// SISTEMA DE INCLUDES/COMPONENTES
// ===================================

// Función para cargar componentes dinámicamente
async function loadComponent(containerId, filePath) {
    try {
        console.log(`🔄 Intentando cargar: ${filePath}`);
        
        // Intentar fetch con manejo de errores mejorado
        const response = await fetch(filePath, {
            method: 'GET',
            headers: {
                'Content-Type': 'text/html',
            },
            cache: 'no-cache'
        });
        
        console.log(`📡 Respuesta de ${filePath}:`, response.status, response.statusText);
        
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        const html = await response.text();
        console.log(`📄 HTML obtenido de ${filePath}:`, html.substring(0, 100) + '...');
        
        const container = document.getElementById(containerId);
        
        if (!container) {
            console.error(`❌ Container no encontrado: ${containerId}`);
            return;
        }
        
        container.innerHTML = html;
        console.log(`✅ Componente cargado exitosamente: ${filePath}`);
        
        // Ejecutar scripts específicos después de cargar
        if (filePath.includes('header')) {
            setTimeout(setupHeaderEvents, 100);
        } else if (filePath.includes('footer')) {
            setTimeout(() => {
                setupFooterEvents();
                updateFooterStats();
            }, 100);
        }
        
    } catch (error) {
        console.error(`❌ Error detallado cargando ${filePath}:`, error);
        
        // Fallback: cargar contenido básico
        const container = document.getElementById(containerId);
        if (container) {
            if (filePath.includes('footer')) {
                loadFallbackFooter(container);
            } else if (filePath.includes('header')) {
                loadFallbackHeader(container);
            } else {
                container.innerHTML = `
                    <div style="text-align: center; padding: 1rem; background: #fee; border: 1px solid #fcc; border-radius: 8px; color: #c33;">
                        ⚠️ Error cargando ${filePath}<br>
                        <small>Error: ${error.message}</small><br>
                        <small>Verificando rutas y permisos...</small>
                    </div>
                `;
            }
        }
    }
}

// Fallback para footer si no se puede cargar dinámicamente
function loadFallbackFooter(container) {
    console.log('🔄 Cargando footer fallback...');
    container.innerHTML = `
        <footer class="footer">
            <div class="container">
                <div class="footer-content">
                    <div class="footer-section">
                        <h3>Contacto</h3>
                        <div class="contact-info">
                            <div class="contact-item">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                                    <polyline points="22,6 12,13 2,6"/>
                                </svg>
                                <span>soporte@empresa.com</span>
                            </div>
                            <div class="contact-item">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                                </svg>
                                <span>+52 55 1234 5678</span>
                            </div>
                            <div class="contact-item">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                                    <circle cx="12" cy="10" r="3"/>
                                </svg>
                                <span>Oficina Central - Piso 3</span>
                            </div>
                            <div class="contact-item">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="10"/>
                                    <polyline points="12,6 12,12 16,14"/>
                                </svg>
                                <span>Lun - Vie: 9:00 - 18:00</span>
                            </div>
                        </div>
                    </div>
                    <div class="footer-section">
                        <h3>Enlaces Rápidos</h3>
                        <div class="footer-links">
                            <a href="index.html">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                                    <polyline points="9,22 9,12 15,12 15,22"/>
                                </svg>
                                Inicio
                            </a>
                            <a href="historial.html">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M3 3h18v18H3zM8 7h8M8 11h8M8 15h8"/>
                                </svg>
                                Historial
                            </a>
                        </div>
                    </div>
                    <div class="footer-section">
                        <h3>Sistema de Insumos</h3>
                        <p class="footer-description">Plataforma digital para gestión de solicitudes</p>
                        <div class="system-stats">
                            <div class="stat-item">
                                <span class="stat-number" id="totalSolicitudes">0</span>
                                <span class="stat-label">Solicitudes</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-number" id="solicitudesActivas">0</span>
                                <span class="stat-label">Activas</span>
                            </div>
                        </div>
                    </div>
                    <div class="footer-section">
                        <h3>Estado del Sistema</h3>
                        <div class="system-status">
                            <div class="status-item">
                                <div class="status-indicator online"></div>
                                <span>Sistema Operativo</span>
                            </div>
                        </div>
                        <div class="system-info">
                            <small>Última actualización: <span id="lastUpdate">${new Date().toLocaleTimeString()}</span></small>
                            <small>Versión: 1.0.0</small>
                        </div>
                    </div>
                </div>
                <div class="footer-bottom">
                    <div class="footer-bottom-content">
                        <div class="copyright">
                            <p>&copy; <span id="currentYear">${new Date().getFullYear()}</span> Sistema de Solicitudes de Insumos.</p>
                        </div>
                        <div class="footer-actions">
                            <button class="footer-btn" onclick="scrollToTop()">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="12" y1="19" x2="12" y2="5"/>
                                    <polyline points="5,12 12,5 19,12"/>
                                </svg>
                                Subir
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    `;
    
    setTimeout(() => {
        setupFooterEvents();
        updateFooterStats();
    }, 100);
}

// Fallback para header si no se puede cargar dinámicamente
function loadFallbackHeader(container) {
    console.log('🔄 Cargando header fallback...');
    container.innerHTML = `
        <header class="header">
            <div class="container">
                <div class="header-content">
                    <div class="logo-section">
                        <div class="logo-icon">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M9 12l2 2 4-4"/>
                                <circle cx="12" cy="12" r="10"/>
                            </svg>
                        </div>
                        <div class="logo-text">
                            <h1>Solicitudes de Insumos</h1>
                        </div>
                    </div>
                    <nav class="main-nav">
                        <ul class="nav-links">
                            <li><a href="index.html" class="nav-link active">Inicio</a></li>
                            <li><a href="historial.html" class="nav-link">Historial</a></li>
                            <li><a href="contacto.html" class="nav-link">Contacto</a></li>
                        </ul>
                    </nav>
                    <div class="user-section">
                        <div class="user-menu">
                            <button class="user-button" onclick="toggleUserMenu()">
                                <div class="user-avatar">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                        <circle cx="12" cy="7" r="4"/>
                                    </svg>
                                </div>
                                <span class="user-name">Usuario</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    `;
    
    setTimeout(setupHeaderEvents, 100);
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
    
    // ACTUALIZAR USUARIO DESDE SESIÓN
    const session = sessionStorage.getItem('currentUser');
    if (session) {
        try {
            const user = JSON.parse(session);
            currentUser = {
                name: user.nombre,
                email: user.username + '@empresa.com',
                department: user.departamento,
                role: user.rol
            };
            console.log('Usuario actualizado:', currentUser.name);
        } catch (error) {
            console.error('Error actualizando usuario:', error);
        }
    }
    
    // Actualizar información del usuario
    updateUserInfo();
}

// ===================================
// INICIALIZACIÓN DE LA APLICACIÓN
// ===================================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 ' + APP_CONFIG.name + ' v' + APP_CONFIG.version + ' iniciando...');
    console.log('📍 URL actual:', window.location.href);
    console.log('🔍 Verificando contenedores DOM...');
    
    // Verificar que los contenedores existan
    const headerContainer = document.getElementById('header-container');
    const footerContainer = document.getElementById('footer-container');
    
    console.log('Header container:', headerContainer ? '✅ Encontrado' : '❌ No encontrado');
    console.log('Footer container:', footerContainer ? '✅ Encontrado' : '❌ No encontrado');
    
    if (!headerContainer || !footerContainer) {
        console.error('❌ Contenedores faltantes. Verificar HTML.');
        return;
    }
    
    try {
        console.log('🔄 Iniciando carga de componentes...');
        
        // Cargar componentes del sistema con timeout
        const headerPromise = loadComponent('header-container', 'includes/header.html');
        const footerPromise = loadComponent('footer-container', 'includes/foot.html');
        
        // Esperar máximo 5 segundos por componente
        await Promise.race([
            Promise.all([headerPromise, footerPromise]),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
        ]);
        
        console.log('✅ Componentes cargados exitosamente');
        
        // Actualizar información dinámica
        updateDynamicInfo();
        
        // Configurar eventos principales
        setTimeout(setupAllEventListeners, 300);
        
        // Cargar datos iniciales
        setTimeout(loadInitialData, 500);
        
        console.log('✅ Aplicación inicializada correctamente');
        
    } catch (error) {
        console.error('❌ Error durante la inicialización:', error);
        
        // Mostrar notificación de error solo si existe la función
        if (typeof showNotification === 'function') {
            showNotification('Error al inicializar componentes: ' + error.message, 'warning');
        }
        
        // Continuar con la inicialización básica
        setTimeout(() => {
            updateDynamicInfo();
            setupAllEventListeners();
            loadInitialData();
        }, 1000);
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
    
    // Verificar token para solicitudes ordinarias
    if (tipo === 'ordinaria' && !verificarTokenDisponible()) {
        showNotification('No tienes token disponible para solicitudes ordinarias', 'warning');
        return;
    }
    
    const modal = document.getElementById('solicitud-modal');
    const modalTitle = document.getElementById('modal-title');
    
    if (modal && modalTitle) {
        // Configurar título según el tipo
        const titles = {
            'ordinaria': 'Nueva Solicitud Mensual/Ordinaria',
            'juntas': 'Nueva Solicitud para Juntas'
        };
        
        modalTitle.textContent = titles[tipo] || 'Nueva Solicitud';
        
        // ACTUALIZAR INFO DEL USUARIO EN EL MODAL
        actualizarInfoUsuarioModal();
        cargarDatosCarrito();
        
        // Mostrar modal
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
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

// ===================================
// DEBUG Y DESARROLLO
// ===================================

function debugInfo() {
    console.log('=== 🔍 DEBUG INFO ===');
    console.log('📍 URL actual:', window.location.href);
    console.log('📁 Ubicación base:', window.location.origin);
    console.log('🔍 Contenedores DOM:');
    console.log('  - Header container:', document.getElementById('header-container') ? '✅' : '❌');
    console.log('  - Footer container:', document.getElementById('footer-container') ? '✅' : '❌');
    console.log('📊 Datos:');
    console.log('  - Solicitudes:', solicitudes.length);
    console.log('  - Usuario actual:', currentUser);
    console.log('  - Tipo de solicitud actual:', currentSolicitudType);
    console.log('⚙️ Configuración:', APP_CONFIG);
    console.log('🌐 Live Server activo:', window.location.protocol === 'http:' && window.location.hostname === '127.0.0.1');
    console.log('===================');
}

// Función para forzar recarga de componentes
function forceReloadComponents() {
    console.log('🔄 Forzando recarga de componentes...');
    loadComponent('header-container', 'includes/header.html');
    loadComponent('footer-container', 'includes/footer.html');
}

// Función para probar rutas
async function testRoutes() {
    console.log('🧪 Probando rutas de archivos...');
    
    const routes = [
        'includes/header.html',
        'includes/footer.html',
        'css/styles.css',
        'js/script.js'
    ];
    
    for (const route of routes) {
        try {
            const response = await fetch(route, { method: 'HEAD' });
            console.log(`${route}: ${response.ok ? '✅' : '❌'} (${response.status})`);
        } catch (error) {
            console.log(`${route}: ❌ Error - ${error.message}`);
        }
    }
}

// Exponer funciones para debug en desarrollo
if (window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1')) {
    window.debugSolicitudes = {
        debugInfo,
        testRoutes,
        forceReloadComponents,
        solicitudes: () => solicitudes,
        clearSolicitudes: () => {
            localStorage.removeItem('solicitudes');
            solicitudes = [];
            updateFooterStats();
            console.log('🗑️ Solicitudes limpiadas');
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
            console.log('📝 Datos de prueba agregados');
        }
    };
    
    // Auto-ejecutar debug info al cargar en desarrollo
    setTimeout(debugInfo, 2000);
}



// Función de logout
function logout() {
    sessionStorage.removeItem('currentUser');
    localStorage.removeItem('userSession');
    localStorage.removeItem('rememberLogin');
    window.location.href = '/login.html';
}

// ===================================
// INICIALIZACIÓN FINAL
// ===================================

console.log('Script.js cargado completamente - ' + APP_CONFIG.name);