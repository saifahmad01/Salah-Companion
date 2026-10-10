export interface ResolvedLocation {
  name: string
  suburb?: string
  city: string
  state: string
  country: string
  fullAddress: string
  displayShort: string
  lat: number
  lng: number
}

/**
 * Reverse geocode latitude and longitude to a real human-readable address.
 * Uses OpenStreetMap Nominatim with Photon Komoot as a fast fallback.
 */
export async function reverseGeocodeCoordinates(
  lat: number,
  lng: number
): Promise<ResolvedLocation> {
  try {
    // 1. Try OpenStreetMap Nominatim
    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 4000)

    const response = await fetch(nominatimUrl, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    })
    clearTimeout(timeoutId)

    if (response.ok) {
      const data = await response.json()
      const addr = data.address || {}

      const suburb = addr.suburb || addr.neighbourhood || addr.residential || ''
      const city =
        addr.city ||
        addr.town ||
        addr.village ||
        addr.municipality ||
        addr.state_district ||
        addr.county ||
        'India'
      const state = addr.state || ''
      const country = addr.country || 'India'

      let displayShort = ''
      if (suburb && city && suburb.toLowerCase() !== city.toLowerCase()) {
        displayShort = `${suburb}, ${city}`
      } else if (city) {
        displayShort = state ? `${city}, ${state}` : `${city}, ${country}`
      } else {
        displayShort = `${state}, ${country}`
      }

      return {
        name: suburb || city,
        suburb,
        city,
        state,
        country,
        fullAddress: data.display_name || `${displayShort}, ${country}`,
        displayShort,
        lat,
        lng,
      }
    }
  } catch (err) {
    console.warn('Nominatim reverse geocode error or timeout, trying Photon fallback:', err)
  }

  // 2. Fallback: Photon Komoot reverse geocoding
  try {
    const photonUrl = `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`
    const res = await fetch(photonUrl)
    if (res.ok) {
      const data = await res.json()
      if (data.features && data.features.length > 0) {
        const prop = data.features[0].properties
        const name = prop.name || prop.city || prop.district || 'Current Location'
        const city = prop.city || prop.district || prop.county || name
        const state = prop.state || ''
        const country = prop.country || 'India'

        const displayShort =
          name !== city ? `${name}, ${city}` : state ? `${city}, ${state}` : `${city}, ${country}`

        return {
          name,
          city,
          state,
          country,
          fullAddress: `${displayShort}, ${country}`,
          displayShort,
          lat,
          lng,
        }
      }
    }
  } catch (err) {
    console.warn('Photon fallback also failed:', err)
  }

  // 3. Fallback based on nearest Indian city or coordinates
  return {
    name: 'Detected Location',
    city: 'India',
    state: '',
    country: 'India',
    fullAddress: `Coordinates: ${lat.toFixed(3)}, ${lng.toFixed(3)}, India`,
    displayShort: `${lat.toFixed(2)}°N, ${lng.toFixed(2)}°E`,
    lat,
    lng,
  }
}

/**
 * Live search for places/addresses across India using Photon geocoding API.
 */
export async function searchIndiaPlaces(query: string): Promise<ResolvedLocation[]> {
  if (!query || query.trim().length < 2) return []

  const q = query.trim().toLowerCase()
  const instantMatches: ResolvedLocation[] = []

  if ('kapali, jamshedpur, jharkhand'.includes(q) || 'jamshedpur'.includes(q) || q.includes('kapali') || q.includes('jamshed')) {
    instantMatches.push({
      name: 'Kapali, Jamshedpur',
      suburb: 'Kapali',
      city: 'Jamshedpur',
      state: 'Jharkhand',
      country: 'India',
      fullAddress: 'Kapali, Jamshedpur, Jharkhand, India',
      displayShort: 'Kapali, Jamshedpur',
      lat: 22.8050,
      lng: 86.2030,
    })
    instantMatches.push({
      name: 'Jamshedpur',
      suburb: 'Jamshedpur',
      city: 'Jamshedpur',
      state: 'Jharkhand',
      country: 'India',
      fullAddress: 'Jamshedpur, East Singhbhum, Jharkhand, India',
      displayShort: 'Jamshedpur, Jharkhand',
      lat: 22.8046,
      lng: 86.2029,
    })
  }

  try {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(
      query.trim()
    )}&limit=8`
    const res = await fetch(url)
    if (res.ok) {
      const data = await res.json()
      if (data.features) {
        const fetched = data.features.map((f: any) => {
          const prop = f.properties || {}
          const name = prop.name || prop.city || query
          const city = prop.city || prop.district || prop.county || name
          const state = prop.state || ''
          const country = prop.country || 'India'
          const [lng, lat] = f.geometry.coordinates

          const displayShort =
            name !== city ? `${name}, ${city}` : state ? `${city}, ${state}` : `${city}, ${country}`

          return {
            name,
            city,
            state,
            country,
            fullAddress: `${displayShort}, ${country}`,
            displayShort,
            lat,
            lng,
          }
        })

        // Merge without duplicates
        const combined = [...instantMatches]
        for (const item of fetched) {
          if (!combined.some((c) => Math.abs(c.lat - item.lat) < 0.01 && Math.abs(c.lng - item.lng) < 0.01)) {
            combined.push(item)
          }
        }
        return combined
      }
    }
  } catch (err) {
    console.warn('Search places failed:', err)
  }

  return instantMatches
}
