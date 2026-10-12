'use client';

import { useState, useCallback } from 'react';
import { MapPin, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export interface GpsCaptureResult {
  lat: number;
  lng: number;
  accuracy: number; // meters
}

interface GpsCaptureProps {
  onCapture: (result: GpsCaptureResult) => void;
  captured?: GpsCaptureResult | null;
  required?: boolean;
}

type CaptureStatus = 'idle' | 'requesting' | 'captured' | 'error';

export function GpsCapture({
  onCapture,
  captured,
  required = false,
}: GpsCaptureProps) {
  const [status, setStatus] = useState<CaptureStatus>(
    captured ? 'captured' : 'idle'
  );
  const [error, setError] = useState<string | null>(null);

  const captureGps = useCallback(() => {
    if (!navigator.geolocation) {
      setError('GPS is not available on this device');
      setStatus('error');
      return;
    }

    setStatus('requesting');
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const result: GpsCaptureResult = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: Math.round(position.coords.accuracy),
        };
        setStatus('captured');
        onCapture(result);
      },
      (err) => {
        setStatus('error');
        if (err.code === err.PERMISSION_DENIED) {
          setError(
            'GPS permission denied. Please allow location access in your browser settings.'
          );
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setError('GPS position unavailable. Try moving outdoors.');
        } else if (err.code === err.TIMEOUT) {
          setError('GPS timed out. Try again in an open area.');
        } else {
          setError('Could not get GPS location. Try again.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,   // 15 seconds
        maximumAge: 60000, // Accept cached position up to 1 minute old
      }
    );
  }, [onCapture]);

  return (
    <div style={{ width: '100%' }}>
      {/* Idle / Error — show capture button */}
      {(status === 'idle' || status === 'error') && (
        <button
          type="button"
          onClick={captureGps}
          style={{
            width: '100%',
            padding: '16px',
            background: '#f8fafc',
            border: `2px dashed ${status === 'error' ? '#ef4444' : '#e2e8f0'}`,
            borderRadius: 12,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
          }}
        >
          <MapPin size={32} color="#10b981" />
          <span style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>
            {status === 'error'
              ? 'Retry GPS Capture'
              : 'Tap to Capture GPS Location'}
          </span>
          <span style={{ fontSize: 12, color: '#64748b' }}>
            {required ? 'Required — ' : ''}Uses your phone&apos;s GPS
          </span>
        </button>
      )}

      {/* Requesting */}
      {status === 'requesting' && (
        <div
          style={{
            padding: '20px 16px',
            background: '#eff6ff',
            border: '2px solid #bfdbfe',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <Loader2 size={24} color="#3b82f6" className="animate-spin" />
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#1e40af' }}>
              Getting GPS signal...
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              Move outdoors for better accuracy
            </div>
          </div>
        </div>
      )}

      {/* Captured */}
      {status === 'captured' && captured && (
        <div
          style={{
            padding: '14px 16px',
            background: '#f0fdf4',
            border: '2px solid #86efac',
            borderRadius: 12,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 8,
            }}
          >
            <CheckCircle2 size={20} color="#10b981" />
            <span style={{ fontWeight: 700, fontSize: 14, color: '#065f46' }}>
              GPS Captured
            </span>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '4px 16px',
              fontSize: 12,
            }}
          >
            <div>
              <span style={{ color: '#64748b' }}>Latitude</span>
              <div style={{ fontWeight: 600 }}>{captured.lat.toFixed(6)}°N</div>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Longitude</span>
              <div style={{ fontWeight: 600 }}>{captured.lng.toFixed(6)}°E</div>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <span style={{ color: '#64748b' }}>Accuracy </span>
              <span
                style={{
                  fontWeight: 600,
                  color:
                    captured.accuracy <= 20
                      ? '#10b981'
                      : captured.accuracy <= 50
                      ? '#f59e0b'
                      : '#ef4444',
                }}
              >
                ±{captured.accuracy}m
                {captured.accuracy > 50 ? ' — try moving outdoors' : ''}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={captureGps}
            style={{
              marginTop: 8,
              background: 'none',
              border: 'none',
              color: '#10b981',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Re-capture GPS
          </button>
        </div>
      )}

      {/* Error message */}
      {status === 'error' && error && (
        <div
          style={{
            marginTop: 8,
            padding: '8px 12px',
            background: '#fef2f2',
            borderRadius: 8,
            display: 'flex',
            gap: 8,
            alignItems: 'flex-start',
          }}
        >
          <AlertCircle
            size={16}
            color="#ef4444"
            style={{ flexShrink: 0, marginTop: 1 }}
          />
          <span style={{ fontSize: 12, color: '#7f1d1d' }}>{error}</span>
        </div>
      )}
    </div>
  );
}
