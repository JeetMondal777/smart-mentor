// components/MockResults.jsx
import ReactMarkdown from 'react-markdown';

export default function MockResults({ userAnswers, answerKey }) {
  const markdown = Object.entries(userAnswers).map(([qNumber, selected]) => {
    const correct = answerKey[qNumber];
    const isCorrect = selected === correct;
    return `### Q${qNumber}  
**Your Answer**: ${selected}  
**Correct Answer**: ${correct} ${isCorrect ? '✅' : '❌'}  
`;
  }).join('\n\n');

  return (
    <div className="mt-4 bg-white/10 p-4 rounded-xl">
      <h3 className="text-lg font-semibold text-green-300 mb-2">Results:</h3>
      <ReactMarkdown>{markdown}</ReactMarkdown>
    </div>
  );
}
