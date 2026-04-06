import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminMessaging } from "@/lib/firebase/admin";

export async function POST(req: NextRequest) {
  try {
    const { debtorId, amount, debtorName } = await req.json();

    // 1. Obtener la información del debtor (cliente)
    const debtorDoc = await adminDb.collection("debtors").doc(debtorId).get();
    if (!debtorDoc.exists) {
      return NextResponse.json({ ok: false, message: "Debtor no encontrado" });
    }
    const debtorData = debtorDoc.data();
    const cedula = debtorData?.cedula;
    const email = debtorData?.email;

    // 2. Encontrar al usuario (userId) en la colección de usuarios PWA (users) que coincida con esa cédula o correo
    let userDocs: any[] = [];
    if (cedula) {
      const snap = await adminDb.collection("users").where("cedula", "==", cedula).get();
      userDocs = snap.docs;
    }
    if (userDocs.length === 0 && email) {
      const snap = await adminDb.collection("users").where("email", "==", email).get();
      userDocs = snap.docs;
    }

    if (userDocs.length === 0) {
      return NextResponse.json({ ok: true, message: "No hay usuario PWA enlazado a este deudor" });
    }

    const userId = userDocs[0].id;

    // 3. Obtener los tokens FCM de este usuario
    const tokenSnap = await adminDb.collection("fcm_tokens").where("userId", "==", userId).get();
    const tokens: string[] = tokenSnap.docs.map((d: any) => d.data().token).filter(Boolean);

    if (tokens.length === 0) {
      return NextResponse.json({ ok: true, message: "No hay tokens de notificación para este usuario" });
    }

    // 4. Enviar notificación Push
    const message = {
      notification: {
        title: "💰 Abono Registrado",
        body: `Hola ${debtorName}, se ha registrado exitosamente tu abono por $${(amount ?? 0).toLocaleString("es-CO")}.`
      },
      data: { 
        link: "/client/history" 
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
    
    return NextResponse.json({ ok: true, successCount: response.successCount });
  } catch (err) {
    console.error("Notify payment error:", err);
    return NextResponse.json({ error: "Error interno al enviar alerta" }, { status: 500 });
  }
}
