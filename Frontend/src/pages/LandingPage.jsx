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
  const [showMentorSession, setShowMentorSession] = useState(false);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

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
        // Convert the array of caption objects into a single string
        const transcriptText = res.data.map(item => item.text).join(' ');
        setTranscript(transcriptText); // Set the generated transcript text
        console.log(transcript);
        
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
    setMockTest(null);
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
              content: `Here is the extracted captions from a YouTube video:\n\n"${transcript}"\n\nNow, focusing on the key points and structure, generate in-depth, well-organized notes in markdown format that cover all the aspects mentioned, try to make theory wise in detailed notes with the keypoints but don't add the code as it is from the caption try to manipulate it by your own so that user can understand better from it. Make sure to include examples and explanations where necessary. The notes should be clear, very much detailed, to the point, concise, and easy to follow and don't just rely on the captions. Use your own understanding and knowledge to create this and cover all the aspects related to the center point of the video.`,
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
    setGeneratedNotes('');
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
              content: `Based on the following notes:\n\n"${notes}"\n\nGenerate 7–10 multiple-choice questions. Each question should have 4 options labeled A, B, C, D.\n\nAt the end, provide a separate line with this format ONLY:\n\nAnswer Key: {"1": "B", "2": "D", ...}\n\nMake sure to follow and be strict about this exact structure.`,
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

  const toggleMentorSession = () => {
    setShowMentorSession(prev => !prev);
    if (!showMentorSession) {
      setMessages([]);
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || isTyping) return;

    // Add user message
    const newMessage = {
      text: messageInput,
      isUser: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages(prev => [...prev, newMessage]);
    setMessageInput('');
    setIsTyping(true);

    try {
      // Validate required content
      if (!transcript && !generatedNotes) {
        throw new Error('Please generate video notes first');
      }

      // Prepare context
      const context = `VIDEO CONTENT:\n${transcript}\n\nGENERATED NOTES:\n${generatedNotes}`;

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'deepseek/deepseek-r1:free',
          messages: [
            { 
              role: 'system', 
              content: `You are a mentor specializing in everything, generate responses to questions of the user to make him understand about topic carefully.
              Your responses should be helpful, concise, and informative.`
            },
            {
              role: 'user',
              content: `CONTEXT:\n${context}\n\nQUESTION: ${messageInput}\n\ngenerate answers in a friendly and understandable manner if user greets you also greet if user congratulate, make him more happy and also congratulate him back and generate responses to questions of the user to make him understand about topic carefully. Your responses should be helpful, concise, and informative.`,
            }
          ],
          temperature: 0.7,
          max_tokens: 1500
        }),
      });

      const data = await response.json();
      console.log(`response:`, data);

      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response from the AI model');
      }

      // Handle API errors
      if (!response.ok) {
        const errorMessage = data.error?.message || 'API request failed';
        throw new Error(`OpenRouter Error: ${errorMessage}`);
      }

      // Validate response structure


      const aiResponse = data.choices[0].message.content;

      setMessages(prev => [
        ...prev,
        {
          text: aiResponse,
          isUser: false,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (error) {
      console.error('Mentor error:', error);
      setMessages(prev => [
        ...prev,
        {
          text: `⚠️ ${error.message.replace('OpenRouter Error: ', '')}`,
          isUser: false,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsTyping(false);
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
            <button
              onClick={toggleMentorSession}
              className="px-6 py-3 bg-pink-600 hover:bg-pink-700 rounded-xl font-semibold transition"
            >
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
              <ReactMarkdown>
                {generatedNotes}
              </ReactMarkdown>
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
                        setUserAnswers(prev => ({ ...prev, [qIndex]: answer }))}
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

        {/* Enhanced Mentor Session Panel */}
        <AnimatePresence>
          {showMentorSession && (
            <motion.div
              key="mentor-session"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300 }}
              className="fixed top-0 right-0 h-full w-full sm:w-96 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 flex flex-col shadow-xl border-l border-purple-900/50 z-50"
            >
              <div className="p-4 bg-gray-900 border-b border-purple-900/50 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                    AI Mentor Session
                  </h2>
                </div>
                <button 
                  onClick={toggleMentorSession}
                  className="p-2 rounded-full hover:bg-gray-800 transition"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide scrollbar-thumb-purple-900 scrollbar-track-gray-800">
                {messages.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-8"
                  >
                    <div className="inline-block p-4 bg-indigo-900/50 rounded-full mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-purple-200">Ask about Video concepts</h3>
                    <p className="text-sm text-purple-300 mt-1">Powered by AI 🤖</p>
                  </motion.div>
                ) : (
                  messages.map((message, index) => (
                    <AnimatePresence key={index}>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl p-3 ${
                            message.isUser 
                              ? 'bg-purple-600 rounded-br-none'
                              : 'bg-indigo-900 rounded-bl-none'
                          }`}
                        >
                          <ReactMarkdown>
                            {message.text}
                          </ReactMarkdown>
                          <p className={`text-xs mt-1 ${
                            message.isUser ? 'text-purple-200' : 'text-indigo-300'
                          }`}>
                            {message.timestamp}
                          </p>
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  ))
                )}

                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center space-x-2 text-indigo-400 pl-4"
                  >
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-100"></div>
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-200"></div>
                    </div>
                    <span className="text-sm">Mentor is thinking...</span>
                  </motion.div>
                )}
              </div>

              <div className="p-4 bg-gray-900 border-t border-purple-900/50">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Ask about React concepts..."
                    className="flex-1 px-4 py-2 bg-gray-800 rounded-xl border border-purple-900/50 focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-purple-300/70"
                    disabled={isTyping}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={isTyping || !messageInput.trim()}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}