import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, ArrowRight, Shuffle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface QuickBookTile {
  id: string;
  title: string;
  emoji: string;
  category: string;
  searchQuery: string;
  color: string;
  gradient: string;
}

const QuickBookTiles = () => {
  const [tiles, setTiles] = useState<QuickBookTile[]>([]);
  const [currentSet, setCurrentSet] = useState(0);
  const navigate = useNavigate();

  // All available quick book tiles
  const allTiles: QuickBookTile[] = [
    {
      id: 'grocery',
      title: 'Grocery le aao please',
      emoji: '🛒',
      category: 'delivery',
      searchQuery: 'grocery delivery, fresh vegetables, supermarket',
      color: 'green',
      gradient: 'from-green-50 to-emerald-50 border-green-200'
    },
    {
      id: 'ac-service',
      title: 'AC service before garmi',
      emoji: '❄️',
      category: 'maintenance',
      searchQuery: 'AC repair, AC service, air conditioning',
      color: 'blue',
      gradient: 'from-blue-50 to-cyan-50 border-blue-200'
    },
    {
      id: 'school-tuition',
      title: 'School tuition chahiye ghar pe',
      emoji: '📚',
      category: 'education',
      searchQuery: 'home tuition, private tutor, school subjects',
      color: 'purple',
      gradient: 'from-purple-50 to-violet-50 border-purple-200'
    },
    {
      id: 'bartan-dhulwane',
      title: 'Bartan dhulwane hain ghar pe',
      emoji: '🍽️',
      category: 'cleaning',
      searchQuery: 'dish washing, kitchen cleaning, maid service',
      color: 'orange',
      gradient: 'from-orange-50 to-amber-50 border-orange-200'
    },
    {
      id: 'makeup-artist',
      title: 'Makeup artist chahiye shaadi',
      emoji: '💄',
      category: 'beauty',
      searchQuery: 'bridal makeup, makeup artist, wedding makeup',
      color: 'pink',
      gradient: 'from-pink-50 to-rose-50 border-pink-200'
    },
    {
      id: 'car-wash',
      title: 'Car wash chahiye ghar pe',
      emoji: '🚗',
      category: 'automotive',
      searchQuery: 'car wash, car detailing, vehicle cleaning',
      color: 'indigo',
      gradient: 'from-indigo-50 to-blue-50 border-indigo-200'
    },
    {
      id: 'ironing',
      title: 'Kapray press karwa do',
      emoji: '👔',
      category: 'laundry',
      searchQuery: 'ironing service, clothes pressing, laundry',
      color: 'teal',
      gradient: 'from-teal-50 to-cyan-50 border-teal-200'
    },
    {
      id: 'mehndi',
      title: 'Mehndi lagwani hai urgently',
      emoji: '🌿',
      category: 'beauty',
      searchQuery: 'mehndi artist, henna design, bridal mehndi',
      color: 'brown',
      gradient: 'from-amber-50 to-orange-50 border-amber-200'
    },
    {
      id: 'massage',
      title: 'Massage chahiye ghar pe',
      emoji: '💆',
      category: 'wellness',
      searchQuery: 'home massage, spa therapy, relaxation massage',
      color: 'lime',
      gradient: 'from-lime-50 to-green-50 border-lime-200'
    },
    {
      id: 'tutor',
      title: 'Assignment likhwa do kal tak',
      emoji: '📝',
      category: 'education',
      searchQuery: 'assignment help, homework assistance, academic writing',
      color: 'red',
      gradient: 'from-red-50 to-pink-50 border-red-200'
    },
    {
      id: 'cleaning',
      title: 'Fridge ki safai karwao',
      emoji: '🧽',
      category: 'cleaning',
      searchQuery: 'fridge cleaning, appliance cleaning, deep cleaning',
      color: 'cyan',
      gradient: 'from-cyan-50 to-blue-50 border-cyan-200'
    },
    {
      id: 'presentation',
      title: 'Presentation banwani hai jaldi',
      emoji: '📊',
      category: 'business',
      searchQuery: 'presentation design, powerpoint, business presentation',
      color: 'slate',
      gradient: 'from-slate-50 to-gray-50 border-slate-200'
    },
    {
      id: 'haircut',
      title: 'Hair cut chahiye is weekend',
      emoji: '✂️',
      category: 'beauty',
      searchQuery: 'haircut, hair styling, barber, salon',
      color: 'emerald',
      gradient: 'from-emerald-50 to-teal-50 border-emerald-200'
    },
    {
      id: 'facial',
      title: 'Facial chahiye trusted expert se',
      emoji: '🌸',
      category: 'beauty',
      searchQuery: 'facial treatment, skincare, beauty expert',
      color: 'rose',
      gradient: 'from-rose-50 to-pink-50 border-rose-200'
    },
    {
      id: 'notes',
      title: 'Notes banwane hain exam ke',
      emoji: '📖',
      category: 'education',
      searchQuery: 'exam notes, study notes, academic notes',
      color: 'violet',
      gradient: 'from-violet-50 to-purple-50 border-violet-200'
    },
    {
      id: 'driver',
      title: 'Driver chahiye school run ke',
      emoji: '🚙',
      category: 'transport',
      searchQuery: 'driver service, chauffeur, school pickup',
      color: 'sky',
      gradient: 'from-sky-50 to-blue-50 border-sky-200'
    },
    {
      id: 'rickshaw',
      title: 'Rickshaw book karwa do abhi',
      emoji: '🛺',
      category: 'transport',
      searchQuery: 'rickshaw booking, auto rickshaw, transport',
      color: 'yellow',
      gradient: 'from-yellow-50 to-amber-50 border-yellow-200'
    },
    {
      id: 'curtains',
      title: 'Curtains lagwaane hain urgently',
      emoji: '🪟',
      category: 'home',
      searchQuery: 'curtain installation, home decoration, interior',
      color: 'fuchsia',
      gradient: 'from-fuchsia-50 to-pink-50 border-fuchsia-200'
    },
    {
      id: 'tailor',
      title: 'Tailor se kapray uthwa do',
      emoji: '🧵',
      category: 'services',
      searchQuery: 'tailor pickup, clothing collection, garment',
      color: 'stone',
      gradient: 'from-stone-50 to-neutral-50 border-stone-200'
    }
  ];

  useEffect(() => {
    // Show 6 random tiles initially
    shuffleTiles();
  }, []);

  const shuffleTiles = () => {
    const shuffled = [...allTiles].sort(() => Math.random() - 0.5);
    setTiles(shuffled.slice(0, 6));
    setCurrentSet(prev => prev + 1);
  };

  const handleTileClick = (tile: QuickBookTile) => {
    navigate(`/?search=${encodeURIComponent(tile.searchQuery)}`);
    toast.success(`Taking you to ${tile.category} services!`);
  };

  const handleShuffle = () => {
    shuffleTiles();
    toast.success('New quick book options loaded!');
  };

  const getColorClasses = (color: string) => {
    const colorMap: Record<string, { bg: string, hover: string, text: string, button: string }> = {
      green: { bg: 'bg-green-50 hover:bg-green-100', hover: 'hover:bg-green-100', text: 'text-green-800', button: 'bg-green-600 hover:bg-green-700' },
      blue: { bg: 'bg-blue-50 hover:bg-blue-100', hover: 'hover:bg-blue-100', text: 'text-blue-800', button: 'bg-blue-600 hover:bg-blue-700' },
      purple: { bg: 'bg-purple-50 hover:bg-purple-100', hover: 'hover:bg-purple-100', text: 'text-purple-800', button: 'bg-purple-600 hover:bg-purple-700' },
      orange: { bg: 'bg-orange-50 hover:bg-orange-100', hover: 'hover:bg-orange-100', text: 'text-orange-800', button: 'bg-orange-600 hover:bg-orange-700' },
      pink: { bg: 'bg-pink-50 hover:bg-pink-100', hover: 'hover:bg-pink-100', text: 'text-pink-800', button: 'bg-pink-600 hover:bg-pink-700' },
      indigo: { bg: 'bg-indigo-50 hover:bg-indigo-100', hover: 'hover:bg-indigo-100', text: 'text-indigo-800', button: 'bg-indigo-600 hover:bg-indigo-700' },
      teal: { bg: 'bg-teal-50 hover:bg-teal-100', hover: 'hover:bg-teal-100', text: 'text-teal-800', button: 'bg-teal-600 hover:bg-teal-700' },
      brown: { bg: 'bg-amber-50 hover:bg-amber-100', hover: 'hover:bg-amber-100', text: 'text-amber-800', button: 'bg-amber-600 hover:bg-amber-700' },
      lime: { bg: 'bg-lime-50 hover:bg-lime-100', hover: 'hover:bg-lime-100', text: 'text-lime-800', button: 'bg-lime-600 hover:bg-lime-700' },
      red: { bg: 'bg-red-50 hover:bg-red-100', hover: 'hover:bg-red-100', text: 'text-red-800', button: 'bg-red-600 hover:bg-red-700' },
      cyan: { bg: 'bg-cyan-50 hover:bg-cyan-100', hover: 'hover:bg-cyan-100', text: 'text-cyan-800', button: 'bg-cyan-600 hover:bg-cyan-700' },
      slate: { bg: 'bg-slate-50 hover:bg-slate-100', hover: 'hover:bg-slate-100', text: 'text-slate-800', button: 'bg-slate-600 hover:bg-slate-700' }
    };

    return colorMap[color] || colorMap.blue;
  };

  return (
    <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-yellow-900">
              <Zap className="h-5 w-5" />
              Quick Book Tiles
            </CardTitle>
            <CardDescription className="text-yellow-700">
              One-tap booking for common tasks. New options refresh automatically!
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleShuffle}
            className="border-yellow-300 text-yellow-700 hover:bg-yellow-100"
          >
            <Shuffle className="h-4 w-4 mr-2" />
            Shuffle
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {tiles.map((tile) => {
            const colors = getColorClasses(tile.color);
            return (
              <div
                key={tile.id}
                className={`bg-gradient-to-br ${tile.gradient} rounded-lg p-4 cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-md border-2 hover:border-opacity-50`}
                onClick={() => handleTileClick(tile)}
              >
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className="text-3xl">{tile.emoji}</div>
                  <div className="text-sm font-medium text-gray-800 leading-tight">
                    {tile.title}
                  </div>
                  <Button
                    size="sm"
                    className={`${colors.button} text-white text-xs px-3 py-1 h-auto`}
                  >
                    Book Now
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 text-center">
          <p className="text-xs text-yellow-700">
            💡 <strong>Pro tip:</strong> These tiles change based on what's popular right now!
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickBookTiles;