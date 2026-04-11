import { useEffect, useRef } from "react";
import mermaid from "mermaid";

export default function Diagram({ code }) {
  const ref = useRef(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: "dark",
      themeVariables: {
        darkMode: true,
        primaryColor: "#1E90FF",
        primaryTextColor: "#FFFFFF",
        primaryBorderColor: "#00C6FF",
        lineColor: "#00C6FF",
        tertiaryColor: "#1A2238",
        background: "#0B0F19",
        mainBkg: "#121826",
        secondBkg: "#1A2238",
      },
    });

    if (ref.current) {
      ref.current.innerHTML = code;
      mermaid.contentLoaded();
    }
  }, [code]);

  return <div ref={ref} className="mermaid" />;
}
