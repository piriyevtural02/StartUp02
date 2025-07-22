import React, { useState } from 'react';
import { ArrowRight, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import PortfolioManager from '../portfolio/PortfolioManager';
import ChatInterface from '../chat/ChatInterface';

const PortfolioPanel: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'portfolio' | 'chat'>('portfolio');
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900 pt-16 lg:pt-0">
      {/* Header with Collapse Toggle */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Portfolio & AI
          </h3>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors duration-200"
            title={isCollapsed ? "Expand portfolio panel" : "Collapse portfolio panel"}
          >
            {isCollapsed ? (
              <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            ) : (
              <ChevronUp className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            )}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <>
          {/* Section Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex" aria-label="Portfolio sections">
          <button
            onClick={() => setActiveSection('portfolio')}
            className={`
              flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-colors duration-200
              ${activeSection === 'portfolio'
                ? 'border-sky-500 text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/20'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }
            `}
            aria-pressed={activeSection === 'portfolio'}
          >
            <ArrowRight className="w-4 h-4" />
            Portfolio
          </button>
          
          <button
            onClick={() => setActiveSection('chat')}
            className={`
              flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-colors duration-200
              ${activeSection === 'chat'
                ? 'border-sky-500 text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/20'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }
            `}
            aria-pressed={activeSection === 'chat'}
          >
            <MessageSquare className="w-4 h-4" />
            AI Help
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeSection === 'portfolio' && <PortfolioManager />}
        {activeSection === 'chat' && <ChatInterface />}
      </div>
        </>
      )}
    </div>
  );
};

export default PortfolioPanel;