import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminMessaging } from "@/lib/firebase/admin";

export async function POST(req: NextRequest) {
  try {
    const { clientName, total } = await req.json();

    // Obtener tokens FCM de todos los admins y propietarios usando adminDb
    const usersSnap = await adminDb.collection("users").where("role", "in", ["admin", "propietario"]).get();

    const tokenPromises = usersSnap.docs.map(async (userDoc: any) => {
      const tokenSnap = await adminDb.collection("fcm_tokens").where("userId", "==", userDoc.id).get();
      return tokenSnap.docs.map((d: any) => d.data().token);
    });

    const tokenArrays = await Promise.all(tokenPromises);
    const tokens: string[] = tokenArrays.flat().filter(Boolean);

    if (tokens.length === 0) {
      return NextResponse.json({ ok: true, message: "No tokens found" });
    }

    // Enviar push a cada token usando firebase-admin SDK
    const message = {
      notification: {
        title: "🛍️ Nuevo pedido recibido",
        body: `${clientName} realizó un pedido por $${(total ?? 0).toLocaleString("es-CO")}`
      },
      data: { 
        link: "/admin/orders" 
      },
      android: {
        priority: "high" as const,
        notification: {
          sound: "default",
          channelId: "default"
        }
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1
          }
        }
      },
      tokens: tokens
    };

    const response = await adminMessaging.sendEachForMulticast(message);
    console.log(response.successCount + ' messages were sent successfully');

    return NextResponse.json({ ok: true, successCount: response.successCount });
  } catch (err) {
    console.error("Notify order error:", err);
    return NextResponse.json({ error: "Error enviando notificación" }, { status: 500 });
  }
}
