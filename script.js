// Initialize global variables
let map, polyline, previousPosition = null, totalDistance = 0;
let wakeLock = null;

// Chart.js variables
let speedChart, distanceChart;
let speedData = [];
let distanceData = [];
let timeLabels = [];

// Initialize the map after user interaction
function initMap(latitude, longitude) {
    map = L.map('map').setView([latitude, longitude], 15);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Initialize polyline to track the path
    polyline = L.polyline([], {
        color: '#007bff',
        weight: 3,
        opacity: 0.8
    }).addTo(map);

    // Add current position marker
    L.marker([latitude, longitude]).addTo(map);
}

// Initialize charts
function initCharts() {
    const ctxSpeed = document.getElementById('speedChart').getContext('2d');
    const ctxDistance = document.getElementById('distanceChart').getContext('2d');

    // Speed Chart
    speedChart = new Chart(ctxSpeed, {
        type: 'line',
        data: {
            labels: timeLabels,
            datasets: [{
                label: 'Speed (km/h)',
                data: speedData,
                borderColor: '#ff6384',
                borderWidth: 2,
                fill: false
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    type: 'category',
                    title: { display: true, text: 'Time (s)' }
                },
                y: {
                    title: { display: true, text: 'Speed (km/h)' },
                    beginAtZero: true
                }
            }
        }
    });

    // Distance Chart
    distanceChart = new Chart(ctxDistance, {
        type: 'line',
        data: {
            labels: timeLabels,
            datasets: [{
                label: 'Distance (km)',
                data: distanceData,
                borderColor: '#36a2eb',
                borderWidth: 2,
                fill: false
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    type: 'category',
                    title: { display: true, text: 'Time (s)' }
                },
                y: {
                    title: { display: true, text: 'Distance (km)' },
                    beginAtZero: true
                }
            }
        }
    });
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
        navigator.geolocation.getCurrentPosition(position => {
            const { latitude, longitude } = position.coords;
            initMap(latitude, longitude); // Initialize the map with current location
            initCharts(); // Initialize the speed and distance charts
            startWatchingPosition();      // Start updating the position continuously
        }, error => {
            console.error("Error getting initial position:", error);
            alert("Please enable location services to use this app.");
        });
    } else {
        alert("Geolocation is not supported by your browser.");
    }
}
// Continuously watch position changes
function startWatchingPosition() {
    navigator.geolocation.watchPosition(
        updatePosition,
        error => {
            console.error("Tracking error:", error);
            alert("Error tracking location. Please check your GPS settings.");
        },
        {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        }
    );
}

// Update position on map and stats
function updatePosition(position) {
    const { latitude, longitude, speed } = position.coords;
    const currentPosition = [latitude, longitude];

    // Update map view and path
    map.setView(currentPosition, map.getZoom());
    polyline.addLatLng(currentPosition);

    // Calculate distance if we have a previous position
    if (previousPosition) {
        const distance = calculateDistance(
            previousPosition[0], previousPosition[1],
            latitude, longitude
        );

        // Only add to total if the distance is reasonable (prevent GPS jumps)
        if (distance < 0.1) { // Less than 100m
            totalDistance += distance;

            // Update distance data and time labels for chart
            distanceData.push(totalDistance.toFixed(2));
            timeLabels.push(new Date().toLocaleTimeString());
            distanceChart.update();
        }
    }

    // Update speed data and chart
    speedData.push(speed ? (speed * 3.6).toFixed(1) : '0'); // Convert m/s to km/h
    speedChart.update();

    // Update stats display
    document.getElementById('distance').textContent = totalDistance.toFixed(2);
    document.getElementById('speed').textContent = speed ? (speed * 3.6).toFixed(1) : '0';

    // Update previous position
    previousPosition = currentPosition;
}

// Compass heading display
function initCompass() {
    const compassElement = document.getElementById('compass');

    if (window.DeviceOrientationEvent) {
        window.addEventListener('deviceorientation', (event) => {
            if (event.alpha !== null) {
                // Compass heading in degrees
                const heading = event.alpha;

                // Update compass display rotation
                compassElement.style.transform = `rotate(${heading}deg)`;

                // Display the heading in degrees inside the compass element
                compassElement.textContent = `${Math.round(heading)}°`;
            } else {
                compassElement.textContent = 'No Compass';
            }
        });
    } else {
        alert("Compass not supported on this device.");
    }
}

// Handle wake lock (keep screen on)
async function handleWakeLock() {
    const btn = document.getElementById('wakeLockBtn');

    if (!wakeLock) {
        try {
            wakeLock = await navigator.wakeLock.request('screen');
            btn.textContent = 'Screen Lock Active';
            btn.classList.add('active');

            wakeLock.addEventListener('release', () => {
                wakeLock = null;
                btn.textContent = 'Keep Screen On';
                btn.classList.remove('active');
            });
        } catch (err) {
            console.error(`Wake Lock error: ${err.name}, ${err.message}`);
            alert('Could not keep screen on. Your device may not support this feature.');
        }
    } else {
        wakeLock.release();
        wakeLock = null;
    }
}

// Attach event listeners
window.onload = () => {
    // Setup the Start Tracking button to initiate map and GPS tracking
    document.getElementById('startTrackingBtn').addEventListener('click', startTracking);

    // Setup wake lock button if supported
    if ('wakeLock' in navigator) {
        const wakeLockBtn = document.getElementById('wakeLockBtn');
        wakeLockBtn.addEventListener('click', handleWakeLock);
    } else {
        document.getElementById('wakeLockBtn').style.display = 'none';
    }

    // Initialize the compass
    initCompass();
};
