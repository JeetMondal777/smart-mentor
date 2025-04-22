const express = require('express');
const cors = require('cors');
const axios = require('axios');
const youtubeCaptions = require('youtube-captions-scraper');
require('dotenv').config();

const app = express();

app.use(cors({
    origin: process.env.CLIENT_URL,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));
app.use(express.json());

app.post('/api/extract-captions', async (req, res) => {
  try {
    const { videoUrl } = req.body;
    console.log("Incoming video URL:", videoUrl);

    if (!videoUrl) {
      return res.status(400).json({ error: "Missing video URL" });
    }

    const videoID = getYouTubeID(videoUrl);  // custom function you created
    console.log("Extracted video ID:", videoID);

    const captions = await youtubeCaptions.getSubtitles({
      videoID,
      lang: 'en'
    });

    if (!captions || captions.length === 0) {
      return res.status(404).json({ error: 'No captions found' });
    }

    res.json(captions);

  } catch (err) {
    console.error("🔥 ERROR in /api/extract-captions:", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
});


function extractVideoID(url) {
  const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

async function getCaptions(videoId) {
  try {
    // Fetch page content using ScraperAPI
    const proxyUrl = `http://api.scraperapi.com?api_key=${process.env.SCRAPER_API_KEY}&url=https://www.youtube.com/watch?v=${videoId}`;
    
    // Logging the proxy URL and response to verify
    console.log(`Fetching data from: ${proxyUrl}`);
    
    const response = await axios.get(proxyUrl);
    console.log('ScraperAPI Response:', response.data);  // Check if the response is HTML

    // If ScraperAPI response is good, fetch captions
    const captionData = await youtubeCaptions.getSubtitles({
      videoID: videoId,
      lang: 'en',
    });

    if (!captionData || captionData.length === 0) {
      throw new Error('No captions found');
    }

    const transcript = captionData.map(caption => caption.text).join(' ');
    return transcript;
  } catch (err) {
    // Log the error for debugging
    console.error('Error fetching captions:', err);
    throw new Error('Failed to fetch captions from YouTube');
  }
}

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
