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
    
    const { spawn } = require('child_process');
    const pyProcess = spawn(pythonPath, [scraperPath, url]);
    
    let stdoutData = '';
    let stderrData = '';

    pyProcess.stdout.on('data', (data) => {
        stdoutData += data.toString();
    });

    pyProcess.stderr.on('data', (data) => {
        stderrData += data.toString();
    });

    pyProcess.on('close', (code) => {
        if (stderrData.trim()) {
            console.log('[scraper.py]', stderrData.trim());
        }

        if (code !== 0 && stdoutData.trim() === '') {
            return res.status(500).json({ error: 'Failed to extract chat. Process exited with code ' + code });
        }

        try {
            const data = JSON.parse(stdoutData);
            if (data.error) {
                return res.status(500).json({ error: data.error });
            }
            if (Array.isArray(data.messages)) {
                console.log(`Extracted messages: ${data.messages.length}`);
            }
            res.json(data);
        } catch (parseError) {
            console.error('JSON Parse Error:', parseError.message);
            res.status(500).json({ error: 'Failed to parse scraper output.' });
        }
    });

    pyProcess.on('error', (err) => {
        console.error('Failed to start scraper process:', err);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to start extraction process.' });
        }
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
