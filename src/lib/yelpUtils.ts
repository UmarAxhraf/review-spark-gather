/**
 * Utility functions for Yelp integration - Global Edition
 * Designed to work with businesses worldwide
 */

/**
 * Extracts business slug from Yelp URL
 * @param url - Yelp business URL (e.g., https://www.yelp.com/biz/pizza-hut-los-angeles-2)
 * @returns Business slug (e.g., "pizza-hut-los-angeles-2")
 */
export function extractBusinessSlug(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const bizIndex = pathParts.indexOf('biz');
    
    if (bizIndex === -1 || bizIndex + 1 >= pathParts.length) {
      throw new Error('Invalid Yelp business URL format');
    }
    
    return pathParts[bizIndex + 1];
  } catch (error) {
    throw new Error('Invalid Yelp business URL format');
  }
}

/**
 * Checks if a word is likely a location indicator using global patterns
 * @param word - Word to check
 * @param position - Position in the slug parts array
 * @param totalParts - Total number of parts in the slug
 * @returns true if word is likely a location indicator
 */
function isLikelyLocationWord(word: string, position: number, totalParts: number): boolean {
  const lowerWord = word.toLowerCase();
  
  // Position-based heuristic: words in the latter half are more likely to be location
  const isInLocationPosition = position >= Math.floor(totalParts * 0.4);
  
  // Global location patterns
  const locationPatterns = [
    // Numbers (postal codes, area codes, branch numbers)
    /^\d+$/,
    
    // Directional indicators (universal)
    /^(north|south|east|west|n|s|e|w|northeast|northwest|southeast|southwest|ne|nw|se|sw)$/i,
    /^(norte|sur|este|oeste|nord|sud|est|ouest|norden|süden|osten|westen)$/i, // Spanish, French, German
    /^(北|南|東|西|东)$/i, // Chinese/Japanese
    
    // Common location terms (multilingual)
    /^(central|center|centre|centro|centrum|downtown|uptown|midtown|city|town|ville|ciudad|stadt)$/i,
    /^(district|distrito|arrondissement|bezirk|ward|zona|zone|area|área|région|region)$/i,
    /^(street|st|avenue|ave|road|rd|boulevard|blvd|plaza|square|sq)$/i,
    /^(rue|calle|straße|strasse|via|strada|rua)$/i, // Street in other languages
    
    // Geographic features
    /^(beach|playa|plage|strand|hill|colina|mont|mountain|montaña|berg|valley|valle|tal)$/i,
    /^(river|río|rivière|fluss|lake|lago|lac|see|bay|bahía|baie|bucht)$/i,
    
    // Administrative divisions
    /^(county|condado|comté|kreis|province|provincia|état|estado|state|prefecture)$/i,
    /^(municipality|municipio|commune|gemeinde|borough|distrito)$/i,
    
    // Common suffixes that indicate location
    /^.+(ville|town|city|burg|berg|heim|hausen|ingen|sted|by)$/i,
    
    // Airport codes and transportation hubs
    /^[a-z]{3}$/i, // 3-letter codes (often airports)
    /^(airport|aeropuerto|aéroport|flughafen|station|estación|gare|bahnhof)$/i
  ];
  
  // Check if word matches any location pattern
  const matchesPattern = locationPatterns.some(pattern => pattern.test(lowerWord));
  
  // Additional heuristics
  const isShortAbbreviation = lowerWord.length <= 3 && /^[a-z]+$/.test(lowerWord);
  const hasLocationSuffix = /^.+(ton|ford|field|wood|land|dale|shire|burg|ville|stad|hof)$/i.test(lowerWord);
  
  return isInLocationPosition && (matchesPattern || isShortAbbreviation || hasLocationSuffix);
}

/**
 * Parses business name from Yelp business slug using intelligent global location detection
 * @param slug - Business slug (e.g., "pizza-hut-los-angeles-2")
 * @returns Parsed business name (e.g., "pizza hut")
 */
export function parseBusinessNameFromSlug(slug: string): string {
  // Split by hyphens
  const parts = slug.split('-');
  
  if (parts.length <= 2) {
    // If only 1-2 parts, likely all business name
    return parts.join(' ').trim();
  }
  
  // Find where business name likely ends using intelligent detection
  let businessNameParts: string[] = [];
  let locationStartIndex = parts.length; // Default to end if no location found
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    
    // Check if this part is likely a location indicator
    if (isLikelyLocationWord(part, i, parts.length)) {
      // Look ahead to see if subsequent parts are also location-like
      let consecutiveLocationWords = 0;
      for (let j = i; j < parts.length; j++) {
        if (isLikelyLocationWord(parts[j], j, parts.length) || /^\d+$/.test(parts[j])) {
          consecutiveLocationWords++;
        } else {
          break;
        }
      }
      
      // If we have multiple consecutive location words, this is likely the start of location
      if (consecutiveLocationWords >= 1 && businessNameParts.length > 0) {
        locationStartIndex = i;
        break;
      }
    }
    
    businessNameParts.push(part);
  }
  
  // If we didn't find a clear location break, use heuristics
  if (locationStartIndex === parts.length) {
    // Take first 60% of parts as business name, but at least 1 and at most 4 parts
    const maxBusinessParts = Math.max(1, Math.min(4, Math.floor(parts.length * 0.6)));
    businessNameParts = parts.slice(0, maxBusinessParts);
  }
  
  // Clean up the business name
  let businessName = businessNameParts.join(' ').trim();
  
  // Remove common business suffixes that might be confused with location
  businessName = businessName.replace(/\b(inc|llc|ltd|corp|co|restaurant|cafe|bar|grill)$/i, '').trim();
  
  return businessName || parts[0]; // Fallback to first part if everything was filtered out
}

/**
 * Validates Yelp business URL format
 * @param url - URL to validate
 * @returns true if valid Yelp business URL
 */
export function isValidYelpBusinessUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.includes('yelp.com') && 
           urlObj.pathname.includes('/biz/');
  } catch {
    return false;
  }
}

/**
 * Calculates similarity between two business names for matching
 * Uses multiple algorithms for better accuracy
 * @param name1 - First business name
 * @param name2 - Second business name
 * @returns Similarity score between 0 and 1
 */
export function calculateBusinessNameSimilarity(name1: string, name2: string): number {
  const normalize = (str: string) => 
    str.toLowerCase()
       .replace(/[^a-z0-9\s]/g, '') // Remove special characters
       .replace(/\b(the|and|&|restaurant|cafe|bar|grill|inc|llc|ltd|corp|co)\b/g, '') // Remove common words
       .replace(/\s+/g, ' ')
       .trim();
  
  const n1 = normalize(name1);
  const n2 = normalize(name2);
  
  if (n1 === n2) return 1;
  if (!n1 || !n2) return 0;
  
  // Method 1: Word overlap (Jaccard similarity)
  const words1 = new Set(n1.split(' ').filter(w => w.length > 1));
  const words2 = new Set(n2.split(' ').filter(w => w.length > 1));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  const jaccardScore = union.size > 0 ? intersection.size / union.size : 0;
  
  // Method 2: Substring matching
  const longer = n1.length > n2.length ? n1 : n2;
  const shorter = n1.length > n2.length ? n2 : n1;
  
  let substringScore = 0;
  if (longer.includes(shorter)) {
    substringScore = shorter.length / longer.length;
  } else {
    // Check for partial matches
    const words = shorter.split(' ');
    let matchedLength = 0;
    words.forEach(word => {
      if (word.length > 2 && longer.includes(word)) {
        matchedLength += word.length;
      }
    });
    substringScore = matchedLength / shorter.length;
  }
  
  // Method 3: Edit distance (simplified)
  const editScore = 1 - (levenshteinDistance(n1, n2) / Math.max(n1.length, n2.length));
  
  // Weighted combination of all methods
  return (jaccardScore * 0.5) + (substringScore * 0.3) + (editScore * 0.2);
}

/**
 * Calculates Levenshtein distance between two strings
 * @param str1 - First string
 * @param str2 - Second string
 * @returns Edit distance
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Extracts potential location information from a business slug
 * @param slug - Business slug
 * @returns Likely location parts
 */
export function extractLocationFromSlug(slug: string): string[] {
  const parts = slug.split('-');
  const businessName = parseBusinessNameFromSlug(slug);
  const businessParts = businessName.split(' ').length;
  
  // Return parts that are likely location (after business name)
  return parts.slice(businessParts).filter(part => 
    part.length > 0 && !part.match(/^\d+$/)
  );
}

/**
 * Validates if a location string seems reasonable
 * @param location - Location string to validate
 * @returns true if location seems valid
 */
export function isValidLocation(location: string): boolean {
  if (!location || location.trim().length < 2) return false;
  
  const trimmed = location.trim();
  
  // Check for reasonable patterns
  const validPatterns = [
    /^[a-zA-Z\s,.-]+$/, // Letters, spaces, common punctuation
    /^\d{5}(-\d{4})?$/, // US ZIP codes
    /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/, // Canadian postal codes
    /^\d{4,6}$/ // International postal codes
  ];
  
  return validPatterns.some(pattern => pattern.test(trimmed)) && 
         trimmed.length <= 100; // Reasonable length limit
}