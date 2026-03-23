/**
 * importar-firebase.js
 * 
 * Importa el archivo productos.json generado por scraper.js
 * directamente a la colección "products" de tu Firestore.
 */

const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

const OUTPUT_FILE = "productos.json";
const BATCH_SIZE = 400;

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const catFilter = args.includes("--categoria")
    ? args[args.indexOf("--categoria") + 1]
    : null;

  if (!fs.existsSync(OUTPUT_FILE)) {
    console.error(`❌ No se encontró ${OUTPUT_FILE}. Ejecuta primero: node scraper.js`);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(OUTPUT_FILE, "utf-8"));
  let productos = raw.productos || raw;

  if (catFilter) {
    productos = productos.filter((p) => p.categoria === catFilter);
    console.log(`Filtrando por categoría: "${catFilter}" → ${productos.length} productos`);
  }

  console.log(`\n📦 Productos a importar: ${productos.length}`);

  if (dryRun) {
    console.log("\n[DRY RUN] Primeros 5 productos:");
    productos.slice(0, 5).forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.nombre} | $${p.precio.toLocaleString("es-CO")} | ${p.categoria}`);
    });
    return;
  }

  const serviceAccountPath = path.join(__dirname, "serviceAccount.json");
  if (!fs.existsSync(serviceAccountPath)) {
    console.error("\n❌ No se encontró serviceAccount.json");
    process.exit(1);
  }

  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  const db = admin.firestore();

  let total = 0;
  for (let i = 0; i < productos.length; i += BATCH_SIZE) {
    const chunk = productos.slice(i, i + BATCH_SIZE);
    const batch = db.batch();

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
      total++;
    }

    await batch.commit();
  }

  console.log(`\n✅ ${total} productos importados exitosamente`);
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
