'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { MapPin, Upload, Play, Download, Settings, BarChart3, Route, Clock, DollarSign } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import LocationInputComponent from '@/components/LocationInput'
import InteractiveMap from '@/components/InteractiveMap'
import AlgorithmVisualizer from '@/components/AlgorithmVisualizer'
import { TSPStep, Location as TSPLocation } from '@/lib/tsp-algorithms'

interface Location {
  id: string
  name: string
  address?: string
  latitude: number
  longitude: number
  position: number
}

interface OptimizationResult {
  id: string
  algorithm: string
  totalDistance: number
  totalTime: number
  totalCost: number
  route: string[]
  computationTime: number
  steps?: TSPStep[]
}

export default function Home() {
  const [locations, setLocations] = useState<Location[]>([
    {
      id: '1',
      name: 'Mumbai Office',
      address: '123 Marine Lines, Mumbai',
      latitude: 19.0760,
      longitude: 72.8777,
      position: 1
    },
    {
      id: '2', 
      name: 'Pune Branch',
      address: '456 MG Road, Pune',
      latitude: 18.5204,
      longitude: 73.8567,
      position: 2
    },
    {
      id: '3',
      name: 'Nashik Warehouse', 
      address: '789 Nashik Road, Nashik',
      latitude: 19.9975,
      longitude: 73.7898,
      position: 3
    }
  ])
  const [optimizationResults, setOptimizationResults] = useState<OptimizationResult[]>([])
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<string>('greedy')
  const [optimizationType, setOptimizationType] = useState<string>('distance')
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false)
  const [optimizationProgress, setOptimizationProgress] = useState<number>(0)

  const algorithms = [
    { id: 'brute-force', name: 'Brute Force', description: 'Exhaustive search for optimal solution', maxLocations: 10 },
    { id: 'dynamic-programming', name: 'Dynamic Programming', description: 'Optimal solution with memoization', maxLocations: 15 },
    { id: 'greedy', name: 'Greedy', description: 'Fast approximation algorithm', maxLocations: 100 },
    { id: 'genetic', name: 'Genetic Algorithm', description: 'Evolutionary approach for large problems', maxLocations: 200 },
    { id: 'ant-colony', name: 'Ant Colony Optimization', description: 'Nature-inspired swarm intelligence', maxLocations: 150 }
  ]

  const optimizationTypes = [
    { id: 'distance', name: 'Shortest Route', icon: Route, color: 'bg-blue-500' },
    { id: 'time', name: 'Fastest Route', icon: Clock, color: 'bg-green-500' },
    { id: 'cost', name: 'Cheapest Route', icon: DollarSign, color: 'bg-yellow-500' },
    { id: 'balanced', name: 'Balanced Route', icon: BarChart3, color: 'bg-purple-500' }
  ]

  const handleLocationsAdd = (newLocations: any[]) => {
    const locationsWithIds = newLocations.map((loc, index) => ({
      id: Date.now().toString() + index,
      name: loc.name,
      address: loc.address,
      latitude: loc.latitude,
      longitude: loc.longitude,
      position: locations.length + index + 1
    }))
    setLocations([...locations, ...locationsWithIds])
  }

  const handleMapLocationAdd = (lat: number, lng: number) => {
    const newLocation = {
      id: Date.now().toString(),
      name: `Location ${locations.length + 1}`,
      address: '',
      latitude: lat,
      longitude: lng,
      position: locations.length + 1
    }
    setLocations([...locations, newLocation])
  }

  const handleLocationSelect = (location: Location) => {
    console.log('Selected location:', location)
  }

  const handleOptimize = async () => {
    if (locations.length < 2) {
      alert('Please add at least 2 locations')
      return
    }

    setIsOptimizing(true)
    setOptimizationProgress(0)

    try {
      const response = await fetch('/api/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          locations: locations,
          algorithm: selectedAlgorithm,
          optimizationType: optimizationType,
          speed: 50,
          costPerKm: 30 // Cost per km in Indian Rupees
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to optimize route')
      }

      const data = await response.json()
      
      // Convert the result to match our interface
      const result: OptimizationResult = {
        id: Date.now().toString(),
        algorithm: selectedAlgorithm,
        totalDistance: data.result.totalDistance,
        totalTime: data.result.totalTime,
        totalCost: data.result.totalCost,
        route: data.result.route.map((loc: any) => loc.id),
        computationTime: data.result.computationTime,
        steps: data.result.steps
      }

      setOptimizationResults([result, ...optimizationResults])
    } catch (error) {
      console.error('Optimization error:', error)
      alert(error instanceof Error ? error.message : 'Failed to optimize route')
    } finally {
      setIsOptimizing(false)
      setOptimizationProgress(0)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                Dynamic TSP Route Optimizer
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-400">
                Optimize your routes with advanced algorithms and real-time visualization
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Input */}
          <div className="lg:col-span-1 space-y-6">
            {/* Location Input Component */}
            <LocationInputComponent 
              onLocationsAdd={handleLocationsAdd}
              existingLocations={locations}
            />

            {/* Algorithm Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Optimization Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Algorithm</Label>
                  <Select value={selectedAlgorithm} onValueChange={setSelectedAlgorithm}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select algorithm" />
                    </SelectTrigger>
                    <SelectContent>
                      {algorithms.map((algo) => (
                        <SelectItem key={algo.id} value={algo.id}>
                          <div>
                            <div className="font-medium">{algo.name}</div>
                            <div className="text-xs text-slate-500">{algo.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Optimization Type</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {optimizationTypes.map((type) => {
                      const Icon = type.icon
                      return (
                        <Button
                          key={type.id}
                          variant={optimizationType === type.id ? "default" : "outline"}
                          size="sm"
                          onClick={() => setOptimizationType(type.id)}
                          className="h-auto p-3"
                        >
                          <div className="flex flex-col items-center gap-1">
                            <Icon className="h-4 w-4" />
                            <span className="text-xs">{type.name}</span>
                          </div>
                        </Button>
                      )
                    })}
                  </div>
                </div>
                
                <Button 
                  onClick={handleOptimize} 
                  className="w-full" 
                  disabled={isOptimizing || locations.length < 2}
                >
                  <Play className="h-4 w-4 mr-2" />
                  {isOptimizing ? 'Optimizing...' : 'Optimize Route'}
                </Button>
                
                {isOptimizing && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{Math.round(optimizationProgress)}%</span>
                    </div>
                    <Progress value={optimizationProgress} />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Map and Results */}
          <div className="lg:col-span-2 space-y-6">
            {/* Interactive Map */}
            <InteractiveMap
              locations={locations}
              onLocationAdd={handleMapLocationAdd}
              onLocationSelect={handleLocationSelect}
              height="384px"
            />

            {/* Results */}
            <Card>
              <CardHeader>
                <CardTitle>Optimization Results</CardTitle>
                <CardDescription>
                  Compare different algorithm performances
                </CardDescription>
              </CardHeader>
              <CardContent>
                {optimizationResults.length === 0 ? (
                  <div className="text-center py-8">
                    <BarChart3 className="h-12 w-12 mx-auto mb-2 text-slate-400" />
                    <p className="text-slate-600 dark:text-slate-400">
                      No optimization results yet. Add locations and run optimization to see results.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {optimizationResults.map((result) => (
                      <motion.div
                        key={result.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Card>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{result.algorithm}</Badge>
                                <span className="text-sm text-slate-500">
                                  {result.computationTime.toFixed(0)}ms
                                </span>
                              </div>
                              <Button variant="outline" size="sm">
                                View Details
                              </Button>
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                              <div>
                                <div className="text-slate-500">Distance</div>
                                <div className="font-medium">{result.totalDistance.toFixed(1)} km</div>
                              </div>
                              <div>
                                <div className="text-slate-500">Time</div>
                                <div className="font-medium">{result.totalTime.toFixed(0)} min</div>
                              </div>
                              <div>
                                <div className="text-slate-500">Cost</div>
                                <div className="font-medium">${result.totalCost.toFixed(2)}</div>
                              </div>
                            </div>
                            
                            {/* Algorithm Visualizer */}
                            {result.steps && result.steps.length > 0 && (
                              <AlgorithmVisualizer
                                steps={result.steps}
                                algorithm={result.algorithm}
                                totalDistance={result.totalDistance}
                                totalTime={result.totalTime}
                                totalCost={result.totalCost}
                                computationTime={result.computationTime}
                                locations={locations}
                              />
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Locations List */}
            <Card>
              <CardHeader>
                <CardTitle>Locations ({locations.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {locations.length === 0 ? (
                  <p className="text-slate-500 text-center py-4">No locations added yet</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {locations.map((location) => (
                      <div key={location.id} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded">
                        <div>
                          <div className="font-medium">{location.name}</div>
                          {location.address && (
                            <div className="text-sm text-slate-500">{location.address}</div>
                          )}
                        </div>
                        <Badge variant="outline">#{location.position}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}