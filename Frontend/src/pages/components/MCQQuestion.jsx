// components/MCQQuestion.jsx
import React from 'react';
import ReactMarkdown from 'react-markdown';

export default function MCQQuestion({ question, options, index, selectedAnswer, onAnswerChange, disabled }) {
  return (
    <div className="mb-4">
      <div className="font-semibold">
        <div>{index + 1}. <ReactMarkdown>{question}</ReactMarkdown></div>
      </div>
      <div className="pl-4">
        {options.map((opt, i) => {
          const label = ['A', 'B', 'C', 'D'][i];
          return (
            <div key={`option-${index}-${label}`} className="flex items-center space-x-2">
              <input
                type="radio"
                name={`q${index + 1}`}
                value={label}
                onChange={() => onAnswerChange(index + 1, label)}
                checked={selectedAnswer === label}
                disabled={disabled}
              />
              <span>{opt}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
