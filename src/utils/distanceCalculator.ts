/**
 * Calculate the distance between two points using the Haversine formula
 * Returns distance in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180; // φ, λ in radians
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Convert meters to kilometers with appropriate formatting
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  } else {
    return `${(meters / 1000).toFixed(1)}km`;
  }
}

export interface DistanceZone {
  name: string;
  maxDistance: number;
  color: string;
  priority: number;
}

export interface FilteredService {
  distance: number;
  distanceZone: string;
  travelTime?: number; // Estimated travel time in minutes
  priorityScore?: number; // Combined score for sorting
  [key: string]: any; // Allow other properties from the original service
}

/**
 * Define distance zones for better categorization
 */
export const DISTANCE_ZONES: DistanceZone[] = [
  { name: 'Very Close', maxDistance: 2000, color: '#10b981', priority: 10 }, // 2km - Green
  { name: 'Close', maxDistance: 5000, color: '#f59e0b', priority: 7 }, // 5km - Amber
  { name: 'Moderate', maxDistance: 10000, color: '#3b82f6', priority: 5 }, // 10km - Blue
  { name: 'Far', maxDistance: 20000, color: '#8b5cf6', priority: 2 }, // 20km - Purple
];

/**
 * Filter services within a given radius with enhanced features
 */
export function filterServicesByDistance(
  services: any[],
  userLat: number,
  userLng: number,
  maxDistance: number = 10000, // 10km default
  options?: {
    includeTravelTime?: boolean;
    prioritizeProBadge?: boolean;
    sortBy?: 'distance' | 'priority' | 'rating' | 'combined';
  }
): FilteredService[] {
  const {
    includeTravelTime = false,
    prioritizeProBadge = true,
    sortBy = 'combined'
  } = options || {};

  return services.filter(service => {
    const providerLat = service.provider_profiles?.latitude;
    const providerLng = service.provider_profiles?.longitude;

    // Skip services without location data
    if (!providerLat || !providerLng) {
      return false;
    }

    const distance = calculateDistance(userLat, userLng, providerLat, providerLng);
    return distance <= maxDistance;
  }).map(service => {
    const distance = calculateDistance(
      userLat,
      userLng,
      service.provider_profiles.latitude,
      service.provider_profiles.longitude
    );

    // Determine distance zone
    const distanceZone = DISTANCE_ZONES.find(zone => distance <= zone.maxDistance)?.name || 'Very Far';

    // Calculate travel time (estimated)
    let travelTime: number | undefined;
    if (includeTravelTime) {
      // Rough estimate: 30km/h average speed in city
      travelTime = Math.round((distance / 1000) / 30 * 60); // in minutes
    }

    // Calculate priority score
    let priorityScore = 0;

    // Base priority from distance zone
    const zone = DISTANCE_ZONES.find(z => z.name === distanceZone);
    if (zone) {
      priorityScore += zone.priority;
    }

    // Pro Badge priority bonus
    if (prioritizeProBadge && service.provider_profiles?.verified_pro) {
      priorityScore += 20;
    }

    // Rating bonus
    if (service.provider_profiles?.rating) {
      priorityScore += service.provider_profiles.rating * 2;
    }

    // Experience bonus
    if (service.provider_profiles?.total_jobs) {
      priorityScore += Math.min(service.provider_profiles.total_jobs / 10, 10);
    }

    return {
      ...service,
      distance,
      distanceZone,
      travelTime,
      priorityScore
    };
  }).sort((a, b) => {
    switch (sortBy) {
      case 'distance':
        return a.distance - b.distance;
      case 'priority':
        return b.priorityScore - a.priorityScore;
      case 'rating':
        return (b.provider_profiles?.rating || 0) - (a.provider_profiles?.rating || 0);
      case 'combined':
      default:
        // Combined sorting: priority score first, then distance
        if (Math.abs(a.priorityScore - b.priorityScore) > 5) {
          return b.priorityScore - a.priorityScore;
        }
        return a.distance - b.distance;
    }
  });
}

/**
 * Get services within specific distance zones
 */
export function getServicesByZones(
  services: any[],
  userLat: number,
  userLng: number,
  zones?: string[]
): Record<string, FilteredService[]> {
  const allZones = zones || DISTANCE_ZONES.map(z => z.name);
  const result: Record<string, FilteredService[]> = {};

  allZones.forEach(zoneName => {
    const zone = DISTANCE_ZONES.find(z => z.name === zoneName);
    if (zone) {
      result[zoneName] = filterServicesByDistance(
        services,
        userLat,
        userLng,
        zone.maxDistance
      ).filter(service => service.distanceZone === zoneName);
    }
  });

  return result;
}

/**
 * Calculate optimal service area coverage
 */
export function calculateOptimalCoverage(
  services: any[],
  userLat: number,
  userLng: number,
  targetServices: number = 10
): {
  recommendedRadius: number;
  servicesInRadius: number;
  coveragePercentage: number;
} {
  const maxDistance = 20000; // 20km max
  const step = 1000; // 1km steps

  for (let radius = 1000; radius <= maxDistance; radius += step) {
    const servicesInRadius = filterServicesByDistance(services, userLat, userLng, radius).length;

    if (servicesInRadius >= targetServices) {
      const totalServices = services.filter(s =>
        s.provider_profiles?.latitude && s.provider_profiles?.longitude
      ).length;

      return {
        recommendedRadius: radius,
        servicesInRadius,
        coveragePercentage: Math.round((servicesInRadius / totalServices) * 100)
      };
    }
  }

  // If we can't find enough services, return max radius
  const maxRadiusServices = filterServicesByDistance(services, userLat, userLng, maxDistance);
  const totalServices = services.filter(s =>
    s.provider_profiles?.latitude && s.provider_profiles?.longitude
  ).length;

  return {
    recommendedRadius: maxDistance,
    servicesInRadius: maxRadiusServices.length,
    coveragePercentage: Math.round((maxRadiusServices.length / totalServices) * 100)
  };
}