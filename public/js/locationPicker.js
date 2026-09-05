const pickerDiv = document.getElementById("location-picker-map");

if (pickerDiv) {

    // If editing, start centered on the listing's current location
    let startCenter = [78.9629, 20.5937]; // India, default
    let startZoom = 4;

    if (pickerDiv.dataset.existingCoordinates) {
        try {
            const existing = JSON.parse(pickerDiv.dataset.existingCoordinates);
            if (existing && existing.length === 2 && (existing[0] !== 77.209 || existing[1] !== 28.6139)) {
                startCenter = existing;
                startZoom = 12;
            }
        } catch (err) {
            console.warn("Could not parse existing coordinates");
        }
    }

    const map = new maplibregl.Map({
        container: "location-picker-map",
        style: "https://tiles.openfreemap.org/styles/liberty",
        center: startCenter,
        zoom: startZoom,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    let marker = null;

    // If editing an existing listing, show marker at current spot
    if (startZoom === 12) {
        marker = new maplibregl.Marker({ color: "#e74c3c" })
            .setLngLat(startCenter)
            .addTo(map);
    }

    map.on("click", async (e) => {
        const { lng, lat } = e.lngLat;

        if (marker) {
            marker.setLngLat([lng, lat]);
        } else {
            marker = new maplibregl.Marker({ color: "#e74c3c" })
                .setLngLat([lng, lat])
                .addTo(map);
        }

        document.getElementById("picked-lng").value = lng;
        document.getElementById("picked-lat").value = lat;

        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
                { headers: { "User-Agent": "DreamStay" } }
            );
            const data = await res.json();
            const address = data.address || {};

            const cityLike =
                address.city || address.town || address.village || address.county || address.state || "";
            const country = address.country || "";

            if (cityLike) {
                document.getElementById("location-input").value = cityLike;
            }
            if (country) {
                document.getElementById("country-input").value = country;
            }
        } catch (err) {
            console.error("Reverse geocoding failed:", err);
        }
    });
}
