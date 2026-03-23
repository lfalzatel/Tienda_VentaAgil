# Scraper — Supermercados La 80

Extrae todos los productos (nombre, precio, categoría, imagen) del sitio
https://www.supermercadosla80.com/pedir y los guarda en `productos.json`
listo para importar a tu colección `products` de Firestore.

---

## Instalación (una sola vez)

```bash
cd scripts/scraper-la80
npm install
npx playwright install chromium
```

---

## Uso

### 1. Probar con una sola categoría (rápido, ~2 min)
```bash
node scraper.js --test
```

### 2. Extraer todo el catálogo (~20-40 min)
```bash
node scraper.js
```

### 3. Extraer y subir directo a Firebase
```bash
node scraper.js --firebase
```

### 4. Importar el JSON ya generado a Firebase
```bash
node importar-firebase.js
```

### 5. Importar solo una categoría específica
```bash
node importar-firebase.js --categoria Carnes
```

### 6. Ver qué haría sin subir nada (dry-run)
```bash
node importar-firebase.js --dry-run
```

---

## Requisitos para subir a Firebase

1. Ve a **Firebase Console → Configuración del proyecto → Cuentas de servicio**
2. Clic en **"Generar nueva clave privada"**
3. Guarda el archivo descargado como `serviceAccount.json` en **esta carpeta** (`scripts/scraper-la80`)
4. El archivo está en `.gitignore` — nunca lo subas a GitHub

---

## Notas importantes

- **`costo` y `markup` quedan en 0** — debes ingresarlos manualmente desde el panel de Inventario de tu app.
- **`stock` queda en 0** — el stock real lo manejas tú desde el sistema.
- Las imágenes son URLs directas al CDN de Justo, no se descargan localmente.
