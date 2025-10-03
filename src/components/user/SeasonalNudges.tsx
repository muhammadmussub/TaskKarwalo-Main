import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Sparkles, Clock, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface SeasonalNudge {
  id: string;
  title: string;
  description: string;
  emoji: string;
  actionText: string;
  category: string;
  urgency: 'low' | 'medium' | 'high';
  dismissible?: boolean;
}

const SeasonalNudges = () => {
  const [currentNudge, setCurrentNudge] = useState<SeasonalNudge | null>(null);
  const [dismissedNudges, setDismissedNudges] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    generateSeasonalNudge();
  }, []);

  const generateSeasonalNudge = () => {
    const now = new Date();
    const month = now.getMonth();
    const day = now.getDate();
    const hour = now.getHours();

    // Seasonal nudges based on month and time
    const seasonalNudges: SeasonalNudge[] = [
      // Winter season (Dec-Feb)
      ...(month >= 11 || month <= 1 ? [{
        id: 'winter-geyser',
        title: 'Winter\'s Coming—Get Geyser Checked!',
        description: 'Cold weather ahead! Schedule a geyser maintenance service before the chill sets in.',
        emoji: '❄️',
        actionText: 'Book Geyser Service',
        category: 'maintenance',
        urgency: 'medium' as const
      }] : []),

      // Wedding season (Oct-Dec)
      ...(month >= 9 && month <= 11 ? [{
        id: 'wedding-season',
        title: 'Shaadi Season\'s Here—Book Makeup Now!',
        description: 'Wedding bells ringing? Get your bridal makeup artist booked before slots fill up.',
        emoji: '💄',
        actionText: 'Book Makeup Artist',
        category: 'beauty',
        urgency: 'high' as const
      }] : []),

      // Exam season (Mar-May)
      ...(month >= 2 && month <= 4 ? [{
        id: 'exam-tutor',
        title: 'Exam Month—Need a Tutor?',
        description: 'Exams approaching! Get expert tutoring at home to ace your subjects.',
        emoji: '📚',
        actionText: 'Find Tutor',
        category: 'education',
        urgency: 'high' as const
      }] : []),

      // Summer season (Jun-Aug)
      ...(month >= 5 && month <= 7 ? [{
        id: 'summer-ac',
        title: 'Summer Heat—AC Service Ready?',
        description: 'Beat the heat! Get your AC serviced before summer peaks.',
        emoji: '🌞',
        actionText: 'Book AC Service',
        category: 'maintenance',
        urgency: 'medium' as const
      }] : []),

      // Ramadan/Eid season
      ...(month === 2 || month === 3 ? [{
        id: 'ramadan-cleaning',
        title: 'Ramadan Mubarak—Deep Clean Ready?',
        description: 'Prepare your home for Ramadan with professional deep cleaning services.',
        emoji: '🌙',
        actionText: 'Book Deep Cleaning',
        category: 'cleaning',
        urgency: 'medium' as const
      }] : []),

      // Weekend specials
      ...(now.getDay() === 5 || now.getDay() === 6 ? [{
        id: 'weekend-relax',
        title: 'Weekend Vibes—Spa Day?',
        description: 'It\'s the weekend! Treat yourself to a relaxing spa session at home.',
        emoji: '🧘',
        actionText: 'Book Spa Session',
        category: 'wellness',
        urgency: 'low' as const
      }] : []),

      // Morning routine
      ...(hour >= 6 && hour <= 10 ? [{
        id: 'morning-iron',
        title: 'Morning Rush—Clothes Ironed?',
        description: 'Start your day fresh! Get your clothes ironed for the week ahead.',
        emoji: '👔',
        actionText: 'Book Ironing Service',
        category: 'laundry',
        urgency: 'low' as const
      }] : []),

      // Evening wind-down
      ...(hour >= 18 && hour <= 22 ? [{
        id: 'evening-massage',
        title: 'Evening Relaxation—Massage Time?',
        description: 'Wind down after a long day with a professional massage at home.',
        emoji: '💆',
        actionText: 'Book Massage',
        category: 'wellness',
        urgency: 'low' as const
      }] : []),

      // Generic helpful nudges
      {
        id: 'grocery-reminder',
        title: 'Grocery Running Low?',
        description: 'Need groceries delivered? Get fresh produce and essentials at your doorstep.',
        emoji: '🛒',
        actionText: 'Order Groceries',
        category: 'delivery',
        urgency: 'low' as const
      },
      {
        id: 'car-wash',
        title: 'Car Looking Dusty?',
        description: 'Get your car washed and detailed at home—shine like new!',
        emoji: '🚗',
        actionText: 'Book Car Wash',
        category: 'automotive',
        urgency: 'low' as const
      }
    ];

    // Filter out dismissed nudges
    const availableNudges = seasonalNudges.filter(nudge => !dismissedNudges.has(nudge.id));

    if (availableNudges.length > 0) {
      // Show the most urgent nudge first, or random if same urgency
      const urgentNudges = availableNudges.filter(n => n.urgency === 'high');
      const selectedNudges = urgentNudges.length > 0 ? urgentNudges : availableNudges;
      const randomNudge = selectedNudges[Math.floor(Math.random() * selectedNudges.length)];
      setCurrentNudge(randomNudge);
    } else {
      setCurrentNudge(null);
    }
  };

  const handleDismiss = (nudgeId: string) => {
    setDismissedNudges(prev => new Set([...prev, nudgeId]));
    setCurrentNudge(null);
    toast.success("Nudge dismissed! We'll show you something else next time.");
  };

  const handleAction = () => {
    if (!currentNudge) return;

    // Navigate to home page with search query based on nudge category
    const searchQueries: Record<string, string> = {
      'maintenance': 'AC service, geyser repair',
      'beauty': 'makeup artist, mehndi',
      'education': 'tutor, home tuition',
      'cleaning': 'deep cleaning, house cleaning',
      'wellness': 'spa, massage',
      'laundry': 'ironing, laundry',
      'delivery': 'grocery delivery',
      'automotive': 'car wash, car detailing'
    };

    const query = searchQueries[currentNudge.category] || currentNudge.category;
    navigate(`/?search=${encodeURIComponent(query)}`);
    toast.success(`Taking you to ${currentNudge.category} services!`);
  };

  const handleRemindLater = () => {
    if (!currentNudge) return;
    handleDismiss(currentNudge.id);
    toast.info("We'll remind you about this later!");
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'bg-red-100 text-red-800 border-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (!currentNudge) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="text-3xl">{currentNudge.emoji}</div>
            <div>
              <CardTitle className="text-lg text-blue-900">{currentNudge.title}</CardTitle>
              <CardDescription className="text-blue-700">
                {currentNudge.description}
              </CardDescription>
            </div>
          </div>
          {currentNudge.dismissible !== false && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDismiss(currentNudge.id)}
              className="h-6 w-6 text-blue-600 hover:text-blue-800"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={`${getUrgencyColor(currentNudge.urgency)} font-medium`}
            >
              {currentNudge.urgency.toUpperCase()}
            </Badge>
            <div className="flex items-center gap-1 text-sm text-blue-600">
              <Sparkles className="h-3 w-3" />
              <span>Seasonal Suggestion</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRemindLater}
              className="text-blue-700 border-blue-300 hover:bg-blue-100"
            >
              <Clock className="h-3 w-3 mr-1" />
              Later
            </Button>
            <Button
              size="sm"
              onClick={handleAction}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {currentNudge.actionText}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SeasonalNudges;