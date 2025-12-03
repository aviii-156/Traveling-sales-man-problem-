import { NextRequest, NextResponse } from 'next/server'
import { solveTSP, validateLocations, OptimizationOptions } from '@/lib/tsp-algorithms'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const { 
      locations, 
      algorithm = 'greedy', 
      optimizationType = 'distance',
      speed = 50,
      costPerKm = 30 // Default cost per km in Indian Rupees
    } = body

    // Validate input
    if (!locations || !Array.isArray(locations) || locations.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 locations are required' },
        { status: 400 }
      )
    }

    // Validate locations
    const validationErrors = validateLocations(locations)
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationErrors },
        { status: 400 }
      )
    }

    // Set up optimization options
    const options: OptimizationOptions = {
      optimizationType: optimizationType as any,
      speed,
      costPerKm
    }

    // Solve TSP
    const result = await solveTSP(algorithm, locations, options)

    return NextResponse.json({
      success: true,
      result: {
        ...result,
        route: result.route.map(loc => ({
          id: loc.id,
          name: loc.name,
          address: loc.address,
          latitude: loc.latitude,
          longitude: loc.longitude,
          position: loc.position
        }))
      }
    })

  } catch (error) {
    console.error('TSP optimization error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to optimize route',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'TSP Optimization API',
    endpoints: {
      'POST /api/optimize': {
        description: 'Solve TSP problem',
        parameters: {
          locations: 'Array of location objects',
          algorithm: 'Algorithm to use (greedy, brute-force, dynamic-programming)',
          optimizationType: 'distance, time, cost, or balanced',
          speed: 'Speed in km/h for time calculation',
          costPerKm: 'Cost per kilometer'
        }
      }
    }
  })
}