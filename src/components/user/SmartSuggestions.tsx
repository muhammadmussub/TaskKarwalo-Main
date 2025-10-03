import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, TrendingUp, Sparkles, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface SmartSuggestion {
  id: string;
  title: string;
  description: string;
  emoji: string;
  actionText: string;
  category: string;
  confidence: number; // 0-100 based on how likely they want this
  reason: string; // Why we're suggesting this
  basedOn: 'history' | 'time' | 'pattern' | 'seasonal';
}

interface SmartSuggestionsProps {
  userId: string;
  bookings: any[];
}

const SmartSuggestions = ({ userId, bookings }: SmartSuggestionsProps) => {
  const [suggestions, setSuggestions] = useState<SmartSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    generateSmartSuggestions();
  }, [userId, bookings]);

  const generateSmartSuggestions = async () => {
    setLoading(true);

    try {
      const now = new Date();
      const hour = now.getHours();
      const dayOfWeek = now.getDay();
      const month = now.getMonth();

      // Analyze booking history
      const bookingHistory = analyzeBookingHistory(bookings);
      const timeBasedSuggestions = getTimeBasedSuggestions(hour, dayOfWeek);
      const patternBasedSuggestions = getPatternBasedSuggestions(bookingHistory, dayOfWeek);

      // Combine all suggestions
      const allSuggestions: SmartSuggestion[] = [
        ...timeBasedSuggestions,
        ...patternBasedSuggestions
      ];

      // Sort by confidence and take top 3
      const topSuggestions = allSuggestions
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 3);

      setSuggestions(topSuggestions);
    } catch (error) {
      console.error('Error generating smart suggestions:', error);
      toast.error('Failed to generate smart suggestions');
    } finally {
      setLoading(false);
    }
  };

  const analyzeBookingHistory = (bookings: any[]) => {
    const history = {
      categories: new Map<string, number>(),
      times: new Map<string, number>(),
      days: new Map<number, number>(),
      recentBookings: bookings.filter(b => {
        const bookingDate = new Date(b.created_at);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return bookingDate >= weekAgo;
      })
    };

    bookings.forEach(booking => {
      // Extract category from title or description
      const category = extractCategory(booking.title, booking.description);
      history.categories.set(category, (history.categories.get(category) || 0) + 1);

      // Analyze time patterns
      const hour = new Date(booking.created_at).getHours();
      const timeSlot = `${Math.floor(hour / 4) * 4}-${Math.floor(hour / 4) * 4 + 3}h`;
      history.times.set(timeSlot, (history.times.get(timeSlot) || 0) + 1);

      // Analyze day patterns
      const day = new Date(booking.created_at).getDay();
      history.days.set(day, (history.days.get(day) || 0) + 1);
    });

    return history;
  };

  const extractCategory = (title: string, description?: string): string => {
    const text = `${title} ${description || ''}`.toLowerCase();

    if (text.includes('spa') || text.includes('massage')) return 'wellness';
    if (text.includes('clean') || text.includes('wash')) return 'cleaning';
    if (text.includes('iron') || text.includes('laundry')) return 'laundry';
    if (text.includes('tutor') || text.includes('teach')) return 'education';
    if (text.includes('makeup') || text.includes('beauty')) return 'beauty';
    if (text.includes('repair') || text.includes('fix')) return 'maintenance';
    if (text.includes('grocery') || text.includes('delivery')) return 'delivery';
    if (text.includes('car') || text.includes('vehicle')) return 'automotive';

    return 'general';
  };

  const getTimeBasedSuggestions = (hour: number, dayOfWeek: number): SmartSuggestion[] => {
    const suggestions: SmartSuggestion[] = [];

    // Morning suggestions (6-10 AM)
    if (hour >= 6 && hour <= 10) {
      suggestions.push({
        id: 'morning-prep',
        title: 'Morning Prep—Clothes Ready?',
        description: 'Start your day fresh! Get your clothes ironed for the week ahead.',
        emoji: '👔',
        actionText: 'Book Ironing',
        category: 'laundry',
        confidence: 85,
        reason: 'It\'s morning time - perfect for getting clothes ready',
        basedOn: 'time'
      });
    }

    // Friday evening suggestions
    if (dayOfWeek === 5 && hour >= 17) {
      suggestions.push({
        id: 'friday-spa',
        title: 'Friday Evening—Spa Time?',
        description: 'Wind down from the work week with a relaxing spa session at home.',
        emoji: '🧘',
        actionText: 'Book Spa Session',
        category: 'wellness',
        confidence: 90,
        reason: 'It\'s Friday evening - time to relax!',
        basedOn: 'time'
      });
    }

    // Weekend suggestions
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      suggestions.push({
        id: 'weekend-cleaning',
        title: 'Weekend Deep Clean?',
        description: 'Make the most of your weekend with professional deep cleaning services.',
        emoji: '🧹',
        actionText: 'Book Deep Cleaning',
        category: 'cleaning',
        confidence: 80,
        reason: 'It\'s the weekend - perfect for home maintenance',
        basedOn: 'time'
      });
    }

    return suggestions;
  };

  const getPatternBasedSuggestions = (history: any, dayOfWeek: number): SmartSuggestion[] => {
    const suggestions: SmartSuggestion[] = [];

    // If they booked spa last week, suggest it again
    if (history.recentBookings.some((b: any) => extractCategory(b.title, b.description) === 'wellness')) {
      suggestions.push({
        id: 'repeat-spa',
        title: 'Loved Your Last Spa Session?',
        description: 'You booked a spa service recently—want to experience it again?',
        emoji: '🧖',
        actionText: 'Rebook Spa',
        category: 'wellness',
        confidence: 95,
        reason: 'Based on your recent spa booking',
        basedOn: 'history'
      });
    }

    // If they frequently book cleaning services
    if (history.categories.get('cleaning') && history.categories.get('cleaning') > 1) {
      suggestions.push({
        id: 'repeat-cleaning',
        title: 'Regular Cleaning Routine?',
        description: 'You\'ve booked cleaning services before—ready for your next session?',
        emoji: '✨',
        actionText: 'Book Cleaning',
        category: 'cleaning',
        confidence: 88,
        reason: 'Based on your cleaning service history',
        basedOn: 'pattern'
      });
    }

    // If they book educational services
    if (history.categories.get('education') && history.categories.get('education') > 0) {
      suggestions.push({
        id: 'continue-tutoring',
        title: 'Continue Learning Journey?',
        description: 'You\'ve had tutoring sessions—ready to book your next lesson?',
        emoji: '📖',
        actionText: 'Book Tutor',
        category: 'education',
        confidence: 82,
        reason: 'Based on your educational service history',
        basedOn: 'pattern'
      });
    }

    return suggestions;
  };

  const handleSuggestionAction = (suggestion: SmartSuggestion) => {
    const searchQueries: Record<string, string> = {
      'wellness': 'spa, massage, relaxation',
      'cleaning': 'deep cleaning, house cleaning, maid service',
      'laundry': 'ironing, laundry service, clothes pressing',
      'education': 'tutor, home tuition, private lessons',
      'beauty': 'makeup artist, mehndi, beauty services',
      'maintenance': 'AC repair, geyser service, home maintenance',
      'delivery': 'grocery delivery, food delivery',
      'automotive': 'car wash, car detailing, vehicle cleaning'
    };

    const query = searchQueries[suggestion.category] || suggestion.category;
    navigate(`/?search=${encodeURIComponent(query)}`);
    toast.success(`Taking you to ${suggestion.category} services!`);
  };

  const refreshSuggestions = () => {
    generateSmartSuggestions();
    toast.success('Suggestions refreshed!');
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'bg-green-100 text-green-800 border-green-300';
    if (confidence >= 75) return 'bg-blue-100 text-blue-800 border-blue-300';
    return 'bg-yellow-100 text-yellow-800 border-yellow-300';
  };

  const getBasedOnIcon = (basedOn: string) => {
    switch (basedOn) {
      case 'history': return '📈';
      case 'time': return '🕐';
      case 'pattern': return '🔄';
      case 'seasonal': return '🌸';
      default: return '💡';
    }
  };

  if (loading) {
    return (
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-900">
            <Sparkles className="h-5 w-5" />
            Smart Suggestions
          </CardTitle>
          <CardDescription className="text-purple-700">
            Analyzing your preferences...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-20">
            <RefreshCw className="h-6 w-6 text-purple-600" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (suggestions.length === 0) {
    return (
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-900">
            <Sparkles className="h-5 w-5" />
            Smart Suggestions
          </CardTitle>
          <CardDescription className="text-purple-700">
            No suggestions available right now. Check back later!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={refreshSuggestions}
            className="w-full border-purple-300 text-purple-700"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Suggestions
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-purple-900">
              <Sparkles className="h-5 w-5" />
              Smart Suggestions
            </CardTitle>
            <CardDescription className="text-purple-700">
              Personalized recommendations based on your history and timing
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={refreshSuggestions}
            className="text-purple-600"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className="flex items-start justify-between p-3 rounded-lg bg-white/70 border border-purple-200"
            >
              <div className="flex items-start gap-3 flex-1">
                <div className="text-2xl">{suggestion.emoji}</div>
                <div className="flex-1">
                  <h4 className="font-medium text-purple-900">{suggestion.title}</h4>
                  <p className="text-sm text-purple-700 mb-2">{suggestion.description}</p>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`${getConfidenceColor(suggestion.confidence)} text-xs`}
                    >
                      {suggestion.confidence}% match
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-purple-600">
                      <span>{getBasedOnIcon(suggestion.basedOn)}</span>
                      <span>{suggestion.reason}</span>
                    </div>
                  </div>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => handleSuggestionAction(suggestion)}
                className="bg-purple-600 text-white ml-3"
              >
                {suggestion.actionText}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default SmartSuggestions;