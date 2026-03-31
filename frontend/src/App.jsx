import { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { createClient } from "@supabase/supabase-js";
import "./App.css";

const isUrl = (text) => /^https?:\/\//i.test(text);

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

function App() {
  const [scanning, setScanning] = useState(false);
  const [db, setDb] = useState([]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const html5QrCodeRef = useRef(null);
  const readerRef = useRef(null);

  useEffect(() => {
    loadCodes();
  }, []);

  const loadCodes = async () => {
    try {
      const { data, error } = await supabase
        .from("scanned_codes")
        .select("code");

      if (error) throw error;

      setDb(data.map((row) => row.code));
    } catch (error) {
      console.error("Error loading codes:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    if (scanning && readerRef.current && !html5QrCodeRef.current) {
      html5QrCodeRef.current = new Html5Qrcode("reader");
      html5QrCodeRef.current
        .start(
          { facingMode: "environment" },
          { fps: 10 },
          (decodedText) => {
            handleScan({ text: decodedText });
          },
          () => {}
        )
        .catch(() => {});
    } else if (!scanning && html5QrCodeRef.current) {
      html5QrCodeRef.current.stop().catch(() => {});
      html5QrCodeRef.current = null;
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning]);

  const handleScan = async (result) => {
    if (result?.text && scanning) {
      if (isUrl(result.text)) {
        setStatus("wrong-qr");
        return;
      }

      setScanning(false);

      if (db.includes(result.text)) {
        setStatus("found");
      } else {
        try {
          const { error } = await supabase
            .from("scanned_codes")
            .insert([{ code: result.text }]);

          if (error) throw error;

          setDb((prev) => [...prev, result.text]);
          setStatus("notfound");
        } catch (error) {
          console.error("Error inserting code:", error);
          setStatus("error");
        }
      }
    }
  };

  const handleStart = () => {
    setScanning(true);
    setStatus(null);
  };

  const handleScanButtonClick = () => {
    if (scanning) {
      setScanning(false);
    } else {
      handleStart();
    }
  };

  if (loading) {
    return (
      <div className="container-mobile">
        <h2>Loading...</h2>
      </div>
    );
  }

  return (
    <div className="container-mobile">
      <h2>Scan QR codes to check against database</h2>
      <div className="card flex-shrink-0">
        <div className="scanner-header-mobile">Scanner</div>
        <div className="scanner-box-mobile">
          {scanning ? (
            <>
              <div id="reader" ref={readerRef} />
              {status === "wrong-qr" && (
                <div className="scan-overlay-warning">
                  ⚠️ Wrong QR code — scan the text one
                </div>
              )}
            </>
          ) : status === "found" ? (
            <div
              className="scan-placeholder"
              style={{ color: "#ef4444", fontSize: "x-large" }}
            >
              ❌ Already scanned
            </div>
          ) : status === "notfound" ? (
            <div
              className="scan-placeholder"
              style={{ color: "#22c55e", fontSize: "x-large" }}
            >
              ✅ Not scanned yet
            </div>
          ) : status === "error" ? (
            <div
              className="scan-placeholder"
              style={{ color: "#f59e0b", fontSize: "x-large" }}
            >
              ⚠️ Database error
            </div>
          ) : (
            <div className="scan-placeholder">Scanner stopped.</div>
          )}
        </div>
        <button className="scan-btn" onClick={handleScanButtonClick}>
          {scanning ? "Stop Scanning" : "Start Scanning"}
        </button>
      </div>
      <div className="card">
        <div className="db-header-mobile">Database ({db.length} items)</div>
        <div className="db-list-mobile">
          {db.map((code, idx) => (
            <div className="db-item-mobile" key={code + idx}>
              <span className="db-code-mobile">{code}</span>
              <span className="db-status-check">✔️ In Database</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
