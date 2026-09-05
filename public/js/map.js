const mapDiv = document.getElementById("map");

if (mapDiv) {

    let coordinates;

    try {
        coordinates = JSON.parse(mapDiv.dataset.coordinates);
    } catch (err) {
        console.error("Invalid coordinates:", mapDiv.dataset.coordinates);
        coordinates = [77.2090, 28.6139]; // Default: New Delhi
    }

    const map = new maplibregl.Map({
        container: "map",
        // Full detailed street map (roads, labels, POIs) — free, no API key.
        // The old "demotiles" style only drew bare country borders, which is
        // why it didn't look like a real map.
        style: "https://tiles.openfreemap.org/styles/liberty",
        center: coordinates,
        zoom: 14,
        pitch: 45,
        bearing: -10,
        antialias: true,
    });

    map.addControl(
        new maplibregl.NavigationControl({ visualizePitch: true }),
        "top-right"
    );

    map.addControl(new maplibregl.FullscreenControl(), "top-right");

    map.addControl(
        new maplibregl.GeolocateControl({
            positionOptions: { enableHighAccuracy: true },
            trackUserLocation: false,
        }),
        "top-right"
    );

    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");

    // ===== Google-Maps-style pin marker (teardrop shape, not the default dot) =====
    const pinEl = document.createElement("div");
    pinEl.className = "gmap-style-pin";
    pinEl.innerHTML = `
        <svg width="34" height="46" viewBox="0 0 34 46" xmlns="http://www.w3.org/2000/svg">
            <path d="M17 0C7.6 0 0 7.6 0 17c0 12.7 17 29 17 29s17-16.3 17-29C34 7.6 26.4 0 17 0z" fill="#EA4335"/>
            <circle cx="17" cy="17" r="7" fill="#ffffff"/>
        </svg>
    `;

    // ===== Info popup (mimics a Google Maps info window) =====
    const title = mapDiv.dataset.title || "";
    const location = mapDiv.dataset.location || "";
    const price = mapDiv.dataset.price || "";

    let popupHtml = "";

    if (title) {
        popupHtml = `
            <div class="gmap-style-popup">
                <strong>${title}</strong>
                ${location ? `<div class="gmap-popup-location">${location}</div>` : ""}
                ${price ? `<div class="gmap-popup-price">${price}</div>` : ""}
            </div>
        `;
    }

    const marker = new maplibregl.Marker({ element: pinEl, anchor: "bottom" })
        .setLngLat(coordinates)
        .addTo(map);

    if (popupHtml) {

        const popup = new maplibregl.Popup({ offset: 40, closeButton: false })
            .setHTML(popupHtml);

        marker.setPopup(popup);
        popup.addTo(map); // open by default, like a Google Maps info window

    }

    map.on("error", (e) => {
        console.error("MapLibre Error:", e);
    });

} else {

    console.warn("No #map element found on this page");

}