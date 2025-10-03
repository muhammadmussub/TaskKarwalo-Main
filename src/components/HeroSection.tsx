import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MapPin } from "lucide-react";
import { useState, useEffect } from "react";
import NearMeButton from "@/components/NearMeButton";

interface HeroSectionProps {
  onSearch: (query: string, location: string) => void;
  onLocationFound: (lat: number, lng: number) => void;
  onLocationCleared: () => void;
  isNearMeActive: boolean;
}

const HeroSection = ({ onSearch, onLocationFound, onLocationCleared, isNearMeActive }: HeroSectionProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [location, setLocation] = useState("");
  const [animatedText, setAnimatedText] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);

  // Typing animation states
  const words = ["chota", "bara"];
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentText, setCurrentText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const [charIndex, setCharIndex] = useState(0);

  useEffect(() => {
    let animationTimeout: NodeJS.Timeout;

    const animate = () => {
      const currentWord = words[currentWordIndex];
      console.log('🎬 Animation step:', { currentWord, charIndex, isTyping, currentText });
      setIsAnimating(true);

      if (isTyping) {
        // Typing animation
        if (charIndex < currentWord.length) {
          const nextChar = currentWord.slice(0, charIndex + 1);
          console.log('📝 Typing:', nextChar);
          setCurrentText(nextChar);
          setCharIndex(prev => prev + 1);
          animationTimeout = setTimeout(animate, 200); // Typing speed
        } else {
          // Finished typing, start deleting after a pause
          console.log('⏸️ Finished typing, pausing...');
          setIsTyping(false);
          animationTimeout = setTimeout(animate, 1500); // Pause before deleting
        }
      } else {
        // Deleting animation
        if (charIndex > 0) {
          const nextChar = currentWord.slice(0, charIndex - 1);
          console.log('🗑️ Deleting:', nextChar);
          setCurrentText(nextChar);
          setCharIndex(prev => prev - 1);
          animationTimeout = setTimeout(animate, 120); // Deleting speed (faster)
        } else {
          // Finished deleting, move to next word
          console.log('🔄 Switching to next word');
          setIsTyping(true);
          setCurrentWordIndex(prev => (prev + 1) % words.length);
          setCharIndex(0);
          animationTimeout = setTimeout(animate, 300); // Small pause before next word
        }
      }
    };

    // Start animation immediately
    console.log('🚀 Starting animation...');
    animationTimeout = setTimeout(animate, 500);

    return () => {
      if (animationTimeout) {
        clearTimeout(animationTimeout);
      }
    };
  }, [currentWordIndex, isTyping, charIndex, words]);

  useEffect(() => {
    setAnimatedText(currentText);
  }, [currentText]);

  // Initialize animation on component mount
  useEffect(() => {
    console.log('🎬 Starting typing animation...');
    // Set initial empty text to start animation
    setCurrentText("");
    setCharIndex(0);
    setIsTyping(true);
    setCurrentWordIndex(0);
  }, []);

  // Debug animation state
  useEffect(() => {
    console.log('📝 Animation state:', {
      animatedText,
      currentText,
      charIndex,
      isTyping,
      currentWordIndex,
      currentWord: words[currentWordIndex]
    });
  }, [animatedText, currentText, charIndex, isTyping, currentWordIndex]);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      onSearch(searchQuery, location);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <section className="min-h-screen flex items-center justify-center pt-16"
             style={{ background: 'var(--hero-gradient)' }}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-4xl mx-auto">
          {/* Animated Main Headlines */}
          <div className="mb-8 relative">
            {/* Background Animated Text */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className={`text-4xl md:text-6xl font-bold text-[hsl(210,100%,65%)] opacity-10 transition-all duration-500 ${
                  isAnimating ? 'opacity-5 scale-95' : 'opacity-10 scale-100'
                }`}>
                  {animatedText || "chota"}
                </p>
              </div>
            </div>

            {/* First line - static */}
            <h1 className="text-3xl md:text-5xl font-bold mb-4 leading-tight relative z-10">
              <span className="text-black dark:text-white">Koi bhi kaam—</span>
              <span className={`text-blue-500 text-glow transition-all duration-300 inline-block min-h-[1.2em] font-bold text-3xl md:text-5xl drop-shadow-lg bg-white/10 rounded px-2 ${
                isAnimating ? 'opacity-70' : 'opacity-100'
              }`} style={{ minWidth: '150px', display: 'inline-block', textShadow: '0 0 10px rgba(59, 130, 246, 0.5)' }}>
                {animatedText || "chota"}
              </span>
              <span className={`text-blue-500 animate-pulse transition-all duration-300 font-bold text-3xl md:text-5xl drop-shadow-lg ${
                isAnimating ? 'opacity-70' : 'opacity-100'
              }`} style={{ textShadow: '0 0 10px rgba(59, 130, 246, 0.5)' }}>
                |
              </span>
              <span className="text-black dark:text-white">,{" "}</span>
            </h1>

            {/* Second line - static */}
            <h1 className="text-3xl md:text-4xl font-bold mb-8 leading-tight relative z-10">
              <span className="text-[hsl(210,100%,65%)] text-glow">idher se easily Task Karwalo.</span>
            </h1>
          </div>

          {/* Subheadline */}
          <p className="text-2xl md:text-3xl text-[hsl(210,100%,75%)] mb-4 font-medium">
            Dhundo. Book karo. Ho gaya.
          </p>

          {/* English translation */}
          <p className="text-lg md:text-xl text-[hsl(210,100%,75%)] mb-16 font-medium">
            Find. Book. Done.
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-12">
            <div className="flex flex-col sm:flex-row gap-4 p-2 bg-[hsl(220,20%,12%)] rounded-xl border border-[hsl(220,20%,18%)]">
              {/* Service Input */}
              <div className="flex-1 relative">
                <Input
                  placeholder="What service do you need?"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="border-0 text-lg h-14 pl-4 pr-12 focus:ring-0 focus:outline-none bg-[hsl(220,20%,15%)] text-[hsl(0,0%,95%)] placeholder:text-[hsl(210,100%,75%)]"
                />
              </div>

              {/* Location Selector */}
              <div className="sm:w-48 relative">
                <Select value={location} onValueChange={setLocation}>
                  <SelectTrigger className="border-0 h-14 text-lg focus:ring-0 bg-[hsl(220,20%,15%)] text-[hsl(0,0%,95%)]">
                    <MapPin className="w-5 h-5 text-[hsl(210,100%,65%)] mr-2" />
                    <SelectValue placeholder="Select Location" className="text-[hsl(0,0%,95%)]" />
                  </SelectTrigger>
                  <SelectContent className="bg-[hsl(220,20%,12%)] border-[hsl(220,20%,18%)]">
                    <SelectItem value="karachi" className="text-[hsl(0,0%,95%)] hover:bg-[hsl(220,20%,15%)]">Karachi</SelectItem>
                    <SelectItem value="lahore" className="text-[hsl(0,0%,95%)] hover:bg-[hsl(220,20%,15%)]">Lahore</SelectItem>
                    <SelectItem value="islamabad" className="text-[hsl(0,0%,95%)] hover:bg-[hsl(220,20%,15%)]">Islamabad</SelectItem>
                    <SelectItem value="rawalpindi" className="text-[hsl(0,0%,95%)] hover:bg-[hsl(220,20%,15%)]">Rawalpindi</SelectItem>
                    <SelectItem value="faisalabad" className="text-[hsl(0,0%,95%)] hover:bg-[hsl(220,20%,15%)]">Faisalabad</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Search Button */}
              <Button 
                onClick={handleSearch}
                className="h-14 px-8 bg-[hsl(210,100%,65%)] hover:bg-[hsl(210,100%,70%)] text-white font-semibold text-lg glow-effect"
              >
                <Search className="w-5 h-5" />
              </Button>
            </div>
            
            {/* Near Me Button */}
            <div className="mt-4 flex justify-center">
              <NearMeButton 
                onLocationFound={onLocationFound}
                onLocationCleared={onLocationCleared}
                isActive={isNearMeActive}
              />
            </div>
          </div>

          {/* CTA Button */}
          <Button 
            onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })} 
            className="text-lg px-8 py-6 bg-transparent border border-[hsl(210,100%,65%)] text-[hsl(210,100%,65%)] hover:bg-[hsl(210,100%,65%)] hover:text-white glow-effect"
          >
            Explore Services
          </Button>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;