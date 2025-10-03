import { useEffect, useState } from 'react';
import { useTheme } from "@/contexts/ThemeContext";

const messages = [
  "Just completed my house cleaning, excellent service! ⭐⭐⭐⭐⭐",
  "Found a plumber in just 5 minutes, amazing app!",
  "My AC is fixed and working perfectly now, thank you!",
  "Great painter, very professional and on time",
  "The electrician was so helpful and fixed everything",
  "Just booked a gardening service for tomorrow",
  "Furniture assembly completed in under an hour!",
  "The tutor you recommended was excellent for my son",
  "Quick response from the pest control service",
  "My car service was completed today, very satisfied",
  "The moving help was fantastic, saved me so much time"
];

export function FloatingMessages() {
  const { theme } = useTheme();
  const [visibleMessages, setVisibleMessages] = useState<string[]>([]);
  
  useEffect(() => {
    // Initial set of messages
    const initialMessages = messages.slice(0, 5);
    setVisibleMessages(initialMessages);
    
    // Set up interval to cycle through messages
    const interval = setInterval(() => {
      setVisibleMessages(prev => {
        const newMessages = [...prev];
        // Remove the first message and add a new one
        newMessages.shift();
        const remainingMessages = messages.filter(msg => !newMessages.includes(msg));
        const randomIndex = Math.floor(Math.random() * remainingMessages.length);
        newMessages.push(remainingMessages[randomIndex]);
        return newMessages;
      });
    }, 6000); // Match with the animation duration
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {visibleMessages.map((message, index) => (
        <div 
          key={`${message}-${index}`}
          className="floating-message theme-transition"
          style={{
            left: `${15 + (index * 5)}%`,
            bottom: `${10 + (index * 8)}%`
          }}
        >
          {message}
        </div>
      ))}
    </div>
  );
}