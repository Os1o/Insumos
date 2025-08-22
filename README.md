# 📋 Sistema de Solicitud de Insumos

Sistema web intuitivo para la gestión de solicitudes de insumos corporativos con control mensual automático y solicitudes de emergencia.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?style=flat&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/css3-%231572B6.svg?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=flat&logo=javascript&logoColor=%23F7DF1E)


## 🚀 Características

### ✅ **Control Automático**
- **Una solicitud por mes** por usuario
- **Validación inteligente** de fechas y restricciones
- **Contador visual** hasta próxima solicitud disponible

### 🚨 **Solicitudes de Emergencia**
- **Disponibles siempre** con justificación requerida
- **Validación robusta** para casos urgentes
- **Especificación de eventos** (juntas, presentaciones)

### 📦 **Catálogo Completo**
- **6 categorías organizadas**: Papelería, Escritura, Organización, Tecnología, Limpieza, Otros
- **25+ tipos de insumos** predefinidos
- **Gestión dinámica** de cantidades y unidades

### 🎨 **Experiencia de Usuario**
- **Diseño responsive** para móviles y escritorio
- **Validaciones en tiempo real**
- **Modal de confirmación** antes del envío
- **Sistema de alertas** para feedback inmediato
- **Historial completo** de solicitudes

## 🛠️ Tecnologías

- **HTML5** - Estructura semántica
- **CSS3** - Diseño moderno y responsive
- **JavaScript (Vanilla)** - Funcionalidad sin dependencias
- **localStorage** - Persistencia de datos local

## 📁 Estructura del Proyecto

```
sistema-insumos/
│
├── 📄 index.html              # Página principal
├── 📁 css/
│   └── 📄 styles.css          # Estilos principales
├── 📁 js/
│   └── 📄 script.js           # Lógica de la aplicación
├── 📁 docs/
│   ├── 📄 INSTALLATION.md     # Guía de instalación
│   ├── 📄 CONFIGURATION.md    # Guía de configuración
│   └── 🖼️ preview.png         # Captura de pantalla
├── 📁 config/
│   └── 📄 netlify.toml        # Configuración para Netlify
├── 📄 README.md               # Este archivo
└── 📄 LICENSE                 # Licencia MIT
```

## 🚀 Instalación Rápida

### Opción 1: Netlify (Recomendado)

1. **Fork este repositorio**
2. **Conecta tu repositorio** a Netlify
3. **Deploy automático** - ¡Listo!

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/tu-usuario/sistema-insumos)

### Opción 2: Servidor Local

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/sistema-insumos.git

# Navegar al directorio
cd sistema-insumos

# Abrir con un servidor local
python -m http.server 8000
# o
npx serve .
```

### Opción 3: GitHub Pages

1. Ve a **Settings** → **Pages**
2. Selecciona **Source**: Deploy from branch
3. Elige **Branch**: main
4. **Save** - Tu sitio estará en `https://tu-usuario.github.io/sistema-insumos`

## 🎯 Uso del Sistema

### 👤 **Para Usuarios Regulares**

1. **Verificar Estado**
   - La página principal muestra si puedes hacer una solicitud
   - Verde = Disponible | Rojo = Cuota usada

2. **Nueva Solicitud**
   - Click en "Nueva Solicitud"
   - Completa la información personal
   - Agrega insumos necesarios
   - Confirma y envía

3. **Historial**
   - Consulta todas tus solicitudes anteriores
   - Ve el estado actual de cada solicitud

### 🚨 **Para Emergencias**

1. **Solicitud de Emergencia**
   - Disponible siempre, sin restricciones mensuales
   - Requiere justificación detallada (mínimo 10 caracteres)
   - Especifica fecha de junta o evento

## ⚙️ Configuración

### 🏢 **Personalizar Áreas**

Edita el archivo `js/script.js` en la sección `AREAS_CONFIG`:

```javascript
const AREAS_CONFIG = [
    { 
        code: 'TU_AREA', 
        name: 'Nombre de tu Área',
        manager: 'Título del Jefe',
        email: 'area@empresa.com'
    }
];
```

### 📦 **Agregar Insumos**

Modifica `INSUMOS_CATALOG` en `js/script.js`:

```javascript
nuevaCategoria: {
    name: 'Nueva Categoría',
    icon: '🆕',
    items: [
        { value: 'nuevo-insumo', name: 'Nuevo Insumo', unit: 'piezas' }
    ]
}
```

### 🔧 **Límites del Sistema**

Ajusta en `SYSTEM_CONFIG`:

```javascript
limits: {
    maxInsumosPerRequest: 20,      // Máximo insumos por solicitud
    maxQuantityPerItem: 100,       // Cantidad máxima por insumo
    requestsPerMonth: 1            // Solicitudes por mes
}
```

### 🔐 **Autenticación**

```javascript
// Integrar con sistema de login existente
function getCurrentUser() {
    return fetch('/api/current-user')
        .then(response => response.json());
}
```

## 📊 Validaciones Implementadas

### ✅ **Solicitudes Normales**
- Solo una por mes por usuario
- Todos los campos requeridos completos
- Al menos un insumo en la lista
- Cantidades entre 1 y 100 unidades

### 🚨 **Solicitudes de Emergencia**
- Justificación mínima de 10 caracteres
- Motivo específico y detallado
- Sin límites de frecuencia

## 🧪 Testing

```bash
# Ejecutar tests (si implementas)
npm test

# Validar HTML
npx htmlhint index.html

# Validar CSS
npx stylelint css/styles.css

# Validar JavaScript
npx eslint js/script.js
```

## 📱 Responsive Design

- ✅ **Móviles** (320px+): Layout optimizado, formulario apilado
- ✅ **Tablets** (768px+): Grid adaptativo, navegación fácil  
- ✅ **Escritorio** (1024px+): Layout completo con todos los elementos

## 🚀 Roadmap

### v1.1.0 (Próximo Release)
- [ ] Integración con API REST
- [ ] Notificaciones push
- [ ] Exportación a PDF
- [ ] Firma digital

### v1.2.0 (Futuro)
- [ ] Dashboard para administradores
- [ ] Reportes y estadísticas
- [ ] Aprobación multinivel
- [ ] Integración con sistemas ERP

### v2.0.0 (Visión)
- [ ] PWA (Progressive Web App)
- [ ] Sincronización offline
- [ ] Código QR para seguimiento
- [ ] Integración con Microsoft Teams


### 📋 **Guías de Contribución**

- Sigue el estilo de código existente
- Agrega comentarios descriptivos
- Actualiza la documentación si es necesario
- Incluye tests para nuevas funcionalidades

## 📝 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 👥 Autores

- **Tu Nombre** - *Desarrollo inicial* - [@tu-usuario](https://github.com/tu-usuario)

## 🙏 Agradecimientos

- Dirección Jurídica por los requerimientos
- Comunidad de desarrolladores
- Contribuidores del proyecto



<div align="center">

**⭐ Si este proyecto te resulta útil, ¡considera darle una estrella! ⭐**

[⬆ Volver al inicio](#-sistema-de-solicitud-de-insumos)

</div>