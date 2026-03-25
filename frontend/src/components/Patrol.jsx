import { useState } from "react";
import QRScanner from "./QRScanner";

function Patrol() {
  const [showScanner, setShowScanner] = useState(false);
  const [lastScan, setLastScan] = useState("");

  const handleScan = async (locationId) => {
    setLastScan(locationId);

    await fetch("http://localhost:5000/api/patrol/log", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        guardId: "G101",
        locationId: locationId,
        status: "checked",
      }),
    });

    setShowScanner(false);
  };

  return (
    <div>
      <h2>Patrolling</h2>

      <button onClick={() => setShowScanner(true)}>
        Scan QR
      </button>

      {showScanner && <QRScanner onScan={handleScan} />}

      <h3>Last Scan:</h3>
      <p>{lastScan}</p>
    </div>
  );
}

export default Patrol;