'use client';

export default function TypingIndicator() {
  return (
    <div className="flex justify-start animate-fade-in">
      <div className="bg-zinc-800 rounded-2xl rounded-bl-md px-4 py-3">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-indigo-400 rounded-full typing-dot" />
          <div className="w-2 h-2 bg-indigo-400 rounded-full typing-dot" />
          <div className="w-2 h-2 bg-indigo-400 rounded-full typing-dot" />
        </div>
        <p className="text-xs text-gray-400 mt-1">Generating image...</p>
      </div>
    </div>
  );
}
