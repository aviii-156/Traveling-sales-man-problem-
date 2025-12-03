import Papa from 'papaparse'

export interface LocationInput {
  name: string
  address?: string
  latitude: number
  longitude: number
}

export interface ParsedLocation {
  name: string
  address?: string
  latitude: number
  longitude: number
  error?: string
}

export function validateLocation(location: Partial<LocationInput>): string | null {
  if (!location.name || location.name.trim() === '') {
    return 'Location name is required'
  }
  
  if (!location.latitude || location.latitude < -90 || location.latitude > 90) {
    return 'Valid latitude is required (-90 to 90)'
  }
  
  if (!location.longitude || location.longitude < -180 || location.longitude > 180) {
    return 'Valid longitude is required (-180 to 180)'
  }
  
  return null
}

export function parseCSVLocations(csvContent: string): ParsedLocation[] {
  const results: ParsedLocation[] = []
  
  try {
    const parsed = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.toLowerCase().trim()
    })
    
    if (parsed.errors.length > 0) {
      throw new Error(`CSV parsing error: ${parsed.errors[0].message}`)
    }
    
    const data = parsed.data as any[]
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      
      // Try different possible column names
      const name = row.name || row.location || row.title || row.label
      const address = row.address || row.street || row.details
      const latitude = parseFloat(row.latitude || row.lat || row.y)
      const longitude = parseFloat(row.longitude || row.lng || row.lon || row.x)
      
      const location: ParsedLocation = {
        name: name || `Location ${i + 1}`,
        address: address,
        latitude: latitude,
        longitude: longitude
      }
      
      const error = validateLocation(location)
      if (error) {
        location.error = error
      }
      
      results.push(location)
    }
  } catch (error) {
    throw new Error(`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
  
  return results
}

export function parseJSONLocations(jsonContent: string): ParsedLocation[] {
  const results: ParsedLocation[] = []
  
  try {
    const data = JSON.parse(jsonContent)
    
    // Handle array of locations
    const locations = Array.isArray(data) ? data : (data.locations || data.points || [])
    
    for (let i = 0; i < locations.length; i++) {
      const loc = locations[i]
      
      const location: ParsedLocation = {
        name: loc.name || loc.location || loc.title || loc.label || `Location ${i + 1}`,
        address: loc.address || loc.street || loc.details,
        latitude: parseFloat(loc.latitude || loc.lat || loc.y),
        longitude: parseFloat(loc.longitude || loc.lng || loc.lon || loc.x)
      }
      
      const error = validateLocation(location)
      if (error) {
        location.error = error
      }
      
      results.push(location)
    }
  } catch (error) {
    throw new Error(`Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
  
  return results
}

export function generateSampleCSV(): string {
  return `name,address,latitude,longitude
Mumbai Office,"123 Marine Lines, Mumbai",19.0760,72.8777
Pune Branch,"456 MG Road, Pune",18.5204,73.8567
Nashik Warehouse,"789 Nashik Road, Nashik",19.9975,73.7898
Aurangabad Store,"321 Station Road, Aurangabad",19.8762,75.3433
Solapur Shop,"654 Solapur Road, Solapur",17.6599,75.9064`
}

export function generateSampleJSON(): string {
  return JSON.stringify([
    {
      name: "New York Office",
      address: "123 Broadway, New York, NY",
      latitude: 40.7128,
      longitude: -74.0060
    },
    {
      name: "Brooklyn Branch", 
      address: "456 Atlantic Ave, Brooklyn, NY",
      latitude: 40.6782,
      longitude: -73.9442
    },
    {
      name: "Queens Warehouse",
      address: "789 Queens Blvd, Queens, NY", 
      latitude: 40.7282,
      longitude: -73.7949
    },
    {
      name: "Bronx Store",
      address: "321 Fordham Rd, Bronx, NY",
      latitude: 40.8615,
      longitude: -73.8895
    },
    {
      name: "Staten Island Shop",
      address: "654 Bay St, Staten Island, NY",
      latitude: 40.5795,
      longitude: -74.1502
    }
  ], null, 2)
}

export function calculateDistance(loc1: LocationInput, loc2: LocationInput): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = (loc2.latitude - loc1.latitude) * Math.PI / 180
  const dLon = (loc2.longitude - loc1.longitude) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(loc1.latitude * Math.PI / 180) * Math.cos(loc2.latitude * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

export function estimateTravelTime(distance: number, speed: number = 50): number {
  // Estimate travel time in minutes (default speed: 50 km/h)
  return (distance / speed) * 60
}

export function estimateCost(distance: number, costPerKm: number = 30): number {
  // Estimate cost (default: ₹30 per km - typical for India)
  return distance * costPerKm
}