import React, { useState } from 'react';

const QuickActions = ({ language, onQuickAction }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const actions = {
    english: [
      { emoji: '📍', label: 'Current Risk',   query: 'What is the current flood risk at my location?' },
      { emoji: '🌧️', label: 'Live Rainfall',  query: 'Is it raining now? What is the current rainfall?' },
      { emoji: '⛰️', label: 'Landslide Risk', query: 'What is the landslide risk right now?' },
      { emoji: '🌊', label: 'Flood Info',     query: 'What is a flood and what are its types?' },
      { emoji: '🛡️', label: 'Flood Safety',   query: 'How to stay safe during a flood?' },
      { emoji: '🚐', label: 'Evacuation',     query: 'How to evacuate during flood?' },
      { emoji: '🚨', label: 'Emergency',      query: 'Emergency contacts India' },
      { emoji: '🎒', label: 'Emergency Kit',  query: 'What to pack in emergency kit?' },
      { emoji: '💧', label: 'Water Safety',   query: 'How to purify flood water safely?' },
      { emoji: '🏥', label: 'First Aid',      query: 'First aid tips during floods' },
      { emoji: '🌪️', label: 'Cyclone',        query: 'How to stay safe during a cyclone?' },
      { emoji: '🛡️', label: 'Prevention',     query: 'How to prevent flood damage?' },
    ],
    tamil: [
      { emoji: '📍', label: 'தற்போதைய அபாயம்',  query: 'எனது இடத்தில் தற்போதைய வெள்ள அபாயம் என்ன?' },
      { emoji: '🌧️', label: 'நேரடி மழை',       query: 'இப்போது மழை பெய்கிறதா? மழைப்பொழிவு என்ன?' },
      { emoji: '⛰️', label: 'நிலச்சரிவு அபாயம்', query: 'தற்போது நிலச்சரிவு அபாயம் என்ன?' },
      { emoji: '🌊', label: 'வெள்ளம்',          query: 'வெள்ளம் என்றால் என்ன? வெள்ள வகைகள் என்ன?' },
      { emoji: '🛡️', label: 'பாதுகாப்பு',       query: 'வெள்ளத்தின் போது பாதுகாப்பாக இருப்பது எப்படி?' },
      { emoji: '🚐', label: 'வெளியேற்றம்',      query: 'வெள்ளத்தின் போது எவ்வாறு வெளியேறுவது?' },
      { emoji: '🚨', label: 'அவசரம்',           query: 'அவசரகால தொடர்பு எண்கள் என்ன?' },
      { emoji: '🎒', label: 'கிட்',             query: 'அவசரகால கிட்டில் என்ன வைக்க வேண்டும்?' },
      { emoji: '💧', label: 'நீர் பாதுகாப்பு',  query: 'வெள்ள நீரை எவ்வாறு சுத்திகரிப்பது?' },
      { emoji: '🏥', label: 'முதலுதவி',         query: 'வெள்ளத்தின் போது முதலுதவி எப்படி செய்வது?' },
      { emoji: '🌪️', label: 'சுழற்காற்று',      query: 'சுழற்காற்றின் போது எப்படி பாதுகாப்பாக இருப்பது?' },
      { emoji: '🛡️', label: 'தடுப்பு',          query: 'வெள்ளத்தை எவ்வாறு தடுப்பது?' },
    ]
  };

  const currentActions = actions[language] || actions.english;
  // Show only first 3 by default
  const visibleActions = isExpanded
    ? currentActions
    : currentActions.slice(0, 3);

  return (
    <div className="quick-actions-bar">
      <div className="quick-actions-scroll">
        {visibleActions.map((action, index) => (
          <button
            key={index}
            className="quick-action-chip"
            onClick={() => onQuickAction(action.query)}
            title={action.query}
          >
            {action.emoji} {action.label}
          </button>
        ))}

        {/* More / Less Toggle */}
        <button
          className="quick-action-chip toggle-chip"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? '▲ Less' : '▼ More'}
        </button>
      </div>
    </div>
  );
};

export default QuickActions;
