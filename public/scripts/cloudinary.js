export async function uploadToCloudinary(file, folder) {
    const CLOUD_NAME = "dpndiyqrw"; // Reemplaza con tu Cloud Name
    const UPLOAD_PRESET = "ml_default"; // Reemplaza con tu Upload Preset

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);
    formData.append("folder", folder); // Opcional, define la carpeta en Cloudinary

    try {
        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, {
            method: "POST",
            body: formData
        });

        const data = await response.json();
        if (response.ok) {
            console.log("Imagen subida exitosamente:", data.secure_url); // Log para ver la URL
            return data.secure_url;
        } else {
            throw new Error(data.error.message || "Error desconocido al subir la imagen.");
        }
    } catch (error) {
        console.error("Error al subir la imagen a Cloudinary:", error);
        throw error;
    }
}
