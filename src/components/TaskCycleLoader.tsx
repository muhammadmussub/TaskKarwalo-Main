import React, { useEffect, useState } from 'react';

interface TaskCycleLoaderProps {
  isLoading: boolean;
  onLoadComplete?: () => void;
}

const TaskCycleLoader: React.FC<TaskCycleLoaderProps> = ({ 
  isLoading, 
  onLoadComplete 
}) => {
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    if (!isLoading) {
      setProgress(100);
      // Ensure the loader is hidden after a short delay
      setTimeout(() => {
        if (onLoadComplete) {
          onLoadComplete();
        }
      }, 300);
      return;
    }
    
    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = Math.min(prev + Math.random() * 5, 100);
        if (newProgress >= 100) {
          clearInterval(interval);
          // Ensure the loader is hidden after completion
          setTimeout(() => {
            if (onLoadComplete) {
              onLoadComplete();
            }
          }, 300);
        }
        return newProgress;
      });
    }, 50);
    
    return () => clearInterval(interval);
  }, [isLoading, onLoadComplete]);
  
  // Convert progress to a percentage string for the circle
  const progressCircleValue = (progress * 3.14 * 2);
  const progressCircleOffset = (100 * 3.14 * 2);
  
  // Calculate which task to show based on progress
  const taskIndex = Math.min(Math.floor(progress / 20), 4);
  
  // If not loading and progress is at 100, don't render anything
  if (!isLoading && progress >= 100) {
    return null;
  }
  
  return (
    <div className={`fixed inset-0 flex items-center justify-center bg-white dark:bg-[hsl(var(--background))] z-50 transition-opacity duration-500 ${progress >= 100 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      <div className="relative flex flex-col items-center">
        {/* Task cycle animation with progress ring */}
        <div className="relative w-64 h-64">
          {/* Progress circle */}
          <svg className="absolute w-full h-full -rotate-90" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle 
              cx="50" 
              cy="50" 
              r="45" 
              fill="none" 
              strokeWidth="3" 
              stroke="hsl(var(--border))"
            />
            {/* Progress circle */}
            <circle 
              cx="50" 
              cy="50" 
              r="45" 
              fill="none" 
              strokeWidth="4" 
              stroke="hsl(var(--primary))" 
              strokeLinecap="round" 
              strokeDasharray={progressCircleOffset.toString()} 
              strokeDashoffset={(progressCircleOffset - progressCircleValue).toString()}
              className="drop-shadow-lg transition-all duration-300 ease-out"
            />
          </svg>
          
          {/* Task animations */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-48 h-48 relative">
              {/* Mechanic - Tightens a bolt */}
              <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-500 ${taskIndex === 0 ? 'opacity-100' : 'opacity-0'}`}>
                <div className="relative">
                  <svg className="w-28 h-28" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="50" cy="50" r="45" fill="hsl(var(--hero-bg))" />
                    <g className="animate-[spin_8s_linear_infinite]">
                      <circle cx="50" cy="50" r="20" fill="hsl(var(--primary))" />
                      <circle cx="50" cy="20" r="6" fill="hsl(var(--primary-hover))" />
                      <rect x="48" y="26" width="4" height="10" fill="hsl(var(--primary-hover))" />
                    </g>
                    <g className="animate-[spin-reverse_4s_linear_infinite]">
                      <path d="M65,42 L80,30 L82,34 L69,48 Z" fill="hsl(var(--primary-foreground))" />
                      <circle cx="82" cy="28" r="5" fill="hsl(var(--primary-hover))" />
                    </g>
                  </svg>
                  <span className="absolute bottom-[-30px] left-1/2 transform -translate-x-1/2 text-[hsl(var(--primary))] font-medium">Mechanic</span>
                </div>
              </div>
              
              {/* Cleaner - Sweeps the floor */}
              <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-500 ${taskIndex === 1 ? 'opacity-100' : 'opacity-0'}`}>
                <div className="relative">
                  <svg className="w-28 h-28" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="50" cy="50" r="45" fill="hsl(var(--hero-bg))" />
                    <rect x="48" y="20" width="4" height="50" fill="hsl(var(--primary))" />
                    <path className="animate-[spin-slow_4s_ease-in-out_infinite]" d="M30,65 L70,65 L80,75 L20,75 Z" fill="hsl(var(--secondary))" />
                    <path className="animate-[float-1_2s_ease-in-out_infinite]" d="M35,75 L40,85 L30,85 Z" fill="hsl(var(--muted))" />
                    <path className="animate-[float-2_2.5s_ease-in-out_infinite]" d="M55,75 L60,85 L50,85 Z" fill="hsl(var(--muted))" />
                    <path className="animate-[float-3_3s_ease-in-out_infinite]" d="M75,75 L80,85 L70,85 Z" fill="hsl(var(--muted))" />
                    <circle cx="50" cy="20" r="6" fill="hsl(var(--primary-hover))" />
                  </svg>
                  <span className="absolute bottom-[-30px] left-1/2 transform -translate-x-1/2 text-[hsl(var(--primary))] font-medium">Cleaner</span>
                </div>
              </div>
              
              {/* Barber - Cuts hair */}
              <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-500 ${taskIndex === 2 ? 'opacity-100' : 'opacity-0'}`}>
                <div className="relative">
                  <svg className="w-28 h-28" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="50" cy="50" r="45" fill="hsl(var(--hero-bg))" />
                    <g className="animate-[spin-slow-reverse_6s_ease-in-out_infinite]">
                      <circle cx="50" cy="50" r="20" fill="hsl(var(--secondary))" />
                      <circle cx="50" cy="50" r="15" fill="hsl(var(--primary))" />
                      <circle cx="50" cy="50" r="10" fill="hsl(var(--primary-hover))" />
                    </g>
                    <g className="animate-[spin-slow_3s_ease-in-out_infinite]">
                      <path d="M25,40 L40,55 L37,58 L22,43 Z" fill="hsl(var(--primary-hover))" />
                      <path d="M25,70 L40,55 L37,58 L22,73 Z" fill="hsl(var(--primary-hover))" />
                      <circle cx="22" cy="43" r="4" fill="hsl(var(--primary-foreground))" />
                      <circle cx="22" cy="73" r="4" fill="hsl(var(--primary-foreground))" />
                    </g>
                  </svg>
                  <span className="absolute bottom-[-30px] left-1/2 transform -translate-x-1/2 text-[hsl(var(--primary))] font-medium">Barber</span>
                </div>
              </div>
              
              {/* Courier - Delivers a parcel */}
              <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-500 ${taskIndex === 3 ? 'opacity-100' : 'opacity-0'}`}>
                <div className="relative">
                  <svg className="w-28 h-28" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="50" cy="50" r="45" fill="hsl(var(--hero-bg))" />
                    <g className="animate-[float-1_3s_ease-in-out_infinite]">
                      <rect x="35" y="35" width="30" height="30" fill="hsl(var(--primary))" />
                      <rect x="40" y="40" width="20" height="20" fill="hsl(var(--secondary))" />
                      <path d="M40,40 L60,60 M40,60 L60,40" stroke="hsl(var(--primary))" strokeWidth="2" />
                    </g>
                    <circle className="animate-[spin_4s_linear_infinite]" cx="30" cy="75" r="8" fill="hsl(var(--primary-hover))" />
                    <circle className="animate-[spin_4s_linear_infinite]" cx="70" cy="75" r="8" fill="hsl(var(--primary-hover))" />
                    <rect x="30" y="72" width="40" height="6" fill="hsl(var(--primary-hover))" />
                  </svg>
                  <span className="absolute bottom-[-30px] left-1/2 transform -translate-x-1/2 text-[hsl(var(--primary))] font-medium">Courier</span>
                </div>
              </div>
              
              {/* Tutor - Writes on a whiteboard */}
              <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-500 ${taskIndex === 4 ? 'opacity-100' : 'opacity-0'}`}>
                <div className="relative">
                  <svg className="w-28 h-28" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="50" cy="50" r="45" fill="hsl(var(--hero-bg))" />
                    <rect x="20" y="30" width="60" height="40" rx="2" fill="hsl(var(--card))" stroke="hsl(var(--primary))" strokeWidth="2" />
                    <g className="animate-[float-2_4s_ease-in-out_infinite]">
                      <path d="M30,45 L40,45 M35,50 L45,50 M30,55 L50,55" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" />
                    </g>
                    <g className="animate-[float-1_3s_ease-in-out_infinite]">
                      <rect x="55" y="40" width="15" height="5" rx="1" fill="hsl(var(--secondary))" />
                      <rect x="60" y="50" width="15" height="5" rx="1" fill="hsl(var(--secondary))" />
                    </g>
                    <path d="M50,80 L60,80 L58,75 L52,75 Z" fill="hsl(var(--primary))" />
                  </svg>
                  <span className="absolute bottom-[-30px] left-1/2 transform -translate-x-1/2 text-[hsl(var(--primary))] font-medium">Tutor</span>
                </div>
              </div>
              
              {/* Verified badge that pulses */}
              <div className={`absolute top-2 right-2 transition-opacity duration-500 ${progress > 95 ? 'opacity-100' : 'opacity-0'}`}>
                <div className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] text-xs font-bold px-2 py-1 rounded-full flex items-center animate-pulse">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Verified
                </div>
              </div>
            </div>
          </div>
          
          {/* Thumbs up icon at completion */}
          <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-500 ${progress >= 100 ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
            <div className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-full p-4 animate-bounce">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
              </svg>
            </div>
          </div>
        </div>
        
        {/* Loading text */}
        <div className="mt-8 text-center">
          <h3 className="text-xl font-semibold text-[hsl(var(--primary))]">
            {progress < 100 ? 'Loading TaskKarwalo' : 'Ready!'}
          </h3>
          <p className="text-[hsl(var(--text-subtle))] mt-2">
            {progress < 100 
              ? `Connecting you with verified professionals...` 
              : `Your everyday help is ready!`}
          </p>
          <div className="w-64 h-2 bg-[hsl(var(--border))] rounded-full mt-4 overflow-hidden">
            <div 
              className="h-full bg-[hsl(var(--primary))] rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskCycleLoader;