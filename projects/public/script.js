document.addEventListener('DOMContentLoaded', function() {
    var map = L.map('map').setView([0, 0], 2); // Initial map view (world view)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    var marker = L.marker([0, 0], {
        draggable: true // Make the marker draggable
    }).addTo(map);

    map.on('click', function(e) {
        updateMarkerPosition(e.latlng.lat, e.latlng.lng);
    });

    marker.on('dragend', function(e) {
        updateMarkerPosition(e.target.getLatLng().lat, e.target.getLatLng().lng);
    });

    document.getElementById('locationForm').addEventListener('submit', function(e) {
        e.preventDefault();
        addLocation();
    });

    document.getElementById('currentLocationBtn').addEventListener('click', function() {
        getCurrentLocation();
    });

    function updateMarkerPosition(lat, lng) {
        marker.setLatLng([lat, lng]);
        document.getElementById('latitude').value = lat.toFixed(12);
        document.getElementById('longitude').value = lng.toFixed(12);
    }

    function addLocation() {
        const latitude = parseFloat(document.getElementById('latitude').value);
        const longitude = parseFloat(document.getElementById('longitude').value);

        if (isNaN(latitude) || isNaN(longitude)) {
            alert('Invalid coordinates. Please enter valid latitude and longitude values.');
            return;
        }

        fetch('http://localhost:3000/addLocation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ latitude: latitude.toFixed(12), longitude: longitude.toFixed(12) })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Location added successfully.');
                fetchNearestServices(latitude, longitude);
            } else {
                alert('Error adding location: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error adding location. Please try again.');
        });
    }

    function getCurrentLocation() {
        fetch('https://api.ipgeolocation.io/ipgeo?apiKey=9e7d8ae7c0284af5bf11c3d7b51d4b4d')
        .then(response => response.json())
        .then(data => {
            const latitude = parseFloat(data.latitude);
            const longitude = parseFloat(data.longitude);
            if (latitude && longitude) {
                updateMarkerPosition(latitude, longitude);
                map.setView([latitude, longitude], 13);
            } else {
                fallbackGeolocation();
            }
        })
        .catch(error => {
            console.error('Error fetching IP geolocation:', error);
            fallbackGeolocation();
        });
    }

    function fallbackGeolocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function(position) {
                const latitude = position.coords.latitude.toFixed(12);
                const longitude = position.coords.longitude.toFixed(12);

                marker.setLatLng([latitude, longitude]);
                map.setView([latitude, longitude], 13);
                document.getElementById('latitude').value = latitude;
                document.getElementById('longitude').value = longitude;
            }, function(error) {
                console.error('Error getting location:', error);
                alert('Error getting location. Please ensure location services are enabled.');
            });
        } else {
            alert('Geolocation is not supported by this browser.');
        }
    }

    function fetchNearestServices(latitude, longitude) {
        fetch(`http://localhost:3000/fetchNearestServices?latitude=${latitude}&longitude=${longitude}`)
        .then(response => response.json())
        .then(data => {
            updateMapWithServices(data.nearestServices);
            displayNearestServicesTable(data.nearestServices);
            sendEmail(latitude, longitude, data.nearestServices);
        })
        .catch(error => {
            console.error('Error fetching nearest services:', error);
            alert('Error fetching nearest services. Please try again.');
        });
    }

    function updateMapWithServices(services) {
        map.eachLayer(layer => {
            if (layer instanceof L.Marker && layer !== marker) {
                map.removeLayer(layer);
            }
        });

        marker.addTo(map);

        services.forEach(service => {
            L.marker([service.latitude, service.longitude])
            .addTo(map)
            .bindPopup(`<b>${service.type}</b><br>${service.location}`)
            .openPopup();
        });
    }

    function displayNearestServicesTable(services) {
        const tableContainer = document.getElementById('nearestServicesTable');
        tableContainer.innerHTML = generateHtmlTable(services);
    }

    function sendEmail(latitude, longitude, nearestServices) {
        const toAddresses = 'kundenatharakaram@gmail.com'; // Replace with your recipient email address
        const subject = 'Emergency Alert';
        const coordinatesLink = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
        const body = `An emergency has been reported at latitude: ${latitude}, longitude: ${longitude}. Please respond immediately.\n\nNearest Services:\n${generateHtmlTable(nearestServices)}\n\nCoordinates Link: ${coordinatesLink}`;

        fetch(`http://localhost:3000/sendEmail?toAddresses=${toAddresses}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}&latitude=${latitude}&longitude=${longitude}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('Email sent successfully');
            } else {
                console.error('Error sending email:', data.message);
            }
        })
        .catch(error => {
            console.error('Error sending email:', error);
        });
    }

    function generateHtmlTable(data) {
        let table = '<table border="1"><tr><th>Type</th><th>Location</th><th>Distance (km)</th></tr>';
        data.forEach(item => {
            table += `<tr><td>${item.type}</td><td>${item.location}</td><td>${item.distance.toFixed(2)}</td></tr>`;
        });
        table += '</table>';
        return table;
    }
});
