'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MapPin, Navigation, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react'
import './InteractiveMap.css'

// Dynamic import for client-side only components
interface Location {
  id: string
  name: string
  address?: string
  latitude: number
  longitude: number
  position: number
}

interface InteractiveMapProps {
  locations: Location[]
  onLocationAdd?: (lat: number, lng: number) => void
  onLocationSelect?: (location: Location) => void
  selectedLocationId?: string
  className?: string
  height?: string
}

export default function InteractiveMap({
  locations,
  onLocationAdd,
  onLocationSelect,
  selectedLocationId,
  className = '',
  height = '400px'
}: InteractiveMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const [isMapLoaded, setIsMapLoaded] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)
  const [isAddingMode, setIsAddingMode] = useState(false)

  // Initialize map
  useEffect(() => {
    const initMap = async () => {
      if (!mapRef.current || mapInstanceRef.current) return

      try {
        // Dynamically import Leaflet
        const L = await import('leaflet')
        await import('leaflet/dist/leaflet.css')

        // Fix for default markers
        delete (L.Icon.Default.prototype as any)._getIconUrl
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        })

        // Initialize map
        const map = L.map(mapRef.current).setView([40.7128, -74.0060], 10)

        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(map)

        // Store map instance
        mapInstanceRef.current = map

        // Handle map click
        if (onLocationAdd) {
          map.on('click', (e: any) => {
            if (isAddingMode) {
              // Add adding-mode class for cursor styling
              map.getContainer().classList.add('adding-mode')
              
              // Add a temporary marker to show where they clicked
              const tempIcon = L.divIcon({
                className: 'temp-marker',
                html: `
                  <div class="relative">
                    <div class="w-8 h-8 bg-green-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center animate-pulse">
                      <span class="text-white text-xs font-bold">+</span>
                    </div>
                  </div>
                `,
                iconSize: [32, 32],
                iconAnchor: [16, 32]
              })
              
              const tempMarker = L.marker([e.latlng.lat, e.latlng.lng], { icon: tempIcon })
                .addTo(map)
              
              // Remove temp marker after 1 second
              setTimeout(() => {
                tempMarker.remove()
                // Remove adding-mode class
                map.getContainer().classList.remove('adding-mode')
              }, 1000)
              
              // Call the onLocationAdd callback
              onLocationAdd(e.latlng.lat, e.latlng.lng)
              setIsAddingMode(false)
            }
          })
        }

        setIsMapLoaded(true)
      } catch (error) {
        console.error('Error initializing map:', error)
        setMapError('Failed to load map. Please try again.')
      }
    }

    initMap()

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [onLocationAdd, isAddingMode])

  // Update markers when locations change
  useEffect(() => {
    if (!isMapLoaded || !mapInstanceRef.current) return

    const updateMarkers = async () => {
      const L = await import('leaflet')
      
      // Clear existing markers
      markersRef.current.forEach(marker => marker.remove())
      markersRef.current = []

      // Add new markers
      locations.forEach((location) => {
        const isSelected = location.id === selectedLocationId
        
        // Create custom icon
        const icon = L.divIcon({
          className: 'custom-marker',
          html: `
            <div class="relative">
              <div class="w-8 h-8 ${isSelected ? 'bg-blue-500' : 'bg-red-500'} rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                <span class="text-white text-xs font-bold">${location.position}</span>
              </div>
              ${isSelected ? '<div class="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-blue-500"></div>' : ''}
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -32]
        })

        const marker = L.marker([location.latitude, location.longitude], { icon })
          .addTo(mapInstanceRef.current)

        // Add popup
        const popupContent = `
          <div class="p-2">
            <h3 class="font-bold text-sm">${location.name}</h3>
            ${location.address ? `<p class="text-xs text-gray-600">${location.address}</p>` : ''}
            <p class="text-xs text-gray-500">Position: ${location.position}</p>
            <p class="text-xs text-gray-500">Coords: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}</p>
          </div>
        `
        
        marker.bindPopup(popupContent)

        // Handle marker click
        if (onLocationSelect) {
          marker.on('click', () => {
            onLocationSelect(location)
          })
        }

        markersRef.current.push(marker)
      })

      // Fit map to show all markers
      if (locations.length > 0 && markersRef.current.length > 0) {
        try {
          // Create a bounds object from all marker positions
          const bounds = L.latLngBounds(
            locations.map(loc => [loc.latitude, loc.longitude])
          )
          mapInstanceRef.current.fitBounds(bounds.pad(0.1))
        } catch (error) {
          console.error('Error fitting bounds:', error)
          // Fallback: center on first location
          if (locations.length > 0) {
            mapInstanceRef.current.setView([locations[0].latitude, locations[0].longitude], 12)
          }
        }
      }
    }

    updateMarkers()
  }, [locations, selectedLocationId, isMapLoaded, onLocationSelect])

  // Map controls
  const handleZoomIn = useCallback(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomIn()
    }
  }, [])

  const handleZoomOut = useCallback(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomOut()
    }
  }, [])

  const handleResetView = useCallback(() => {
    if (mapInstanceRef.current && locations.length > 0) {
      try {
        // Create a bounds object from all marker positions
        const bounds = L.latLngBounds(
          locations.map(loc => [loc.latitude, loc.longitude])
        )
        mapInstanceRef.current.fitBounds(bounds.pad(0.1))
      } catch (error) {
        console.error('Error fitting bounds:', error)
        // Fallback: center on first location
        if (locations.length > 0) {
          mapInstanceRef.current.setView([locations[0].latitude, locations[0].longitude], 12)
        }
      }
    } else if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([40.7128, -74.0060], 10)
    }
  }, [locations])

  const toggleAddMode = useCallback(() => {
    setIsAddingMode(!isAddingMode)
  }, [isAddingMode])

  if (mapError) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center">
            <MapPin className="h-12 w-12 mx-auto mb-2 text-red-500" />
            <p className="text-red-600">{mapError}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Interactive Map
          </CardTitle>
          <div className="flex items-center gap-2">
            {isAddingMode && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                Click on map to add location
              </Badge>
            )}
            {onLocationAdd && (
              <Button
                variant={isAddingMode ? "default" : "outline"}
                size="sm"
                onClick={toggleAddMode}
              >
                <Navigation className="h-4 w-4 mr-1" />
                {isAddingMode ? 'Cancel' : 'Add Location'}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative">
          {/* Map container */}
          <div
            ref={mapRef}
            style={{ height, width: '100%' }}
            className="bg-slate-200 dark:bg-slate-700 rounded-b-lg"
          >
            {!isMapLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-200 dark:bg-slate-700 rounded-b-lg">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                  <p className="text-slate-600 dark:text-slate-400">Loading map...</p>
                </div>
              </div>
            )}
          </div>

          {/* Map controls overlay */}
          {isMapLoaded && (
            <div className="absolute top-4 right-4 flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                className="bg-white/90 backdrop-blur-sm shadow-md"
                onClick={handleZoomIn}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-white/90 backdrop-blur-sm shadow-md"
                onClick={handleZoomOut}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-white/90 backdrop-blur-sm shadow-md"
                onClick={handleResetView}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Location count overlay */}
          {locations.length > 0 && (
            <div className="absolute bottom-4 left-4">
              <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm shadow-md">
                {locations.length} location{locations.length !== 1 ? 's' : ''}
              </Badge>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}