import { useEffect, useRef } from "react";
import mermaid from "mermaid";

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

        const svgElement = containerRef.current.querySelector("svg");
        if (!svgElement) return;

        let scale = 1;
        let translateX = 0;
        let translateY = 0;
        let isDragging = false;
        let lastX = 0;
        let lastY = 0;

        svgElement.style.transformOrigin = "0 0";
        svgElement.style.cursor = "grab";
        svgElement.style.userSelect = "none";

        const applyTransform = () => {
          svgElement.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
        };

        const onWheel = (event) => {
          event.preventDefault();
          const zoomStep = event.deltaY < 0 ? 1.1 : 0.9;
          scale = Math.min(3, Math.max(0.5, scale * zoomStep));
          applyTransform();
        };

        const onMouseDown = (event) => {
          isDragging = true;
          lastX = event.clientX;
          lastY = event.clientY;
          svgElement.style.cursor = "grabbing";
        };

        const onMouseMove = (event) => {
          if (!isDragging) return;
          translateX += event.clientX - lastX;
          translateY += event.clientY - lastY;
          lastX = event.clientX;
          lastY = event.clientY;
          applyTransform();
        };

        const onMouseUp = () => {
          isDragging = false;
          svgElement.style.cursor = "grab";
        };

        containerRef.current.addEventListener("wheel", onWheel, {
          passive: false,
        });
        containerRef.current.addEventListener("mousedown", onMouseDown);
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);

        // Attach cleanup for this render cycle.
        containerRef.current._cleanup = () => {
          containerRef.current.removeEventListener("wheel", onWheel);
          containerRef.current.removeEventListener("mousedown", onMouseDown);
          window.removeEventListener("mousemove", onMouseMove);
          window.removeEventListener("mouseup", onMouseUp);
        };
      }
    });

    return () => {
      if (containerRef.current?._cleanup) {
        containerRef.current._cleanup();
      }
    };
  }, [code]);

  return (
    <div
      ref={containerRef}
      className="mermaid-container"
      style={{
        overflow: "hidden",
        border: "1px solid #1e293b",
        borderRadius: "10px",
      }}
    />
  );
}
