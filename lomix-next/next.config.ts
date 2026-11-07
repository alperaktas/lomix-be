import type { NextConfig } from "next";
import { realpathSync } from "fs";

const nextConfig: NextConfig = {
  // Üst klasörde de package-lock.json olduğundan Next çalışma kökünü yanlış (üst klasör) seçiyordu;
  // Turbopack `tailwindcss` gibi paketleri bu yüzden çözemiyordu. Proje bir kısayol (junction) üzerinden
  // açılabildiği için gerçek yolu kullanıyoruz.
  turbopack: { root: realpathSync(process.cwd()) },
};

export default nextConfig;
