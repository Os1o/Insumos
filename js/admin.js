/* ===================================
   PANEL DE ADMINISTRACIÓN - LÓGICA
   =================================== */

// Variables globales admin
let todasLasSolicitudes = [];
let currentAdmin = null;

// Configuración Supabase (misma que otros archivos)
const SUPABASE_CONFIG = {
    url: 'https://nxuvisaibpmdvraybzbm.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54dXZpc2FpYnBtZHZyYXliemJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4OTMxNjQsImV4cCI6MjA3MTQ2OTE2NH0.OybYM_E3mWsZym7mEf-NiRtrG0svkylXx_q8Tivonfg'
};

const supabaseAdmin = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

// Inicialización
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Iniciando panel de administración...');
    
    // Verificar permisos de administrador
    currentAdmin = verificarPermisosAdmin();
    if (!currentAdmin) return;
    
    // Cargar componentes
    await cargarComponentesAdmin();
    
    // Cargar todas las solicitudes
    await cargarTodasLasSolicitudes();
});

function verificarPermisosAdmin() {
    const session = sessionStorage.getItem('currentUser');
    if (!session) {
        window.location.replace('/login.html');
        return null;
    }
    
    try {
        const user = JSON.parse(session);
        if (user.rol !== 'admin' && user.rol !== 'super_admin') {
            alert('No tienes permisos para acceder al panel de administración');
            window.location.replace('/index.html');
            return null;
        }
        return user;
    } catch (error) {
        window.location.replace('/login.html');
        return null;
    }
}

async function cargarComponentesAdmin() {
    try {
        await Promise.all([
            loadComponent('header-container', 'includes/header.html'),
            loadComponent('footer-container', 'includes/foot.html')
        ]);
        
        setTimeout(() => {
            setupHeaderEvents();
            setupFooterEvents();
        }, 200);
        
    } catch (error) {
        console.error('Error cargando componentes:', error);
    }
}

async function cargarTodasLasSolicitudes() {
    try {
        mostrarLoadingAdmin(true);
        
        const { data: solicitudes, error } = await supabaseAdmin
            .from('solicitudes')
            .select(`
                id,
                tipo,
                estado,
                fecha_solicitud,
                total_items,
                token_usado,
                datos_junta,
                usuarios!inner(
                    id,
                    nombre,
                    departamento
                )
            `)
            .order('fecha_solicitud', { ascending: false });
        
        if (error) throw error;
        
        todasLasSolicitudes = solicitudes || [];
        
        renderizarSolicitudesAdmin(todasLasSolicitudes);
        actualizarEstadisticasAdmin(todasLasSolicitudes);
        
        mostrarLoadingAdmin(false);
        
    } catch (error) {
        console.error('Error cargando solicitudes:', error);
        mostrarErrorAdmin('Error al cargar solicitudes. Intenta nuevamente.');
        mostrarLoadingAdmin(false);
    }
}

console.log('Admin.js cargado');