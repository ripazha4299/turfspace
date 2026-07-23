import { useEffect, useState } from 'react';
import { subscribe } from '../loadingState';

export default function GlobalLoader() {
  const [loading, setLoading] = useState(false);
  const [showLoader, setShowLoader] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribe(setLoading);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!loading) {
      setShowLoader(false);
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setShowLoader(true);
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [loading]);

  if (!showLoader) return null;

  return (
    <div className="global-loader-overlay">
      <div className="global-loader-spinner" />
      <div className="global-loader-text">Good things take time</div>
    </div>
  );
}
