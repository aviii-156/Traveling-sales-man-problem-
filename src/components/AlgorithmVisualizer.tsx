'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Play, Pause, SkipBack, SkipForward, RotateCcw, Route, Clock, DollarSign } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { TSPStep, Location } from '@/lib/tsp-algorithms'

interface AlgorithmVisualizerProps {
  steps: TSPStep[]
  algorithm: string
  totalDistance: number
  totalTime: number
  totalCost: number
  computationTime: number
  locations: Location[]
}

export default function AlgorithmVisualizer({
  steps,
  algorithm,
  totalDistance,
  totalTime,
  totalCost,
  computationTime,
  locations
}: AlgorithmVisualizerProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1000) // milliseconds per step

  useEffect(() => {
    let interval: NodeJS.Timeout
    
    if (isPlaying && currentStep < steps.length - 1) {
      interval = setInterval(() => {
        setCurrentStep(prev => Math.min(prev + 1, steps.length - 1))
      }, playbackSpeed)
    } else if (currentStep >= steps.length - 1) {
      setIsPlaying(false)
    }

    return () => clearInterval(interval)
  }, [isPlaying, currentStep, steps.length, playbackSpeed])

  const handlePlay = () => {
    if (currentStep >= steps.length - 1) {
      setCurrentStep(0)
    }
    setIsPlaying(true)
  }

  const handlePause = () => {
    setIsPlaying(false)
  }

  const handleReset = () => {
    setIsPlaying(false)
    setCurrentStep(0)
  }

  const handleStepBack = () => {
    setIsPlaying(false)
    setCurrentStep(prev => Math.max(prev - 1, 0))
  }

  const handleStepForward = () => {
    setIsPlaying(false)
    setCurrentStep(prev => Math.min(prev + 1, steps.length - 1))
  }

  const currentStepData = steps[currentStep] || steps[0]

  if (steps.length === 0) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center">
            <Route className="h-12 w-12 mx-auto mb-2 text-slate-400" />
            <p className="text-slate-600 dark:text-slate-400">
              No algorithm steps available for visualization
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Route className="h-5 w-5" />
              Algorithm Visualization
            </CardTitle>
            <CardDescription>
              {algorithm} - Step-by-step optimization process
            </CardDescription>
          </div>
          <Badge variant="outline">
            {currentStep + 1} / {steps.length} steps
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Playback Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={currentStep === 0}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleStepBack}
              disabled={currentStep === 0}
            >
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button
              onClick={isPlaying ? handlePause : handlePlay}
              size="sm"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleStepForward}
              disabled={currentStep >= steps.length - 1}
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Speed:</span>
            <select
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
              className="text-sm border rounded px-2 py-1"
            >
              <option value={500}>Fast</option>
              <option value={1000}>Normal</option>
              <option value={2000}>Slow</option>
              <option value={3000}>Slower</option>
            </select>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{Math.round(((currentStep + 1) / steps.length) * 100)}%</span>
          </div>
          <Progress 
            value={((currentStep + 1) / steps.length) * 100} 
            className="h-2"
          />
        </div>

        <Tabs defaultValue="description" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="description">Description</TabsTrigger>
            <TabsTrigger value="route">Current Route</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
          </TabsList>
          
          <TabsContent value="description" className="space-y-4">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg"
            >
              <h4 className="font-medium mb-2">Step {currentStep + 1}</h4>
              <p className="text-slate-600 dark:text-slate-400">
                {currentStepData.description}
              </p>
              {currentStepData.selectedEdge && (
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    Selected Edge: {currentStepData.selectedEdge[0].name} → {currentStepData.selectedEdge[1].name}
                  </p>
                </div>
              )}
            </motion.div>
          </TabsContent>
          
          <TabsContent value="route" className="space-y-4">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <h4 className="font-medium mb-3">Current Route</h4>
                <div className="flex flex-wrap gap-2">
                  <AnimatePresence>
                    {currentStepData.currentRoute.map((location, index) => (
                      <motion.div
                        key={`${location.id}-${index}`}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{ duration: 0.2, delay: index * 0.1 }}
                      >
                        <Badge 
                          variant={index === 0 ? "default" : "secondary"}
                          className="flex items-center gap-1"
                        >
                          <span className="text-xs">{index + 1}</span>
                          {location.name}
                        </Badge>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
                
                {currentStepData.currentRoute.length > 1 && (
                  <div className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                    Route: {currentStepData.currentRoute.map(loc => loc.name).join(' → ')}
                  </div>
                )}
              </div>
            </motion.div>
          </TabsContent>
          
          <TabsContent value="metrics" className="space-y-4">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-3 gap-4"
            >
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                <Route className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                <div className="text-sm text-slate-600 dark:text-slate-400">Distance</div>
                <div className="font-bold text-blue-600">
                  {currentStepData.currentDistance.toFixed(1)} km
                </div>
              </div>
              
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                <Clock className="h-6 w-6 mx-auto mb-2 text-green-600" />
                <div className="text-sm text-slate-600 dark:text-slate-400">Time</div>
                <div className="font-bold text-green-600">
                  {(currentStepData.currentDistance / 50 * 60).toFixed(0)} min
                </div>
              </div>
              
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-center">
                <DollarSign className="h-6 w-6 mx-auto mb-2 text-yellow-600" />
                <div className="text-sm text-slate-600 dark:text-slate-400">Cost</div>
                <div className="font-bold text-yellow-600">
                  ₹{(currentStepData.currentDistance * 30).toFixed(2)}
                </div>
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>

        {/* Final Results */}
        {currentStep >= steps.length - 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg border border-green-200 dark:border-green-800"
          >
            <h4 className="font-bold text-green-800 dark:text-green-200 mb-3">
              🎉 Optimization Complete!
            </h4>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-slate-600 dark:text-slate-400">Algorithm</div>
                <div className="font-medium">{algorithm}</div>
              </div>
              <div>
                <div className="text-slate-600 dark:text-slate-400">Total Distance</div>
                <div className="font-medium">{totalDistance.toFixed(1)} km</div>
              </div>
              <div>
                <div className="text-slate-600 dark:text-slate-400">Total Time</div>
                <div className="font-medium">{totalTime.toFixed(0)} min</div>
              </div>
              <div>
                <div className="text-slate-600 dark:text-slate-400">Computation</div>
                <div className="font-medium">{computationTime.toFixed(0)}ms</div>
              </div>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  )
}