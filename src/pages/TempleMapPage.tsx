import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import L from 'leaflet';
import type * as Leaflet from 'leaflet';
import {
  Search, Loader2, MapPin, Navigation, Church, Hospital, Shield, Bus,
  Train, Hotel, Siren, Layers, Maximize2, Minimize2, Crosshair, X,
  Phone, Eye, Ticket, Filter, ChevronDown, AlertCircle,
  LocateFixed, Map as MapIcon, Check,
} from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import { supabase, type Temple, type District } from '@/lib/supabase';
import EmergencySection from '@/components/EmergencySection';

interface TempleWithDistrict extends Temple {
  district_name?: string;
  district_region?: string;
}

const TAMIL_NADU_CENTER: [number, number] = [11.0, 78.0];

const LAYER_CONFIG = [
  { key: 'temples', label: 'Temples', icon: Church, color: '#6B1F2B' },
  { key: 'hospitals', label: 'Hospitals', icon: Hospital, color: '#dc2626' },
  { key: 'police', label: 'Police Stations', icon: Shield, color: '#1d4ed8' },
  { key: 'bus', label: 'Bus Stands', icon: Bus, color: '#059669' },
  { key: 'railway', label: 'Railway Stations', icon: Train, color: '#7c3aed' },
  { key: 'hotels', label: 'Hotels', icon: Hotel, color: '#b45309' },
];

const TEMPLE_ICON = L.divIcon({
  className: 'custom-temple-marker',
  html: `<div style="background: #6B1F2B; width: 28px; height: 28px; border-radius: 50% 50% 50% 0; border: 2px solid #D4AF37; display: flex; align-items: center; justify-content: center; transform: rotate(-45deg); box-shadow: 0 2px 6px rgba(0,0,0,0.3);">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(45deg);">
      <path d="M10 2v7.31"/><path d="M14 9.3V1.99"/><path d="M8.5 2h7"/><path d="M14 9.3a6.5 6.5 0 1 1-4 0"/>
      <path d="M5.58 16.5h12.85"/><path d="M7 19h10"/><path d="M11 22h2"/>
    </svg>
  </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
});

export default function TempleMapPage() {
  const navigate = useNavigate();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Leaflet.Map | null>(null);
  const standardTilesRef = useRef<Leaflet.TileLayer | null>(null);
  const satelliteTilesRef = useRef<Leaflet.TileLayer | null>(null);
  const markersRef = useRef<Leaflet.Marker[]>([]);
  const userMarkerRef = useRef<Leaflet.Marker | null>(null);

  const [temples, setTemples] = useState<TempleWithDistrict[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<TempleWithDistrict[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedDistrict, setSelectedDistrict] = useState('all');
  const [selectedTemple, setSelectedTemple] = useState<TempleWithDistrict | null>(null);
  const [activeLayers, setActiveLayers] = useState<Record<string, boolean>>({
    temples: true, hospitals: false, police: false, bus: false, railway: false, hotels: false,
  });
  const [showLayers, setShowLayers] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showSatellite, setShowSatellite] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  // Initialize map immediately on mount — don't wait for data
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: TAMIL_NADU_CENTER,
      zoom: 7,
      zoomControl: true,
      attributionControl: true,
      minZoom: 6,
      maxZoom: 18,
    });

    const standardTiles = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }
    );
    standardTiles.addTo(map);
    standardTilesRef.current = standardTiles;

    const satelliteTiles = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 19,
      }
    );
    satelliteTilesRef.current = satelliteTiles;

    mapInstanceRef.current = map;

    // Fix tile rendering — invalidateSize after the container is laid out
    setTimeout(() => {
      map.invalidateSize();
      setMapReady(true);
    }, 100);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markersRef.current = [];
      userMarkerRef.current = null;
      setMapReady(false);
    };
  }, []);

  // Load data from Supabase
  useEffect(() => {
    Promise.all([
      supabase.from('temples').select('*, districts(name, region)').order('name'),
      supabase.from('districts').select('*').order('name'),
    ]).then(([tRes, dRes]) => {
      if (tRes.error) setError(tRes.error.message);
      else {
        setTemples(
          (tRes.data || []).map((t) => {
            const d = (t as Record<string, unknown>).districts as Record<string, unknown> | null;
            return {
              ...t,
              district_name: d?.name as string | undefined,
              district_region: d?.region as string | undefined,
            };
          }) as TempleWithDistrict[]
        );
      }
      if (dRes.data) setDistricts(dRes.data as District[]);
      setLoading(false);
    });
  }, []);

  const filteredTemples = useMemo(() => {
    if (selectedDistrict === 'all') return temples;
    return temples.filter((t) => t.district_id === selectedDistrict);
  }, [temples, selectedDistrict]);

  // Search results
  useEffect(() => {
    if (!search.trim()) {
      setSearchResults([]);
      return;
    }
    const q = search.toLowerCase();
    const results = temples.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.tamil_name?.includes(search.trim()) ?? false) ||
        (t.district_name?.toLowerCase().includes(q) ?? false) ||
        (t.location?.toLowerCase().includes(q) ?? false) ||
        (t.deity?.toLowerCase().includes(q) ?? false)
    );
    setSearchResults(results.slice(0, 8));
  }, [search, temples]);

  // Toggle satellite / standard tiles
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;
    const std = standardTilesRef.current;
    const sat = satelliteTilesRef.current;
    if (showSatellite) {
      if (std && map.hasLayer(std)) map.removeLayer(std);
      if (sat && !map.hasLayer(sat)) sat.addTo(map);
    } else {
      if (sat && map.hasLayer(sat)) map.removeLayer(sat);
      if (std && !map.hasLayer(std)) std.addTo(map);
    }
  }, [showSatellite, mapReady]);

  // Render / clear markers when data or layer changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current = [];

    if (!activeLayers.temples) return;

    const templesToShow = filteredTemples.filter(
      (t) => t.latitude != null && t.longitude != null
    );

    templesToShow.forEach((temple) => {
      const marker = L.marker([temple.latitude!, temple.longitude!], { icon: TEMPLE_ICON });
      marker.bindPopup(
        `<div style="font-family: Inter, sans-serif; min-width: 200px;">
          <strong style="color: #0a1535; font-size: 14px;">${temple.name}</strong><br/>
          <span style="color: #6B1F2B; font-size: 12px;">${temple.district_name || ''}</span><br/>
          <span style="color: #666; font-size: 11px;">${temple.location || ''}</span><br/>
          ${temple.verification_status === 'verified'
            ? '<span style="color: #059669; font-size: 10px; font-weight: 600;">&#10003; Verified</span>'
            : '<span style="color: #b45309; font-size: 10px;">Unverified location</span>'
          }
        </div>`
      );
      marker.on('click', () => setSelectedTemple(temple));
      marker.addTo(map);
      markersRef.current.push(marker);
    });
  }, [filteredTemples, activeLayers.temples, mapReady]);

  // Zoom to district when selected
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;
    if (selectedDistrict === 'all') {
      map.setView(TAMIL_NADU_CENTER, 7, { animate: true });
    } else {
      const dt = temples.filter((t) => t.district_id === selectedDistrict && t.latitude && t.longitude);
      if (dt.length > 0) {
        const avgLat = dt.reduce((s, t) => s + (t.latitude || 0), 0) / dt.length;
        const avgLng = dt.reduce((s, t) => s + (t.longitude || 0), 0) / dt.length;
        map.setView([avgLat, avgLng], 10, { animate: true });
      }
    }
  }, [selectedDistrict, temples, mapReady]);

  // Geolocation
  const findMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(coords);

        const map = mapInstanceRef.current;
        if (!map || !mapReady) return;

        if (userMarkerRef.current) {
          map.removeLayer(userMarkerRef.current);
        }
        const icon = L.divIcon({
          className: 'user-location-marker',
          html: `<div style="position: relative;">
            <div style="background: #3b82f6; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(59,130,246,0.6);"></div>
            <div style="position: absolute; inset: -8px; border-radius: 50%; border: 2px solid #3b82f6; opacity: 0.4; animation: pulse 2s infinite;"></div>
          </div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });
        const marker = L.marker(coords, { icon });
        marker.bindPopup(
          `<div style="font-family: Inter, sans-serif;">
            <strong style="color: #1d4ed8;">Your Location</strong><br/>
            <span style="color: #666; font-size: 11px;">${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}</span><br/>
            <span style="color: #666; font-size: 11px;">Accuracy: ~${Math.round(pos.coords.accuracy)}m</span>
          </div>`
        );
        marker.addTo(map);
        userMarkerRef.current = marker;
        map.setView(coords, 12, { animate: true });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED)
          setLocationError('Location permission denied. Please enable location access to use this feature.');
        else if (err.code === err.POSITION_UNAVAILABLE)
          setLocationError('Location information is unavailable. Please try again.');
        else if (err.code === err.TIMEOUT)
          setLocationError('Location request timed out. Please try again.');
        else
          setLocationError('Unable to retrieve your location. Please try again.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, [mapReady]);

  const stopLocationTracking = useCallback(() => {
    const map = mapInstanceRef.current;
    if (map && userMarkerRef.current) {
      map.removeLayer(userMarkerRef.current);
      userMarkerRef.current = null;
    }
    setUserLocation(null);
  }, []);

  const selectSearchResult = (temple: TempleWithDistrict) => {
    setSearch('');
    setShowSuggestions(false);
    setSelectedTemple(temple);
    const map = mapInstanceRef.current;
    if (temple.latitude && temple.longitude && map && mapReady) {
      map.setView([temple.latitude, temple.longitude], 14, { animate: true });
      markersRef.current.forEach((m) => {
        const ll = m.getLatLng();
        if (Math.abs(ll.lat - temple.latitude!) < 0.001 && Math.abs(ll.lng - temple.longitude!) < 0.001) {
          m.openPopup();
        }
      });
    }
  };

  const resetMap = () => {
    const map = mapInstanceRef.current;
    if (map && mapReady) {
      map.setView(TAMIL_NADU_CENTER, 7, { animate: true });
      setSelectedDistrict('all');
      setSelectedTemple(null);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen((p) => !p);
    setTimeout(() => {
      if (mapInstanceRef.current && mapReady) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 200);
  };

  const directionsUrl = selectedTemple?.latitude && selectedTemple?.longitude
    ? `https://www.google.com/maps/dir/?api=1&destination=${selectedTemple.latitude},${selectedTemple.longitude}`
    : null;

  const directionsFromUserUrl = userLocation && selectedTemple?.latitude && selectedTemple?.longitude
    ? `https://www.google.com/maps/dir/?api=1&origin=${userLocation[0]},${userLocation[1]}&destination=${selectedTemple.latitude},${selectedTemple.longitude}`
    : null;

  return (
    <PageLayout>
      {/* Hero */}
      <section className="relative h-[280px] sm:h-[340px] overflow-hidden">
        <img
          src="https://images.pexels.com/photos/37662256/pexels-photo-37662256.jpeg?auto=compress&cs=tinysrgb&w=1920"
          alt="Tamil Nadu temple map"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 hero-overlay" />
        <div className="relative h-full flex flex-col items-center justify-center text-center px-4">
          <span className="text-xs font-semibold text-gold-300 uppercase tracking-[0.2em] mb-2">
            Interactive Map
          </span>
          <h1 className="font-serif text-3xl sm:text-5xl font-bold text-white mb-3">
            Tamil Nadu Live Temple Map
          </h1>
          <p className="text-sm sm:text-base text-cream/80 max-w-2xl">
            Explore all 38 districts and 114 featured temples across Tamil Nadu with interactive maps, directions, and emergency contacts.
          </p>
        </div>
      </section>

      {/* Map Section */}
      <section className={`px-4 py-6 bg-cream ${isFullscreen ? 'fixed inset-0 z-50 bg-cream p-2' : ''}`}>
        <div className="max-w-7xl mx-auto">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Search + District Selector */}
          <div className="flex flex-col lg:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-900/40" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="Search temple, district or location..."
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-navy-900/10 rounded-lg focus:outline-none focus:border-gold-accent transition-colors"
              />
              {showSuggestions && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-gold-200 z-30 max-h-64 overflow-y-auto">
                  {searchResults.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => selectSearchResult(t)}
                      className="w-full text-left px-4 py-2.5 hover:bg-gold-50 transition-colors border-b border-gold-50 last:border-0"
                    >
                      <p className="text-sm font-medium text-navy-900">{t.name}</p>
                      <p className="text-xs text-navy-900/50">{t.district_name} • {t.location}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="px-4 py-2.5 text-sm bg-white border border-navy-900/10 rounded-lg focus:outline-none focus:border-gold-accent transition-colors cursor-pointer min-w-[200px]"
            >
              <option value="all">All Districts ({temples.length} temples)</option>
              {districts.map((d) => {
                const count = temples.filter((t) => t.district_id === d.id).length;
                return (
                  <option key={d.id} value={d.id}>{d.name} ({count})</option>
                );
              })}
            </select>
          </div>

          {/* Map + Side Panel Layout */}
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Map Container */}
            <div className="flex-1 relative">
              <div
                ref={mapContainerRef}
                className={`w-full rounded-xl overflow-hidden shadow-lg border border-gold-200 bg-gray-100 ${isFullscreen ? 'h-[calc(100vh-120px)]' : 'h-[500px] sm:h-[600px]'}`}
                style={{ zIndex: 1 }}
              />

              {/* Loading overlay */}
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-cream/80 z-20 rounded-xl pointer-events-none">
                  <Loader2 className="w-8 h-8 text-maroon-deep animate-spin" />
                </div>
              )}

              {/* Map Controls - Top Right */}
              <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
                <button
                  onClick={findMyLocation}
                  className="bg-white p-2.5 rounded-lg shadow-md hover:shadow-lg transition-all group"
                  title="Find My Location"
                >
                  <Crosshair className="w-5 h-5 text-blue-600 transition-transform" />
                </button>
                {userLocation && (
                  <button
                    onClick={stopLocationTracking}
                    className="bg-white p-2.5 rounded-lg shadow-md hover:shadow-lg transition-all"
                    title="Stop Location Tracking"
                  >
                    <X className="w-5 h-5 text-red-500" />
                  </button>
                )}
                <button
                  onClick={resetMap}
                  className="bg-white p-2.5 rounded-lg shadow-md hover:shadow-lg transition-all"
                  title="Reset Map"
                >
                  <MapIcon className="w-5 h-5 text-navy-900" />
                </button>
                <button
                  onClick={toggleFullscreen}
                  className="bg-white p-2.5 rounded-lg shadow-md hover:shadow-lg transition-all"
                  title="Toggle Fullscreen"
                >
                  {isFullscreen ? <Minimize2 className="w-5 h-5 text-navy-900" /> : <Maximize2 className="w-5 h-5 text-navy-900" />}
                </button>
              </div>

              {/* Layer Toggle - Top Left */}
              <div className="absolute top-3 left-3 z-[1000]">
                <button
                  onClick={() => setShowLayers(!showLayers)}
                  className="bg-white px-3 py-2 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2 text-sm font-medium text-navy-900"
                >
                  <Layers className="w-4 h-4 text-gold-600" />
                  Layers
                  <ChevronDown className={`w-4 h-4 transition-transform ${showLayers ? 'rotate-180' : ''}`} />
                </button>
                {showLayers && (
                  <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl border border-gold-200 p-3 min-w-[200px] z-[1001]">
                    <p className="text-xs font-semibold text-navy-900/50 uppercase tracking-wide mb-2">Map Layers</p>
                    {LAYER_CONFIG.map((layer) => {
                      const Icon = layer.icon;
                      return (
                        <button
                          key={layer.key}
                          onClick={() => setActiveLayers((p) => ({ ...p, [layer.key]: !p[layer.key] }))}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gold-50 transition-colors text-sm"
                        >
                          <span
                            className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                            style={{ background: activeLayers[layer.key] ? layer.color : 'transparent', border: `2px solid ${layer.color}` }}
                          >
                            {activeLayers[layer.key] && <Check className="w-3 h-3 text-white" />}
                          </span>
                          <Icon className="w-4 h-4" style={{ color: layer.color }} />
                          <span className="text-navy-900/80">{layer.label}</span>
                        </button>
                      );
                    })}
                    <hr className="my-2 border-gold-100" />
                    <button
                      onClick={() => setShowSatellite(!showSatellite)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gold-50 transition-colors text-sm"
                    >
                      <span
                        className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                        style={{ background: showSatellite ? '#0a1535' : 'transparent', border: '2px solid #0a1535' }}
                      >
                        {showSatellite && <Check className="w-3 h-3 text-white" />}
                      </span>
                      <span className="text-navy-900/80">Satellite View</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Legend - Bottom Left */}
              <div className="absolute bottom-3 left-3 z-[1000] bg-white/95 backdrop-blur-sm rounded-lg shadow-md p-3 max-w-[180px]">
                <p className="text-xs font-semibold text-navy-900/50 uppercase tracking-wide mb-2">Legend</p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-4 h-4 rounded-full" style={{ background: '#6B1F2B', border: '1.5px solid #D4AF37' }} />
                    <span className="text-navy-900/70">Temple</span>
                  </div>
                  {activeLayers.hospitals && (
                    <div className="flex items-center gap-2 text-xs">
                      <Hospital className="w-4 h-4 text-red-600" />
                      <span className="text-navy-900/70">Hospital</span>
                    </div>
                  )}
                  {activeLayers.police && (
                    <div className="flex items-center gap-2 text-xs">
                      <Shield className="w-4 h-4 text-blue-700" />
                      <span className="text-navy-900/70">Police</span>
                    </div>
                  )}
                  {activeLayers.bus && (
                    <div className="flex items-center gap-2 text-xs">
                      <Bus className="w-4 h-4 text-green-600" />
                      <span className="text-navy-900/70">Bus Stand</span>
                    </div>
                  )}
                  {activeLayers.railway && (
                    <div className="flex items-center gap-2 text-xs">
                      <Train className="w-4 h-4 text-violet-600" />
                      <span className="text-navy-900/70">Railway</span>
                    </div>
                  )}
                  {activeLayers.hotels && (
                    <div className="flex items-center gap-2 text-xs">
                      <Hotel className="w-4 h-4 text-amber-700" />
                      <span className="text-navy-900/70">Hotel</span>
                    </div>
                  )}
                  {userLocation && (
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white" />
                      <span className="text-navy-900/70">Your Location</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Location Error */}
              {locationError && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-700 shadow-md max-w-xs text-center">
                  {locationError}
                </div>
              )}
            </div>

            {/* Side Panel - Temple Details */}
            <div className="lg:w-80 flex-shrink-0">
              {selectedTemple ? (
                <div className="bg-white rounded-xl shadow-lg border border-gold-200 overflow-hidden lg:sticky lg:top-32">
                  {selectedTemple.featured_image && (
                    <div className="relative h-40 overflow-hidden">
                      <img
                        src={selectedTemple.featured_image}
                        alt={selectedTemple.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-navy-950/80 to-transparent" />
                      <button
                        onClick={() => setSelectedTemple(null)}
                        className="absolute top-2 right-2 bg-white/80 backdrop-blur-sm rounded-full p-1.5 hover:bg-white transition-colors"
                      >
                        <X className="w-4 h-4 text-navy-900" />
                      </button>
                      <div className="absolute bottom-2 left-3 right-3">
                        <h3 className="font-serif text-lg font-bold text-white">{selectedTemple.name}</h3>
                        {selectedTemple.tamil_name && (
                          <p className="text-sm text-gold-200 font-tamil">{selectedTemple.tamil_name}</p>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-gold-200 bg-maroon-deep/80 px-2 py-0.5 rounded-full">
                        <MapPin className="w-3 h-3" />
                        {selectedTemple.district_name}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-navy-900/60 bg-gold-50 px-2 py-0.5 rounded-full">
                        {selectedTemple.category}
                      </span>
                    </div>
                    <p className="text-sm text-navy-900/70 line-clamp-3 mb-3">
                      {selectedTemple.description || 'Temple information pending verification.'}
                    </p>
                    <div className="space-y-1.5 text-xs text-navy-900/60 mb-4">
                      <p className="flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-gold-600" />
                        {selectedTemple.location}
                      </p>
                      {selectedTemple.latitude && selectedTemple.longitude && (
                        <p className="flex items-center gap-1.5">
                          <Navigation className="w-3 h-3 text-gold-600" />
                          {selectedTemple.latitude.toFixed(4)}, {selectedTemple.longitude.toFixed(4)}
                        </p>
                      )}
                      <p className="flex items-center gap-1.5">
                        <Church className="w-3 h-3 text-gold-600" />
                        {selectedTemple.deity || 'Deity info pending'}
                      </p>
                      <p className="flex items-center gap-1.5">
                        {selectedTemple.verification_status === 'verified'
                          ? <><Check className="w-3 h-3 text-green-600" /> Verified location</>
                          : <><AlertCircle className="w-3 h-3 text-amber-600" /> Unverified location</>
                        }
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Link
                        to={`/temples/${selectedTemple.id}`}
                        className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-gradient-to-r from-maroon-deep to-maroon-800 text-white text-sm font-semibold rounded-lg hover:shadow-lg transition-all"
                      >
                        <Eye className="w-4 h-4" />
                        View Full Details
                      </Link>
                      {directionsUrl && (
                        <a
                          href={directionsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-white border border-navy-900/20 text-navy-900 text-sm font-semibold rounded-lg hover:bg-navy-900 hover:text-white transition-all"
                        >
                          <Navigation className="w-4 h-4" />
                          Get Directions
                        </a>
                      )}
                      {directionsFromUserUrl && (
                        <a
                          href={directionsFromUserUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-blue-50 border border-blue-200 text-blue-700 text-sm font-semibold rounded-lg hover:bg-blue-100 transition-all"
                        >
                          <Navigation className="w-4 h-4" />
                          Route from My Location
                        </a>
                      )}
                      <button
                        onClick={() => navigate(`/temples/${selectedTemple.id}`)}
                        className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-gradient-to-r from-gold-300 to-gold-500 text-maroon-deep text-sm font-bold rounded-lg hover:shadow-lg transition-all"
                      >
                        <Ticket className="w-4 h-4" />
                        Book Darshan
                      </button>
                    </div>
                    {selectedTemple.verification_status !== 'verified' && (
                      <p className="text-xs text-amber-700 bg-amber-50 rounded-lg p-2 mt-3">
                        <AlertCircle className="w-3.5 h-3.5 inline mr-1" />
                        Location is unverified. Please confirm before visiting.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gold-200 p-6 lg:sticky lg:top-32">
                  <Church className="w-10 h-10 mx-auto text-navy-900/20 mb-3" />
                  <p className="text-sm text-navy-900/60 text-center">
                    Click on a temple marker on the map to see detailed information.
                  </p>
                  {!userLocation && (
                    <button
                      onClick={findMyLocation}
                      className="flex items-center justify-center gap-2 w-full mt-4 px-4 py-2.5 bg-blue-50 border border-blue-200 text-blue-700 text-sm font-semibold rounded-lg hover:bg-blue-100 transition-all"
                    >
                      <LocateFixed className="w-4 h-4" />
                      Find My Location
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Stats bar */}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-navy-900/60">
            <span className="flex items-center gap-1.5">
              <Church className="w-4 h-4 text-maroon-deep" />
              {filteredTemples.filter((t) => t.latitude).length} temples with coordinates
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-gold-600" />
              {filteredTemples.length} total in {selectedDistrict === 'all' ? 'all districts' : 'selected district'}
            </span>
            {selectedDistrict !== 'all' && (
              <span className="flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-navy-900/40" />
                {districts.find((d) => d.id === selectedDistrict)?.name}
              </span>
            )}
          </div>

          <p className="text-xs text-navy-900/40 mt-2">
            Map data &copy; OpenStreetMap contributors. Temple coordinates are individually verified where marked; unverified markers may be approximate.
          </p>
        </div>
      </section>

      {/* Emergency Section */}
      <EmergencySection districts={districts} userLocation={userLocation} />
    </PageLayout>
  );
}
