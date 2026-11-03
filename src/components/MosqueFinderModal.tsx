import React, { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { device } from '../platform/device'
import {
  X,
  MapPin,
  Navigation,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Building,
} from 'lucide-react'

interface Mosque {
  id: string | number
  name: string
  lat: number
  lng: number
  distanceKm: number
  address?: string
}

interface MosqueFinderModalProps {
  isOpen: boolean
  onClose: () => void
  latitude: number
  longitude: number
  cityName: string
}

function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export const MosqueFinderModal: React.FC<MosqueFinderModalProps> = ({
  isOpen,
  onClose,
  latitude,
  longitude,
  cityName,
}) => {
  const [mosques, setMosques] = useState<Mosque[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [searchRadiusKm, setSearchRadiusKm] = useState<number>(5)

  const fetchNearbyMosques = useCallback(async () => {
    if (!latitude || !longitude) return
    setLoading(true)
    setError(null)

    try {
      const radiusMeters = searchRadiusKm * 1000
      // OpenStreetMap Overpass QL query for Muslim places of worship
      const query = `[out:json][timeout:15];(node["amenity"="place_of_worship"]["religion"="muslim"](around:${radiusMeters},${latitude},${longitude});way["amenity"="place_of_worship"]["religion"="muslim"](around:${radiusMeters},${latitude},${longitude}););out center 25;`
      const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 12000)

      const res = await fetch(url, { signal: controller.signal })
      clearTimeout(timeoutId)

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`)
      }

      const data = await res.json()
      const elements = data?.elements || []

      const parsed: Mosque[] = elements.map((item: any) => {
        const itemLat = item.lat || item.center?.lat
        const itemLng = item.lon || item.center?.lon
        const dist = calculateHaversineDistanceKm(latitude, longitude, itemLat, itemLng)
        const name =
          item.tags?.name ||
          item.tags?.['name:en'] ||
          item.tags?.['name:ur'] ||
          'Masjid / Mosque'
        const address =
          item.tags?.['addr:street'] ||
          item.tags?.['addr:suburb'] ||
          item.tags?.['addr:city'] ||
          cityName

        return {
          id: item.id,
          name,
          lat: itemLat,
          lng: itemLng,
          distanceKm: dist,
          address,
        }
      })

      // Sort by proximity
      parsed.sort((a, b) => a.distanceKm - b.distanceKm)
      setMosques(parsed)
    } catch (err: any) {
      console.warn('[MosqueFinder] Could not fetch from Overpass API:', err)
      setError('Unable to load live mosque data. You can navigate directly using Google Maps.')
    } finally {
      setLoading(false)
    }
  }, [latitude, longitude, searchRadiusKm, cityName])

  useEffect(() => {
    if (isOpen) {
      fetchNearbyMosques()
    }
  }, [isOpen, fetchNearbyMosques])

  if (!isOpen) return null

  const handleOpenInMaps = (m: Mosque) => {
    const query = encodeURIComponent(`${m.name}, ${cityName}`)
    const url = `https://www.google.com/maps/dir/?api=1&destination=${m.lat},${m.lng}&destination_place_id=${query}`
    device.openExternalUrl(url)
  }

  const handleSearchGeneralMaps = () => {
    const url = `https://www.google.com/maps/search/mosques+near+me/@${latitude},${longitude},14z`
    device.openExternalUrl(url)
  }

  return createPortal(
    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in touch-manipulation">
      <div className="bg-[#FAF8F3] text-stone-900 w-full max-w-lg rounded-3xl shadow-2xl border border-stone-200 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header Bar */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#0C382B] via-[#092E23] to-[#0C382B] text-white flex items-center justify-between border-b border-emerald-950 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-950 p-2 flex items-center justify-center border border-[#E2B755]/30 shadow-xs flex-shrink-0">
              <Building className="w-5 h-5 text-[#E2B755]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-serif font-bold text-base sm:text-lg text-[#F6E6C2] leading-tight truncate">
                  Nearby Mosques
                </h2>
                <span className="hidden xs:inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E2B755]/20 text-[#E2B755] border border-[#E2B755]/30">
                  قریبی مساجد
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-emerald-200/80 flex items-center gap-1 mt-0.5 truncate">
                <MapPin className="w-3 h-3 text-[#E2B755] flex-shrink-0" />
                <span className="truncate">Near {cityName}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-full bg-emerald-900/80 hover:bg-emerald-900 text-white flex items-center justify-center transition cursor-pointer touch-target flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter & Action Bar */}
        <div className="px-4 sm:px-5 py-2.5 bg-stone-100 border-b border-stone-200 flex items-center justify-between gap-2 text-xs flex-shrink-0 flex-wrap">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="font-bold text-stone-600 text-[11px]">Radius:</span>
            {[2, 5, 10].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setSearchRadiusKm(r)}
                className={`px-2.5 py-1 rounded-full text-xs font-bold transition cursor-pointer touch-target ${
                  searchRadiusKm === r
                    ? 'bg-[#0C382B] text-white shadow-xs'
                    : 'bg-white text-stone-700 hover:bg-stone-200 border border-stone-200'
                }`}
              >
                {r} km
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={fetchNearbyMosques}
              disabled={loading}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white hover:bg-stone-200 text-[#0C382B] font-bold text-xs border border-stone-200 transition cursor-pointer shadow-xs disabled:opacity-50 touch-target"
              title="Refresh mosque list"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden xs:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 no-scrollbar">
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <RefreshCw className="w-8 h-8 text-[#0C382B] animate-spin mb-3" />
              <p className="text-sm font-semibold text-stone-700">Searching for nearby mosques...</p>
              <p className="text-xs text-stone-500 mt-1">Checking places of worship within {searchRadiusKm} km</p>
            </div>
          )}

          {!loading && error && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold">{error}</p>
                  <button
                    type="button"
                    onClick={handleSearchGeneralMaps}
                    className="mt-3 px-3.5 py-2 rounded-xl bg-[#0C382B] text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer touch-target"
                  >
                    <Navigation className="w-3.5 h-3.5 text-[#E2B755]" />
                    <span>Open Nearby Mosques in Google Maps</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {!loading && !error && mosques.length === 0 && (
            <div className="py-10 text-center">
              <Building className="w-12 h-12 text-stone-400 mx-auto mb-2 opacity-60" />
              <p className="font-bold text-stone-800 text-sm">No recorded mosques within {searchRadiusKm} km</p>
              <p className="text-xs text-stone-500 mt-1 max-w-xs mx-auto">
                Try expanding the search radius or open Google Maps directly to locate local Masjids.
              </p>
              <button
                type="button"
                onClick={handleSearchGeneralMaps}
                className="mt-4 px-4 py-2 rounded-xl bg-[#0C382B] text-white font-bold text-xs flex items-center gap-2 mx-auto shadow-md cursor-pointer touch-target"
              >
                <Navigation className="w-4 h-4 text-[#E2B755]" />
                <span>Search Google Maps</span>
              </button>
            </div>
          )}

          {!loading &&
            mosques.map((m) => (
              <div
                key={m.id}
                className="p-3 sm:p-3.5 bg-white rounded-2xl border border-stone-200/90 shadow-xs hover:border-emerald-700/40 transition flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 flex-shrink-0"></span>
                    <h3 className="font-bold text-xs sm:text-sm text-stone-900 truncate">{m.name}</h3>
                  </div>
                  <p className="text-[11px] sm:text-xs text-stone-500 truncate mt-0.5 pl-4">{m.address}</p>
                  <p className="text-[11px] font-bold text-[#0C382B] mt-1 pl-4 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#E2B755]" />
                    <span>
                      {m.distanceKm < 1
                        ? `${Math.round(m.distanceKm * 1000)} m away`
                        : `${m.distanceKm.toFixed(1)} km away`}
                    </span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenInMaps(m)}
                  className="px-3 py-2 rounded-xl bg-[#0C382B] hover:bg-emerald-950 active:scale-95 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer flex-shrink-0 touch-target"
                  title="Get directions to this mosque"
                >
                  <Navigation className="w-3.5 h-3.5 text-[#E2B755]" />
                  <span>Navigate</span>
                </button>
              </div>
            ))}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 bg-stone-100/90 border-t border-stone-200 flex items-center justify-between gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={handleSearchGeneralMaps}
            className="flex items-center gap-1.5 text-xs font-bold text-[#0C382B] hover:underline cursor-pointer touch-target"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Search in Google Maps</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white hover:bg-stone-200 text-stone-800 font-bold text-xs border border-stone-300 transition cursor-pointer touch-target"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
