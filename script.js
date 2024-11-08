// Initialize global variables
let map, polyline, previousPosition = null, totalDistance = 0;

// Initialize the map
function initMap() {
    map = L.map('map').setView([0, 0], 13);  // Starting view (0,0)

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Initialize polyline to track the path
    polyline = L.polyline([], { color: 'blue' }).addTo(map);

    // Start GPS tracking
    startTracking();
}

// Calculate distance between two coordinates in kilometers
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Start tracking GPS location
function startTracking() {
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(
            updatePosition,
            error => console.error(error),
            { enableHighAccuracy: true }
        );
    } else {
        alert("Geolocation is not supported by this browser.");
    }
}

// Update position on map and stats
function updatePosition(position) {
    const { latitude, longitude, speed } = position.coords;

    // Update map view to current position
    const currentPosition = [latitude, longitude];
    map.setView(currentPosition, 13);

    // Add position to polyline path
    polyline.addLatLng(currentPosition);

    // Calculate distance and update stats
    if (previousPosition) {
        const distance = calculateDistance(
            previousPosition[0], previousPosition[1],
            latitude, longitude
        );
        totalDistance += distance;

        // Display distance in kilometers and speed in km/h
        document.getElementById('distance').textContent = totalDistance.toFixed(2);
        document.getElementById('speed').textContent = speed ? (speed * 3.6).toFixed(2) : 0;  // m/s to km/h
    }

    // Set current position as previous for next calculation
    previousPosition = currentPosition;
}

// Initialize the map when page loads
window.onload = initMap;
