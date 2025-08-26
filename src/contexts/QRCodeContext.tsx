import React, { createContext, useContext, useState, ReactNode } from "react";

interface QRCodeSettings {
  fgColor: string;
  bgColor: string;
  errorCorrectionLevel: "L" | "M" | "Q" | "H";
  includeMargin: boolean;
  logoImage: string | null;
  logoWidth: number;
  logoHeight: number;
  logoOpacity: number;
}

interface QRCodeContextType {
  settings: QRCodeSettings;
  updateSettings: (newSettings: Partial<QRCodeSettings>) => void;
  resetSettings: () => void;
}

const defaultSettings: QRCodeSettings = {
  fgColor: "#000000",
  bgColor: "#FFFFFF",
  errorCorrectionLevel: "M",
  includeMargin: true,
  logoImage: null,
  logoWidth: 50,
  logoHeight: 50,
  logoOpacity: 0.3,
};

const QRCodeContext = createContext<QRCodeContextType | undefined>(undefined);

export const useQRCode = () => {
  const context = useContext(QRCodeContext);
  if (context === undefined) {
    throw new Error("useQRCode must be used within a QRCodeProvider");
  }
  return context;
};

export const QRCodeProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<QRCodeSettings>(defaultSettings);

  const updateSettings = (newSettings: Partial<QRCodeSettings>) => {
    setSettings((prev) => ({
      ...prev,
      ...newSettings,
    }));
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
  };

  return (
    <QRCodeContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </QRCodeContext.Provider>
  );
};
