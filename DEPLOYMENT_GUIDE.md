# 📱 Guía de Despliegue Local y Prueba de PWA

## 🚀 Inicio Rápido - Despliegue Local

### 1. **Despliegue en Modo Desarrollo** (Sin PWA)
```bash
npm install
npm run dev
```
**URL**: http://localhost:3000
- La app funciona normalmente
- El botón "Instalar app" NO aparecerá (PWA deshabilitada)

---

## 🎯 Ver los Cambios Recientemente Realizados

Todos los cambios están en los encabezados de módulos:
- **Dashboard** `/admin/dashboard`
- **Compras** `/admin/purchases`
- **Clientes** `/admin/clients`
- **Inventario** `/admin/inventory`

**Cambios implementados**:
1. ✅ Encabezados reducidos a máximo 30% de espacio
2. ✅ Ganancia neta ahora *resta gastos de compras* correctamente
3. ✅ Ventas ahora muestran solo efectivo recibido
4. ✅ Créditos pendientes en tarjeta separada

---

## 🔧 Despliegue para Testing de PWA

**Para ver el botón "Instalar app" y probar la PWA en local:**

### Opción 1: BUILD + START (Recomendado) ⭐
```bash
npm run build
npm run start
```
**URL**: http://localhost:3000
- Simula producción exactamente
- PWA **HABILITADA**
- El botón "Instalar app" **APARECERÁ**
- Service Worker funcionando
- Funcionará sin conexión

**Tiempo de compilación**: ~30-60 segundos

### Opción 2: Con Devtools de Chrome simulando instalación
Si prefieres ver en desarrollo:
1. Abre Chrome DevTools (F12)
2. Ir a `Application` → `Manifest`
3. Click en "Show Messages"
4. La PWA debería estar detectada

---

## 📊 Cómo Probar la Ganancia Neta (Ya Arreglada)

### Dashboard - Nueva Lógica de Ganancia Neta

**Antes**: Ganancia = (precio - costo) × cantidad (SOLO de ventas)
**Ahora**: Ganancia = (Efectivo recibido - Costo items vendidos) - Gastos de compras

**Para ver funcionando**:
1. Ve a `/admin/dashboard`
2. Verás 3 tarjetas principales:
   - **Efectivo Recibido**: Solo ventas de contado
   - **Créditos Pendientes**: Ventas a crédito sin cobrar
   - **Ganancia Neta**: (Efectivo - Costos) - Gastos compras

**Ejemplo numérico**:
```
Si hoy:
- Vendiste $100 en efectivo
- Los items costaron $30
- Compraste cosas por $60

Ganancia Neta = ($100 - $30) - $60 = $10
```

Video en Dashboard / Compras:
- La ganancia será **negativa** si gastos > ingresos
- Las compras se restan en tiempo real

---

## 🔍 Testing Checklist

Para verificar que todo está funcionando:

- [ ] Dashboard muestra ganancia neta correcta
- [ ] Encabezados ocupan máximo 30% de pantalla
- [ ] Navega entre módulos sin errores
- [ ] Los botones del menú cierran después de click
- [ ] Compartir acceso funciona en móvil/desktop
- [ ] En `npm run build && npm run start`: Aparece "Instalar app"

---

## 🔗 Instalar la App (Solo funciona en `build + start` o Vercel)

Cuando aparezca el botón "Instalar app":

**En Chrome:**
1. Click en el botón en el menú de usuario
2. Chrome te pedirá confirmación
3. Instala como aplicación en tu dispositivo

**Características PWA**:
- Accede como aplicación nativa
- Funciona sin conexión a internet
- Carga más rápido (caché local)
- Acceso desde pantalla de inicio

---

## 🌐 Despliegue a Producción (Vercel)

Ya está hosteado en:
```
https://tienda-venta-agil-ashen.vercel.app/
```

**PWA funcionará automáticamente en Vercel**
- El botón "Instalar app" aparecerá en todos los navegadores
- Funciona en iOS via web app
- Service Worker caché todo

---

## 🐛 Troubleshooting

### "Instalar app" no aparece en `npm run dev`
✓ **Normal** - PWA está deshabilitada en desarrollo
→ Usa `npm run build && npm run start`

### Ganancia neta sigue siendo incorrecta
→ Asegúrate de recargar F5 luego de deploy
→ Los cálculos son en tiempo real con Firestore

### Encabezados se ven raros en móvil
→ Son responsive, probablemente sea normalmente comprimido
→ Los encabezados ahora ocupan menos espacio

---

## 📝 Notas Técnicas

**Archivos modificados**:
```
src/app/admin/dashboard/page.tsx      ✅ Arreglada ganancia neta
src/app/admin/purchases/page.tsx      ✅ Encabezado reducido
src/app/admin/clients/page.tsx        ✅ Encabezado reducido
src/app/admin/inventory/page.tsx      ✅ Encabezado reducido
src/components/admin/StatsGrid.tsx    ✅ Nuevas métri cas
src/components/layout/BottomNav.tsx   ✅ Fondo menos transparente
src/components/layout/UserMenu.tsx    ✅ Cierre de menú en todas opciones
```

**Configuración PWA**:
- `next.config.mjs` - Config PWA (service worker generado automáticamente)
- `public/manifest.json` - Metadata de instalación
- `public/sw.js` - Service worker pre-generado

---

## ⚡ Quick Commands

```bash
# Desarrollo
npm run dev

# Build optimizado + start
npm run build && npm run start

# Solo build
npm run build

# Linter
npm run lint
```

---

¡Listo! Disfruta de la app mejorada. Si tienes dudas, revisa esta guía. 🚀
