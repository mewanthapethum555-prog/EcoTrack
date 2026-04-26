import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { MapPin, Navigation, RefreshCw } from 'lucide-react'
import { vehicleTrackingService, Vehicle, formatSpeed, formatBattery } from '../../services/vehicleTracking'
import { MapContainer as MapContainerRaw, Marker as MarkerRaw, Popup as PopupRaw, TileLayer as TileLayerRaw, useMap as useMapRaw } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Cast leaflet components to any to bypass missing/broken type definitions in the local environment
const MapContainer = MapContainerRaw as any
const Marker = MarkerRaw as any
const Popup = PopupRaw as any
const TileLayer = TileLayerRaw as any
const useMap = useMapRaw as any

// Matara, Sri Lanka center coordinates
const MATARA_CENTER: [number, number] = [5.9549, 80.5550]

// Sri Lanka approximate bounds used to keep focus on island-wide operations
const SRI_LANKA_BOUNDS = {
  north: 9.85,
  south: 5.85,
  east: 81.95,
  west: 79.45
}

interface VehicleTrackingMapProps {
  className?: string
}

export function VehicleTrackingMap({ className }: VehicleTrackingMapProps) {
  const [vehicles, setVehicles] = React.useState<Vehicle[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [resetCounter, setResetCounter] = React.useState(0)

  React.useEffect(() => {
    const unsubscribe = vehicleTrackingService.subscribeToUpdates((updatedVehicles) => {
      setVehicles(updatedVehicles)
      setIsLoading(false)
    })

    return unsubscribe
  }, [])

  const getVehicleIcon = (status: Vehicle['status']) => {
    const colors: Record<Vehicle['status'], string> = {
      active: '#10B981',
      idle: '#F59E0B',
      offline: '#EF4444'
    }
    const color = colors[status]

    return L.divIcon({
      html: `<span style="display:block;width:14px;height:14px;background:${color};border:2px solid #fff;border-radius:9999px;box-shadow:0 0 0 1px rgba(0,0,0,0.25);"></span>`,
      className: '',
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    })
  }

  const refreshLocations = () => {
    vehicleTrackingService.refreshLocations()
  }

  const centerOnMatara = () => setResetCounter((v) => v + 1)

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((vehicle) => (
      vehicle.position.lat >= SRI_LANKA_BOUNDS.south &&
      vehicle.position.lat <= SRI_LANKA_BOUNDS.north &&
      vehicle.position.lng >= SRI_LANKA_BOUNDS.west &&
      vehicle.position.lng <= SRI_LANKA_BOUNDS.east
    ))
  }, [vehicles])

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Live Vehicle Tracking</CardTitle>
          <div className="flex items-center gap-2">
            <Badge className="bg-green-100 text-green-800 border-green-200">
              {vehicles.filter(v => v.status === 'active').length} vehicles online
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Map Controls */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshLocations}
              disabled={isLoading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Locations
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={centerOnMatara}
              disabled={isLoading}
            >
              <Navigation className="h-4 w-4 mr-2" />
              Center on Matara
            </Button>
          </div>

          {/* Map Container */}
          <div className="relative h-80 bg-gray-100 rounded-lg overflow-hidden">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <div className="text-center space-y-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-sm text-gray-600">Loading map...</p>
                </div>
              </div>
            )}
            <MapContainer
              center={MATARA_CENTER}
              zoom={12}
              className="w-full h-full"
              scrollWheelZoom
              attributionControl={false}
            >
              <TileLayer
                attribution=""
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapViewportController
                vehicles={filteredVehicles}
                resetCounter={resetCounter}
              />
              {filteredVehicles.map((vehicle) => (
                <Marker
                  key={vehicle.id}
                  position={[vehicle.position.lat, vehicle.position.lng] as [number, number]}
                  icon={getVehicleIcon(vehicle.status)}
                >
                  <Popup>
                    <div className="p-1 min-w-[200px]">
                      <h3 className="font-semibold text-sm mb-2">{vehicle.name}</h3>
                      <div className="space-y-1 text-xs text-gray-600">
                        <p><strong>Driver:</strong> {vehicle.driver}</p>
                        <p><strong>Status:</strong> <span className="capitalize">{vehicle.status}</span></p>
                        <p><strong>Route:</strong> {vehicle.route || 'N/A'}</p>
                        <p><strong>Speed:</strong> {vehicle.speed ? formatSpeed(vehicle.speed) : 'N/A'}</p>
                        <p><strong>Battery:</strong> {vehicle.battery ? formatBattery(vehicle.battery) : 'N/A'}</p>
                        <p><strong>Last update:</strong> {vehicle.lastUpdate}</p>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          {/* Vehicle Status Legend */}
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Active ({vehicles.filter(v => v.status === 'active').length})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span>Idle ({vehicles.filter(v => v.status === 'idle').length})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span>Offline ({vehicles.filter(v => v.status === 'offline').length})</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function MapViewportController({
  vehicles,
  resetCounter
}: {
  vehicles: Vehicle[]
  resetCounter: number
}) {
  const map = useMap()

  React.useEffect(() => {
    if (vehicles.length === 0) {
      map.setView(MATARA_CENTER, 12)
      return
    }

    const bounds = L.latLngBounds(
      vehicles.map((vehicle) => [vehicle.position.lat, vehicle.position.lng] as [number, number])
    )
    map.fitBounds(bounds, { padding: [40, 40] })
  }, [map, vehicles])

  React.useEffect(() => {
    map.setView(MATARA_CENTER, 12)
  }, [map, resetCounter])

  return null
}
