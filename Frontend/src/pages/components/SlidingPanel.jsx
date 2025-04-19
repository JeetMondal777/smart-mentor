import { X } from 'lucide-react';

export default function SlidePanel({ isOpen, onClose, title, children }) {
  return (
    <div
      className={`fixed top-0 right-0 h-full w-full md:w-[500px] bg-[#1f1f2f] shadow-xl text-white z-50 transition-transform duration-500 ease-in-out transform ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#29293d]">
        <h2 className="text-xl font-semibold">{title}</h2>
        <button onClick={onClose}>
          <X className="w-6 h-6 text-white hover:text-red-400 transition" />
        </button>
      </div>
      <div className="p-4 overflow-y-auto max-h-[calc(100vh-60px)]">{children}</div>
    </div>
  );
}
