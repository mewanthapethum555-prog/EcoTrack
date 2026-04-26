import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'

export interface Vehicle {
  id: string
  name: string
  position: {
    lat: number
    lng: number
  }
  status: 'active' | 'idle' | 'offline'
  driver: string
  lastUpdate: string
  route?: string
  speed?: number
  battery?: number
}

export interface VehicleTrackingService {
  vehicles: Vehicle[]
  subscribeToUpdates: (callback: (vehicles: Vehicle[]) => void) => () => void
  refreshLocations: () => void
  getVehicleById: (id: string) => Vehicle | undefined
}

class VehicleTrackingServiceImpl implements VehicleTrackingService {
  private _vehicles: Vehicle[] = []
  private subscribers: ((vehicles: Vehicle[]) => void)[] = []
  private unsubscribeFirestore: (() => void) | null = null

  constructor() {
    this.startRealTimeUpdates()
  }

  get vehicles(): Vehicle[] {
    return [...this._vehicles]
  }

  subscribeToUpdates(callback: (vehicles: Vehicle[]) => void): () => void {
    this.subscribers.push(callback)
    callback(this.vehicles)
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback)
    }
  }

  refreshLocations(): void {
    // If we're using real-time Firestore sockets, refresh is implicit!
    this.notifySubscribers()
  }

  getVehicleById(id: string): Vehicle | undefined {
    return this._vehicles.find(vehicle => vehicle.id === id)
  }

  private startRealTimeUpdates(): void {
    try {
      const driversRef = collection(db, 'driver')
      
      this.unsubscribeFirestore = onSnapshot(driversRef, (snapshot) => {
        const liveVehicles: Vehicle[] = []
        
        snapshot.forEach((doc) => {
          const data = doc.data()
          // Filter to actual drivers with names
          if (!data.fullName && !data.name) return
          
          const lat = Number(data.lastLatitude) || 5.9549
          const lng = Number(data.lastLongitude) || 80.5550
          const updatedMs = this.getLastUpdatedMs(data)
          
          let status: 'active' | 'idle' | 'offline' = 'idle'
          const minsSince = (Date.now() - updatedMs) / 60000
          
          if (minsSince < 10) status = 'active'
          else if (minsSince < 60) status = 'idle'
          else status = 'offline'
          
          let lastUpdateText = "Just now"
          if (minsSince >= 2) lastUpdateText = `${Math.floor(minsSince)} min ago`
          if (minsSince >= 60) lastUpdateText = `${Math.floor(minsSince / 60)} hrs ago`
          if (minsSince >= 1440) lastUpdateText = `${Math.floor(minsSince / 1440)} days ago`

          liveVehicles.push({
            id: doc.id,
            name: data.truck || `Truck ${doc.id.substring(0,4)}`,
            driver: data.fullName || 'Unknown Driver',
            position: { lat, lng },
            status,
            lastUpdate: lastUpdateText,
            route: 'Assigned Routes',
            speed: status === 'active' ? 20 : 0,
            battery: 100
          })
        })
        
        this._vehicles = liveVehicles
        this.notifySubscribers()
      }, (error) => {
        console.error('Vehicle tracking firestore error:', error)
      })
    } catch (e) {
      console.error("Critical error subscribing to tracking", e)
    }
  }

  private getLastUpdatedMs(data: Record<string, any>): number {
    const candidates = [
      data.lastLocationUpdatedMillis,
      data.lastGpsUpdatedMillis,
      data.lastUpdatedMillis,
      data.locationUpdatedAt,
      data.lastLocationUpdatedAt,
      data.updatedAt,
      data.timestamp
    ]

    for (const value of candidates) {
      const parsed = this.parseTimestampToMs(value)
      if (parsed) return parsed
    }

    return Date.now()
  }

  private parseTimestampToMs(value: any): number | null {
    if (value === null || value === undefined) return null

    if (typeof value === 'number' && Number.isFinite(value)) {
      // Handle seconds-based unix timestamps.
      return value < 1_000_000_000_000 ? value * 1000 : value
    }

    if (value instanceof Date) {
      return value.getTime()
    }

    if (typeof value === 'string') {
      const fromString = Date.parse(value)
      if (!Number.isNaN(fromString)) return fromString
      return null
    }

    // Firestore Timestamp support: { seconds, nanoseconds } or toMillis()
    if (typeof value === 'object') {
      if (typeof value.toMillis === 'function') {
        return value.toMillis()
      }

      if (typeof value.seconds === 'number') {
        return value.seconds * 1000
      }
    }

    return null
  }

  private notifySubscribers(): void {
    const currentVehicles = this.vehicles
    this.subscribers.forEach(callback => {
      try {
        callback(currentVehicles)
      } catch (error) {
        console.error('Error in vehicle tracking subscriber:', error)
      }
    })
  }

  destroy(): void {
    if (this.unsubscribeFirestore) {
      this.unsubscribeFirestore()
      this.unsubscribeFirestore = null
    }
    this.subscribers.length = 0
  }
}

export const vehicleTrackingService = new VehicleTrackingServiceImpl()

// Matara area boundaries for validation
export const MATARA_BOUNDS = {
  north: 6.0200,
  south: 5.9000,
  east: 80.6500,
  west: 80.4500
}

export const isWithinMataraBounds = (lat: number, lng: number): boolean => {
  return (
    lat >= MATARA_BOUNDS.south &&
    lat <= MATARA_BOUNDS.north &&
    lng >= MATARA_BOUNDS.west &&
    lng <= MATARA_BOUNDS.east
  )
}

export const formatSpeed = (speed: number): string => {
  return `${speed} km/h`
}

export const formatBattery = (battery: number): string => {
  return `${Math.round(battery)}%`
}