// components/ModeSelector.js
import { useState, useEffect } from 'react';
import { chatService } from '../lib/chat-service';

const ModeSelector = ({ currentMode, onModeChange }) => {
  const [modes, setModes] = useState({});
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const loadModes = async () => {
      const availableModes = await chatService.getAIModes();
      setModes(availableModes);
    };
    loadModes();
  }, []);

  const currentModeConfig = modes[currentMode] || modes.general;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <span>{currentModeConfig?.icon}</span>
        <span className="text-sm font-medium">{currentModeConfig?.name}</span>
        <span className="text-gray-400">▼</span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
          {Object.entries(modes).map(([key, mode]) => (
            <button
              key={key}
              onClick={() => {
                onModeChange(key);
                setIsOpen(false);
              }}
              className={`flex items-center space-x-2 w-full px-3 py-2 text-left hover:bg-gray-50 ${
                currentMode === key ? 'bg-blue-50 text-blue-600' : ''
              }`}
            >
              <span>{mode.icon}</span>
              <div className="flex-1">
                <div className="text-sm font-medium">{mode.name}</div>
                <div className="text-xs text-gray-500">{mode.description}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ModeSelector;