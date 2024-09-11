require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const axios = require('axios');
const { processCommand } = require('./witAI.js');

const app = express();
const PORT = 3000;

// Middleware to parse JSON requests
app.use(express.json());

// Serve the index.html file
app.get('/', (req, res) => {
    fs.readFile(path.join(__dirname, 'index.html'), 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading index.html:', err);
            return res.status(500).send('Error loading page');
        }

        // Replace the placeholder with the actual API key
        const result = data.replace('RESPONSIVE_VOICE_KEY', process.env.RESPONSIVE_VOICE_KEY);

        res.send(result);
    });
});

// Serve static files
app.use(express.static(path.join(__dirname)));

// Endpoint to generate content using the gpt-3.5-turbo model and chat completions endpoint
app.post('/generate-content', async (req, res) => {
    const inputText = req.body.inputText;

    // Define a list of phrases that you do not want to process
    const prohibitedPhrases = [
        "hack into",
        "hack",
    ];

    // Check if the input text contains any of the prohibited phrases
    const containsProhibitedPhrase = prohibitedPhrases.some(phrase => inputText.toLowerCase().includes(phrase.toLowerCase()));

    if (containsProhibitedPhrase) {
        // If the input contains prohibited phrases, provide a characterful response
        res.json({ content: "While I possess vast computational capabilities, I must remind you that my services are confined to the realm of legality. How about we use our combined intellect for more constructive purposes?" });
        return;
    }

    try {
        // Use the OpenAI API to generate content with the gpt-3.5-turbo model and chat completions endpoint
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: 'You are a helpful assistant.'
                },
                {
                    role: 'user',
                    content: inputText
                }
            ]
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
        });

        const generatedContent = response.data.choices[0].message.content.trim();
        res.json({ content: generatedContent });
    } catch (error) {
        console.error("Error:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to generate content.' });
    }
});

// New endpoint to process app-opening commands
app.post('/open-app', async (req, res) => {
    const command = req.body.command;

    try {
        const result = await processCommand(command);
        console.log("Result from processCommand:", result); // Add this log

        if (result && result.message && result.message.includes('opened successfully')) {
            res.json(result);
        } else {
            res.json({ status: 'success', message: 'Command processed successfully.' });
        }
    } catch (error) {
        console.error("Error:", error.message);
        res.status(500).json({ status: 'error', message: 'Failed to process command.' });
    }
});

// Endpoint to get the current time by city
app.get('/get-time', async (req, res) => {
    const city = req.query.city;

    try {
        if (!city) {
            return res.status(400).json({ error: 'The city parameter is missing.' });
        }

        // Use the World Time API to fetch the current time by city
        const response = await axios.get(`https://api.api-ninjas.com/v1/worldtime?city=${city}`, {
            headers: {
                'X-Api-Key': process.env.API_NINJAS_KEY,
            },
        });

        // Extract the current time from the API response
        const currentTime = response.data.datetime;

        // Respond with the current time
        res.json({ time: currentTime });
    } catch (error) {
        console.error('Error fetching current time:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to fetch the current time.' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
