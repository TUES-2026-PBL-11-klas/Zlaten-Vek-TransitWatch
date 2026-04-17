import 'leaflet/dist/leaflet.css';
import './map.css';
import L from 'leaflet';
import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import { useAuth } from '../contexts/AuthContext';
import { loadMapSettings } from '../lib/map-settings';
import StopMarkers from '../components/map/StopMarkers';
import VehicleMarkers from '../components/map/VehicleMarkers';
import RouteOverlay from '../components/map/RouteOverlay';
import MapController from '../components/map/MapController';
import VehiclePopup from '../components/map/VehiclePopup';
import StopPopup, { StopPopupContent } from '../components/map/StopPopup';
import MobileBottomSheet from '../components/map/MobileBottomSheet';
import { useIsMobile } from '../hooks/useIsMobile';
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
  requestLocation: () => void;
  currentUserId: string | null;
  isMobile: boolean;
  hideControls: boolean;
  showVehicles: boolean;
  showStopTimes: boolean;
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
  requestLocation,
  currentUserId,
  isMobile,
  hideControls,
  showVehicles,
  showStopTimes,
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
      {!hideControls && <LocateMeButton location={userLocation} requestLocation={requestLocation} />}

      {showStopTimes && (
        <StopMarkers
          onStopSelect={onStopSelect}
          selectedStopId={selectedStop?.id ?? null}
        />
      )}
      {showVehicles && (
        <VehicleMarkers
          onVehicleSelect={onVehicleSelect}
          selectedVehicleId={selectedVehicle?.vehicleId ?? null}
        />
      )}
      <MapClickHandler onMapClick={onMapClick} />

      {selectedVehicle && !isMobile && (
        <VehiclePopup
          vehicle={selectedVehicle}
          timeline={tripTimeline.timeline}
          loading={tripTimeline.loading}
          onClose={onDeselect}
          currentUserId={currentUserId ?? null}
        />
      )}

      {!isMobile && <StopPopup selectedStop={selectedStop} onClose={onDeselect} />}
    </>
  );
}

export default function MapPage() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [selectedStop, setSelectedStop] = useState<SelectedStop | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<VehiclePosition | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showReportFlow, setShowReportFlow] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const mapSettings = loadMapSettings();

  const handleFollowChange = useCallback((following: boolean) => {
    setIsFollowing(following);
  }, []);

  const tripTimeline = useTripTimeline(selectedVehicle?.vehicleId ?? null);
  const { location: userLocation, error: locationError, requestLocation } = useUserLocation();

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
            requestLocation={requestLocation}
            currentUserId={user?.id ?? null}
            isMobile={isMobile}
            hideControls={isMobile && !!(selectedStop || selectedVehicle)}
            showVehicles={mapSettings.showVehicles}
            showStopTimes={mapSettings.showStopTimes}
          />
        </MapContainer>

        {/* Mobile bottom sheets — popups rendered outside MapContainer on phones */}
        {/* Vehicle popup skipped on mobile — TripTimelinePanel already shows the route */}

        {selectedStop && isMobile && (
          <MobileBottomSheet onClose={handleDeselect}>
            <StopPopupContent stopId={selectedStop.id} onClose={handleDeselect} />
          </MobileBottomSheet>
        )}

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
            vehicleId={selectedVehicle.vehicleId}
            currentUserId={user?.id ?? null}
          />
        )}

        {/* Report FAB — hidden when a panel is open on mobile */}
        {user && userLocation && !showReportFlow && !(isMobile && (selectedStop || selectedVehicle)) && (
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
