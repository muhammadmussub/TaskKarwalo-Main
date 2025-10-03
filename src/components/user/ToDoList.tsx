import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CheckCircle2,
  Circle,
  Plus,
  Calendar,
  ShoppingCart,
  Wrench,
  BookOpen,
  Sparkles,
  X,
  Minimize2,
  Maximize2,
  Trash2,
  Mic,
  RotateCcw,
  Bell,
  Trophy
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ToDoItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
  category?: string;
  canConvertToBooking?: boolean;
  suggested?: boolean;
  recurring?: boolean;
  recurringFrequency?: 'daily' | 'weekly' | 'monthly';
  streak?: number;
  lastCompleted?: string;
  reminderTime?: string;
}

interface ToDoContextType {
  items: ToDoItem[];
  suggestions: ToDoItem[];
  addItem: (text: string, category?: string) => void;
  toggleItem: (id: string) => void;
  removeItem: (id: string) => void;
  convertToBooking: (id: string) => void;
  addSuggestion: (suggestion: ToDoItem) => void;
  dismissSuggestion: (id: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const ToDoContext = createContext<ToDoContextType | undefined>(undefined);

export const useToDo = () => {
  const context = useContext(ToDoContext);
  if (!context) {
    throw new Error('useToDo must be used within a ToDoProvider');
  }
  return context;
};

interface ToDoProviderProps {
  children: ReactNode;
  userId: string;
}

export const ToDoProvider = ({ children, userId }: ToDoProviderProps) => {
  const [items, setItems] = useState<ToDoItem[]>([]);
  const [isOpen, setIsOpen] = useState(true);
  const [newItemText, setNewItemText] = useState("");
  const [suggestions, setSuggestions] = useState<ToDoItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const navigate = useNavigate();

  // Load to-do items from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(`todo-${userId}`);
    if (saved) {
      try {
        setItems(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading to-do items:', error);
      }
    } else {
      // Add some default suggestions for new users
      const defaultItems: ToDoItem[] = [
        {
          id: '1',
          text: 'Book AC service before summer',
          completed: false,
          createdAt: new Date().toISOString(),
          category: 'maintenance',
          canConvertToBooking: true,
          suggested: true
        },
        {
          id: '2',
          text: 'Schedule car wash this week',
          completed: false,
          createdAt: new Date().toISOString(),
          category: 'automotive',
          canConvertToBooking: true,
          suggested: true
        },
        {
          id: '3',
          text: 'Find a home tutor for math',
          completed: false,
          createdAt: new Date().toISOString(),
          category: 'education',
          canConvertToBooking: true,
          suggested: true
        }
      ];
      setItems(defaultItems);
      localStorage.setItem(`todo-${userId}`, JSON.stringify(defaultItems));
    }
  }, [userId]);

  // Save to localStorage whenever items change
  useEffect(() => {
    localStorage.setItem(`todo-${userId}`, JSON.stringify(items));
  }, [items, userId]);

  // Generate auto-suggestions based on time, season, and history
  useEffect(() => {
    const generateAutoSuggestions = () => {
      const now = new Date();
      const hour = now.getHours();
      const dayOfWeek = now.getDay();
      const month = now.getMonth();

      const suggestions: ToDoItem[] = [];

      // Time-based suggestions
      if (hour >= 6 && hour <= 10) {
        suggestions.push({
          id: `morning-${Date.now()}`,
          text: 'Get clothes ironed for the week',
          completed: false,
          createdAt: new Date().toISOString(),
          category: 'laundry',
          canConvertToBooking: true,
          suggested: true
        });
      }

      if (dayOfWeek === 5 && hour >= 17) {
        suggestions.push({
          id: `friday-${Date.now()}`,
          text: 'Book a relaxing spa session',
          completed: false,
          createdAt: new Date().toISOString(),
          category: 'wellness',
          canConvertToBooking: true,
          suggested: true
        });
      }

      // Season-based suggestions
      if (month >= 11 || month <= 1) { // Winter
        suggestions.push({
          id: `winter-${Date.now()}`,
          text: 'Service geyser before winter',
          completed: false,
          createdAt: new Date().toISOString(),
          category: 'maintenance',
          canConvertToBooking: true,
          suggested: true
        });
      }

      if (month >= 9 && month <= 11) { // Wedding season
        suggestions.push({
          id: `wedding-${Date.now()}`,
          text: 'Book bridal makeup artist',
          completed: false,
          createdAt: new Date().toISOString(),
          category: 'beauty',
          canConvertToBooking: true,
          suggested: true
        });
      }

      // History-based suggestions (if user has bookings)
      const hasCleaningBookings = items.some(item =>
        item.text.toLowerCase().includes('clean') ||
        item.category === 'cleaning'
      );

      if (hasCleaningBookings) {
        suggestions.push({
          id: `repeat-cleaning-${Date.now()}`,
          text: 'Schedule regular house cleaning',
          completed: false,
          createdAt: new Date().toISOString(),
          category: 'cleaning',
          canConvertToBooking: true,
          suggested: true,
          recurring: true,
          recurringFrequency: 'weekly'
        });
      }

      setSuggestions(suggestions);
    };

    generateAutoSuggestions();

    // Update suggestions every hour
    const interval = setInterval(generateAutoSuggestions, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [items, userId]);

  const addItem = (text: string, category?: string) => {
    if (!text.trim()) return;

    const newItem: ToDoItem = {
      id: Date.now().toString(),
      text: text.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
      category,
      canConvertToBooking: true,
      suggested: false
    };

    setItems(prev => [newItem, ...prev]);
    setNewItemText("");
    toast.success('Task added to your to-do list!');
  };

  const toggleItem = (id: string) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const newCompleted = !item.completed;
        return {
          ...item,
          completed: newCompleted,
          lastCompleted: newCompleted ? new Date().toISOString() : item.lastCompleted,
          streak: newCompleted ? (item.streak || 0) + 1 : item.streak
        };
      }
      return item;
    }));

    const item = items.find(i => i.id === id);
    if (item) {
      const isCompleting = !item.completed;
      if (isCompleting) {
        const streak = (item.streak || 0) + 1;
        if (streak === 1) {
          toast.success('🎉 First task completed! You\'re on fire! 🔥');
        } else if (streak === 3) {
          toast.success('🔥 3 in a row! You\'re unstoppable! 🚀');
        } else if (streak === 5) {
          toast.success('🌟 5 task streak! You\'re a productivity superstar! ⭐');
        } else {
          toast.success(`Task completed! ${streak > 1 ? `🔥 ${streak} in a row!` : '🎉'}`);
        }
      } else {
        toast.success('Task marked as pending. No worries, you got this! 💪');
      }
    }
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
    toast.success('Task removed from list');
  };

  const convertToBooking = async (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    try {
      // For now, navigate to search - in a real app, you'd create the booking directly
      const searchQuery = item.text.toLowerCase();
      navigate(`/?search=${encodeURIComponent(searchQuery)}`);

      // Show a more enthusiastic message
      toast.success(`🚀 "${item.text}" → Booking mode activated! Let's find you the perfect service!`);

      // Mark task as completed since they're taking action
      toggleItem(id);
    } catch (error) {
      console.error('Error converting to booking:', error);
      toast.error('Something went wrong. Let\'s try that again! 😊');
    }
  };

  const addSuggestion = (suggestion: ToDoItem) => {
    setItems(prev => [suggestion, ...prev]);
    setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
    toast.success('Smart suggestion added to your list! 🧠');
  };

  const dismissSuggestion = (id: string) => {
    setSuggestions(prev => prev.filter(s => s.id !== id));
    toast.info('Suggestion dismissed. We\'ll suggest something else next time!');
  };

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'maintenance': return '🔧';
      case 'automotive': return '🚗';
      case 'education': return '📚';
      case 'cleaning': return '🧹';
      case 'beauty': return '💄';
      case 'wellness': return '🧘';
      case 'delivery': return '🛒';
      default: return '📝';
    }
  };

  const getCategoryColor = (category?: string) => {
    switch (category) {
      case 'maintenance': return 'bg-blue-100 text-blue-800';
      case 'automotive': return 'bg-green-100 text-green-800';
      case 'education': return 'bg-purple-100 text-purple-800';
      case 'cleaning': return 'bg-yellow-100 text-yellow-800';
      case 'beauty': return 'bg-pink-100 text-pink-800';
      case 'wellness': return 'bg-lime-100 text-lime-800';
      case 'delivery': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const completedCount = items.filter(item => item.completed).length;
  const totalCount = items.length;

  return (
    <ToDoContext.Provider value={{
      items,
      suggestions,
      addItem,
      toggleItem,
      removeItem,
      convertToBooking,
      addSuggestion,
      dismissSuggestion,
      isOpen,
      setIsOpen
    }}>
      {children}
    </ToDoContext.Provider>
  );
};

interface ToDoListProps {
  compact?: boolean;
  showHeader?: boolean;
}

export const ToDoList = ({ compact = false, showHeader = true }: ToDoListProps) => {
  const { items, suggestions, addItem, toggleItem, removeItem, convertToBooking, addSuggestion, dismissSuggestion, isOpen, setIsOpen } = useToDo();
  const [newItemText, setNewItemText] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAddItem = () => {
    if (!newItemText.trim()) return;

    // Parse natural language input
    const parsedTask = parseNaturalLanguageInput(newItemText);
    addItem(parsedTask.text, parsedTask.category);
    setNewItemText("");
    setShowAddForm(false);
  };

  const parseNaturalLanguageInput = (input: string) => {
    const text = input.toLowerCase().trim();

    // Category detection based on keywords
    const categoryMap: Record<string, string> = {
      // Cleaning
      'clean': 'cleaning',
      'wash': 'cleaning',
      'tidy': 'cleaning',
      'vacuum': 'cleaning',
      'dust': 'cleaning',
      'mop': 'cleaning',
      'sanitize': 'cleaning',

      // Maintenance
      'repair': 'maintenance',
      'fix': 'maintenance',
      'service': 'maintenance',
      'maintenance': 'maintenance',
      'plumber': 'maintenance',
      'electrician': 'maintenance',
      'ac': 'maintenance',
      'geyser': 'maintenance',

      // Beauty
      'makeup': 'beauty',
      'hair': 'beauty',
      'beauty': 'beauty',
      'mehndi': 'beauty',
      'facial': 'beauty',
      'massage': 'beauty',
      'spa': 'beauty',

      // Education
      'tutor': 'education',
      'teach': 'education',
      'lesson': 'education',
      'class': 'education',
      'study': 'education',
      'homework': 'education',
      'assignment': 'education',

      // Automotive
      'car': 'automotive',
      'vehicle': 'automotive',
      'detail': 'automotive',

      // Wellness
      'relax': 'wellness',
      'meditation': 'wellness',
      'yoga': 'wellness',

      // Delivery
      'grocery': 'delivery',
      'food': 'delivery',
      'delivery': 'delivery',
      'order': 'delivery',
      'shop': 'delivery'
    };

    // Find category
    let detectedCategory = 'general';
    for (const [keyword, category] of Object.entries(categoryMap)) {
      if (text.includes(keyword)) {
        detectedCategory = category;
        break;
      }
    }

    return {
      text: input.trim(),
      category: detectedCategory
    };
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddItem();
    }
  };

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'maintenance': return '🔧';
      case 'automotive': return '🚗';
      case 'education': return '📚';
      case 'cleaning': return '🧹';
      case 'beauty': return '💄';
      case 'wellness': return '🧘';
      case 'delivery': return '🛒';
      default: return '📝';
    }
  };

  const getCategoryColor = (category?: string) => {
    switch (category) {
      case 'maintenance': return 'bg-blue-100 text-blue-800';
      case 'automotive': return 'bg-green-100 text-green-800';
      case 'education': return 'bg-purple-100 text-purple-800';
      case 'cleaning': return 'bg-yellow-100 text-yellow-800';
      case 'beauty': return 'bg-pink-100 text-pink-800';
      case 'wellness': return 'bg-lime-100 text-lime-800';
      case 'delivery': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const completedCount = items.filter(item => item.completed).length;
  const totalCount = items.length;

  if (compact) {
    return (
      <Card className="w-80 bg-gradient-to-b from-indigo-50 to-blue-50 border-indigo-200 shadow-lg">
        {showHeader && (
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-indigo-900 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Today's Tasks
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-6 w-6 text-indigo-600 hover:text-red-600"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <CardDescription className="text-indigo-700">
              {completedCount}/{totalCount} completed
            </CardDescription>
          </CardHeader>
        )}

        {isOpen && (
          <CardContent className="space-y-3">
            {/* Add new task */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Try: 'clean house tomorrow' or 'book spa this evening'..."
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="text-sm border-indigo-200 focus:border-indigo-400"
                />
                <Button
                  size="sm"
                  onClick={handleAddItem}
                  disabled={!newItemText.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Smart Suggestions */}
            {suggestions.length > 0 && (
              <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  <h4 className="text-sm font-medium text-blue-900">Smart Suggestions</h4>
                </div>
                <div className="space-y-2">
                  {suggestions.slice(0, 2).map((suggestion) => (
                    <div
                      key={suggestion.id}
                      className="flex items-center justify-between p-2 bg-white rounded border border-blue-100"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getCategoryIcon(suggestion.category)}</span>
                        <span className="text-sm text-gray-700">{suggestion.text}</span>
                        <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800">
                          Suggested
                        </Badge>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => addSuggestion(suggestion)}
                          className="h-6 px-2 text-xs border-green-300 text-green-700 hover:bg-green-50"
                        >
                          Add
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => dismissSuggestion(suggestion.id)}
                          className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Task list */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {items.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-indigo-600 mb-2">No tasks yet. Add one above! ✨</p>
                  {suggestions.length === 0 && (
                    <p className="text-xs text-indigo-500">💡 Try adding "clean house" or "book spa" to see smart suggestions!</p>
                  )}
                </div>
              ) : (
                items.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${
                      item.completed
                        ? 'bg-green-50 border-green-200'
                        : 'bg-white border-indigo-100 hover:bg-indigo-50'
                    }`}
                  >
                    <Checkbox
                      checked={item.completed}
                      onCheckedChange={() => toggleItem(item.id)}
                      className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                    />

                    <div className="flex-1 min-w-0">
                      <div className={`text-sm ${item.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                        {item.text}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        {item.category && (
                          <Badge variant="outline" className={`text-xs ${getCategoryColor(item.category)}`}>
                            <span className="mr-1">{getCategoryIcon(item.category)}</span>
                            {item.category}
                          </Badge>
                        )}
                        {item.suggested && (
                          <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800">
                            <Sparkles className="h-2 w-2 mr-1" />
                            Suggested
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                       {item.canConvertToBooking && !item.completed && (
                         <Button
                           size="sm"
                           variant="outline"
                           onClick={() => convertToBooking(item.id)}
                           className="h-7 px-2 text-xs border-green-300 text-green-700 hover:bg-green-50 hover:border-green-400"
                           title="Convert to booking"
                         >
                           <Calendar className="h-3 w-3 mr-1" />
                           Book
                         </Button>
                       )}

                       <Button
                         size="sm"
                         variant="outline"
                         onClick={() => removeItem(item.id)}
                         className="h-7 w-7 p-0 text-red-600 hover:text-red-800 border-red-300 hover:bg-red-50 hover:border-red-400"
                         title="Remove task"
                       >
                         <Trash2 className="h-3 w-3" />
                       </Button>
                     </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        )}
      </Card>
    );
  }

  // Full version for dashboard
  return (
    <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-200 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-indigo-900">
              <CheckCircle2 className="h-5 w-5" />
              My To-Do List
            </CardTitle>
            <CardDescription className="text-indigo-700">
              Your daily anchor - track tasks and convert to bookings
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-indigo-900">{completedCount}/{totalCount}</div>
            <div className="text-sm text-indigo-600">completed</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new task */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Add a new task or goal..."
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              onKeyPress={handleKeyPress}
              className="border-indigo-200 focus:border-indigo-400"
            />
            <Button
              onClick={handleAddItem}
              disabled={!newItemText.trim()}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>
        </div>

        {/* Task list */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 text-indigo-300 mx-auto mb-3" />
              <p className="text-indigo-600">No tasks yet!</p>
              <p className="text-sm text-indigo-500 mb-2">Add your first task above to get started.</p>
              <p className="text-xs text-indigo-400">💡 <strong>Pro tip:</strong> Try "clean house" or "book spa" to see smart suggestions!</p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                  item.completed
                    ? 'bg-green-50 border-green-200'
                    : 'bg-white border-indigo-100 hover:bg-indigo-50'
                }`}
              >
                <Checkbox
                  checked={item.completed}
                  onCheckedChange={() => toggleItem(item.id)}
                  className="mt-0.5 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                />

                <div className="flex-1 min-w-0">
                  <div className={`font-medium ${item.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                    {item.text}
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    {item.category && (
                      <Badge variant="outline" className={`text-xs ${getCategoryColor(item.category)}`}>
                        <span className="mr-1">{getCategoryIcon(item.category)}</span>
                        {item.category}
                      </Badge>
                    )}

                    {item.suggested && (
                      <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800">
                        <Sparkles className="h-2 w-2 mr-1" />
                        AI Suggested
                      </Badge>
                    )}

                    {item.recurring && (
                      <Badge variant="outline" className="text-xs bg-purple-100 text-purple-800">
                        <RotateCcw className="h-2 w-2 mr-1" />
                        {item.recurringFrequency}
                      </Badge>
                    )}

                    {item.streak && item.streak > 0 && (
                      <Badge variant="outline" className="text-xs bg-orange-100 text-orange-800">
                        <Trophy className="h-2 w-2 mr-1" />
                        {item.streak} streak
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {item.canConvertToBooking && !item.completed && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => convertToBooking(item.id)}
                      className="text-indigo-600 border-indigo-300 hover:bg-indigo-100 hover:border-indigo-400 transition-all duration-200"
                    >
                      <Calendar className="h-3 w-3 mr-1" />
                      Book
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => removeItem(item.id)}
                    className="text-red-600 hover:text-red-800 border-red-300 hover:bg-red-50 hover:border-red-400 transition-all duration-200"
                    title="Remove task"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Progress indicator */}
        {totalCount > 0 && (
          <div className="pt-2 border-t border-indigo-200">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-indigo-700">Progress</span>
              <span className="font-medium text-indigo-900">
                {Math.round((completedCount / totalCount) * 100)}%
              </span>
            </div>
            <div className="w-full bg-indigo-100 rounded-full h-2 mt-1 mb-2">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(completedCount / totalCount) * 100}%` }}
              />
            </div>

            {/* Streak counter */}
            {(() => {
              const currentStreak = Math.max(...items.map(item => item.streak || 0), 0);
              return currentStreak > 0 && (
                <div className="flex items-center justify-center gap-1 text-xs text-indigo-600 bg-indigo-50 rounded-full px-2 py-1">
                  <Trophy className="h-3 w-3" />
                  <span>🔥 {currentStreak} task streak!</span>
                </div>
              );
            })()}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Floating To-Do button for other pages
export const ToDoButton = () => {
  const { isOpen, setIsOpen, items } = useToDo();
  const completedCount = items.filter(item => item.completed).length;
  const totalCount = items.length;

  return (
    <>
      {/* Floating Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className="h-14 w-14 rounded-full bg-indigo-600 hover:bg-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200 relative"
        >
          <CheckCircle2 className="h-6 w-6" />
        </Button>

        {/* Task count badge */}
        {totalCount > 0 && (
          <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center font-bold animate-pulse">
            {totalCount}
          </div>
        )}
      </div>

      {/* Floating Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-end justify-end p-4 pointer-events-none"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <ToDoList compact={true} showHeader={true} />
          </div>
        </div>
      )}
    </>
  );
};

export default ToDoList;