let map, polyline, previousPosition = null, totalDistance = 0;
let wakeLock = null;

let speedChart, distanceChart;
let speedData = [];
let distanceData = [];
let timeLabels = [];

function initMap(latitude, longitude) {
    map = L.map('map').setView([latitude, longitude], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    polyline = L.polyline([], { color: '#007aff', weight: 3, opacity: 0.8 }).addTo(map);
    L.marker([latitude, longitude]).addTo(map);
}

function initCharts() {
    const ctxSpeed = document.getElementById('speedChart').getContext('2d');
    const ctxDistance = document.getElementById('distanceChart').getContext('2d');
    speedChart = new Chart(ctxSpeed, {
        type: 'line',
        data: {
            labels: timeLabels,
            datasets: [{ label: 'Speed (km/h)', data: speedData, borderColor: '#ff4081', borderWidth: 2, fill: false }]
        },
        options: { responsive: true, scales: { x: { title: { display: true, text: 'Time (s)' } }, y: { title: { display: true, text: 'Speed (km/h)' }, beginAtZero: true } } }
    });
    distanceChart = new Chart(ctxDistance, {
        type: 'line',
        data: {
            labels: timeLabels,
            datasets: [{ label: 'Distance (km)', data: distanceData, borderColor: '#36a2eb', borderWidth: 2, fill: false }]
        },
        options: { responsive: true, scales: { x: { title: { display: true, text: 'Time (s)' } }, y: { title: { display: true, text: 'Distance (km)' }, beginAtZero: true } } }
    });
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function startTracking() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const { latitude, longitude } = position.coords;
            initMap(latitude, longitude);
            initCharts();
            startWatchingPosition();
        }, error => {
            alert("Please enable location services to use this app.");
        });
    } else {
        alert("Geolocation is not supported by your browser.");
    }
}

function startWatchingPosition() {
    navigator.geolocation.watchPosition(
        updatePosition,
        error => {
            alert("Error tracking location. Please check your GPS settings.");
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
}

function updatePosition(position) {
    const { latitude, longitude, speed } = position.coords;
    const currentPosition = [latitude, longitude];
    map.setView(currentPosition, map.getZoom());
    polyline.addLatLng(currentPosition);
    if (previousPosition) {
        const distance = calculateDistance(previousPosition[0], previousPosition[1], latitude, longitude);
        if (distance < 0.1) {
            totalDistance += distance;
            distanceData.push(totalDistance.toFixed(2));
            timeLabels.push(new Date().toLocaleTimeString());
            distanceChart.update();
        }
    }
    speedData.push(speed ? (speed * 3.6).toFixed(1) : '0');
    speedChart.update();
    document.getElementById('distance').textContent = totalDistance.toFixed(2);
    document.getElementById('speed').textContent = speed ? (speed * 3.6).toFixed(1) : '0';
    previousPosition = currentPosition;
}

function initCompass() {
    const compassElement = document.getElementById('compass');
    if (window.DeviceOrientationEvent) {
        window.addEventListener('deviceorientation', (event) => {
            if (event.alpha !== null) {
                const heading = event.alpha;
                compassElement.style.transform = `rotate(${heading}deg)`;
                compassElement.textContent = `${Math.round(heading)}°`;
            } else {
                compassElement.textContent = 'No Compass';
            }
        });
    } else {
        alert("Compass not supported on this device.");
    }
}

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
            alert('Could not keep screen on. Your device may not support this feature.');
        }
    } else {
        wakeLock.release();
        wakeLock = null;
    }
}

window.onload = () => {
    document.getElementById('startTrackingBtn').addEventListener('click', startTracking);
    if ('wakeLock' in navigator) {
        const wakeLockBtn = document.getElementById('wakeLockBtn');
        wakeLockBtn.addEventListener('click', handleWakeLock);
    } else {
        document.getElementById('wakeLockBtn').style.display = 'none';
    }
    initCompass();
};
