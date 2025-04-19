import { useState } from 'react';
import axios from 'axios';
import Accordion from './components/Accordition';
import ReactMarkdown from 'react-markdown';
import MockResults from './components/MockResults';
import MCQQuestion from './components/MCQQuestion';
import { motion, AnimatePresence } from 'framer-motion';

export default function LandingPage() {
  const [videoUrl, setVideoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const [generatedNotes, setGeneratedNotes] = useState('');
  const [notesLoading, setNotesLoading] = useState(false);
  const [mockTest, setMockTest] = useState(null);
  const [mockLoading, setMockLoading] = useState(false);
  const [userAnswers, setUserAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);

  const cacheKey = `generatedNotes:${videoUrl}`;

  const handleGenerate = async () => {
    if (!videoUrl) return;

    setLoading(true);
    setTranscript('');
    setShowOptions(false);
    setGeneratedNotes('');
    setMockTest(null);
    setShowResults(false);

    try {
      const res = await axios.post(`${import.meta.env.VITE_BASE_URL}/api/extract-captions`, { videoUrl });
      if (res.status === 200) {
        setTranscript(res.data.transcript);
        setShowOptions(true);
      }
    } catch (err) {
      console.error('Error fetching captions:', err);
    } finally {
      setLoading(false);
    }
  };

  const getCachedNotes = () => localStorage.getItem(cacheKey);

  const handleGenerateNotes = async () => {
    setMockTest(null); // Hide mock test
    setNotesLoading(true);
    setGeneratedNotes('');

    const cached = getCachedNotes();
    if (cached) {
      setGeneratedNotes(cached);
      setNotesLoading(false);
      return;
    }

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'deepseek/deepseek-r1:free',
          max_tokens: 5000,
          temperature: 0.7,
          messages: [
            { role: 'system', content: `You are a professional teacher who makes great in-depth notes.` },
            {
              role: 'user',
              content: `Here is the extracted captions from a YouTube video:\n\n"${transcript}"\n\nNow, focusing on the key points and structure, generate in-depth, well-organized notes that cover all the aspects mentioned, try to make theory wise in detailed notes with the keypoints but don't add the code as it is from the caption try to manipulate it by your own so that user can understand better from it. Make sure to include examples and explanations where necessary. The notes should be clear, very much detailed, to the point, concise, and easy to follow and don't just rely on the captions. Use your own understanding and knowledge to create this.`,
            },
          ],
        }),
      });

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content ?? 'No content received.';
      localStorage.setItem(cacheKey, content);
      setGeneratedNotes(content);
    } catch (error) {
      console.error('Note generation failed:', error);
      setGeneratedNotes('⚠️ Failed to generate notes.');
    } finally {
      setNotesLoading(false);
    }
  };

  const handleGenerateMockTest = async () => {
    setGeneratedNotes(''); // Hide notes
    setMockLoading(true);
    setShowResults(false);
    setUserAnswers({});
    setMockTest(null);

    let notes = getCachedNotes() || generatedNotes;

    if (!notes) {
      await handleGenerateNotes();
      notes = getCachedNotes();
    }

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'deepseek/deepseek-r1:free',
          max_tokens: 3000,
          temperature: 0.7,
          messages: [
            { role: 'system', content: `You're an expert test creator.` },
            {
              role: 'user',
              content: `Based on the following notes:\n\n"${notes}"\n\nGenerate 7–10 multiple-choice questions. Each question should have 4 options labeled A, B, C, D.\n\nAt the end, provide a separate line with this format ONLY:\n\nAnswer Key: {"1": "B", "2": "D", ...}\n\nMake sure to follow this exact structure.`,
            },
          ],
        }),
      });

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';

      const answerKeyMatch = content.match(/Answer Key:\s*({[\s\S]*})/i);
      if (!answerKeyMatch) throw new Error('Answer key not found in the response. Please try again.');

      const questionsPart = content.split('Answer Key:')[0].trim();
      const answerKey = JSON.parse(answerKeyMatch[1]);

      setMockTest({ questions: questionsPart, answerKey });
    } catch (error) {
      console.error('Mock test generation error:', error);
      alert(`⚠️ ${error.message}`);
    } finally {
      setMockLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-indigo-900 to-purple-900 text-white px-4">
      <div className="text-center space-y-6 max-w-xl w-full">
        <h1 className="text-4xl md:text-5xl font-bold leading-tight">
          Transform YouTube into Your Personal Learning Hub 📚
        </h1>

        <div className="flex flex-col md:flex-row items-center gap-4">
          <input
            type="text"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="Paste your YouTube video link here..."
            className="w-full md:flex-1 px-4 py-3 rounded-2xl bg-white/10 border border-white/20 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-2xl font-semibold transition disabled:opacity-50"
          >
            {loading ? 'Generating...' : 'Generate'}
          </button>
        </div>

        <AnimatePresence>
          {transcript && (
            <motion.div
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 100 }}
            >
              <h2 className="font-semibold mb-2">Extraction Done ✅</h2>
            </motion.div>
          )}
        </AnimatePresence>

        {showOptions && (
          <div className="flex flex-col md:flex-row gap-4 justify-center mt-6">
            <button
              className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-xl font-semibold transition"
              onClick={handleGenerateNotes}
              disabled={notesLoading}
            >
              {notesLoading ? 'Generating Notes...' : 'Generate Notes 📝'}
            </button>
            <button
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold transition"
              onClick={handleGenerateMockTest}
              disabled={mockLoading}
            >
              {mockLoading ? 'Generating Test...' : 'Generate Mock Test 🎯'}
            </button>
            <button className="px-6 py-3 bg-pink-600 hover:bg-pink-700 rounded-xl font-semibold transition">
              1:1 Discussion 💬
            </button>
          </div>
        )}

        {/* Notes Panel */}
        <AnimatePresence>
          {generatedNotes && !mockTest && (
            <motion.div
              key="notes-panel"
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              transition={{ type: 'tween', duration: 0.5 }}
              className="mt-6 p-4 bg-white/10 rounded-xl text-left max-h-[80vh] overflow-y-auto scrollbar-hide"
            >
              <h2 className="text-xl font-semibold mb-4">Generated Notes:</h2>
              <Accordion notes={generatedNotes} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mock Test Panel */}
        <AnimatePresence>
          {mockTest && !generatedNotes && (
            <motion.div
              key="mock-panel"
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              transition={{ type: 'tween', duration: 0.5 }}
              className="mt-6 p-4 bg-white/10 rounded-xl text-left max-h-[80vh] overflow-y-auto scrollbar-hide"
            >
              <h2 className="text-xl font-semibold mb-4">Mock Test</h2>
              {mockTest.questions
                .split(/\d+\./)
                .slice(1)
                .map((qBlock, index) => {
                  const [question, ...optionsRaw] = qBlock.trim().split(/\n/);
                  const filteredOptions = optionsRaw.filter(Boolean).slice(0, 4);
                  return (
                    <MCQQuestion
                      key={`question-${index}`}
                      question={question}
                      options={filteredOptions}
                      index={index}
                      selectedAnswer={userAnswers[index + 1]}
                      onAnswerChange={(qIndex, answer) =>
                        setUserAnswers(prev => ({ ...prev, [qIndex]: answer }))
                      }
                      disabled={showResults}
                    />
                  );
                })}

              {!showResults ? (
                <button
                  onClick={() => setShowResults(true)}
                  className="mt-4 bg-green-600 hover:bg-green-700 px-6 py-2 rounded-xl font-semibold"
                >
                  Submit Test
                </button>
              ) : (
                <MockResults userAnswers={userAnswers} answerKey={mockTest.answerKey} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
