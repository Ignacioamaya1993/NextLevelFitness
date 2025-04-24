export function openCloudinaryWidget(callback, folder = '') {
    const cloudName = 'dpndiyqrw';
    const uploadPreset = 'ml_default';

    // Asegurate de tener cargado el script del widget en tu index.html
    if (!window.cloudinary) {
        console.error("Cloudinary Widget no cargado.");
        return;
    }

    const widget = window.cloudinary.createUploadWidget({
        cloudName,
        uploadPreset,
        sources: [
            'local', 'url', 'camera',
            'facebook', 'instagram',
            'dropbox', 'google_drive'
        ],
        folder,
        multiple: false,
        defaultSource: 'local',
        styles: {
            palette: {
                window: "#ffffff",
                sourceBg: "#f4f4f4",
                windowBorder: "#90a0b3",
                tabIcon: "#000000",
                inactiveTabIcon: "#555a5f",
                menuIcons: "#555a5f",
                link: "#0078ff",
                action: "#339933",
                inProgress: "#0078ff",
                complete: "#339933",
                error: "#cc0000",
                textDark: "#000000",
                textLight: "#ffffff"
            }
        }
    }, (error, result) => {
        if (!error && result && result.event === "success") {
            console.log('Archivo subido:', result.info.secure_url);
            if (callback) callback(result.info.secure_url);
        } else if (error) {
            console.error("Error en widget Cloudinary:", error);
        }
    });

    widget.open();
}