import React, { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle2, CloudRain } from 'lucide-react';
import { salahApi } from '../services/backendApi';

/**
 * ServerWarmupNotice Component
 *
 * Lightweight, non-intrusive indicator that detects Render free-tier cold starts.
 * If the server responds in < 2.5s (already awake), nothing is rendered to avoid UI clutter.
 * If the server takes > 2.5s (cold start spin-up), shows a friendly status pill.
 */
export const ServerWarmupNotice: React.FC = () => {
  const [status, setStatus] = useState<'idle' | 'waking' | 'connected' | 'error'>('idle');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // Start a timer: if health check hasn't responded within 2.5 seconds, display the warmup pill
    const timer = setTimeout(() => {
      if (isMounted && status === 'idle') {
        setStatus('waking');
        setVisible(true);
      }
    }, 2500);

    const ping = async () => {
      try {
        const res = await salahApi.getHealth();
        if (res && isMounted) {
          clearTimeout(timer);
          if (visible || status === 'waking') {
            setStatus('connected');
            setTimeout(() => {
              if (isMounted) setVisible(false);
            }, 2000);
          } else {
            setStatus('connected');
          }
        }
      } catch (err) {
        if (isMounted) {
          clearTimeout(timer);
          setStatus('error');
          setVisible(true);
        }
      }
    };

    ping();

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, []);

  if (!visible) return null;

  return (
    <aside
      aria-label="Server status"
      className="fixed bottom-5 right-5 z-50 transition-all duration-500 transform animate-in fade-in slide-in-from-bottom-3"
    >
      <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-full shadow-lg border backdrop-blur-md text-xs font-medium tracking-wide bg-[#0E3D2F]/90 text-stone-100 border-emerald-500/30">
        {status === 'waking' && (
          <>
            <RefreshCw className="w-3.5 h-3.5 text-amber-300 animate-spin" />
            <span>Connecting to cloud backend (waking from eco-sleep)...</span>
          </>
        )}
        {status === 'connected' && (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Backend online & ready</span>
          </>
        )}
        {status === 'error' && (
          <>
            <CloudRain className="w-3.5 h-3.5 text-rose-300" />
            <span>Server is taking longer than usual</span>
            <button
              onClick={() => window.location.reload()}
              className="underline text-amber-300 hover:text-amber-200 ml-1 font-semibold cursor-pointer"
            >
              Refresh
            </button>
          </>
        )}
      </div>
    </aside>
  );
};
