import { useEffect, useRef } from "react";
import mermaid from "mermaid";

export default function Diagram({ code }) {
  const ref = useRef(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: "dark",
    });

    if (ref.current) {
      ref.current.innerHTML = code;
      mermaid.contentLoaded();
    }
  }, [code]);

  return <div ref={ref} className="mermaid" />;
}
