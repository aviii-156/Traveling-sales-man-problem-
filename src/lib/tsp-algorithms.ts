export interface Location {
  id: string
  name: string
  address?: string
  latitude: number
  longitude: number
  position: number
}

export interface TSPResult {
  route: Location[]
  totalDistance: number
  totalTime: number
  totalCost: number
  computationTime: number
  algorithm: string
  steps?: TSPStep[]
}

export interface TSPStep {
  step: number
  description: string
  currentRoute: Location[]
  currentDistance: number
  selectedEdge?: [Location, Location]
  candidateRoutes?: Location[][]
}

export interface OptimizationOptions {
  optimizationType: 'distance' | 'time' | 'cost' | 'balanced'
  speed?: number // km/h for time calculation
  costPerKm?: number // for cost calculation
  timeWeight?: number // for balanced optimization
  distanceWeight?: number // for balanced optimization
  costWeight?: number // for balanced optimization
}

// Calculate distance between two locations using Haversine formula
export function calculateDistance(loc1: Location, loc2: Location): number {
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

// Calculate travel time between two locations
export function calculateTime(loc1: Location, loc2: Location, speed: number = 50): number {
  const distance = calculateDistance(loc1, loc2)
  return (distance / speed) * 60 // Return time in minutes
}

// Calculate travel cost between two locations
export function calculateCost(loc1: Location, loc2: Location, costPerKm: number = 30): number {
  const distance = calculateDistance(loc1, loc2)
  return distance * costPerKm // Cost in Indian Rupees
}

// Calculate route metrics
export function calculateRouteMetrics(route: Location[], options: OptimizationOptions = {}) {
  const {
    speed = 50,
    costPerKm = 30 // Default cost per km in Indian Rupees
  } = options

  let totalDistance = 0
  let totalTime = 0
  let totalCost = 0

  for (let i = 0; i < route.length - 1; i++) {
    const from = route[i]
    const to = route[i + 1]
    
    totalDistance += calculateDistance(from, to)
    totalTime += calculateTime(from, to, speed)
    totalCost += calculateCost(from, to, costPerKm)
  }

  // Add return to starting point
  if (route.length > 1) {
    const first = route[0]
    const last = route[route.length - 1]
    totalDistance += calculateDistance(last, first)
    totalTime += calculateTime(last, first, speed)
    totalCost += calculateCost(last, first, costPerKm)
  }

  return { totalDistance, totalTime, totalCost }
}

// Calculate fitness score for balanced optimization
export function calculateFitness(route: Location[], options: OptimizationOptions = {}): number {
  const {
    optimizationType = 'distance',
    timeWeight = 0.3,
    distanceWeight = 0.5,
    costWeight = 0.2
  } = options

  const metrics = calculateRouteMetrics(route, options)

  switch (optimizationType) {
    case 'distance':
      return metrics.totalDistance
    case 'time':
      return metrics.totalTime
    case 'cost':
      return metrics.totalCost
    case 'balanced':
      // Normalize and combine metrics (lower is better)
      const normalizedDistance = metrics.totalDistance / 100 // Normalize to ~0-1 range
      const normalizedTime = metrics.totalTime / 120 // Normalize to ~0-1 range  
      const normalizedCost = metrics.totalCost / 300 // Normalize to ~0-1 range (assuming max ~300₹)
      
      return (
        normalizedDistance * distanceWeight +
        normalizedTime * timeWeight +
        normalizedCost * costWeight
      )
    default:
      return metrics.totalDistance
  }
}

// Brute Force Algorithm - tries all possible permutations
export async function bruteForceTSP(
  locations: Location[], 
  options: OptimizationOptions = {},
  onStep?: (step: TSPStep) => void
): Promise<TSPResult> {
  const startTime = performance.now()
  const steps: TSPStep[] = []
  
  if (locations.length < 2) {
    throw new Error('At least 2 locations required')
  }

  if (locations.length > 10) {
    throw new Error('Brute force is only suitable for up to 10 locations')
  }

  const startLocation = locations[0]
  const otherLocations = locations.slice(1)
  
  let bestRoute: Location[] = []
  let bestFitness = Infinity
  let bestMetrics = { totalDistance: 0, totalTime: 0, totalCost: 0 }

  // Generate all permutations of other locations
  function* generatePermutations(arr: Location[]): Generator<Location[]> {
    if (arr.length <= 1) {
      yield arr
      return
    }
    
    for (let i = 0; i < arr.length; i++) {
      const current = arr[i]
      const remaining = arr.slice(0, i).concat(arr.slice(i + 1))
      
      for (const permutation of generatePermutations(remaining)) {
        yield [current, ...permutation]
      }
    }
  }

  let stepCount = 0
  for (const permutation of generatePermutations(otherLocations)) {
    stepCount++
    const route = [startLocation, ...permutation]
    
    const fitness = calculateFitness(route, options)
    const metrics = calculateRouteMetrics(route, options)
    
    const step: TSPStep = {
      step: stepCount,
      description: `Evaluating route: ${route.map(l => l.name).join(' → ')}`,
      currentRoute: route,
      currentDistance: metrics.totalDistance
    }
    
    steps.push(step)
    if (onStep) onStep(step)

    if (fitness < bestFitness) {
      bestFitness = fitness
      bestRoute = route
      bestMetrics = metrics
    }
  }

  const endTime = performance.now()
  const computationTime = endTime - startTime

  return {
    route: bestRoute,
    totalDistance: bestMetrics.totalDistance,
    totalTime: bestMetrics.totalTime,
    totalCost: bestMetrics.totalCost,
    computationTime,
    algorithm: 'Brute Force',
    steps
  }
}

// Dynamic Programming Algorithm - Held-Karp algorithm
export async function dynamicProgrammingTSP(
  locations: Location[], 
  options: OptimizationOptions = {},
  onStep?: (step: TSPStep) => void
): Promise<TSPResult> {
  const startTime = performance.now()
  const steps: TSPStep[] = []
  
  if (locations.length < 2) {
    throw new Error('At least 2 locations required')
  }

  if (locations.length > 15) {
    throw new Error('Dynamic programming is only suitable for up to 15 locations')
  }

  const n = locations.length
  const startLocation = locations[0]

  // Create distance matrix
  const distMatrix: number[][] = []
  for (let i = 0; i < n; i++) {
    distMatrix[i] = []
    for (let j = 0; j < n; j++) {
      if (i === j) {
        distMatrix[i][j] = 0
      } else {
        distMatrix[i][j] = calculateDistance(locations[i], locations[j])
      }
    }
  }

  // DP table: dp[mask][i] = minimum cost to visit all cities in mask ending at city i
  const dp: number[][] = Array(1 << n).fill(null).map(() => Array(n).fill(Infinity))
  const parent: number[][] = Array(1 << n).fill(null).map(() => Array(n).fill(-1))

  // Base case: starting at location 0
  dp[1][0] = 0

  let stepCount = 0
  // Iterate over all subsets
  for (let mask = 1; mask < (1 << n); mask++) {
    if ((mask & 1) === 0) continue // Must include starting location
    
    stepCount++
    const step: TSPStep = {
      step: stepCount,
      description: `Processing subset with ${mask.toString(2).split('1').length - 1} locations`,
      currentRoute: [],
      currentDistance: 0
    }
    steps.push(step)
    if (onStep) onStep(step)

    for (let i = 1; i < n; i++) {
      if ((mask & (1 << i)) === 0) continue
      
      const prevMask = mask ^ (1 << i)
      
      for (let j = 0; j < n; j++) {
        if ((prevMask & (1 << j)) === 0) continue
        
        const newCost = dp[prevMask][j] + distMatrix[j][i]
        if (newCost < dp[mask][i]) {
          dp[mask][i] = newCost
          parent[mask][i] = j
        }
      }
    }
  }

  // Reconstruct the optimal route
  const finalMask = (1 << n) - 1
  let minCost = Infinity
  let lastCity = -1

  for (let i = 1; i < n; i++) {
    const cost = dp[finalMask][i] + distMatrix[i][0]
    if (cost < minCost) {
      minCost = cost
      lastCity = i
    }
  }

  // Backtrack to find the route
  const routeIndices: number[] = []
  let currentMask = finalMask
  let currentCity = lastCity

  while (currentCity !== -1) {
    routeIndices.push(currentCity)
    const nextMask = currentMask ^ (1 << currentCity)
    currentCity = parent[currentMask][currentCity]
    currentMask = nextMask
  }

  routeIndices.reverse()
  const optimalRoute = routeIndices.map(i => locations[i])

  const metrics = calculateRouteMetrics(optimalRoute, options)
  const endTime = performance.now()
  const computationTime = endTime - startTime

  return {
    route: optimalRoute,
    totalDistance: metrics.totalDistance,
    totalTime: metrics.totalTime,
    totalCost: metrics.totalCost,
    computationTime,
    algorithm: 'Dynamic Programming',
    steps
  }
}

// Greedy Algorithm - Nearest Neighbor
export async function greedyTSP(
  locations: Location[], 
  options: OptimizationOptions = {},
  onStep?: (step: TSPStep) => void
): Promise<TSPResult> {
  const startTime = performance.now()
  const steps: TSPStep[] = []
  
  if (locations.length < 2) {
    throw new Error('At least 2 locations required')
  }

  const n = locations.length
  const unvisited = new Set(locations.slice(1)) // All locations except the first
  const route: Location[] = [locations[0]]
  let currentLocation = locations[0]

  let stepCount = 0
  while (unvisited.size > 0) {
    stepCount++
    
    // Find nearest unvisited location
    let nearestLocation: Location | null = null
    let minDistance = Infinity
    
    for (const location of unvisited) {
      const distance = calculateDistance(currentLocation, location)
      if (distance < minDistance) {
        minDistance = distance
        nearestLocation = location
      }
    }

    if (nearestLocation) {
      route.push(nearestLocation)
      unvisited.delete(nearestLocation)
      currentLocation = nearestLocation

      const step: TSPStep = {
        step: stepCount,
        description: `Moving to nearest location: ${nearestLocation.name} (${minDistance.toFixed(1)} km)`,
        currentRoute: [...route],
        currentDistance: calculateRouteMetrics(route, options).totalDistance,
        selectedEdge: [route[route.length - 2], nearestLocation]
      }
      
      steps.push(step)
      if (onStep) onStep(step)
    }
  }

  // Return to starting location
  route.push(locations[0])
  
  const finalStep: TSPStep = {
    step: stepCount + 1,
    description: `Returning to starting location: ${locations[0].name}`,
    currentRoute: route,
    currentDistance: calculateRouteMetrics(route, options).totalDistance,
    selectedEdge: [route[route.length - 2], locations[0]]
  }
  
  steps.push(finalStep)
  if (onStep) onStep(finalStep)

  const metrics = calculateRouteMetrics(route, options)
  const endTime = performance.now()
  const computationTime = endTime - startTime

  return {
    route,
    totalDistance: metrics.totalDistance,
    totalTime: metrics.totalTime,
    totalCost: metrics.totalCost,
    computationTime,
    algorithm: 'Greedy (Nearest Neighbor)',
    steps
  }
}

// Genetic Algorithm
export interface GeneticAlgorithmOptions {
  populationSize: number
  generations: number
  mutationRate: number
  crossoverRate: number
  elitismCount: number
  tournamentSize: number
}

export async function geneticAlgorithmTSP(
  locations: Location[], 
  options: OptimizationOptions = {},
  gaOptions: Partial<GeneticAlgorithmOptions> = {},
  onStep?: (step: TSPStep) => void
): Promise<TSPResult> {
  const startTime = performance.now()
  const steps: TSPStep[] = []
  
  if (locations.length < 2) {
    throw new Error('At least 2 locations required')
  }

  const gaOpts: GeneticAlgorithmOptions = {
    populationSize: 50,
    generations: 100,
    mutationRate: 0.02,
    crossoverRate: 0.8,
    elitismCount: 2,
    tournamentSize: 5,
    ...gaOptions
  }

  // Initialize population
  let population = initializePopulation(locations, gaOpts.populationSize)
  let bestIndividual = population[0]
  let bestFitness = calculateFitness(bestIndividual, options)

  let stepCount = 0
  for (let generation = 0; generation < gaOpts.generations; generation++) {
    stepCount++
    
    // Evaluate fitness for all individuals
    const fitnessScores = population.map(individual => calculateFitness(individual, options))
    
    // Find best individual in current generation
    const currentBestIndex = fitnessScores.indexOf(Math.min(...fitnessScores))
    const currentBest = population[currentBestIndex]
    const currentBestFitness = fitnessScores[currentBestIndex]
    
    if (currentBestFitness < bestFitness) {
      bestFitness = currentBestFitness
      bestIndividual = currentBest
    }

    // Create new population
    const newPopulation: Location[][] = []
    
    // Elitism - keep best individuals
    const eliteIndices = fitnessScores
      .map((fitness, index) => ({ fitness, index }))
      .sort((a, b) => a.fitness - b.fitness)
      .slice(0, gaOpts.elitismCount)
      .map(item => item.index)
    
    eliteIndices.forEach(index => {
      newPopulation.push([...population[index]])
    })

    // Generate offspring
    while (newPopulation.length < gaOpts.populationSize) {
      const parent1 = tournamentSelection(population, fitnessScores, gaOpts.tournamentSize)
      const parent2 = tournamentSelection(population, fitnessScores, gaOpts.tournamentSize)
      
      let offspring: Location[]
      if (Math.random() < gaOpts.crossoverRate) {
        offspring = orderedCrossover(parent1, parent2)
      } else {
        offspring = Math.random() < 0.5 ? [...parent1] : [...parent2]
      }
      
      // Mutation
      if (Math.random() < gaOpts.mutationRate) {
        offspring = swapMutation(offspring)
      }
      
      newPopulation.push(offspring)
    }

    population = newPopulation

    // Log progress
    if (generation % 10 === 0 || generation === gaOpts.generations - 1) {
      const step: TSPStep = {
        step: stepCount,
        description: `Generation ${generation + 1}/${gaOpts.generations} - Best fitness: ${bestFitness.toFixed(2)}`,
        currentRoute: bestIndividual,
        currentDistance: calculateRouteMetrics(bestIndividual, options).totalDistance
      }
      steps.push(step)
      if (onStep) onStep(step)
    }
  }

  const metrics = calculateRouteMetrics(bestIndividual, options)
  const endTime = performance.now()
  const computationTime = endTime - startTime

  return {
    route: bestIndividual,
    totalDistance: metrics.totalDistance,
    totalTime: metrics.totalTime,
    totalCost: metrics.totalCost,
    computationTime,
    algorithm: 'Genetic Algorithm',
    steps
  }
}

// Ant Colony Optimization
export interface AntColonyOptions {
  numAnts: number
  numIterations: number
  evaporationRate: number
  alpha: number // Pheromone importance
  beta: number // Heuristic importance
  q: number // Pheromone deposit factor
}

export async function antColonyOptimizationTSP(
  locations: Location[], 
  options: OptimizationOptions = {},
  acoOptions: Partial<AntColonyOptions> = {},
  onStep?: (step: TSPStep) => void
): Promise<TSPResult> {
  const startTime = performance.now()
  const steps: TSPStep[] = []
  
  if (locations.length < 2) {
    throw new Error('At least 2 locations required')
  }

  const acoOpts: AntColonyOptions = {
    numAnts: 20,
    numIterations: 50,
    evaporationRate: 0.1,
    alpha: 1,
    beta: 2,
    q: 100,
    ...acoOptions
  }

  const n = locations.length
  const distanceMatrix = createDistanceMatrix(locations)
  
  // Initialize pheromone matrix
  const pheromoneMatrix = Array(n).fill(null).map(() => Array(n).fill(1.0))
  
  let bestRoute: Location[] = []
  let bestDistance = Infinity

  let stepCount = 0
  for (let iteration = 0; iteration < acoOpts.numIterations; iteration++) {
    stepCount++
    
    const antRoutes: Location[][] = []
    const antDistances: number[] = []

    // Each ant builds a solution
    for (let ant = 0; ant < acoOpts.numAnts; ant++) {
      const route = buildAntRoute(locations, pheromoneMatrix, distanceMatrix, acoOpts.alpha, acoOpts.beta)
      const distance = calculateRouteMetrics(route, options).totalDistance
      
      antRoutes.push(route)
      antDistances.push(distance)

      if (distance < bestDistance) {
        bestDistance = distance
        bestRoute = route
      }
    }

    // Update pheromones
    // Evaporation
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        pheromoneMatrix[i][j] *= (1 - acoOpts.evaporationRate)
      }
    }

    // Pheromone deposit
    for (let ant = 0; ant < acoOpts.numAnts; ant++) {
      const route = antRoutes[ant]
      const distance = antDistances[ant]
      const pheromoneDeposit = acoOpts.q / distance

      for (let i = 0; i < route.length - 1; i++) {
        const fromIndex = locations.indexOf(route[i])
        const toIndex = locations.indexOf(route[i + 1])
        pheromoneMatrix[fromIndex][toIndex] += pheromoneDeposit
        pheromoneMatrix[toIndex][fromIndex] += pheromoneDeposit
      }

      // Return to start
      const fromIndex = locations.indexOf(route[route.length - 1])
      const toIndex = locations.indexOf(route[0])
      pheromoneMatrix[fromIndex][toIndex] += pheromoneDeposit
      pheromoneMatrix[toIndex][fromIndex] += pheromoneDeposit
    }

    // Log progress
    if (iteration % 5 === 0 || iteration === acoOpts.numIterations - 1) {
      const step: TSPStep = {
        step: stepCount,
        description: `Iteration ${iteration + 1}/${acoOpts.numIterations} - Best distance: ${bestDistance.toFixed(2)} km`,
        currentRoute: bestRoute,
        currentDistance: bestDistance
      }
      steps.push(step)
      if (onStep) onStep(step)
    }
  }

  const metrics = calculateRouteMetrics(bestRoute, options)
  const endTime = performance.now()
  const computationTime = endTime - startTime

  return {
    route: bestRoute,
    totalDistance: metrics.totalDistance,
    totalTime: metrics.totalTime,
    totalCost: metrics.totalCost,
    computationTime,
    algorithm: 'Ant Colony Optimization',
    steps
  }
}

// Helper functions for Genetic Algorithm
function initializePopulation(locations: Location[], size: number): Location[][] {
  const population: Location[][] = []
  const otherLocations = locations.slice(1) // Exclude starting location
  
  for (let i = 0; i < size; i++) {
    const shuffled = [...otherLocations].sort(() => Math.random() - 0.5)
    population.push([locations[0], ...shuffled])
  }
  
  return population
}

function tournamentSelection(
  population: Location[][], 
  fitnessScores: number[], 
  tournamentSize: number
): Location[] {
  const tournament: number[] = []
  
  for (let i = 0; i < tournamentSize; i++) {
    const randomIndex = Math.floor(Math.random() * population.length)
    tournament.push(randomIndex)
  }
  
  // Find the best in tournament
  let bestIndex = tournament[0]
  let bestFitness = fitnessScores[bestIndex]
  
  for (let i = 1; i < tournament.length; i++) {
    const currentIndex = tournament[i]
    if (fitnessScores[currentIndex] < bestFitness) {
      bestFitness = fitnessScores[currentIndex]
      bestIndex = currentIndex
    }
  }
  
  return [...population[bestIndex]]
}

function orderedCrossover(parent1: Location[], parent2: Location[]): Location[] {
  const size = parent1.length
  if (size <= 2) return [...parent1]
  
  const start = Math.floor(Math.random() * (size - 1))
  const end = Math.floor(Math.random() * (size - start - 1)) + start + 1
  
  const child: Location[] = Array(size).fill(null)
  const used = new Set<Location>()
  
  // Copy segment from parent1
  for (let i = start; i < end; i++) {
    child[i] = parent1[i]
    used.add(parent1[i])
  }
  
  // Fill remaining positions from parent2
  let currentPos = 0
  for (let i = 0; i < size; i++) {
    if (child[i] === null) {
      while (used.has(parent2[currentPos])) {
        currentPos++
      }
      child[i] = parent2[currentPos]
      used.add(parent2[currentPos])
    }
  }
  
  return child
}

function swapMutation(route: Location[]): Location[] {
  const mutated = [...route]
  const size = mutated.length
  
  if (size <= 2) return mutated
  
  const i = Math.floor(Math.random() * (size - 1)) + 1 // Don't swap starting location
  const j = Math.floor(Math.random() * (size - 1)) + 1
  
  if (i !== j) {
    [mutated[i], mutated[j]] = [mutated[j], mutated[i]]
  }
  
  return mutated
}

// Helper functions for Ant Colony Optimization
function createDistanceMatrix(locations: Location[]): number[][] {
  const n = locations.length
  const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0))
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i !== j) {
        matrix[i][j] = calculateDistance(locations[i], locations[j])
      }
    }
  }
  
  return matrix
}

function buildAntRoute(
  locations: Location[], 
  pheromoneMatrix: number[][], 
  distanceMatrix: number[][], 
  alpha: number, 
  beta: number
): Location[] {
  const n = locations.length
  const route = [locations[0]] // Start with first location
  const unvisited = new Set(locations.slice(1))
  
  let currentLocation = locations[0]
  const currentIndex = 0
  
  while (unvisited.size > 0) {
    const probabilities: number[] = []
    const unvisitedArray = Array.from(unvisited)
    
    // Calculate probabilities for each unvisited location
    for (const nextLocation of unvisitedArray) {
      const nextIndex = locations.indexOf(nextLocation)
      const pheromone = pheromoneMatrix[currentIndex][nextIndex]
      const distance = distanceMatrix[currentIndex][nextIndex]
      const heuristic = 1 / (distance + 1e-10) // Avoid division by zero
      
      const probability = Math.pow(pheromone, alpha) * Math.pow(heuristic, beta)
      probabilities.push(probability)
    }
    
    // Select next location based on probabilities
    const totalProbability = probabilities.reduce((sum, prob) => sum + prob, 0)
    const normalizedProbabilities = probabilities.map(prob => prob / totalProbability)
    
    let random = Math.random()
    let selectedIndex = 0
    
    for (let i = 0; i < normalizedProbabilities.length; i++) {
      random -= normalizedProbabilities[i]
      if (random <= 0) {
        selectedIndex = i
        break
      }
    }
    
    const nextLocation = unvisitedArray[selectedIndex]
    route.push(nextLocation)
    unvisited.delete(nextLocation)
    currentLocation = nextLocation
  }
  
  return route
}

// Main algorithm dispatcher
export async function solveTSP(
  algorithm: string,
  locations: Location[], 
  options: OptimizationOptions = {},
  onStep?: (step: TSPStep) => void
): Promise<TSPResult> {
  switch (algorithm.toLowerCase()) {
    case 'brute-force':
    case 'brute_force':
      return bruteForceTSP(locations, options, onStep)
    case 'dynamic-programming':
    case 'dynamic_programming':
      return dynamicProgrammingTSP(locations, options, onStep)
    case 'greedy':
    case 'nearest-neighbor':
      return greedyTSP(locations, options, onStep)
    case 'genetic':
    case 'genetic-algorithm':
      return geneticAlgorithmTSP(locations, options, {}, onStep)
    case 'ant-colony':
    case 'ant-colony-optimization':
      return antColonyOptimizationTSP(locations, options, {}, onStep)
    default:
      throw new Error(`Unknown algorithm: ${algorithm}`)
  }
}

// Utility function to validate locations
export function validateLocations(locations: Location[]): string[] {
  const errors: string[] = []
  
  if (locations.length < 2) {
    errors.push('At least 2 locations are required')
  }
  
  locations.forEach((location, index) => {
    if (!location.name || location.name.trim() === '') {
      errors.push(`Location ${index + 1}: Name is required`)
    }
    
    if (location.latitude < -90 || location.latitude > 90) {
      errors.push(`Location ${index + 1}: Invalid latitude (${location.latitude})`)
    }
    
    if (location.longitude < -180 || location.longitude > 180) {
      errors.push(`Location ${index + 1}: Invalid longitude (${location.longitude})`)
    }
  })
  
  return errors
}