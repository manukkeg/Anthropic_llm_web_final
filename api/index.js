const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON request bodies
app.use(express.json());

// Add timeout configuration
const ANTHROPIC_TIMEOUT = 25000; // 25 seconds (close to Vercel's edge function limit)
const MAX_RETRY_ATTEMPTS = 2;

// Centralized error handling function
const handleApiError = (error) => {
    console.error('Error communicating with Anthropic API:', 
        error.response ? error.response.data : error.message
    );
    
    if (error.code === 'ECONNABORTED') {
        return { 
            error: 'Request timed out',
            details: 'The AI service took too long to respond'
        };
    }
    
    return { 
        error: 'Failed to fetch response from Anthropic API',
        details: error.message 
    };
};

// Retry mechanism with exponential backoff
const retryRequest = async (userMessage, attempt = 0) => {
    try {
        const response = await axios.post(
            'https://api.anthropic.com/v1/messages',  
            {
                model: "claude-3-5-sonnet-20241022", 
                max_tokens: 1024,
                messages: [
                    { role: "user", content: userMessage }
                ]
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': process.env.ANTHROPIC_API_KEY, 
                    'anthropic-version': '2023-06-01'
                },
                timeout: ANTHROPIC_TIMEOUT
            }
        );
    
        return response.data;
    } catch (error) {
        if (attempt < MAX_RETRY_ATTEMPTS) {
            // Exponential backoff
            const waitTime = Math.pow(2, attempt) * 1000;
            await new Promise(resolve => setTimeout(resolve, waitTime));
            return retryRequest(userMessage, attempt + 1);
        }
        throw error;
    }
};

// Define the /api/chat endpoint
app.post('/api/chat', async (req, res) => {
    const userMessage = req.body.message;

    // Validate that a message was provided in the request body
    if (!userMessage) {
        return res.status(400).json({ error: 'Message is required.' });
    }

    try {
        const generatedResponse = await retryRequest(userMessage);
        
        // Validate response structure
        if (!generatedResponse || !generatedResponse.content) {
            return res.status(500).json({ 
                error: 'Invalid response format from AI service' 
            });
        }

        // Extract the text from the first content block
        const aiReply = generatedResponse.content[0].text || 'No response generated';

        res.json({ 
            reply: { 
                content: [{ text: aiReply }] 
            } 
        });
    } catch (error) {
        const errorResponse = handleApiError(error);
        res.status(500).json(errorResponse);
    }
});

// Export for Vercel serverless function
module.exports = app;

/*const express = require('express');
const axios = require('axios');
require('dotenv').config();


const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON request bodies
app.use(express.json());

// Define the /api/chat endpoint
app.post('/api/chat', async (req, res) => {
    const userMessage = req.body.message;

    // Validate that a message was provided in the request body
    if (!userMessage) {
        return res.status(400).json({ error: 'Message is required.' });
    }
    try {
        const response = await axios.post(
            'https://api.anthropic.com/v1/messages',  
            {
                model: "claude-3-5-sonnet-20241022", 
                max_tokens: 1024,
                messages: [
                    { role: "user", content: userMessage }
                ]
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': process.env.ANTHROPIC_API_KEY, 
                    'anthropic-version': '2023-06-01' 
                }
            }
        );
    
        // Log the entire response object for debugging
        console.log("API Response:", response.data); 
    
        // Adjust this line based on the actual response structure
        const generatedText = response.data.completion || response.data; 
        res.json({ reply: generatedText });
    } catch (error) {
        console.error('Error communicating with Anthropic API:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to fetch response from Anthropic API.' });
    }
    
});
module.exports = app;*/

/*Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
*/