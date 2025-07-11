const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const { exec } = require('child_process');
const path = require('path'); // Include path module for resolving file paths

const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'passkey',
    database: 'database name'
});

connection.connect(err => {
    if (err) {
        console.error('Database connection error:', err.stack);
        return;
    }
    console.log('Connected to MySQL database');
});

app.post('/addLocation', (req, res) => {
    const { latitude, longitude } = req.body;

    // Insert coordinates into the database
    const sql = 'INSERT INTO coordinates (latitude, longitude) VALUES (?, ?)';
    connection.query(sql, [parseFloat(latitude), parseFloat(longitude)], (err, result) => {
        if (err) {
            console.error('Error inserting data:', err);
            res.status(500).json({ success: false, message: 'Error inserting data' });
            return;
        }

        console.log('Location added:', { latitude, longitude });

        // Respond to client
        res.json({ success: true });
    });
});

app.get('/fetchNearestServices', (req, res) => {
    const { latitude, longitude } = req.query;

    // Fetch emergency services locations from the database
    const fetchSql = `
        (SELECT 'Hospital' AS type, location, latitude, longitude FROM hospitals)
        UNION
        (SELECT 'Ambulance' AS type, location, latitude, longitude FROM ambulance)
        UNION
        (SELECT 'Police Station' AS type, location, latitude, longitude FROM policestations)
    `;
    connection.query(fetchSql, (err, services) => {
        if (err) {
            console.error('Error fetching emergency services:', err);
            res.status(500).json({ success: false, message: 'Error fetching emergency services' });
            return;
        }

        // Calculate distances and find the nearest services
        const distances = services.map(service => {
            const distance = calculateDistance(parseFloat(latitude), parseFloat(longitude), parseFloat(service.latitude), parseFloat(service.longitude));
            return { ...service, distance };
        });

        distances.sort((a, b) => a.distance - b.distance);

        const nearestServices = distances.slice(0, 3);

        // Return nearest services to the client
        res.json({ success: true, nearestServices });
    });
});

app.get('/sendEmail', (req, res) => {
    const { toAddresses, subject, body, latitude, longitude } = req.query;
    const escapedBody = body.replace(/"/g, '\\"').replace(/\n/g, '\\n'); // Escaping quotes and newlines

    // Adjust path to send_mail.py using path module
    const scriptPath = path.join(__dirname, 'send_mail.py'); // Assuming send_mail.py is in the same directory as server.js
    const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';

    const emailCommand = `${pythonCommand} "${scriptPath}" "${toAddresses}" "${subject}" "${escapedBody}" "${latitude}" "${longitude}"`;

    console.log('Sending email with the following command:');
    console.log(emailCommand);

    exec(emailCommand, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            res.status(500).json({ success: false, message: 'Error sending email' });
            return;
        }
        console.log(`stdout: ${stdout}`);
        console.error(`stderr: ${stderr}`);
        res.json({ success: true });
    });
});

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    return distance;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

const port = 3000;
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
