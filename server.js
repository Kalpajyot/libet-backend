// server.js

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose'); // Import mongoose

// Create an Express application
const app = express();

// --- Environment Variables (Recommended!) ---
// Load environment variables from a .env file during development
// Install with: npm install dotenv
require('dotenv').config();

// --- Middleware ---
app.use(cors()); // Configure CORS appropriately for production
app.use(express.json());

// --- MongoDB Connection ---
// Get the connection string from environment variables
const mongoURI = process.env.MONGODB_URI; // Store your connection string in a .env file

if (!mongoURI) {
    console.error("FATAL ERROR: MONGODB_URI environment variable is not set.");
    process.exit(1); // Exit the application if connection string is missing
}

mongoose.connect(mongoURI, {
    // Options to avoid deprecation warnings (check mongoose docs for latest)
    // useNewUrlParser: true, // No longer needed in Mongoose 6+
    // useUnifiedTopology: true // No longer needed in Mongoose 6+
})
.then(() => console.log('MongoDB connected successfully.'))
.catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1); // Exit if connection fails
});

// --- Mongoose Schema and Model ---
// Define the structure of the data you want to save
const trialSchema = new mongoose.Schema({
    participantId: { type: String, required: true, index: true }, // Added index for faster queries
    trial: { type: Number, required: true },
    startPosition: { type: Number, required: true, min: 1, max: 60 },
    keyPressPosition: { type: Number, required: true, min: 1, max: 60 },
    intentionTime: { type: Number, required: true, min: 1, max: 60 },
    timestamp: { type: Date, default: Date.now } // Add a timestamp
});

// Create a Mongoose Model based on the schema
// Mongoose will automatically create a collection named 'trials' (pluralized, lowercase)
const Trial = mongoose.model('Trial', trialSchema);


// --- API Endpoint ---
app.post('/api/save-trial', async (req, res) => { // Make the handler async
    console.log('Received request body:', req.body);
    const trialData = req.body;

    // 1. Basic Validation (Mongoose schema adds more)
    if (!trialData || !trialData.participantId || typeof trialData.trial !== 'number') {
         // Basic check before creating model instance
         return res.status(400).json({ success: false, message: 'Incomplete data.' });
     }

    // 2. Create Mongoose Document & Save to DB
    try {
        // Create a new document using the Model and incoming data
        const newTrial = new Trial({
            participantId: trialData.participantId,
            trial: trialData.trial,
            startPosition: trialData.startPosition,
            keyPressPosition: trialData.keyPressPosition,
            intentionTime: trialData.intentionTime
            // timestamp is added automatically by default
        });

        // Mongoose performs schema validation here before saving
        const savedTrial = await newTrial.save(); // Save the document to MongoDB

        console.log(`Data for trial ${savedTrial.trial} saved to MongoDB with id: ${savedTrial._id}`);

        // 3. Send Success Response
        res.status(201).json({ success: true, message: 'Trial data saved successfully.', data: { id: savedTrial._id } });

    } catch (error) {
        // 4. Handle Errors (Validation or DB errors)
        if (error.name === 'ValidationError') {
            console.error('Validation Error:', error.message);
            return res.status(400).json({ success: false, message: `Validation failed: ${error.message}` });
        }
        console.error('Error saving trial data to MongoDB:', error);
        res.status(500).json({ success: false, message: 'An error occurred on the server while saving data.' });
    }
});

// --- Simple endpoint to fetch data (Example) ---
app.get('/api/get-trials/:participantId', async (req, res) => {
    try {
        const participantId = req.params.participantId;
        const trials = await Trial.find({ participantId: participantId }).sort({ trial: 1 }); // Find trials for a specific participant
        res.status(200).json({ success: true, data: trials });
    } catch (error) {
        console.error('Error fetching trials:', error);
        res.status(500).json({ success: false, message: 'Error fetching trial data.' });
    }
});


// --- Start the Server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
    console.log(`API endpoint available at: http://localhost:${PORT}/api/save-trial`);
});