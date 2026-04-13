import { useEffect, useRef } from "react";
import mermaid from "mermaid";
import panzoom from "panzoom";

export default function Diagram({ code }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!code) return;

    mermaid.initialize({
      startOnLoad: false,
      theme: "dark",
    });

    const id = "diagram-" + Date.now();

    mermaid.render(id, code).then(({ svg }) => {
      if (containerRef.current) {
        containerRef.current.innerHTML = svg;
      }
    });

    let instance;
    const timeout = setTimeout(() => {
      if (containerRef.current) {
        instance = panzoom(containerRef.current, {
          maxZoom: 3,
          minZoom: 0.5,
          bounds: true,
        });
      }
    }, 0);

    return () => {
      clearTimeout(timeout);
      if (instance) instance.dispose();
    };
  }, [code]);

  return (
    <div
      ref={containerRef}
      style={{
        overflow: "hidden",
        border: "1px solid #1e293b",
        borderRadius: "10px",
      }}
    />
  );
}
