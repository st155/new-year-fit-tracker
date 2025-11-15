// Whoop Sport ID to readable name mapping
// Based on Whoop API documentation
export const WHOOP_SPORT_NAMES: Record<number, string> = {
  0: 'Running',
  1: 'Cycling',
  16: 'Baseball',
  17: 'Basketball',
  18: 'Rowing',
  19: 'Fencing',
  20: 'Field Hockey',
  21: 'Football',
  22: 'Golf',
  24: 'Ice Hockey',
  25: 'Lacrosse',
  27: 'Rugby',
  28: 'Sailing',
  29: 'Skiing',
  30: 'Soccer',
  31: 'Softball',
  32: 'Squash',
  33: 'Swimming',
  34: 'Tennis',
  35: 'Track & Field',
  36: 'Volleyball',
  37: 'Water Polo',
  38: 'Wrestling',
  39: 'Boxing',
  42: 'Dance',
  43: 'Pilates',
  44: 'Yoga',
  45: 'Weightlifting',
  47: 'Cross Country Skiing',
  48: 'Functional Fitness',
  49: 'Duathlon',
  51: 'Gymnastics',
  52: 'Hiking',
  53: 'Horseback Riding',
  55: 'Kayaking',
  56: 'Martial Arts',
  57: 'Mountain Biking',
  59: 'Powerlifting',
  60: 'Rock Climbing',
  61: 'Paddleboarding',
  62: 'Triathlon',
  63: 'Walking',
  64: 'Surfing',
  65: 'Elliptical',
  66: 'Stair Climbing',
  70: 'Meditation',
  71: 'Other',
  73: 'Diving',
  74: 'Operations - Tactical',
  75: 'Operations - Medical',
  76: 'Operations - Flying',
  77: 'Operations - Water',
  82: 'Ultimate',
  83: 'Climbing',
  84: 'Jump Rope',
  85: 'Australian Football',
  86: 'Skateboarding',
  87: 'Coaching',
  88: 'Ice Bath',
  89: 'Commuting',
  90: 'Gaming',
  91: 'Snowboarding',
  92: 'Motocross',
  93: 'Caddying',
  94: 'Obstacle Course Racing',
  95: 'Motor Racing',
  96: 'HIIT',
  97: 'Spin',
  98: 'Jiu Jitsu',
  99: 'Manual Labor',
  100: 'Cricket',
  101: 'Pickleball',
  102: 'Inline Skating',
  103: 'Box Fitness',
  104: 'Spikeball',
  105: 'Wheelchair Pushing',
  106: 'Padel',
  107: 'Barre',
  108: 'Stage Performance',
  109: 'High Stress Work',
  110: 'Parkour',
  111: 'Gaelic Football',
  112: 'Hurling',
  121: 'Circus Arts',
  125: 'Massage',
  230: 'Watching Sports',
  231: 'Assault Bike',
  232: 'Kickboxing',
  233: 'Stretching',
  234: 'Table Tennis',
  235: 'Badminton',
  236: 'Netball',
  237: 'Sauna',
  238: 'Disc Golf',
  239: 'Yard Work',
  240: 'Air Compression',
  241: 'Percussive Massage',
  242: 'Paintball',
  243: 'Ice Skating',
  244: 'Handball',
};

// Workout type to emoji mapping
export const WORKOUT_TYPE_ICONS: Record<string, string> = {
  // English names
  'Running': '🏃',
  'Cycling': '🚴',
  'Walking': '🚶',
  'Hiking/Rucking': '⛰️',
  'Swimming': '🏊',
  'Weightlifting': '🏋️',
  'Functional Fitness': '💪',
  'CrossFit': '💪',
  'Yoga': '🧘',
  'Pilates': '🤸',
  'Basketball': '🏀',
  'Football': '⚽',
  'Soccer': '⚽',
  'Tennis': '🎾',
  'Golf': '⛳',
  'Boxing': '🥊',
  'Martial Arts': '🥋',
  'Jiu Jitsu': '🥋',
  'Dance': '💃',
  'Rowing': '🚣',
  'Rock Climbing': '🧗',
  'Skiing': '⛷️',
  'Snowboarding': '🏂',
  'Surfing': '🏄',
  'Ice Hockey': '🏒',
  'Ice Skating': '⛸️',
  'Mountain Biking': '🚵',
  'HIIT': '⚡',
  'Spin': '🚴',
  'Elliptical': '🏃',
  'Stairmaster': '🪜',
  'Meditation': '🧘',
  'Stretching': '🤸',
  'Sauna': '🧖',
  'Ice Bath': '🧊',
  'Triathlon': '🏊',
  'Gymnastics': '🤸',
  'Volleyball': '🏐',
  'Baseball': '⚾',
  'Cricket': '🏏',
  'Rugby': '🏉',
  'Pickleball': '🎾',
  'Table Tennis': '🏓',
  'Badminton': '🏸',
  
  // Default
  'default': '💪',
  'workout': '💪',
  'Workout': '💪',
  'Activity': '🏃',
};

/**
 * Convert Whoop sport ID or text to readable name
 */
export function getWorkoutTypeName(type: string | number | undefined | null): string {
  if (type === undefined || type === null) {
    return 'Workout';
  }
  
  // If it's a string, try to parse it as a number first
  if (typeof type === 'string') {
    const parsed = parseInt(type, 10);
    if (!isNaN(parsed)) {
      return WHOOP_SPORT_NAMES[parsed] || `Activity ${parsed}`;
    }
    // If not a number, return as is (for text descriptions)
    return type;
  }
  
  // If it's a number, look it up directly
  if (typeof type === 'number') {
    return WHOOP_SPORT_NAMES[type] || `Activity ${type}`;
  }
  
  return 'Workout';
}

/**
 * Get emoji icon for workout type
 */
export function getWorkoutIcon(type: string | number | undefined | null): string {
  if (type === undefined || type === null) {
    return WORKOUT_TYPE_ICONS['default'];
  }
  
  // Parse string numbers first
  let processedType = type;
  if (typeof type === 'string') {
    const parsed = parseInt(type, 10);
    if (!isNaN(parsed)) {
      processedType = parsed;
    }
  }
  
  // Get the name and then find the icon
  const name = getWorkoutTypeName(processedType);
  return WORKOUT_TYPE_ICONS[name] || WORKOUT_TYPE_ICONS['default'];
}
