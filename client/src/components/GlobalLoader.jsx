import { useEffect, useState } from 'react';
import { subscribe } from '../loadingState';

export default function GlobalLoader() {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribe(setLoading);
    return unsubscribe;
  }, []);

  if (!loading) return null;

  return (
    <div className="global-loader-overlay">
      <div className="global-loader-spinner" />
      <div className="global-loader-text">Good things take time</div>
    </div>
  );
}
