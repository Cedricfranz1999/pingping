declare module "react-qr-scanner" {
  import * as React from "react";

  export interface QrScannerProps {
    delay?: number;
    style?: React.CSSProperties;
    /**
     * Fires when a QR code is successfully detected.
     * @param data The QR code data, or null if nothing was detected.
     */
    onScan?: (data: string | null) => void;
    /**
     * Fires when an error occurs during scanning.
     */
    onError?: (error: Error) => void;
    constraints?: MediaTrackConstraints;
    facingMode?: "user" | "environment";
    legacyMode?: boolean;
    resolution?: number;
    showViewFinder?: boolean;
    containerStyle?: React.CSSProperties;
    videoStyle?: React.CSSProperties;
  }

  export default class QrScanner extends React.Component<QrScannerProps> {}
}
