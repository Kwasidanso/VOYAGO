import React, { useEffect, useState } from 'react';
import { APIProvider, Map, AdvancedMarker, InfoWindow, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { Loader2, AlertCircle } from 'lucide-react';

export interface Itinerary {
  tripTitle: string;
  days: {
    day: number;
    theme: string;
    activities: { time: string, title: string, description: string, cost?: number }[];
  }[];
}

interface ItineraryMapProps {
  tripTitle: string;
  days: Itinerary['days'];
}

interface PinData {
  id: string;
  position: google.maps.LatLngLiteral;
  title: string;
  description: string;
  dayNum: number;
  time: string;
}

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';

const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

const getSearchQuery = (title: string, tripTitle: string) => {
  const cleanDestination = tripTitle
    .replace(/^(Create |AI |Detailed |Personalized )?Itinerary (for|in|to) /i, '')
    .replace(/^Exploration of /i, '')
    .replace(/^\d+-(Day|Week) (Adventure|Trip|Journey|Itinerary|Vacation) (in|to|for) /i, '')
    .trim();
  
  return `${title}, ${cleanDestination}`;
};

function MapInner({ tripTitle, days }: ItineraryMapProps) {
  const map = useMap();
  const geocodingLib = useMapsLibrary('geocoding');
  const [pins, setPins] = useState<PinData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPin, setSelectedPin] = useState<PinData | null>(null);

  useEffect(() => {
    if (!geocodingLib || !map) return;

    let isMounted = true;
    setLoading(true);

    const runGeocoding = async () => {
      const rawActivities: { dayNum: number; time: string; title: string; description: string; query: string }[] = [];
      days.forEach(day => {
        if (!day.activities) return;
        day.activities.forEach((act, idx) => {
          rawActivities.push({
            dayNum: day.day,
            time: act.time,
            title: act.title,
            description: act.description,
            query: getSearchQuery(act.title, tripTitle)
          });
        });
      });

      const geocoder = new geocodingLib.Geocoder();
      const resolvedPins: PinData[] = [];
      const memoMap: Record<string, google.maps.LatLngLiteral> = {};

      for (let i = 0; i < rawActivities.length; i++) {
        if (!isMounted) return;
        const act = rawActivities[i];
        
        if (memoMap[act.query]) {
          resolvedPins.push({
            id: `${act.dayNum}-${i}`,
            position: memoMap[act.query],
            title: act.title,
            description: act.description,
            dayNum: act.dayNum,
            time: act.time
          });
          continue;
        }

        try {
          const response = await geocoder.geocode({ address: act.query });
          if (!isMounted) return;

          const location = response.results[0]?.geometry.location;
          if (location) {
            const pos = { lat: location.lat(), lng: location.lng() };
            memoMap[act.query] = pos;
            resolvedPins.push({
              id: `${act.dayNum}-${i}`,
              position: pos,
              title: act.title,
              description: act.description,
              dayNum: act.dayNum,
              time: act.time
            });
          }
        } catch (err) {
          console.warn(`Geocoding failed for: ${act.query}`, err);
        }
      }

      if (isMounted) {
        setPins(resolvedPins);
        setLoading(false);

        if (resolvedPins.length > 0) {
          const bounds = new google.maps.LatLngBounds();
          resolvedPins.forEach(p => bounds.extend(p.position));
          map.fitBounds(bounds);
          
          const listener = google.maps.event.addListener(map, 'bounds_changed', () => {
            if (map.getZoom()! > 15) {
              map.setZoom(14);
            }
            google.maps.event.removeListener(listener);
          });
        }
      }
    };

    runGeocoding();

    return () => {
      isMounted = false;
    };
  }, [geocodingLib, map, days, tripTitle]);

  return (
    <>
      {loading && (
        <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center gap-2">
          <Loader2 className="animate-spin text-secondary w-6 h-6" />
          <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">Plotting locations on map...</span>
        </div>
      )}

      <Map
        defaultCenter={{ lat: 37.42, lng: -122.08 }}
        defaultZoom={11}
        mapId="DEMO_MAP_ID"
        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        className="w-full h-full"
        style={{ width: '100%', height: '100%' }}
      >
        {pins.map(pin => (
          <AdvancedMarker
            key={pin.id}
            position={pin.position}
            onClick={() => setSelectedPin(pin)}
          >
            <div className="bg-secondary text-white text-[9px] font-bold h-6 px-2 rounded-full shadow-lg border-2 border-white flex items-center justify-center whitespace-nowrap cursor-pointer hover:scale-110 transition-transform">
              Day {pin.dayNum}
            </div>
          </AdvancedMarker>
        ))}

        {selectedPin && (
          <InfoWindow
            position={selectedPin.position}
            onCloseClick={() => setSelectedPin(null)}
          >
            <div className="p-1 space-y-1 text-slate-800 max-w-[200px]">
              <div className="flex items-center gap-1.5">
                <span className="bg-secondary text-white text-[8px] px-1.5 py-0.5 rounded uppercase font-bold">
                  Day {selectedPin.dayNum}
                </span>
                <span className="text-[9px] font-black text-secondary">{selectedPin.time}</span>
              </div>
              <h5 className="text-xs font-bold leading-tight text-slate-900">{selectedPin.title}</h5>
              <p className="text-[10px] text-slate-500 leading-normal line-clamp-2">{selectedPin.description}</p>
            </div>
          </InfoWindow>
        )}
      </Map>
    </>
  );
}

export const ItineraryMap: React.FC<ItineraryMapProps> = ({ tripTitle, days }) => {
  if (!hasValidKey) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-slate-50 border border-slate-100 rounded-2xl text-center">
        <AlertCircle className="text-secondary w-8 h-8 mb-2" />
        <h4 className="font-headline font-bold text-xs text-slate-800 mb-1">Google Maps Setup Required</h4>
        <p className="text-[10px] text-slate-500 leading-relaxed max-w-sm mb-3">
          To view this interactive itinerary map, please set up your Google Maps Platform key in AI Studio.
        </p>
        <div className="text-left bg-white p-3 rounded-lg border border-slate-100 text-[9px] leading-relaxed text-slate-500 space-y-1.5 w-full">
          <p><strong>1.</strong> <a href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais" target="_blank" rel="noopener noreferrer" className="text-secondary hover:underline font-bold">Get an API Key</a></p>
          <p><strong>2.</strong> Settings (⚙️ top-right) → <strong>Secrets</strong></p>
          <p><strong>3.</strong> Save parameter <code>GOOGLE_MAPS_PLATFORM_KEY</code></p>
        </div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={API_KEY} version="weekly">
      <div className="relative w-full h-[320px] rounded-2xl overflow-hidden border border-slate-100 shadow-sm bg-slate-50">
        <MapInner tripTitle={tripTitle} days={days} />
      </div>
    </APIProvider>
  );
};
