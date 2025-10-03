export interface LocationSuggestion {
  name: string;
  fullName: string;
  lat: number;
  lng: number;
  type: 'city' | 'area' | 'sector' | 'neighborhood';
  distance?: number;
}

export interface LocationSearchResult {
  suggestions: LocationSuggestion[];
  userLocation?: { lat: number; lng: number };
  fromCache?: boolean;
  apiUsed?: 'google' | 'nominatim' | 'local';
}

/**
 * Location service for Pakistani cities and areas
 * Provides intelligent location suggestions with coordinates
 */
export class LocationService {
  private static readonly PAKISTAN_CITIES = [
    { name: "Islamabad", fullName: "Islamabad", lat: 33.6844, lng: 73.0479, type: 'city' as const },
    { name: "Rawalpindi", fullName: "Rawalpindi", lat: 33.5651, lng: 73.0169, type: 'city' as const },
    { name: "Lahore", fullName: "Lahore", lat: 31.5204, lng: 74.3587, type: 'city' as const },
    { name: "Karachi", fullName: "Karachi", lat: 24.8607, lng: 67.0011, type: 'city' as const },
    { name: "Peshawar", fullName: "Peshawar", lat: 34.0151, lng: 71.5249, type: 'city' as const },
    { name: "Quetta", fullName: "Quetta", lat: 30.1798, lng: 66.9750, type: 'city' as const },
    { name: "Faisalabad", fullName: "Faisalabad", lat: 31.4504, lng: 73.1350, type: 'city' as const },
    { name: "Multan", fullName: "Multan", lat: 30.1575, lng: 71.5249, type: 'city' as const },
    { name: "Gujranwala", fullName: "Gujranwala", lat: 32.1577, lng: 74.1819, type: 'city' as const },
    { name: "Sialkot", fullName: "Sialkot", lat: 32.4945, lng: 74.5229, type: 'city' as const },
    { name: "Hyderabad", fullName: "Hyderabad", lat: 25.3969, lng: 68.3771, type: 'city' as const },
    { name: "Sukkur", fullName: "Sukkur", lat: 27.7032, lng: 68.8588, type: 'city' as const },
    { name: "Larkana", fullName: "Larkana", lat: 27.5590, lng: 68.2170, type: 'city' as const },
    { name: "Bahawalpur", fullName: "Bahawalpur", lat: 29.3956, lng: 71.6722, type: 'city' as const },
    { name: "Sargodha", fullName: "Sargodha", lat: 32.0836, lng: 72.6711, type: 'city' as const },
    { name: "Sahiwal", fullName: "Sahiwal", lat: 30.6663, lng: 73.1018, type: 'city' as const },
    { name: "Okara", fullName: "Okara", lat: 30.8102, lng: 73.4511, type: 'city' as const },
    { name: "Wah", fullName: "Wah Cantt", lat: 33.7575, lng: 72.7639, type: 'city' as const },
    { name: "Dera Ghazi Khan", fullName: "Dera Ghazi Khan", lat: 30.0437, lng: 70.6367, type: 'city' as const },
    { name: "Mingora", fullName: "Mingora", lat: 34.7758, lng: 72.3627, type: 'city' as const }
  ];

  private static readonly ISLAMABAD_AREAS = [
    { name: "F-10", fullName: "F-10, Islamabad", lat: 33.6784, lng: 73.0123, type: 'sector' as const },
    { name: "F-11", fullName: "F-11, Islamabad", lat: 33.6784, lng: 72.9923, type: 'sector' as const },
    { name: "G-10", fullName: "G-10, Islamabad", lat: 33.6684, lng: 73.0123, type: 'sector' as const },
    { name: "G-11", fullName: "G-11, Islamabad", lat: 33.6684, lng: 72.9923, type: 'sector' as const },
    { name: "I-8", fullName: "I-8, Islamabad", lat: 33.6584, lng: 73.0723, type: 'sector' as const },
    { name: "I-9", fullName: "I-9, Islamabad", lat: 33.6584, lng: 73.0523, type: 'sector' as const },
    { name: "Blue Area", fullName: "Blue Area, Islamabad", lat: 33.7184, lng: 73.0723, type: 'area' as const },
    { name: "Saddar", fullName: "Saddar, Rawalpindi", lat: 33.5984, lng: 73.0523, type: 'area' as const },
    { name: "Bahria Town", fullName: "Bahria Town, Islamabad", lat: 33.5084, lng: 73.1023, type: 'area' as const },
    { name: "DHA", fullName: "DHA, Islamabad", lat: 33.5284, lng: 73.1523, type: 'area' as const },
    { name: "PWD", fullName: "PWD, Islamabad", lat: 33.5784, lng: 73.1323, type: 'area' as const },
    { name: "Soan Garden", fullName: "Soan Garden, Islamabad", lat: 33.5284, lng: 73.1723, type: 'area' as const },
    { name: "Pakistan Town", fullName: "Pakistan Town, Islamabad", lat: 33.5584, lng: 73.1423, type: 'area' as const },
    { name: "Korangi", fullName: "Korangi, Islamabad", lat: 33.5484, lng: 73.1623, type: 'area' as const },
    { name: "Gulberg", fullName: "Gulberg, Islamabad", lat: 33.5184, lng: 73.0823, type: 'area' as const },
    { name: "Bilal Town", fullName: "Bilal Town, Rawalpindi", lat: 33.6284, lng: 73.0723, type: 'area' as const }
  ];

  private static readonly LAHORE_AREAS = [
    { name: "Gulberg", fullName: "Gulberg, Lahore", lat: 31.5204, lng: 74.3587, type: 'area' as const },
    { name: "DHA", fullName: "DHA, Lahore", lat: 31.4704, lng: 74.3087, type: 'area' as const },
    { name: "Model Town", fullName: "Model Town, Lahore", lat: 31.4904, lng: 74.3287, type: 'area' as const },
    { name: "Johar Town", fullName: "Johar Town, Lahore", lat: 31.4604, lng: 74.2787, type: 'area' as const },
    { name: "Bahria Town", fullName: "Bahria Town, Lahore", lat: 31.3804, lng: 74.1887, type: 'area' as const },
    { name: "Wapda Town", fullName: "Wapda Town, Lahore", lat: 31.4404, lng: 74.2587, type: 'area' as const },
    { name: "Garden Town", fullName: "Garden Town, Lahore", lat: 31.5004, lng: 74.3387, type: 'area' as const },
    { name: "Faisal Town", fullName: "Faisal Town, Lahore", lat: 31.4804, lng: 74.3187, type: 'area' as const },
    { name: "Township", fullName: "Township, Lahore", lat: 31.4304, lng: 74.2987, type: 'area' as const },
    { name: "Shadman", fullName: "Shadman, Lahore", lat: 31.5404, lng: 74.3487, type: 'area' as const },
    { name: "Anarkali", fullName: "Anarkali, Lahore", lat: 31.5604, lng: 74.3087, type: 'area' as const },
    { name: "Mall Road", fullName: "Mall Road, Lahore", lat: 31.5504, lng: 74.3387, type: 'area' as const },
    { name: "Liberty", fullName: "Liberty Market, Lahore", lat: 31.5104, lng: 74.3487, type: 'area' as const },
    { name: "MM Alam", fullName: "MM Alam Road, Lahore", lat: 31.5004, lng: 74.3287, type: 'area' as const },
    { name: "Cavalry Ground", fullName: "Cavalry Ground, Lahore", lat: 31.4904, lng: 74.3787, type: 'area' as const }
  ];

  private static readonly KARACHI_AREAS = [
    { name: "DHA", fullName: "DHA, Karachi", lat: 24.8607, lng: 67.0011, type: 'area' as const },
    { name: "Clifton", fullName: "Clifton, Karachi", lat: 24.8207, lng: 67.0211, type: 'area' as const },
    { name: "Gulshan-e-Iqbal", fullName: "Gulshan-e-Iqbal, Karachi", lat: 24.9207, lng: 67.0811, type: 'area' as const },
    { name: "North Nazimabad", fullName: "North Nazimabad, Karachi", lat: 24.9507, lng: 67.0411, type: 'area' as const },
    { name: "Saddar", fullName: "Saddar, Karachi", lat: 24.8607, lng: 67.0211, type: 'area' as const },
    { name: "Bahria Town", fullName: "Bahria Town, Karachi", lat: 24.9607, lng: 67.1411, type: 'area' as const },
    { name: "Malir", fullName: "Malir, Karachi", lat: 24.8807, lng: 67.1811, type: 'area' as const },
    { name: "Korangi", fullName: "Korangi, Karachi", lat: 24.8207, lng: 67.1211, type: 'area' as const },
    { name: "Landhi", fullName: "Landhi, Karachi", lat: 24.8407, lng: 67.2011, type: 'area' as const },
    { name: "Orangi", fullName: "Orangi, Karachi", lat: 24.9407, lng: 66.9811, type: 'area' as const },
    { name: "Baldia", fullName: "Baldia, Karachi", lat: 24.9207, lng: 66.9611, type: 'area' as const },
    { name: "Gulistan-e-Johar", fullName: "Gulistan-e-Johar, Karachi", lat: 24.9307, lng: 67.1211, type: 'area' as const },
    { name: "Scheme 33", fullName: "Scheme 33, Karachi", lat: 24.9507, lng: 67.1611, type: 'area' as const },
    { name: "PECHS", fullName: "PECHS, Karachi", lat: 24.8707, lng: 67.0611, type: 'area' as const },
    { name: "Tariq Road", fullName: "Tariq Road, Karachi", lat: 24.8807, lng: 67.0711, type: 'area' as const }
  ];

  /**
   * Search for locations based on query with real API integration
   */
  static async searchLocations(query: string, userLocation?: { lat: number; lng: number }): Promise<LocationSearchResult> {
    if (!query.trim()) {
      return { suggestions: [] };
    }

    const normalizedQuery = query.toLowerCase().trim();

    // Try real API first for dynamic suggestions
    try {
      const apiResult = await this.searchWithRealAPI(query, userLocation);
      if (apiResult.suggestions.length > 0) {
        return {
          ...apiResult,
          apiUsed: apiResult.apiUsed
        };
      }
    } catch (error) {
      console.warn('Real API search failed, falling back to local data:', error);
    }

    // Fallback to local data
    const suggestions: LocationSuggestion[] = [];

    // Search in cities
    const cityMatches = this.PAKISTAN_CITIES.filter(city =>
      city.name.toLowerCase().includes(normalizedQuery) ||
      city.fullName.toLowerCase().includes(normalizedQuery)
    );

    // Search in areas based on detected city
    let areaMatches: LocationSuggestion[] = [];

    if (normalizedQuery.includes('islamabad') || normalizedQuery.includes('rawalpindi')) {
      areaMatches = this.ISLAMABAD_AREAS.filter(area =>
        area.name.toLowerCase().includes(normalizedQuery) ||
        area.fullName.toLowerCase().includes(normalizedQuery)
      );
    } else if (normalizedQuery.includes('lahore')) {
      areaMatches = this.LAHORE_AREAS.filter(area =>
        area.name.toLowerCase().includes(normalizedQuery) ||
        area.fullName.toLowerCase().includes(normalizedQuery)
      );
    } else if (normalizedQuery.includes('karachi')) {
      areaMatches = this.KARACHI_AREAS.filter(area =>
        area.name.toLowerCase().includes(normalizedQuery) ||
        area.fullName.toLowerCase().includes(normalizedQuery)
      );
    } else {
      // If no specific city detected, include popular areas from all cities
      areaMatches = [
        ...this.ISLAMABAD_AREAS.slice(0, 5),
        ...this.LAHORE_AREAS.slice(0, 5),
        ...this.KARACHI_AREAS.slice(0, 5)
      ].filter(area =>
        area.name.toLowerCase().includes(normalizedQuery) ||
        area.fullName.toLowerCase().includes(normalizedQuery)
      );
    }

    // Add city matches first (higher priority)
    suggestions.push(...cityMatches.map(city => ({
      ...city,
      distance: userLocation ? this.calculateDistance(userLocation.lat, userLocation.lng, city.lat, city.lng) : undefined
    })));

    // Add area matches
    suggestions.push(...areaMatches.map(area => ({
      ...area,
      distance: userLocation ? this.calculateDistance(userLocation.lat, userLocation.lng, area.lat, area.lng) : undefined
    })));

    // Sort by relevance and distance
    suggestions.sort((a, b) => {
      // Prioritize exact matches
      const aExact = a.name.toLowerCase() === normalizedQuery || a.fullName.toLowerCase() === normalizedQuery;
      const bExact = b.name.toLowerCase() === normalizedQuery || b.fullName.toLowerCase() === normalizedQuery;

      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;

      // Then by distance if available
      if (a.distance !== undefined && b.distance !== undefined) {
        return a.distance - b.distance;
      }

      // Finally by name length (shorter, more specific names first)
      return a.name.length - b.name.length;
    });

    return {
      suggestions: suggestions.slice(0, 10), // Limit to 10 suggestions
      userLocation,
      fromCache: true,
      apiUsed: 'local'
    };
  }

  /**
   * Search using real APIs for dynamic suggestions
   */
  private static async searchWithRealAPI(query: string, userLocation?: { lat: number; lng: number }): Promise<LocationSearchResult> {
    const suggestions: LocationSuggestion[] = [];

    // Try Google Maps Geocoding API first (if API key available)
    if (this.hasGoogleApiKey()) {
      try {
        const googleResults = await this.searchGooglePlaces(query, userLocation);
        if (googleResults.length > 0) {
          suggestions.push(...googleResults);
          return {
            suggestions: suggestions.slice(0, 10),
            userLocation,
            apiUsed: 'google'
          };
        }
      } catch (error) {
        console.warn('Google Places API failed:', error);
      }
    }

    // Fallback to OpenStreetMap Nominatim API (free, no API key required)
    try {
      const nominatimResults = await this.searchNominatim(query, userLocation);
      if (nominatimResults.length > 0) {
        suggestions.push(...nominatimResults);
        return {
          suggestions: suggestions.slice(0, 10),
          userLocation,
          apiUsed: 'nominatim'
        };
      }
    } catch (error) {
      console.warn('Nominatim API failed:', error);
    }

    return { suggestions: [], userLocation };
  }

  /**
   * Check if Google API key is available
   */
  private static hasGoogleApiKey(): boolean {
    return !!process.env.REACT_APP_GOOGLE_MAPS_API_KEY ||
           !!process.env.VITE_GOOGLE_MAPS_API_KEY ||
           !!process.env.GOOGLE_MAPS_API_KEY;
  }

  /**
   * Search using Google Places API
   */
  private static async searchGooglePlaces(query: string, userLocation?: { lat: number; lng: number }): Promise<LocationSuggestion[]> {
    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY ||
                   process.env.VITE_GOOGLE_MAPS_API_KEY ||
                   process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) throw new Error('Google Maps API key not found');

    const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
    url.searchParams.set('input', query);
    url.searchParams.set('key', apiKey);
    url.searchParams.set('components', 'country:pk'); // Restrict to Pakistan
    url.searchParams.set('types', 'geocode');

    if (userLocation) {
      url.searchParams.set('location', `${userLocation.lat},${userLocation.lng}`);
      url.searchParams.set('radius', '50000'); // 50km radius
    }

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status !== 'OK') {
      throw new Error(`Google Places API error: ${data.status}`);
    }

    return data.predictions.map((prediction: any) => ({
      name: prediction.structured_formatting?.main_text || prediction.description.split(',')[0],
      fullName: prediction.description,
      lat: 0, // Will be filled by place details API if needed
      lng: 0,
      type: this.determineLocationType(prediction.description),
      distance: userLocation ? this.calculateDistance(userLocation.lat, userLocation.lng, 0, 0) : undefined
    }));
  }

  /**
   * Search using OpenStreetMap Nominatim API
   */
  private static async searchNominatim(query: string, userLocation?: { lat: number; lng: number }): Promise<LocationSuggestion[]> {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '10');
    url.searchParams.set('countrycodes', 'pk'); // Restrict to Pakistan
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('dedupe', '1');

    if (userLocation) {
      url.searchParams.set('viewbox', `${userLocation.lng - 0.1},${userLocation.lat + 0.1},${userLocation.lng + 0.1},${userLocation.lat - 0.1}`);
      url.searchParams.set('bounded', '1');
    }

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'TaskKarwalo/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const data = await response.json();

    return data.map((result: any) => ({
      name: result.address?.city || result.address?.town || result.address?.village || result.display_name.split(',')[0],
      fullName: result.display_name,
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      type: this.determineLocationType(result.display_name),
      distance: userLocation ? this.calculateDistance(userLocation.lat, userLocation.lng, parseFloat(result.lat), parseFloat(result.lon)) : undefined
    }));
  }

  /**
   * Determine location type based on name/description
   */
  private static determineLocationType(description: string): 'city' | 'area' | 'sector' | 'neighborhood' {
    const desc = description.toLowerCase();

    if (desc.includes('sector') || desc.includes('phase') || desc.includes('block')) {
      return 'sector';
    } else if (desc.includes('town') || desc.includes('colony') || desc.includes('scheme')) {
      return 'area';
    } else if (desc.includes('street') || desc.includes('road') || desc.includes('lane')) {
      return 'neighborhood';
    } else {
      return 'city';
    }
  }

  /**
   * Get popular locations for quick selection
   */
  static getPopularLocations(): LocationSuggestion[] {
    return [
      ...this.PAKISTAN_CITIES.slice(0, 8),
      ...this.ISLAMABAD_AREAS.slice(0, 4),
      ...this.LAHORE_AREAS.slice(0, 4),
      ...this.KARACHI_AREAS.slice(0, 4)
    ];
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  private static calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get location by name
   */
  static getLocationByName(name: string): LocationSuggestion | null {
    const normalizedName = name.toLowerCase().trim();

    // Search in all locations
    const allLocations = [
      ...this.PAKISTAN_CITIES,
      ...this.ISLAMABAD_AREAS,
      ...this.LAHORE_AREAS,
      ...this.KARACHI_AREAS
    ];

    return allLocations.find(location =>
      location.name.toLowerCase() === normalizedName ||
      location.fullName.toLowerCase() === normalizedName
    ) || null;
  }

  /**
   * Get locations within radius of a point
   */
  static getLocationsWithinRadius(centerLat: number, centerLng: number, radiusKm: number): LocationSuggestion[] {
    const allLocations = [
      ...this.PAKISTAN_CITIES,
      ...this.ISLAMABAD_AREAS,
      ...this.LAHORE_AREAS,
      ...this.KARACHI_AREAS
    ];

    return allLocations.filter(location => {
      const distance = this.calculateDistance(centerLat, centerLng, location.lat, location.lng);
      return distance <= radiusKm;
    }).map(location => ({
      ...location,
      distance: this.calculateDistance(centerLat, centerLng, location.lat, location.lng)
    })).sort((a, b) => (a.distance || 0) - (b.distance || 0));
  }
}

// Export singleton instance
export const locationService = new LocationService();