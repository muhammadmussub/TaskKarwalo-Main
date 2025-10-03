import { useRef, useEffect } from 'react';

interface NotificationSoundProps {
  play: boolean;
  onPlayed?: () => void;
}

const NotificationSound = ({ play, onPlayed }: NotificationSoundProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (play && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().then(() => {
        if (onPlayed) {
          onPlayed();
        }
      }).catch(error => {
        console.warn('Error playing notification sound (file may be missing):', error);
        // Still call onPlayed even if audio fails
        if (onPlayed) {
          onPlayed();
        }
      });
    }
  }, [play, onPlayed]);

  return (
    <audio 
      ref={audioRef} 
      className="hidden" 
      preload="auto"
      src="/notification-sound.mp3" // This file needs to be added to the public folder
    />
  );
};

export default NotificationSound;