const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

app.post('/api/extract', async (req, res) => {
    const { url } = req.body;

    if (!url || !url.includes('chatgpt.com/share')) {
        return res.status(400).json({ error: 'Invalid ChatGPT shared link.' });
    }

    console.log(`Extracting with Scrapling: ${url}`);
    
    // Call the Python Scrapling script
    const scraperPath = path.join(__dirname, 'scraper.py');
    const venvPythonPath = path.join(__dirname, 'venv', 'bin', 'python3');
    const pythonPath = process.env.PYTHON_PATH || venvPythonPath;
    
    exec(`"${pythonPath}" "${scraperPath}" "${url}"`, (error, stdout, stderr) => {
        if (stderr && stderr.trim()) {
            console.log('[scraper.py]', stderr.trim());
        }

        if (error) {
            console.error('Scrapling Error:', error.message);
            return res.status(500).json({ error: 'Failed to extract chat. ' + error.message });
        }

        try {
            const data = JSON.parse(stdout);
            if (data.error) {
                return res.status(500).json({ error: data.error });
            }
            if (Array.isArray(data.messages)) {
                console.log(`Extracted messages: ${data.messages.length}`);
            }
            res.json(data);
        } catch (parseError) {
            console.error('JSON Parse Error:', parseError.message);
            console.error('Raw Output:', stdout);
            res.status(500).json({ error: 'Failed to parse scraper output.' });
        }
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
