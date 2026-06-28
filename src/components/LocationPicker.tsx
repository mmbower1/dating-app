import { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;

const DARK_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#1a1f2e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8892a4' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1f2e' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#2d3445' }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#9aa0b0' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#c8d0e0' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2d3748' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1a1f2e' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#8892a4' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3a4459' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d1117' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4a5568' }] },
];

const LIBRARIES: ('places' | 'geocoding')[] = ['places'];

interface Props {
  city: string;
  state: string;
  lat: number | null | undefined;
  lng: number | null | undefined;
  onChange: (city: string, state: string, lat: number, lng: number) => void;
}

const DEFAULT_CENTER = { lat: 37.7749, lng: -122.4194 }; // SF fallback

export default function LocationPicker({ city, state, lat, lng, onChange }: Props) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: API_KEY,
    libraries: LIBRARIES,
  });

  const savedCenter = lat && lng ? { lat, lng } : null;
  const [center, setCenter] = useState<google.maps.LatLngLiteral>(savedCenter ?? DEFAULT_CENTER);
  const [markerPos, setMarkerPos] = useState<google.maps.LatLngLiteral>(savedCenter ?? DEFAULT_CENTER);
  const [locating, setLocating] = useState(false);
  const geocoder = useRef<google.maps.Geocoder | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const reverseGeocode = useCallback((pos: google.maps.LatLngLiteral) => {
    if (!geocoder.current) return;
    geocoder.current.geocode({ location: pos }, (results, status) => {
      if (status !== 'OK' || !results?.[0]) return;
      let newCity = '';
      let newState = '';
      for (const comp of results[0].address_components) {
        if (comp.types.includes('locality')) newCity = comp.long_name;
        if (comp.types.includes('administrative_area_level_1')) newState = comp.short_name;
      }
      onChange(newCity, newState, pos.lat, pos.lng);
    });
  }, [onChange]);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    geocoder.current = new window.google.maps.Geocoder();

    if (!savedCenter) {
      setLocating(true);
      navigator.geolocation?.getCurrentPosition(
        (pos) => {
          const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCenter(newPos);
          setMarkerPos(newPos);
          map.setCenter(newPos);
          reverseGeocode(newPos);
          setLocating(false);
        },
        () => setLocating(false),
        { timeout: 8000 }
      );
    }
  }, [savedCenter, reverseGeocode]);

  const onDragEnd = useCallback((e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
    setMarkerPos(pos);
    reverseGeocode(pos);
  }, [reverseGeocode]);

  // Re-center map if saved coords change externally
  useEffect(() => {
    if (lat && lng && mapRef.current) {
      const pos = { lat, lng };
      setMarkerPos(pos);
      mapRef.current.setCenter(pos);
    }
  }, [lat, lng]);

  if (loadError) return <p className="location-picker-error">Failed to load Google Maps.</p>;
  if (!isLoaded) return <div className="location-picker-loading">Loading map…</div>;

  return (
    <div className="location-picker">
      {locating && <p className="location-picker-hint">Detecting your location…</p>}
      <GoogleMap
        mapContainerClassName="location-picker-map"
        center={center}
        zoom={12}
        onLoad={onMapLoad}
        options={{
          disableDefaultUI: true,
          zoomControl: true,
          styles: DARK_STYLES,
          gestureHandling: 'greedy',
        }}
      >
        <Marker
          position={markerPos}
          draggable
          onDragEnd={onDragEnd}
        />
      </GoogleMap>
      <p className="location-picker-hint">
        Drag the pin to your location — city &amp; state fill in automatically.
      </p>
      {(city || state) && (
        <p className="location-picker-result">
          {[city, state].filter(Boolean).join(', ')}
        </p>
      )}
    </div>
  );
}
