// Variables globales del inventario
let inventarioData = [];
let categoriasData = [];
let currentSuperAdmin = null;

// Configuración Supabase
const supabaseInventario = window.supabase.createClient(
    'https://nxuvisaibpmdvraybzbm.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54dXZpc2FpYnBtZHZyYXliemJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4OTMxNjQsImV4cCI6MjA3MTQ2OTE2NH0.OybYM_E3mWsZym7mEf-NiRtrG0svkylXx_q8Tivonfg'
);

// Inicialización del sistema de inventario
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Inicializando sistema de inventario...');
    
    try {
        // 1. Cargar componentes UI
        await loadComponent('headerAdmin-container', 'includes/headerAdmin.html');
       
        // 2. Verificar permisos
        currentSuperAdmin = verificarPermisosSuperAdmin();
        if (!currentSuperAdmin) return;
        
        // 3. Cargar datos iniciales
        await cargarDatosInventario();
        
        console.log('Sistema de inventario inicializado correctamente');
        
    } catch (error) {
        console.error('Error inicializando inventario:', error);
        mostrarError('Error al cargar el sistema de inventario');
    }
});