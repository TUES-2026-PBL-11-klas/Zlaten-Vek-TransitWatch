import 'leaflet/dist/leaflet.css';
import './map.css';
import L from 'leaflet';
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import StopMarkers from '../components/map/StopMarkers';
import VehicleMarkers from '../components/map/VehicleMarkers';
import RouteOverlay from '../components/map/RouteOverlay';
import ArrivalPanel from '../components/panels/ArrivalPanel';
import TripTimelinePanel from '../components/panels/TripTimelinePanel';
import { useTripTimeline } from '../hooks/useTripTimeline';
import type { VehiclePosition } from '../types/transit';

// Fix Leaflet's broken default icon paths when bundled with Vite
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const SOFIA_CENTER: [number, number] = [42.6977, 23.3219];
const DEFAULT_ZOOM = 13;

function MapClickHandler({ onMapClick }: { onMapClick: () => void }) {
  useMapEvents({
    click: onMapClick,
  });
  return null;
}

interface MapLayersProps {
  onStopSelect: (stopId: string) => void;
  onVehicleSelect: (vehicle: VehiclePosition) => void;
  onMapClick: () => void;
  selectedVehicle: VehiclePosition | null;
  tripTimeline: ReturnType<typeof useTripTimeline>;
}

function MapLayers({
  onStopSelect,
  onVehicleSelect,
  onMapClick,
  selectedVehicle,
  tripTimeline,
}: MapLayersProps) {
  return (
    <>
      {selectedVehicle && tripTimeline.timeline && (
        <RouteOverlay
          timeline={tripTimeline.timeline}
          shape={tripTimeline.shape}
        />
      )}
      <StopMarkers onStopSelect={onStopSelect} />
      <VehicleMarkers onVehicleSelect={onVehicleSelect} />
      <MapClickHandler onMapClick={onMapClick} />
    </>
  );
}

export default function MapPage() {
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<VehiclePosition | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  const tripTimeline = useTripTimeline(selectedVehicle?.tripId ?? null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate('/login');
  }

  const handleStopSelect = (stopId: string) => {
    setSelectedVehicle(null);
    setSelectedStopId(stopId);
  };

  const handleVehicleSelect = (vehicle: VehiclePosition) => {
    setSelectedStopId(null);
    setSelectedVehicle(vehicle);
  };

  const handleDeselect = () => {
    setSelectedStopId(null);
    setSelectedVehicle(null);
  };

  return (
    <div className="map-page">
      {/* Navbar */}
      <header className="map-header">
        <span className="map-brand">
          TransitWatch Sofia
        </span>
        <nav className="map-nav">
          {user ? (
            <>
              <Link to="/profile" className="map-nav-link">
                Profile
              </Link>
              <button onClick={handleSignOut} className="map-nav-link map-nav-link--primary">
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="map-nav-link">
                Login
              </Link>
              <Link to="/register" className="map-nav-link map-nav-link--primary">
                Register
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* Map + panels */}
      <div className="map-stage">
        <MapContainer
          center={SOFIA_CENTER}
          zoom={DEFAULT_ZOOM}
          className="leaflet-map"
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap &copy; CARTO'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png"
          />
          <TileLayer
            attribution='&copy; OpenStreetMap &copy; CARTO'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png"
            pane="overlayPane"
          />
          <MapLayers
            onStopSelect={handleStopSelect}
            onVehicleSelect={handleVehicleSelect}
            onMapClick={handleDeselect}
            selectedVehicle={selectedVehicle}
            tripTimeline={tripTimeline}
          />
        </MapContainer>

        {/* Panels rendered outside MapContainer, positioned absolutely within the map div */}
        {selectedStopId && (
          <ArrivalPanel stopId={selectedStopId} onClose={handleDeselect} />
        )}
        {selectedVehicle && tripTimeline.timeline && (
          <TripTimelinePanel timeline={tripTimeline.timeline} onClose={handleDeselect} />
        )}
      </div>
    </div>
  );
}
