import { useEffect, useRef } from "react";
import mermaid from "mermaid";

export default function Diagram({ code }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!code) return;

    mermaid.initialize({
      startOnLoad: false,
      theme: "dark",
    });

    const id = "mermaid-diagram-" + Date.now();

    mermaid.render(id, code).then(({ svg }) => {
      if (ref.current) {
        ref.current.innerHTML = svg;
      }
    });
  }, [code]);

  return <div ref={ref}></div>;
}
