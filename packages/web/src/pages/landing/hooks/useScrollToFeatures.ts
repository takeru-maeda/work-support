import { useCallback } from "react";

export const useScrollToFeatures = () =>
  useCallback(() => {
    const featuresSection = document.getElementById("features");
    if (featuresSection) {
      featuresSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

