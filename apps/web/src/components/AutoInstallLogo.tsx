import { useEffect } from "react";

export function AutoInstallLogo() {
  useEffect(() => {
    fetch("/api/install-logo").catch(() => {});
  }, []);
  return null;
}

