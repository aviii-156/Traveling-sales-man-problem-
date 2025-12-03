'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MapPin, Upload, Download, FileText, AlertCircle, CheckCircle, X } from 'lucide-react'
import { LocationInput, ParsedLocation, parseCSVLocations, parseJSONLocations, generateSampleCSV, generateSampleJSON, validateLocation } from '@/lib/location-utils'

interface LocationInputComponentProps {
  onLocationsAdd: (locations: LocationInput[]) => void
  existingLocations: LocationInput[]
}

export default function LocationInputComponent({ onLocationsAdd, existingLocations }: LocationInputComponentProps) {
  const [manualLocation, setManualLocation] = useState<LocationInput>({
    name: '',
    address: '',
    latitude: 0,
    longitude: 0
  })
  const [parsedLocations, setParsedLocations] = useState<ParsedLocation[]>([])
  const [parsingErrors, setParsingErrors] = useState<string[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleManualAdd = useCallback(() => {
    const error = validateLocation(manualLocation)
    if (error) {
      setParsingErrors([error])
      return
    }
    
    onLocationsAdd([manualLocation])
    setManualLocation({
      name: '',
      address: '',
      latitude: 0,
      longitude: 0
    })
    setParsingErrors([])
  }, [manualLocation, onLocationsAdd])

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>, type: 'csv' | 'json') => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      try {
        let locations: ParsedLocation[]
        if (type === 'csv') {
          locations = parseCSVLocations(content)
        } else {
          locations = parseJSONLocations(content)
        }
        
        setParsedLocations(locations)
        setParsingErrors(locations.filter(loc => loc.error).map(loc => loc.error || 'Unknown error'))
      } catch (error) {
        setParsingErrors([error instanceof Error ? error.message : 'Failed to parse file'])
      }
    }
    reader.readAsText(file)
  }, [])

  const handleConfirmUpload = useCallback(() => {
    const validLocations = parsedLocations.filter(loc => !loc.error)
    if (validLocations.length > 0) {
      onLocationsAdd(validLocations)
      setParsedLocations([])
      setParsingErrors([])
      setIsDialogOpen(false)
    }
  }, [parsedLocations, onLocationsAdd])

  const downloadSample = useCallback((type: 'csv' | 'json') => {
    const content = type === 'csv' ? generateSampleCSV() : generateSampleJSON()
    const blob = new Blob([content], { type: type === 'csv' ? 'text/csv' : 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sample-locations.${type}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [])

  const removeLocation = useCallback((index: number) => {
    setParsedLocations(prev => prev.filter((_, i) => i !== index))
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Add Locations
        </CardTitle>
        <CardDescription>
          Enter locations manually, upload from file, or select from map
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Manual Entry */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Manual Entry</h3>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="location-name">Location Name *</Label>
              <Input
                id="location-name"
                placeholder="Enter location name"
                value={manualLocation.name}
                onChange={(e) => setManualLocation(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location-address">Address (Optional)</Label>
              <Textarea
                id="location-address"
                placeholder="Enter address"
                value={manualLocation.address}
                onChange={(e) => setManualLocation(prev => ({ ...prev, address: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude *</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="0.000001"
                  placeholder="40.7128"
                  value={manualLocation.latitude || ''}
                  onChange={(e) => setManualLocation(prev => ({ ...prev, latitude: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude *</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="0.000001"
                  placeholder="-74.0060"
                  value={manualLocation.longitude || ''}
                  onChange={(e) => setManualLocation(prev => ({ ...prev, longitude: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <Button onClick={handleManualAdd} className="w-full">
              Add Location
            </Button>
          </div>
        </div>

        {/* File Upload */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">File Upload</h3>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                <Upload className="h-4 w-4 mr-2" />
                Upload from File
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Upload Locations</DialogTitle>
                <DialogDescription>
                  Upload locations from CSV or JSON file. Download sample files to see the expected format.
                </DialogDescription>
              </DialogHeader>
              
              <Tabs defaultValue="csv" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="csv">CSV Format</TabsTrigger>
                  <TabsTrigger value="json">JSON Format</TabsTrigger>
                </TabsList>
                
                <TabsContent value="csv" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Upload CSV File</Label>
                    <Input
                      type="file"
                      accept=".csv"
                      onChange={(e) => handleFileUpload(e, 'csv')}
                      className="cursor-pointer"
                    />
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => downloadSample('csv')}
                    className="w-full"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Sample CSV
                  </Button>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    <p className="font-medium">Expected CSV format:</p>
                    <code className="block bg-slate-100 dark:bg-slate-800 p-2 rounded text-xs">
                      name,address,latitude,longitude<br/>
                      New York Office,"123 Broadway",40.7128,-74.0060
                    </code>
                  </div>
                </TabsContent>
                
                <TabsContent value="json" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Upload JSON File</Label>
                    <Input
                      type="file"
                      accept=".json"
                      onChange={(e) => handleFileUpload(e, 'json')}
                      className="cursor-pointer"
                    />
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => downloadSample('json')}
                    className="w-full"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Sample JSON
                  </Button>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    <p className="font-medium">Expected JSON format:</p>
                    <code className="block bg-slate-100 dark:bg-slate-800 p-2 rounded text-xs">
                      {`[{"name":"NY Office","address":"123 Broadway","latitude":40.7128,"longitude":-74.0060}]`}
                    </code>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Parsed Locations */}
              {parsedLocations.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium">Parsed Locations ({parsedLocations.length})</h4>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {parsedLocations.map((location, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{location.name}</span>
                            {location.error ? (
                              <AlertCircle className="h-4 w-4 text-red-500" />
                            ) : (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            )}
                          </div>
                          {location.address && (
                            <div className="text-sm text-slate-500">{location.address}</div>
                          )}
                          <div className="text-xs text-slate-400">
                            {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                          </div>
                          {location.error && (
                            <div className="text-xs text-red-500">{location.error}</div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLocation(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Errors */}
              {parsingErrors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      {parsingErrors.map((error, index) => (
                        <div key={index}>{error}</div>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleConfirmUpload}
                  disabled={parsedLocations.filter(loc => !loc.error).length === 0}
                >
                  Add {parsedLocations.filter(loc => !loc.error).length} Locations
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Map Selection */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Map Selection</h3>
          <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-8 text-center">
            <MapPin className="h-8 w-8 mx-auto mb-2 text-slate-400" />
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
              Click on the map to add locations
            </p>
            <Button variant="outline" size="sm" disabled>
              Open Map Selector
            </Button>
          </div>
        </div>

        {/* Existing Locations */}
        {existingLocations.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Existing Locations ({existingLocations.length})</h3>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {existingLocations.map((location, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded">
                  <div>
                    <div className="font-medium">{location.name}</div>
                    {location.address && (
                      <div className="text-sm text-slate-500">{location.address}</div>
                    )}
                    <div className="text-xs text-slate-400">
                      {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                    </div>
                  </div>
                  <Badge variant="outline">#{index + 1}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}