import 'leaflet/dist/leaflet.css';
import './map.css';
import L from 'leaflet';
import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import StopMarkers from '../components/map/StopMarkers';
import VehicleMarkers from '../components/map/VehicleMarkers';
import RouteOverlay from '../components/map/RouteOverlay';
import MapController from '../components/map/MapController';
import VehiclePopup from '../components/map/VehiclePopup';
import StopPopup from '../components/map/StopPopup';
import UserLocationMarker from '../components/map/UserLocationMarker';
import LocateMeButton from '../components/map/LocateMeButton';
import ReportFAB from '../components/map/ReportFAB';
import ReportFlow from '../components/report/ReportFlow';
import TripTimelinePanel from '../components/panels/TripTimelinePanel';
import { useTripTimeline } from '../hooks/useTripTimeline';
import { useUserLocation } from '../hooks/useUserLocation';
import type { VehiclePosition, TransitStop } from '../types/transit';

// Fix Leaflet's broken default icon paths when bundled with Vite
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const SOFIA_CENTER: [number, number] = [42.6977, 23.3219];
const DEFAULT_ZOOM = 13;

interface SelectedStop {
  id: string;
  lat: number;
  lng: number;
}

function MapClickHandler({ onMapClick }: { onMapClick: () => void }) {
  useMapEvents({
    click: onMapClick,
  });
  return null;
}

interface MapLayersProps {
  onStopSelect: (stop: TransitStop) => void;
  onVehicleSelect: (vehicle: VehiclePosition) => void;
  onMapClick: () => void;
  onDeselect: () => void;
  selectedVehicle: VehiclePosition | null;
  selectedStop: SelectedStop | null;
  tripTimeline: ReturnType<typeof useTripTimeline>;
  onFollowChange: (following: boolean) => void;
  userLocation: { lat: number; lng: number; accuracy: number } | null;
}

function MapLayers({
  onStopSelect,
  onVehicleSelect,
  onMapClick,
  onDeselect,
  selectedVehicle,
  selectedStop,
  tripTimeline,
  onFollowChange,
  userLocation,
}: MapLayersProps) {
  return (
    <>
      <MapController selectedVehicle={selectedVehicle} selectedStop={selectedStop} onFollowChange={onFollowChange} />

      {selectedVehicle && tripTimeline.timeline && (
        <RouteOverlay
          timeline={tripTimeline.timeline}
          shape={tripTimeline.shape}
        />
      )}

      {userLocation && <UserLocationMarker location={userLocation} />}
      <LocateMeButton location={userLocation} />

      <StopMarkers
        onStopSelect={onStopSelect}
        selectedStopId={selectedStop?.id ?? null}
      />
      <VehicleMarkers
        onVehicleSelect={onVehicleSelect}
        selectedVehicleId={selectedVehicle?.vehicleId ?? null}
      />
      <MapClickHandler onMapClick={onMapClick} />

      {selectedVehicle && (
        <VehiclePopup
          vehicle={selectedVehicle}
          timeline={tripTimeline.timeline}
          loading={tripTimeline.loading}
          onClose={onDeselect}
        />
      )}

      <StopPopup selectedStop={selectedStop} onClose={onDeselect} />
    </>
  );
}

export default function MapPage() {
  const [selectedStop, setSelectedStop] = useState<SelectedStop | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<VehiclePosition | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [showReportFlow, setShowReportFlow] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleFollowChange = useCallback((following: boolean) => {
    setIsFollowing(following);
  }, []);

  const tripTimeline = useTripTimeline(selectedVehicle?.vehicleId ?? null);
  const { location: userLocation, error: locationError } = useUserLocation();

  // Show toast on location error
  useEffect(() => {
    if (!locationError) return;
    const showTimer = setTimeout(() => setToast(locationError), 0);
    const hideTimer = setTimeout(() => setToast(null), 4000);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [locationError]);

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

  const handleStopSelect = (stop: TransitStop) => {
    setSelectedVehicle(null);
    setSelectedStop({ id: stop.id, lat: stop.lat, lng: stop.lng });
  };

  const handleVehicleSelect = (vehicle: VehiclePosition) => {
    setSelectedStop(null);
    setSelectedVehicle(vehicle);
  };

  const handleDeselect = () => {
    setSelectedStop(null);
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
          preferCanvas={true}
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
            onDeselect={handleDeselect}
            selectedVehicle={selectedVehicle}
            selectedStop={selectedStop}
            tripTimeline={tripTimeline}
            onFollowChange={handleFollowChange}
            userLocation={userLocation}
          />
        </MapContainer>

        {/* Re-center button — shown when user pans away from followed vehicle */}
        {selectedVehicle && !isFollowing && (
          <button
            className="recenter-btn"
            onClick={() => setIsFollowing(true)}
          >
            Re-center
          </button>
        )}

        {/* Full trip timeline panel — slide-in detail view for selected vehicle */}
        {selectedVehicle && (
          <TripTimelinePanel
            timeline={tripTimeline.timeline}
            loading={tripTimeline.loading}
            onClose={handleDeselect}
          />
        )}

        {/* Report FAB — visible when authenticated and location available */}
        {user && userLocation && !showReportFlow && (
          <ReportFAB onClick={() => setShowReportFlow(true)} />
        )}

        {/* Report flow bottom sheet */}
        {showReportFlow && userLocation && (
          <ReportFlow
            userLocation={userLocation}
            onClose={() => setShowReportFlow(false)}
            onSuccess={() => setShowReportFlow(false)}
          />
        )}

        {/* Toast notification */}
        {toast && <div className="map-toast">{toast}</div>}
      </div>
    </div>
  );
}
