/**
 * fix-products.js
 * 
 * Script de una sola vez para corregir los productos que se subieron con nombres de campos en español.
 * Renombra:
 * - nombre -> name
 * - categoria -> category
 * - precio -> price
 * - imagen -> image
 */

const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

async function main() {
  const serviceAccountPath = path.join(__dirname, "serviceAccount.json");
  if (!fs.existsSync(serviceAccountPath)) {
    console.error("❌ No se encontró serviceAccount.json en la carpeta del scraper.");
    process.exit(1);
  }

  const serviceAccount = require(serviceAccountPath);
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  const db = admin.firestore();

  console.log("🔍 Buscando productos con campos en español...");
  const snapshot = await db.collection("products").get();
  
  let count = 0;
  const BATCH_SIZE = 400;
  let batch = db.batch();
  let operationsInBatch = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    
    // Si tiene campos en español, hay que migrarlos
    if (data.nombre || data.categoria || data.precio || data.imagen) {
      const updates = {
        name: data.name || data.nombre || "",
        category: data.category || data.categoria || "Sin Categoría",
        price: data.price !== undefined ? data.price : (data.precio || 0),
        image: data.image || data.imagen || "",
        // Limpiar los campos viejos
        nombre: admin.firestore.FieldValue.delete(),
        categoria: admin.firestore.FieldValue.delete(),
        precio: admin.firestore.FieldValue.delete(),
        imagen: admin.firestore.FieldValue.delete(),
        actualizadoEn: admin.firestore.FieldValue.serverTimestamp(),
      };

      batch.update(doc.ref, updates);
      operationsInBatch++;
      count++;

      if (operationsInBatch >= BATCH_SIZE) {
        await batch.commit();
        console.log(`  Procesados ${count} productos...`);
        batch = db.batch();
        operationsInBatch = 0;
      }
    }
  }

  if (operationsInBatch > 0) {
    await batch.commit();
  }

  console.log(`\n✅ Se corrigieron ${count} productos exitosamente.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Error durante la migración:", err);
  process.exit(1);
});
