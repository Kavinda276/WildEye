import { useState, useEffect } from "react";

function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <div className={`network-status ${isOnline ? "network-online" : "network-offline"}`}>
      <span className="network-dot" aria-hidden="true" />
      {isOnline ? "Online" : "Offline"}
    </div>
  );
}

export default NetworkStatus;
