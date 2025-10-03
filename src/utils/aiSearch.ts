export interface AISearchResult {
  query: string;
  detectedCategory: string;
  specificServices: string[];
  searchTerms: string[];
  priorityKeywords: string[];
  location?: string;
  romanUrduDetected: boolean;
  confidence: number;
  suggestedTasks: string[];
  locationRadius?: number;
}

export interface ServiceMatch {
  service: any;
  relevanceScore: number;
  matchedKeywords: string[];
  categoryMatch: boolean;
  titleMatch: boolean;
  descriptionMatch: boolean;
}

/**
 * AI-powered search that understands natural language queries
 * and intelligently categorizes and prioritizes results
 */
export class AISearchEngine {
  private categoryKeywords: Record<string, string[]> = {
    cleaning: [
      // English terms
      'clean', 'cleaning', 'cleaned', 'wash', 'washing', 'dust', 'dusting', 'sweep', 'sweeping',
      'mop', 'mopping', 'vacuum', 'vacuuming', 'sanitize', 'disinfect', 'tidy',
      'dirty', 'mess', 'messy', 'filthy', 'grimy', 'stained', 'spotless', 'hygiene',
      'fan', 'fans', 'ceiling fan', 'exhaust fan', 'fridge', 'refrigerator', 'oven', 'microwave',
      'kitchen', 'bathroom', 'toilet', 'carpet', 'floor', 'windows', 'glass', 'dishes',
      'laundry', 'clothes', 'ironing', 'pressing', 'dry clean', 'curtains', 'blinds',
      'sofa', 'furniture', 'deep clean', 'spring cleaning', 'move in', 'move out',
      'want', 'my', 'i want', 'need', 'help', 'service', 'cleaner', 'maid', 'housekeeping',
      // Roman Urdu terms
      'safai', 'safayi', 'saaf', 'dhona', 'dhulwana', 'dhona', 'dhulna', 'jhaaru', 'pochha',
      'kapray', 'kapre', 'dhoney', 'bartan', 'bartaan', 'fan', 'fridge', 'freezer', 'oven',
      'microwave', 'kitchen', 'bathroom', 'toilet', 'carpet', 'floor', 'khirki', 'glass',
      'laundry', 'istri', 'pressing', 'dry clean', 'curtains', 'blinds', 'sofa', 'furniture',
      'deep clean', 'spring cleaning', 'move in', 'move out', 'ghar', 'house', 'home', 'makan',
      'chahiye', 'chaheye', 'karwa', 'karwana', 'lagwa', 'lagwana', 'karwao', 'karwai'
    ],
    beauty: [
      // English terms
      'beauty', 'makeup', 'hair', 'haircut', 'hair cut', 'styling', 'salon', 'spa',
      'facial', 'face', 'skin', 'massage', 'manicure', 'pedicure', 'nails', 'waxing',
      'threading', 'eyebrows', 'lashes', 'mehndi', 'henna', 'bridal', 'party', 'event',
      'grooming', 'barber', 'trim', 'shave', 'beard', 'mustache', 'color', 'dye',
      'treatment', 'therapy', 'relaxation', 'wellness', 'aromatherapy', 'expert', 'professional',
      // Roman Urdu terms
      'beauty', 'makeup', 'hair', 'haircut', 'hair cut', 'styling', 'parlor', 'salon', 'spa',
      'facial', 'face', 'skin', 'massage', 'manicure', 'pedicure', 'nails', 'waxing',
      'threading', 'eyebrows', 'lashes', 'mehndi', 'henna', 'bridal', 'party', 'event',
      'grooming', 'barber', 'trim', 'shave', 'beard', 'mustache', 'color', 'dye',
      'treatment', 'therapy', 'relaxation', 'wellness', 'aromatherapy', 'expert', 'professional',
      'mehndi', 'henna', 'makeup', 'facial', 'hair', 'cut', 'style', 'trim', 'shave', 'beard',
      'eyebrow', 'threading', 'wax', 'mani', 'pedi', 'nails', 'massage', 'spa', 'salon'
    ],
    repair: [
      // English terms
      'repair', 'fix', 'broken', 'damage', 'maintenance', 'service', 'install', 'installation',
      'setup', 'assembly', 'electrical', 'plumbing', 'carpentry', 'painting', 'wiring',
      'leak', 'clog', 'block', 'crack', 'hole', 'door', 'window', 'lock', 'handle',
      'switch', 'outlet', 'bulb', 'light', 'fan', 'ac', 'air conditioning', 'heater',
      'water', 'pipe', 'drain', 'toilet', 'sink', 'shower', 'bathtub', 'tile', 'wall',
      'ceiling', 'roof', 'fence', 'gate', 'furniture', 'appliance', 'electronic',
      // Roman Urdu terms
      'repair', 'theek', 'fix', 'broken', 'kharab', 'damage', 'maintenance', 'service', 'install',
      'setup', 'bijli', 'electric', 'plumber', 'nal', 'paani', 'leak', 'block', 'crack',
      'darwaza', 'window', 'lock', 'handle', 'switch', 'bulb', 'light', 'fan', 'ac',
      'aircon', 'heater', 'water', 'pipe', 'drain', 'toilet', 'sink', 'shower', 'bathtub',
      'tile', 'wall', 'ceiling', 'roof', 'fence', 'gate', 'furniture', 'appliance', 'electronic',
      'bijli', 'kaam', 'wiring', 'painting', 'carpentry', 'plumbing', 'electrician'
    ],
    tailoring: [
      // English terms
      'tailor', 'stitching', 'sewing', 'alteration', 'alter', 'fit', 'size', 'dress',
      'suit', 'shirt', 'pants', 'trouser', 'skirt', 'blouse', 'kurta', 'shalwar',
      'kameez', 'dupatta', 'scarf', 'cloth', 'fabric', 'needle', 'thread', 'button',
      'zipper', 'hem', 'length', 'width', 'measurement', 'custom', 'design', 'pattern',
      // Roman Urdu terms
      'darzi', 'tailor', 'silai', 'stitching', 'sewing', 'alter', 'fit', 'size', 'dress',
      'suit', 'shirt', 'pant', 'trouser', 'skirt', 'blouse', 'kurta', 'shalwar',
      'kameez', 'dupatta', 'scarf', 'kapra', 'cloth', 'fabric', 'needle', 'thread', 'button',
      'zipper', 'hem', 'length', 'width', 'nap', 'measurement', 'custom', 'design', 'pattern',
      'kapray', 'kapre', 'silwana', 'silai', 'darzi', 'tailoring', 'stitch', 'sew'
    ],
    education: [
      'tutor', 'teaching', 'lesson', 'class', 'course', 'subject', 'math', 'english',
      'urdu', 'science', 'physics', 'chemistry', 'biology', 'history', 'geography',
      'computer', 'programming', 'coding', 'language', 'exam', 'test', 'homework',
      'assignment', 'project', 'notes', 'study', 'learn', 'education', 'school',
      'college', 'university', 'student', 'teacher', 'professor', 'academic'
    ],
    food: [
      'food', 'cooking', 'chef', 'catering', 'delivery', 'restaurant', 'meal', 'lunch',
      'dinner', 'breakfast', 'snack', 'beverage', 'drink', 'juice', 'tea', 'coffee',
      'bakery', 'cake', 'dessert', 'party', 'event', 'wedding', 'birthday', 'celebration',
      'grocery', 'shopping', 'ingredients', 'recipe', 'cuisine', 'traditional', 'modern'
    ],
    vehicle: [
      'car', 'vehicle', 'auto', 'automotive', 'wash', 'cleaning', 'detailing', 'polish',
      'maintenance', 'service', 'repair', 'fix', 'oil', 'change', 'tire', 'tyre', 'battery',
      'engine', 'brake', 'transmission', 'driver', 'chauffeur', 'transport', 'pickup',
      'drop', 'delivery', 'taxi', 'cab', 'ride', 'travel', 'commute', 'school run'
    ],
    tech: [
      'computer', 'laptop', 'phone', 'mobile', 'tablet', 'tech', 'technology', 'software',
      'hardware', 'repair', 'fix', 'setup', 'install', 'configuration', 'network', 'wifi',
      'internet', 'website', 'app', 'application', 'programming', 'coding', 'development',
      'troubleshoot', 'virus', 'malware', 'data', 'recovery', 'backup', 'security'
    ],
    moving: [
      'moving', 'relocation', 'shift', 'transport', 'delivery', 'pickup', 'collect',
      'transfer', 'carry', 'haul', 'pack', 'unpack', 'load', 'unload', 'truck', 'van',
      'bike', 'motorcycle', 'furniture', 'appliance', 'box', 'luggage', 'parcel',
      'package', 'courier', 'shipping', 'logistics', 'warehouse'
    ],
    events: [
      'event', 'party', 'wedding', 'birthday', 'celebration', 'ceremony', 'function',
      'gathering', 'meeting', 'conference', 'seminar', 'workshop', 'training', 'class',
      'performance', 'show', 'entertainment', 'music', 'dance', 'decoration', 'planning',
      'organize', 'manage', 'host', 'venue', 'catering', 'photography', 'videography'
    ],
    pet_care: [
      'pet', 'dog', 'cat', 'animal', 'care', 'grooming', 'walking', 'sitting', 'feeding',
      'training', 'veterinary', 'vet', 'health', 'medicine', 'food', 'toy', 'accessory',
      'boarding', 'daycare', 'shelter', 'adoption', 'rescue', 'behavior', 'obedience'
    ],
    yoga: [
      'yoga', 'fitness', 'exercise', 'workout', 'gym', 'health', 'wellness', 'meditation',
      'mindfulness', 'breathing', 'stretch', 'flexibility', 'strength', 'cardio', 'aerobic',
      'trainer', 'instructor', 'class', 'session', 'personal', 'training', 'coaching'
    ]
  };

  private priorityKeywords: Record<string, string[]> = {
    urgent: ['urgent', 'emergency', 'asap', 'immediately', 'right now', 'today', 'now'],
    quality: ['best', 'top', 'premium', 'professional', 'expert', 'experienced', 'trusted', 'reliable'],
    specific: ['fan', 'ceiling fan', 'exhaust fan', 'fridge', 'refrigerator', 'ac', 'air conditioning']
  };

  /**
   * Detect if the query contains Roman Urdu text
   */
  private detectRomanUrdu(query: string): boolean {
    // Roman Urdu patterns - words that are commonly written in Roman Urdu
    const romanUrduPatterns = [
      // Common Roman Urdu words and patterns
      /\b(kaam|kam|karam|chahiye|chaye|chaheye|karwa|karvana|karwana|lagwa|lagwana)\b/i,
      /\b(ghar|house|home|makan|apna|mera|hamara)\b/i,
      /\b(safai|safayi|clean|cleaning|saaf|kapray|kapre|clothes)\b/i,
      /\b(bartan|bartaan|dishes|dhona|dhulwana|wash)\b/i,
      /\b(ac|aircon|aircon|conditioner|thanda|cool)\b/i,
      /\b(painter|paint|rang|color|wall)\b/i,
      /\b(electrician|bijli|light|fan|switch)\b/i,
      /\b(plumber|pipe|nal|paani|water|leak)\b/i,
      /\b(tailor|darzi|silai|stitch|kapra|cloth)\b/i,
      /\b(tutor|teacher|padhana|padana|study|class)\b/i,
      /\b(beauty|parlor|salon|makeup|mehndi|henna)\b/i,
      /\b(car|gaari|wash|clean|driver)\b/i,
      /\b(moving|shifting|pack|unpack|carry)\b/i,
      /\b(repair|theek|fix|broken|kharab|tuta)\b/i,
      /\b(urgent|jaldi|asap|emergency|foran)\b/i,
      /\b(service|servicing|check|dekhna|checkup)\b/i
    ];

    // Check for Roman Urdu patterns
    const hasRomanUrdu = romanUrduPatterns.some(pattern => pattern.test(query));

    // Also check for mixed Urdu/English patterns
    const mixedPattern = /[a-zA-Z]+\s+[a-zA-Z]*[aeiou][a-zA-Z]*\s*(?:ka|ki|ke|ko|ne|se|me|pe|par|per)/i;
    const hasMixed = mixedPattern.test(query);

    return hasRomanUrdu || hasMixed;
  }

  /**
   * Enhanced confidence calculation with advanced Pakistani context understanding
   */
  private calculateConfidence(query: string, detectedCategory: string, keywordMatches: number): number {
    let confidence = 0;

    // Base confidence from keyword matches
    confidence += Math.min(keywordMatches * 10, 50);

    // Bonus for specific categories
    if (detectedCategory !== 'general') {
      confidence += 20;
    }

    // Enhanced Roman Urdu detection bonus
    const romanUrduDetected = this.detectRomanUrdu(query);
    if (romanUrduDetected) {
      confidence += 25; // Increased bonus for Roman Urdu

      // Additional bonus for mixed Urdu/English
      const hasMixedScript = /[a-zA-Z]+\s+[a-zA-Z]*[aeiou][a-zA-Z]*\s*(?:ka|ki|ke|ko|ne|se|me|pe|par|per|wa|na|do|de|lo|le|ja|ao|ao|ya|ye|yi|yo|yu)/i.test(query);
      if (hasMixedScript) {
        confidence += 10;
      }
    }

    // Length-based confidence (longer queries are more specific)
    if (query.length > 15) {
      confidence += 15;
    } else if (query.length > 10) {
      confidence += 10;
    } else if (query.length > 5) {
      confidence += 5;
    }

    // Enhanced specific keyword bonuses for Pakistani context
    const specificTerms = [
      'chahiye', 'chaheye', 'chaye', 'karwa', 'karwana', 'lagwa', 'lagwana', 'karwao', 'karwai',
      'de do', 'de dena', 'kardo', 'kijiye', 'kijye', 'bulao', 'bulana', 'mangwa', 'mangwana',
      'book', 'booking', 'order', 'delivery', 'pickup', 'drop', 'collect', 'bring', 'take',
      'urgent', 'jaldi', 'foran', 'emergency', 'asap', 'immediately', 'now', 'today',
      'ghar', 'house', 'home', 'makan', 'apna', 'mera', 'hamara', 'apne', 'hamare',
      'safai', 'safayi', 'clean', 'saaf', 'kapray', 'kapre', 'clothes', 'bartan', 'bartaan',
      'ac', 'aircon', 'thanda', 'cool', 'painter', 'paint', 'rang', 'color', 'wall',
      'electrician', 'bijli', 'light', 'fan', 'switch', 'plumber', 'pipe', 'nal', 'paani',
      'tailor', 'darzi', 'silai', 'stitch', 'kapra', 'cloth', 'tutor', 'teacher', 'padhana',
      'beauty', 'parlor', 'salon', 'makeup', 'mehndi', 'henna', 'car', 'gaari', 'wash',
      'repair', 'theek', 'fix', 'broken', 'kharab', 'tuta', 'service', 'servicing'
    ];

    const matchedTerms = specificTerms.filter(term => query.toLowerCase().includes(term));
    confidence += matchedTerms.length * 8; // 8 points per specific term

    // Advanced Pakistani context analysis
    const pakistaniContextTerms = [
      // Common Pakistani service request patterns
      'karwa', 'karwana', 'lagwa', 'lagwana', 'bulwa', 'bulwana', 'mangwa', 'mangwana',
      'chahiye', 'chaheye', 'chaye', 'kijiye', 'kijye', 'kardo', 'kijye ga', 'kardo ga',
      'de do', 'de den', 'de dena', 'kar den', 'kar dena', 'laga den', 'laga dena',
      // Location and time specific terms
      'ghar', 'house', 'home', 'makan', 'apna', 'mera', 'hamara', 'apne', 'hamare',
      'aaj', 'kal', 'abhi', 'jaldi', 'foran', 'urgent', 'emergency', 'asap',
      // Quality and requirement terms
      'acha', 'good', 'best', 'top', 'premium', 'professional', 'expert', 'experienced',
      'trusted', 'reliable', 'verified', 'certified', 'skilled', 'trained', 'qualified'
    ];

    const pakistaniMatches = pakistaniContextTerms.filter(term => query.toLowerCase().includes(term));
    confidence += pakistaniMatches.length * 12; // Higher weight for Pakistani context terms

    // Context-aware bonuses with Pakistani cultural understanding
    if (query.toLowerCase().includes('ghar') || query.toLowerCase().includes('home')) {
      confidence += 8; // Home-related queries are usually more specific in Pakistani context
    }

    if (query.toLowerCase().includes('urgent') || query.toLowerCase().includes('jaldi') || query.toLowerCase().includes('foran')) {
      confidence += 15; // Urgent queries need higher confidence in Pakistani context
    }

    // Pakistani service-specific context bonuses
    if (query.toLowerCase().includes('karwa') || query.toLowerCase().includes('lagwa')) {
      confidence += 10; // Service request patterns get higher confidence
    }

    if (query.toLowerCase().includes('acha') || query.toLowerCase().includes('good') || query.toLowerCase().includes('best')) {
      confidence += 8; // Quality-focused queries are more specific
    }

    // Time-based context understanding
    if (query.toLowerCase().includes('aaj') || query.toLowerCase().includes('today') || query.toLowerCase().includes('abhi')) {
      confidence += 12; // Immediate service requests get higher priority
    }

    return Math.min(confidence, 100);
  }

  /**
   * Generate suggested tasks based on category and query with enhanced Pakistani context
   */
  private generateSuggestedTasks(category: string, query: string): string[] {
    const suggestions: Record<string, string[]> = {
      cleaning: [
        // Roman Urdu suggestions
        'Ghar ki safai karwai',
        'Fan saaf karwaye',
        'Fridge ki safai',
        'Carpet dhulwai',
        'Bathroom saaf karo',
        'Kitchen deep clean',
        'Sofa cleaning karwai',
        'Window khirkiyan saaf',
        // English suggestions
        'House cleaning service',
        'Deep cleaning required',
        'Bathroom sanitization',
        'Kitchen cleaning',
        'Fan cleaning service',
        'Carpet washing',
        'Sofa dry cleaning',
        'Window cleaning'
      ],
      repair: [
        // Roman Urdu suggestions
        'AC service karwaye',
        'Fan theek karwaye',
        'Bijli ka kaam',
        'Plumbing repair',
        'Door lock badlo',
        'Switch board theek',
        'Geyser repair',
        'Washing machine fix',
        // English suggestions
        'AC repair service',
        'Electrical work needed',
        'Plumbing maintenance',
        'Door lock replacement',
        'Switch board repair',
        'Appliance repair',
        'Home maintenance',
        'Emergency repair'
      ],
      beauty: [
        // Roman Urdu suggestions
        'Hair cut karwaye',
        'Facial karwaye',
        'Mehndi lagwaye',
        'Party makeup',
        'Eyebrow threading',
        'Manicure pedicure',
        'Hair styling',
        'Bridal makeup',
        // English suggestions
        'Haircut and styling',
        'Facial treatment',
        'Mehndi application',
        'Party makeup artist',
        'Eyebrow threading',
        'Nail care service',
        'Hair treatment',
        'Bridal beauty package'
      ],
      tailoring: [
        // Roman Urdu suggestions
        'Kapray silwaye',
        'Kurta shalwar banao',
        'Dress stitching',
        'Pant alteration',
        'Shirt fitting',
        'Blouse design',
        'Suit tailoring',
        'Kapra cutting',
        // English suggestions
        'Custom tailoring',
        'Dress making',
        'Clothing alteration',
        'Suit stitching',
        'Shirt tailoring',
        'Blouse designing',
        'Fabric cutting',
        'Clothing repair'
      ],
      education: [
        // Roman Urdu suggestions
        'Math tutor chahiye',
        'English padhayen',
        'Exam preparation',
        'Assignment help',
        'School subjects',
        'Computer classes',
        'Language learning',
        'Notes banwaye',
        // English suggestions
        'Math tutoring',
        'English classes',
        'Exam preparation',
        'Homework help',
        'Subject tutoring',
        'Computer training',
        'Language courses',
        'Study notes'
      ],
      vehicle: [
        // Roman Urdu suggestions
        'Car wash karwaye',
        'Gaari cleaning',
        'Driver for pickup',
        'Car maintenance',
        'Oil change',
        'Car detailing',
        'Tyre badlo',
        'Car service',
        // English suggestions
        'Car wash service',
        'Vehicle cleaning',
        'Driver service',
        'Car maintenance',
        'Oil change service',
        'Car detailing',
        'Tyre replacement',
        'Vehicle servicing'
      ],
      food: [
        // Roman Urdu suggestions
        'Khana banwana',
        'Chef hire karo',
        'Catering service',
        'Party food',
        'Home cooking',
        'Meal delivery',
        'Restaurant booking',
        'Food catering',
        // English suggestions
        'Home cooking',
        'Chef service',
        'Food catering',
        'Party catering',
        'Meal preparation',
        'Food delivery',
        'Restaurant service',
        'Event catering'
      ],
      tech: [
        // Roman Urdu suggestions
        'Computer theek karo',
        'Laptop repair',
        'Mobile fix',
        'Internet setup',
        'WiFi configure',
        'Software install',
        'App development',
        'Tech support',
        // English suggestions
        'Computer repair',
        'Laptop service',
        'Mobile repair',
        'Internet setup',
        'WiFi configuration',
        'Software installation',
        'App development',
        'Technical support'
      ]
    };

    const categorySuggestions = suggestions[category] || [];

    // Filter suggestions based on query content and avoid duplicates
    const relevantSuggestions = categorySuggestions.filter(suggestion => {
      const suggestionLower = suggestion.toLowerCase();
      const queryWords = query.toLowerCase().split(' ');

      // Don't include suggestions that contain words already in the query
      const hasQueryWord = queryWords.some(word =>
        suggestionLower.includes(word) && word.length > 2
      );

      return !hasQueryWord;
    });

    // Mix Roman Urdu and English suggestions for better diversity
    const mixedSuggestions = [];
    const romanUrduOnes = relevantSuggestions.filter(s => /[a-zA-Z]*[aeiou][a-zA-Z]*\s*(?:ka|ki|ke|ko|ne|se|me|pe|par|per|wa|na|do|de|lo|le|ja|ao|ya|ye|yi|yo|yu)/i.test(s));
    const englishOnes = relevantSuggestions.filter(s => !romanUrduOnes.includes(s));

    // Alternate between Roman Urdu and English suggestions
    const maxLength = Math.max(romanUrduOnes.length, englishOnes.length);
    for (let i = 0; i < maxLength && mixedSuggestions.length < 6; i++) {
      if (i < romanUrduOnes.length) {
        mixedSuggestions.push(romanUrduOnes[i]);
      }
      if (i < englishOnes.length && mixedSuggestions.length < 6) {
        mixedSuggestions.push(englishOnes[i]);
      }
    }

    return mixedSuggestions.slice(0, 6);
  }

  /**
   * Parse natural language query and extract meaningful information
   */
  parseQuery(query: string): AISearchResult {
    const normalizedQuery = query.toLowerCase().trim();

    // Detect category based on keywords
    let detectedCategory = 'general';
    let specificServices: string[] = [];
    let matchedKeywords: string[] = [];

    // Check each category for keyword matches
    for (const [category, keywords] of Object.entries(this.categoryKeywords)) {
      const categoryMatches = keywords.filter(keyword =>
        normalizedQuery.includes(keyword)
      );

      if (categoryMatches.length > 0) {
        detectedCategory = category;
        matchedKeywords.push(...categoryMatches);

        // Extract specific services mentioned
        if (category === 'cleaning') {
          if (normalizedQuery.includes('fan') || normalizedQuery.includes('ceiling')) {
            specificServices.push('ceiling fan cleaning');
          }
          if (normalizedQuery.includes('fridge') || normalizedQuery.includes('refrigerator')) {
            specificServices.push('fridge cleaning');
          }
          if (normalizedQuery.includes('car') || normalizedQuery.includes('vehicle')) {
            specificServices.push('car wash');
          }
        }

        if (category === 'beauty') {
          if (normalizedQuery.includes('hair') || normalizedQuery.includes('haircut')) {
            specificServices.push('haircut');
          }
          if (normalizedQuery.includes('facial')) {
            specificServices.push('facial treatment');
          }
          if (normalizedQuery.includes('mehndi') || normalizedQuery.includes('henna')) {
            specificServices.push('mehndi application');
          }
        }

        if (category === 'repair') {
          if (normalizedQuery.includes('ac') || normalizedQuery.includes('air conditioning')) {
            specificServices.push('AC service');
          }
          if (normalizedQuery.includes('plumbing') || normalizedQuery.includes('pipe')) {
            specificServices.push('plumbing repair');
          }
        }
      }
    }

    // Extract priority keywords
    const priorityKeywords: string[] = [];
    for (const [type, keywords] of Object.entries(this.priorityKeywords)) {
      const matches = keywords.filter(keyword => normalizedQuery.includes(keyword));
      if (matches.length > 0) {
        priorityKeywords.push(...matches);
      }
    }

    // Extract search terms (remove common words but keep important ones)
    const searchTerms = normalizedQuery
      .split(' ')
      .filter(word =>
        word.length > 1 &&
        !['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those'].includes(word)
      );

    return {
      query: normalizedQuery,
      detectedCategory,
      specificServices,
      searchTerms,
      priorityKeywords,
      romanUrduDetected: this.detectRomanUrdu(normalizedQuery),
      confidence: this.calculateConfidence(normalizedQuery, detectedCategory, matchedKeywords.length),
      suggestedTasks: this.generateSuggestedTasks(detectedCategory, normalizedQuery),
      locationRadius: 10 // Default 10km radius
    };
  }

  /**
   * Calculate comprehensive relevance score for a service based on multiple factors
   */
  calculateRelevanceScore(service: any, searchResult: AISearchResult): ServiceMatch {
    let score = 0;
    const matchedKeywords: string[] = [];
    let categoryMatch = false;
    let titleMatch = false;
    let descriptionMatch = false;

    const title = service.title?.toLowerCase() || '';
    const description = service.description?.toLowerCase() || '';
    const category = service.category?.toLowerCase() || '';

    // 1. Category matching (highest weight - 50 points)
    if (category === searchResult.detectedCategory) {
      score += 50;
      categoryMatch = true;
    }

    // 2. Specific service matching (very high weight - 100 points each)
    for (const specificService of searchResult.specificServices) {
      if (title.includes(specificService.toLowerCase()) || description.includes(specificService.toLowerCase())) {
        score += 100;
        matchedKeywords.push(specificService);
      }
    }

    // 3. Priority keyword matching (high weight - 30 points each)
    for (const priorityKeyword of searchResult.priorityKeywords) {
      if (title.includes(priorityKeyword) || description.includes(priorityKeyword)) {
        score += 30;
        matchedKeywords.push(priorityKeyword);
      }
    }

    // 4. Search term matching (medium weight - 20 points each)
    for (const searchTerm of searchResult.searchTerms) {
      if (title.includes(searchTerm) || description.includes(searchTerm)) {
        score += 20;
        matchedKeywords.push(searchTerm);
      }
    }

    // 5. General keyword matching (lower weight - 10 points each)
    if (searchResult.detectedCategory !== 'general') {
      for (const keyword of this.categoryKeywords[searchResult.detectedCategory]) {
        if (title.includes(keyword) || description.includes(keyword)) {
          score += 10;
          matchedKeywords.push(keyword);
        }
      }
    }

    // 6. Exact phrase matching (high bonus - 25 points)
    if (title.includes(searchResult.query)) {
      score += 25;
      titleMatch = true;
    }

    // 7. Description match bonus (medium bonus - 15 points)
    if (description.includes(searchResult.query)) {
      score += 15;
      descriptionMatch = true;
    }

    // 8. Enhanced provider quality factors with Pro Badge priority
    const providerProfile = service.provider_profiles;

    // Pro Badge Priority (highest weight - 50 points)
    if (providerProfile?.verified_pro) {
      score += 50; // Pro Badge gets highest priority

      // Additional Pro Badge bonuses
      if (providerProfile.rating && providerProfile.rating >= 4.8) {
        score += 15; // High-rated Pro Badge bonus
      }

      if (providerProfile.total_jobs && providerProfile.total_jobs >= 50) {
        score += 10; // Experienced Pro Badge bonus
      }
    }

    // Provider rating bonus (0-25 points based on rating)
    if (providerProfile?.rating) {
      const rating = providerProfile.rating;
      if (rating >= 4.8) score += 25;
      else if (rating >= 4.5) score += 20;
      else if (rating >= 4.0) score += 15;
      else if (rating >= 3.5) score += 10;
      else if (rating >= 3.0) score += 5;
    }

    // Total jobs completed bonus (0-15 points based on volume)
    if (providerProfile?.total_jobs) {
      const jobs = providerProfile.total_jobs;
      if (jobs >= 200) score += 15; // Very experienced
      else if (jobs >= 100) score += 12; // Experienced
      else if (jobs >= 50) score += 9; // Moderately experienced
      else if (jobs >= 20) score += 6; // Some experience
      else if (jobs >= 10) score += 3; // Getting started
    }

    // Commission volume bonus (0-10 points based on earnings)
    if (providerProfile?.total_commission) {
      const commission = providerProfile.total_commission;
      if (commission >= 50000) score += 10; // Top earner
      else if (commission >= 25000) score += 7; // High earner
      else if (commission >= 10000) score += 5; // Established
      else if (commission >= 5000) score += 3; // Growing
    }

    // Response time and activity bonus (0-10 points)
    if (providerProfile?.updated_at) {
      const lastActive = new Date(providerProfile.updated_at);
      const hoursSinceActive = (Date.now() - lastActive.getTime()) / (1000 * 60 * 60);

      if (hoursSinceActive <= 1) score += 10; // Very recently active
      else if (hoursSinceActive <= 6) score += 7; // Recently active
      else if (hoursSinceActive <= 24) score += 5; // Active today
      else if (hoursSinceActive <= 72) score += 3; // Active recently
    }

    // Business verification bonus (0-8 points)
    if (providerProfile?.business_name && providerProfile.business_name.length > 0) {
      score += 3; // Has business name
    }

    if (providerProfile?.business_address && providerProfile.business_address.length > 0) {
      score += 5; // Has complete business address
    }

    // Service completion rate bonus (0-10 points)
    if (providerProfile?.total_jobs && providerProfile?.total_jobs > 0) {
      // Assuming completion rate is high if they have many jobs and good rating
      const estimatedCompletionRate = Math.min(providerProfile.rating * 20, 90);
      score += Math.floor(estimatedCompletionRate / 10);
    }

    // Location proximity bonus (if user location is available)
    if (searchResult.location && providerProfile?.latitude && providerProfile?.longitude) {
      // This would be calculated based on actual distance
      // For now, just add a small bonus for having location data
      score += 2;
    }

    // Freshness bonus (recently updated services)
    if (service.updated_at) {
      const daysSinceUpdate = (Date.now() - new Date(service.updated_at).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceUpdate <= 7) score += 5;
      else if (daysSinceUpdate <= 30) score += 3;
    }

    return {
      service,
      relevanceScore: score,
      matchedKeywords,
      categoryMatch,
      titleMatch,
      descriptionMatch
    };
  }

  /**
   * Search and rank services based on AI analysis
   */
  searchServices(services: any[], query: string): ServiceMatch[] {
    if (!query.trim()) {
      return [];
    }

    const searchResult = this.parseQuery(query);

    // Calculate relevance scores for all services
    const scoredServices = services.map(service =>
      this.calculateRelevanceScore(service, searchResult)
    );

    // Sort by relevance score (descending)
    return scoredServices
      .filter(match => match.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Get detailed provider ranking information with Pro Badge priority
   */
  getProviderRankingInfo(service: any): {
    totalScore: number;
    breakdown: {
      categoryMatch: number;
      specificServices: number;
      priorityKeywords: number;
      searchTerms: number;
      generalKeywords: number;
      exactPhrase: number;
      descriptionMatch: number;
      proBadge: number;
      rating: number;
      experience: number;
      earnings: number;
      activity: number;
      businessVerification: number;
      completionRate: number;
    };
    rank: 'excellent' | 'good' | 'average' | 'below-average';
    recommendation: string;
    proBadgePriority: boolean;
  } {
    const searchResult = this.parseQuery(''); // Empty query for general ranking
    const match = this.calculateRelevanceScore(service, searchResult);

    const providerProfile = service.provider_profiles;

    // Calculate individual score components
    const breakdown = {
      categoryMatch: match.categoryMatch ? 50 : 0,
      specificServices: searchResult.specificServices.length * 100,
      priorityKeywords: searchResult.priorityKeywords.length * 30,
      searchTerms: searchResult.searchTerms.length * 20,
      generalKeywords: 10, // Base keyword matching
      exactPhrase: match.titleMatch ? 25 : 0,
      descriptionMatch: match.descriptionMatch ? 15 : 0,
      proBadge: providerProfile?.verified_pro ? 50 : 0,
      rating: 0,
      experience: 0,
      earnings: 0,
      activity: 0,
      businessVerification: 0,
      completionRate: 0
    };

    // Calculate rating bonus
    if (providerProfile?.rating) {
      const rating = providerProfile.rating;
      if (rating >= 4.8) breakdown.rating = 25;
      else if (rating >= 4.5) breakdown.rating = 20;
      else if (rating >= 4.0) breakdown.rating = 15;
      else if (rating >= 3.5) breakdown.rating = 10;
      else if (rating >= 3.0) breakdown.rating = 5;
    }

    // Calculate experience bonus
    if (providerProfile?.total_jobs) {
      const jobs = providerProfile.total_jobs;
      if (jobs >= 200) breakdown.experience = 15;
      else if (jobs >= 100) breakdown.experience = 12;
      else if (jobs >= 50) breakdown.experience = 9;
      else if (jobs >= 20) breakdown.experience = 6;
      else if (jobs >= 10) breakdown.experience = 3;
    }

    // Calculate earnings bonus
    if (providerProfile?.total_commission) {
      const commission = providerProfile.total_commission;
      if (commission >= 50000) breakdown.earnings = 10;
      else if (commission >= 25000) breakdown.earnings = 7;
      else if (commission >= 10000) breakdown.earnings = 5;
      else if (commission >= 5000) breakdown.earnings = 3;
    }

    // Calculate activity bonus
    if (providerProfile?.updated_at) {
      const lastActive = new Date(providerProfile.updated_at);
      const hoursSinceActive = (Date.now() - lastActive.getTime()) / (1000 * 60 * 60);

      if (hoursSinceActive <= 1) breakdown.activity = 10;
      else if (hoursSinceActive <= 6) breakdown.activity = 7;
      else if (hoursSinceActive <= 24) breakdown.activity = 5;
      else if (hoursSinceActive <= 72) breakdown.activity = 3;
    }

    // Calculate business verification bonus
    if (providerProfile?.business_name && providerProfile.business_name.length > 0) {
      breakdown.businessVerification += 3;
    }
    if (providerProfile?.business_address && providerProfile.business_address.length > 0) {
      breakdown.businessVerification += 5;
    }

    // Calculate completion rate bonus
    if (providerProfile?.total_jobs && providerProfile?.total_jobs > 0) {
      const estimatedCompletionRate = Math.min(providerProfile.rating * 20, 90);
      breakdown.completionRate = Math.floor(estimatedCompletionRate / 10);
    }

    const totalScore = Object.values(breakdown).reduce((sum, score) => sum + score, 0);

    // Determine rank
    let rank: 'excellent' | 'good' | 'average' | 'below-average';
    let recommendation: string;

    if (totalScore >= 200) {
      rank = 'excellent';
      recommendation = 'Highly recommended - Top rated provider with excellent track record';
    } else if (totalScore >= 150) {
      rank = 'good';
      recommendation = 'Recommended - Good quality provider with solid experience';
    } else if (totalScore >= 100) {
      rank = 'average';
      recommendation = 'Acceptable - Provider meets basic requirements';
    } else {
      rank = 'below-average';
      recommendation = 'Consider other options - Provider needs improvement';
    }

    return {
      totalScore,
      breakdown,
      rank,
      recommendation,
      proBadgePriority: providerProfile?.verified_pro === true
    };
  }

  /**
   * Get search suggestions based on partial input
   */
  getSuggestions(partialQuery: string): string[] {
    if (partialQuery.length < 2) return [];

    const normalizedQuery = partialQuery.toLowerCase();
    const suggestions: string[] = [];

    // Add category-based suggestions
    for (const [category, keywords] of Object.entries(this.categoryKeywords)) {
      const matchingKeywords = keywords.filter(keyword =>
        keyword.includes(normalizedQuery) && keyword.length > normalizedQuery.length
      );

      suggestions.push(...matchingKeywords.slice(0, 3));
    }

    // Add common service phrases (English + Roman Urdu)
    const commonPhrases = [
      // English phrases
      'clean my house',
      'fix my AC',
      'hair cut',
      'car wash',
      'tutor for math',
      'plumbing repair',
      'makeup artist',
      'moving help',
      'computer repair',
      'pet grooming',
      // Roman Urdu phrases
      'ghar ki safai karwai',
      'AC theek karwaye',
      'hair cut karwaye',
      'gaari dhulwai',
      'math tutor chahiye',
      'plumber bulao',
      'makeup karwana hai',
      'shifting help',
      'computer theek karo',
      'pet grooming',
      // Mixed phrases
      'fan saaf karwai',
      'bartan dhulwai',
      'kapray silwai',
      'mehndi lagwai',
      'carpet cleaning',
      'fridge saaf karo',
      'electrician bulao',
      'painter chahiye',
      'driver hire karo',
      'tutor padhana sikhao'
    ];

    const matchingPhrases = commonPhrases.filter(phrase =>
      phrase.includes(normalizedQuery)
    );

    suggestions.push(...matchingPhrases);

    return [...new Set(suggestions)].slice(0, 8);
  }
}

// Export singleton instance
export const aiSearchEngine = new AISearchEngine();