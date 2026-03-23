/**
 * Scraper — Supermercados La 80 (getjusto.com)
 * 
 * Extrae todos los productos con nombre, precio, categoría e imagen.
 * Guarda el resultado en productos.json listo para importar a Firebase.
 */

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE_URL = "https://www.supermercadosla80.com/pedir";
const DELAY_MS = 1200; 
const OUTPUT_FILE = "productos.json";
const LOG_FILE = "scraper.log";

const CATEGORY_MAP = {
  "Carne, Pollo y Pescado": "Carnes",
  "Frutas y Verduras": "Fruver",
  "Lácteos, huevos y Refrigerados": "Lácteos",
  "Bebidas": "Bebidas",
  "Bebidas y Snack": "Bebidas",
  "Aseo y Limpieza": "Aseo",
  "Cuidado Hogar": "Aseo",
  "Cuidado Personal": "Aseo",
  "Licores": "Licores",
  "Vinos y Licores": "Licores",
  "Panadería y Pastelería": "Abarrotes",
  "Enlatados y Conservas": "Abarrotes",
  "Granos y Cereales": "Abarrotes",
  "Aceites y Salsas": "Abarrotes",
  "Snacks y Dulces": "Abarrotes",
  "Despensa": "Abarrotes",
  "Mundo Saludable": "Abarrotes",
  "Mascotas": "Abarrotes",
  "Congelados": "Carnes",
};

function log(msg) {
  const line = `[${new Date().toLocaleTimeString("es-CO")}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + "\n");
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function formatPrice(rawText) {
  const clean = rawText.replace(/[^0-9]/g, "");
  return parseInt(clean, 10) || 0;
}

function getImageOriginal(resizedUrl) {
  return resizedUrl.replace(/\/resized2\/(.+?)-\d+-x\.(webp|jpg|png)/, "/$1");
}

function mapCategory(raw) {
  // Normalizar espacios (eliminar \u00a0 y espacios extra)
  const normalized = (raw || "").replace(/\s+/g, " ").trim();
  return CATEGORY_MAP[normalized] || "Otro";
}

async function extractCategories(page) {
  log("Extrayendo categorías desde la página principal...");
  await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForSelector('a[href*="/pedir/categoria/"]', { timeout: 15000 });

  const categories = await page.$$eval('a[href*="/pedir/categoria/"]', (links) =>
    links.map((a) => ({
      name: a.querySelector("h3, h2, p, span")?.innerText?.trim() || a.innerText.trim(),
      url: a.href,
      id: a.href.split("/categoria/")[1],
    }))
  );

  const seen = new Set();
  const unique = categories.filter((c) => {
    if (seen.has(c.id) || !c.id) return false;
    seen.add(c.id);
    return true;
  });

  log(`  → ${unique.length} categorías encontradas`);
  return unique;
}

async function extractProductsFromCategory(page, category) {
  log(`  Categoría: "${category.name}" (${category.id})`);
  await page.goto(category.url, { waitUntil: "networkidle", timeout: 30000 });

  const products = [];
  let pageNum = 0;
  let previousCount = -1;

  while (true) {
    pageNum++;
    try {
      await page.waitForSelector('a[href*="/pedir/"][href*="-"]', { timeout: 8000 });
    } catch {
      log(`    ⚠ Sin productos visibles en página ${pageNum}`);
      break;
    }

    const visible = await page.$$eval(
      'a[href*="/pedir/"][href*="-"]',
      (links, catName) =>
        links
          .filter((a) => a.querySelector("img") && (a.querySelector('[class*="price"]') || a.querySelector("span, p")))
          .map((a) => {
            const img = a.querySelector("img");
            const spans = Array.from(a.querySelectorAll("span, p, div")).filter((el) => el.innerText.includes("$"));
            return {
              name: (img?.alt || a.querySelector("h3, h2, p")?.innerText || "").trim(),
              priceText: (spans[0]?.innerText || "").trim(),
              imageUrl: img?.src || "",
              productUrl: a.href,
              category: catName,
            };
          })
          .filter((p) => p.name && p.priceText),
      category.name
    );

    if (visible.length === previousCount) break;
    previousCount = visible.length;

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await sleep(DELAY_MS);

    const verMasBtn = await page.$('button:has-text("Ver más"), a:has-text("Ver más")');
    if (verMasBtn) {
      await verMasBtn.click();
      await sleep(DELAY_MS);
    }
    if (pageNum > 30) break;
  }

    const allProducts = await page.$$eval(
    'a[href*="/pedir/"][href*="-"]',
    (links, catName) =>
      links
        .filter((a) => a.querySelector("img"))
        .map((a) => {
          const img = a.querySelector("img");
          
          // Buscar el precio. Si hay varios (ej: tachado y actual), el actual suele ser el último o tener clases específicas.
          // Intentamos buscar elementos que contengan "$" pero que NO tengan clases de "precio anterior/tachado"
          const priceElements = Array.from(a.querySelectorAll("span, p, div")).filter(el => {
            const text = el.innerText.trim();
            const isPrice = /^\$[\d\.,]+$/.test(text);
            const isOldPrice = el.className.toLowerCase().includes("old") || 
                               el.style.textDecoration.includes("line-through");
            return isPrice && !isOldPrice;
          });

          // Si fallan los filtros, tomamos el que tenga el texto más corto o el último (que suele ser el actual)
          const priceText = priceElements.length > 0 
            ? priceElements[priceElements.length - 1].innerText.trim() 
            : "";

          return {
            name: (img?.alt || "").trim(),
            priceText: priceText,
            imageResized: img?.src || "",
            productUrl: a.href,
            rawCategory: catName,
          };
        })
        .filter((p) => p.name && p.priceText && !p.name.includes("Logo")),
    category.name
  );

  const seenUrls = new Set();
  for (const raw of allProducts) {
    if (seenUrls.has(raw.productUrl)) continue;
    seenUrls.add(raw.productUrl);

    products.push({
      nombre: raw.name,
      precio: formatPrice(raw.priceText),
      costo: 0,
      markup: 0,
      categoria: mapCategory(raw.rawCategory),
      categoriaOriginal: raw.rawCategory,
      stock: 0,
      stockMinimo: 5,
      imagen: raw.imageResized,
      imagenOriginal: getImageOriginal(raw.imageResized),
      activo: true,
      fuente: "la80",
      urlProducto: raw.productUrl,
    });
  }
  return products;
}

async function uploadToFirebase(products) {
  const serviceAccountPath = path.join(__dirname, "serviceAccount.json");
  if (!fs.existsSync(serviceAccountPath)) {
    log("⚠ No se encontró serviceAccount.json");
    return;
  }
  const admin = require("firebase-admin");
  const serviceAccount = require(serviceAccountPath);
  if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  const db = admin.firestore();
  const BATCH_SIZE = 400;

  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = products.slice(i, i + BATCH_SIZE);
    for (const p of chunk) {
      const ref = db.collection("products").doc();
      batch.set(ref, {
        name: p.nombre,
        category: p.categoria,
        price: p.precio,
        costPrice: p.costo || 0,
        markup: p.markup || 0,
        stock: p.stock || 0,
        stockMinimo: p.stockMinimo || 5,
        image: p.imagen || "",
        activo: true,
        fuente: "la80",
        creadoEn: admin.firestore.FieldValue.serverTimestamp(),
        actualizadoEn: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
    log(`  Lote ${Math.floor(i / BATCH_SIZE) + 1} subido.`);
    await sleep(500);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const testMode = args.includes("--test");
  const firebaseMode = args.includes("--firebase");
  if (fs.existsSync(LOG_FILE)) fs.unlinkSync(LOG_FILE);

  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();
  await page.route("**/*.{woff,woff2,ttf,mp4,mp3,pdf}", (route) => route.abort());

  let allProducts = [];
  try {
    const categories = await extractCategories(page);
    const toProcess = testMode ? categories.slice(0, 1) : categories;
    for (const cat of toProcess) {
      const products = await extractProductsFromCategory(page, cat);
      allProducts = allProducts.concat(products);
      await sleep(DELAY_MS);
    }

    const seenNames = new Set();
    const deduped = allProducts.filter((p) => {
      if (seenNames.has(p.nombre)) return false;
      seenNames.add(p.nombre);
      return true;
    });

    const output = { meta: { fecha: new Date().toISOString(), fuente: BASE_URL, total: deduped.length }, productos: deduped };
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), "utf-8");
    log(`✅ Guardado en ${OUTPUT_FILE}`);
    if (firebaseMode) await uploadToFirebase(deduped);
  } catch (err) {
    log(`❌ Error: ${err.message}`);
  } finally {
    await browser.close();
  }
}

main();
