import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

export default function Accordion({ notes }) {
  const sections = notes.split('---').map((section) => section.trim()).filter(Boolean);

  return (
    <div className="space-y-4">
    {sections.map((section, idx) => (
    <AccordionItem key={idx} title={extractTitle(section, idx)} content={section} />
    ))}

    </div>
  );
}

function extractTitle(section, index) {
  const lines = section.split('\n');
  for (let line of lines) {
    const match = line.match(/^#+\s+(.*)/);
    if (match) return `${index + 1}. ${match[1]}`;
  }
  return `Section ${index + 1}`;
}

  

function AccordionItem({ title, content }) {
  const [open, setOpen] = useState(false);
  const contentWithoutTitle = content.replace(/^#+\s*.*?\n/, '');

  return (
    <div className="bg-white/5 rounded-lg shadow">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left px-4 py-3 font-semibold text-white flex justify-between items-center"
      >
        <span><ReactMarkdown>{title}</ReactMarkdown></span>
        <span className="text-white text-sm">{open ? '−' : '+'}</span>
      </button>
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          open ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-4 pb-4 text-sm text-white/90 prose prose-invert max-w-none">
          <ReactMarkdown>{contentWithoutTitle}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
