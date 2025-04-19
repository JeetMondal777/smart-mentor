const express = require('express');
const axios = require('axios');
const cors = require('cors');
const youtubeCaptions = require('youtube-captions-scraper');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/extract-captions', async (req, res) => {
  const { videoUrl } = req.body;
  const videoId = extractVideoID(videoUrl);

  if (!videoId) {
    return res.status(400).json({ error: 'Invalid YouTube URL' });
  }

  try {
    const captions = await getCaptions(videoId);
    if (!captions) {
      return res.status(404).json({ error: 'No captions available for this video' });
    }
    
    console.log(captions);
    res.status(200).json({ transcript: captions });
  } catch (err) {
    console.error('Error extracting captions:', err.message);
    res.status(500).json({ error: 'Failed to extract captions' });
  }
});

function extractVideoID(url) {
  const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

async function getCaptions(videoId) {
  try {
    // Fetch captions using the youtube-captions-scraper module
    const captionData = await youtubeCaptions.getSubtitles({
      videoID: videoId,
      lang: 'en',
    });

    if (!captionData || captionData.length === 0) {
      throw new Error('No captions found');
    }

    // Extract the transcript from caption data
    const transcript = captionData.map(caption => caption.text).join(' ');
    
    return transcript;
  } catch (err) {
    throw new Error('Failed to fetch captions from YouTube');
  }
}

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
