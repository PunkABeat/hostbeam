import { QrCode } from "@hostbeam/ui";
import { APP_STORE_URL } from "../lib/links";

export default function StoreQr() {
  return (
    <div className="store-qr" aria-hidden="true">
      {/* The plate is white in both themes, so the modules are a fixed dark
          ink, not var(--ink): in dark mode that turns near-white and the code
          stops scanning. */}
      <div className="store-qr-code">
        <QrCode value={APP_STORE_URL} size={104} fill="#10203b" />
      </div>
      <span className="note" style={{ maxWidth: "11em" }}>
        scan with your iPhone to open the App Store
      </span>
    </div>
  );
}
