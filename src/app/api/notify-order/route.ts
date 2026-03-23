import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase/config";
import { collection, getDocs, query, where } from "firebase/firestore";

export async function POST(req: NextRequest) {
  try {
    const { clientName, total } = await req.json();

    // Obtener tokens FCM de todos los admins y propietarios
    const usersSnap = await getDocs(
      query(collection(db, "users"), where("role", "in", ["admin", "propietario"]))
    );

    const tokenPromises = usersSnap.docs.map(async (userDoc) => {
      const tokenSnap = await getDocs(
        query(collection(db, "fcm_tokens"), where("userId", "==", userDoc.id))
      );
      return tokenSnap.docs.map((d: any) => d.data().token);
    });

    const tokenArrays = await Promise.all(tokenPromises);
    const tokens: string[] = tokenArrays.flat().filter(Boolean);

    // Enviar push a cada token via FCM HTTP API
    await Promise.all(tokens.map(token =>
      fetch("https://fcm.googleapis.com/fcm/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `key=${process.env.FCM_SERVER_KEY}`
        },
        body: JSON.stringify({
          to: token,
          notification: {
            title: "🛍️ Nuevo pedido recibido",
            body: `${clientName} realizó un pedido por $${(total ?? 0).toLocaleString("es-CO")}`
          },
          data: { link: "/admin/orders" },
          android: { priority: "high" },
          apns: { payload: { aps: { sound: "default" } } }
        })
      })
    ));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Notify order error:", err);
    return NextResponse.json({ error: "Error enviando notificación" }, { status: 500 });
  }
}
