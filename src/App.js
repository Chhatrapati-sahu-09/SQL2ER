import { useRef, useState } from "react";
import Diagram from "./Diagram";
import "./App.css";

function parseSQL(sql) {
  const tables = {};
  const relations = [];

  const createTableRegex = /CREATE TABLE\s+(\w+)\s*\(([\s\S]*?)\);/gi;
  let match;

  while ((match = createTableRegex.exec(sql)) !== null) {
    const tableName = match[1];
    const body = match[2];

    tables[tableName] = [];

    // Split safely, preserving commas inside parentheses.
    const lines = body.split(/,(?![^()]*\))/);

    lines.forEach((line) => {
      line = line.trim();
      if (!line) return;

      if (/FOREIGN KEY/i.test(line)) {
        const createTableRegex = /CREATE TABLE\s+(\w+)\s*\(([\s\S]*?)\);/gi;
        const refMatch = line.match(/REFERENCES\s+(\w+)\((.*?)\)/i);

        if (fkMatch && refMatch) {
          relations.push({
            from: tableName,
            to: refMatch[1],
          });

          // Split safely (handles commas inside constraints)
          const lines = body.split(/,(?![^\(]*\))/);
            type: "INT",
            key: "FK",
          });
            if (!line) return;
        }
            // FOREIGN KEY
            if (/FOREIGN KEY/i.test(line)) {
              const fkMatch = line.match(/\((.*?)\)/);
      } else {
        const parts = line.split(/\s+/);
        const colName = parts[0];
        const colType = parts[1] || "STRING";

        let key = "";
        if (/PRIMARY KEY/i.test(line)) key += "PK";
        if (/UNIQUE/i.test(line)) key += " UQ";

        tables[tableName].push({
          name: colName,
          type: colType,
          key: key.trim(),
        });
      }

  return { tables, relations };
}
  let output = "erDiagram\n";

  const { tables, relations } = parsed;
              const colType = parts[1] || "STRING";
  Object.entries(tables).forEach(([table, columns]) => {
    output += `    ${table.toUpperCase()} {\n`;

    columns.forEach((col) => {
      output += `        ${col.type} ${col.name} ${col.key}\n`;
    });

    output += "    }\n\n";
                key,

  relations.forEach((rel) => {
    output += `    ${rel.to.toUpperCase()} ||--o{ ${rel.from.toUpperCase()} : has\n`;
  });

  return output;
}

function App() {
  const [sql, setSql] = useState("");
  const [diagram, setDiagram] = useState("");
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  function readSqlFile(file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      setSql(event.target?.result || "");
      setError("");
    };
    reader.readAsText(file);
  }

  function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    readSqlFile(file);
    e.target.value = "";
  }

  function handleDrop(e) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;

    readSqlFile(file);
  }

  function handleDropZoneClick() {
    fileInputRef.current?.click();
  }

  const generateDiagram = () => {
    try {
      if (!sql.trim()) {
        setError("Please enter SQL");
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
  };

  return (
    <div className="container">
      <h1>SchemaViz</h1>

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

      <textarea
        placeholder="Paste your SQL here..."
        value={sql}
        onChange={(e) => setSql(e.target.value)}
      />

      <button onClick={generateDiagram}>Generate Diagram</button>
      {error && <p style={{ color: "red" }}>{error}</p>}

      <Diagram code={diagram} />
    </div>
  );
}

export default App;
