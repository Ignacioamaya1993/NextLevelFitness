import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Inicializar Firebase Admin SDK
admin.initializeApp();

// 🔹 1. Inhabilitar Usuario
export const inhabilitarUsuario = functions.https.onRequest(async (req, res) => {
    const { uid } = req.body; // UID del usuario a inhabilitar
    if (!uid) {
        return res.status(400).json({ error: "Falta el UID del usuario." });
    }
    
    try {
        await admin.auth().updateUser(uid, { disabled: true });
        return res.json({ message: "Usuario inhabilitado correctamente." });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// 🔹 2. Eliminar Usuario
export const eliminarUsuario = functions.https.onRequest(async (req, res) => {
    const { uid } = req.body;
    if (!uid) {
        return res.status(400).json({ error: "Falta el UID del usuario." });
    }

    try {
        await admin.auth().deleteUser(uid);
        return res.json({ message: "Usuario eliminado correctamente." });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// 🔹 3. Obtener Rutinas del Usuario desde Firestore
export const obtenerRutinas = functions.https.onRequest(async (req, res) => {
    const { uid } = req.query;
    if (!uid) {
        return res.status(400).json({ error: "Falta el UID del usuario." });
    }

    try {
        const routinesRef = admin.firestore().collection("routines");
        const querySnapshot = await routinesRef.where("userId", "==", uid).get();

        if (querySnapshot.empty) {
            return res.status(404).json({ error: "No hay rutinas para este usuario." });
        }

        const routines = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));

        return res.json(routines);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});