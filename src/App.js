
// App.js - Main entry point for the ER Diagram Visualizer React app
// This component allows users to upload or paste SQL, parses it, and generates an ER diagram using Mermaid syntax.
// Key features: SQL parsing, Mermaid code generation, file upload, drag-and-drop, PNG export, and shareable link.

import { useCallback, useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas";
import Diagram from "./Diagram";
import "./App.css";


// Parses SQL CREATE TABLE statements to extract tables, columns, and foreign key relations
function parseSQL(sql) {
  const tables = {};
  const relations = [];


  const createTableRegex = /CREATE TABLE\s+(\w+)\s*\(([\s\S]*?)\);/gi;
  let match;


  while ((match = createTableRegex.exec(sql)) !== null) {
    const tableName = match[1];
    const body = match[2];

    tables[tableName] = [];

    // Split safely (handles commas inside constraints)
    const lines = body.split(/,(?![^()]*\))/);

    lines.forEach((line) => {
      line = line.trim();
      if (!line) return;

      // FOREIGN KEY: capture relationships between tables
      if (/FOREIGN KEY/i.test(line)) {
        const fkMatch = line.match(/\((.*?)\)/);
        const refMatch = line.match(/REFERENCES\s+(\w+)\((.*?)\)/i);

        if (fkMatch && refMatch) {
          relations.push({
            from: tableName,
            to: refMatch[1],
          });

          tables[tableName].push({
            name: fkMatch[1],
            type: "INT",
            key: "FK",
          });
        }
      }
      // Skip table-level constraints
      else if (/PRIMARY KEY\s*\(/i.test(line)) {
        return;
      }
      // COLUMN: parse column name, type, and key
      else {
        const parts = line.split(/\s+/);
        const colName = parts[0];
        const colType = parts[1] || "STRING";

        let key = "";
        if (/PRIMARY KEY/i.test(line)) key += "PK";
        if (/UNIQUE/i.test(line)) key += " UK";

        tables[tableName].push({
          name: colName,
          type: colType,
          key: key.trim(),
        });
      }
    });
  }

  return { tables, relations };
}


// Cleans and formats a string for Mermaid diagram compatibility
function toMermaidWord(value, { upper = false } = {}) {
  const cleaned = String(value || "")
    .replace(/\[|\]|`|"|'|/g, "")
    .replace(/[^A-Za-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  const safeValue = cleaned || "UNKNOWN";
  return upper ? safeValue.toUpperCase() : safeValue;
}


// Converts SQL type to a Mermaid-compatible type string
function toMermaidType(sqlType) {
  const baseType =
    String(sqlType || "STRING")
      .split("(")[0]
      .trim() || "STRING";
  return toMermaidWord(baseType, { upper: true });
}


// Converts parsed SQL structure to Mermaid ER diagram code
function convertToMermaid(parsed) {
  let output = "erDiagram\n";

  const { tables, relations } = parsed;

  Object.entries(tables).forEach(([table, columns]) => {
    const tableName = toMermaidWord(table, { upper: true });
    output += `    ${tableName} {\n`;

    columns.forEach((col) => {
      const columnType = toMermaidType(col.type);
      const columnName = toMermaidWord(col.name);
      const keySuffix = col.key ? ` ${col.key}` : "";
      output += `        ${columnType} ${columnName}${keySuffix}\n`;
    });

    output += "    }\n\n";
  });

  relations.forEach((rel) => {
    const toTable = toMermaidWord(rel.to, { upper: true });
    const fromTable = toMermaidWord(rel.from, { upper: true });
    output += `    ${toTable} ||--o{ ${fromTable} : has\n`;
  });

  return output;
}

function App() {

  // Main React component for the app UI and logic
  function App() {
    // State for SQL input, generated diagram, and error messages
    const [sql, setSql] = useState("");
    const [diagram, setDiagram] = useState("");
    const [error, setError] = useState("");
    const fileInputRef = useRef(null);

    // Reads a .sql file and updates the SQL input
    function readSqlFile(file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSql(event.target?.result || "");
        setError("");
      };
      reader.readAsText(file);
    }

    // Handles file upload via input
    function handleFileUpload(e) {
      const file = e.target.files[0];
      if (!file) return;
      readSqlFile(file);
      e.target.value = "";
    }

    // Handles drag-and-drop file upload
    function handleDrop(e) {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (!file) return;
      readSqlFile(file);
    }

    // Opens file dialog when drop zone is clicked
    function handleDropZoneClick() {
      fileInputRef.current?.click();
    }

    // Generates Mermaid diagram from SQL input
    const generateDiagram = useCallback(() => {
      try {
        if (!sql.trim()) {
          setError("Please enter SQL");
          setDiagram("");
          return;
        }
        const parsed = parseSQL(sql);
        if (Object.keys(parsed.tables).length === 0) {
          setError("No valid tables found");
          return;
        }
        const mermaidCode = convertToMermaid(parsed);
        setDiagram(mermaidCode);
        setError("");
      } catch (err) {
        setError("Invalid SQL format");
      }
    }, [sql]);

    // Auto-generate diagram when SQL input changes (with debounce)
    useEffect(() => {
      const trimmedSql = sql.trim();
      if (!trimmedSql) {
        setDiagram("");
        setError("");
        return;
      }
      const timer = setTimeout(() => {
        generateDiagram();
      }, 500);
      return () => clearTimeout(timer);
    }, [sql, generateDiagram]);

    // Exports the diagram as a PNG image
    function exportPNG() {
      const element = document.querySelector(".mermaid-container");
      if (!element) return;
      html2canvas(element).then((canvas) => {
        const link = document.createElement("a");
        link.download = "schema.png";
        link.href = canvas.toDataURL();
        link.click();
      });
    }

    // Copies a shareable link with the SQL encoded in the URL
    function copyShare() {
      const encoded = btoa(unescape(encodeURIComponent(sql)));
      const link = `${window.location.origin}?data=${encoded}`;
      navigator.clipboard.writeText(link);
      alert("Link copied!");
    }

    // Main UI rendering
    return (
      <div className="container">
        {/* Brand and tagline */}
        <div className="brand">
          <img src="/sql2erlogo.png" alt="SQL2ER logo" className="brand-logo" />
          <p className="brand-tagline">
            Convert SQL schemas into ER diagrams instantly.
          </p>
        </div>

        {/* File upload and drag-and-drop zone */}
        <div
          className="drop-zone"
          onClick={handleDropZoneClick}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          Drag &amp; Drop .sql file here OR click to upload
          <input
            ref={fileInputRef}
            type="file"
            accept=".sql"
            onChange={handleFileUpload}
          />
        </div>

        {/* SQL input textarea */}
        <textarea
          placeholder="Paste your SQL here..."
          value={sql}
          onChange={(e) => setSql(e.target.value)}
        />

        {/* Toolbar for actions */}
        <div className="toolbar">
          <button onClick={generateDiagram}>Generate</button>
          <button onClick={exportPNG}>Export PNG</button>
          <button onClick={copyShare}>Share</button>
        </div>
        {error && <p style={{ color: "red" }}>{error}</p>}

        {/* Diagram rendering */}
        <Diagram code={diagram} />
      </div>
    );
  }

export default App;
