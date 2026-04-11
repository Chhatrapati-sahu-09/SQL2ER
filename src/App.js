import { useState } from "react";
import Diagram from "./Diagram";
import "./App.css";

function stripIdentifierQuotes(value) {
  return value.replace(/^[`"\[]+|[`"\]]+$/g, "");
}

function normalizeIdentifier(value = "") {
  const raw = stripIdentifierQuotes(value.trim());
  const parts = raw.split(".").filter(Boolean);
  return parts[parts.length - 1] || raw;
}

function splitSqlDefinitions(body) {
  const parts = [];
  let current = "";
  let depth = 0;

  for (let i = 0; i < body.length; i += 1) {
    const char = body[i];

    if (char === "(") depth += 1;
    if (char === ")") depth = Math.max(0, depth - 1);

    if (char === "," && depth === 0) {
      if (current.trim()) parts.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  if (current.trim()) parts.push(current.trim());
  return parts;
}

function parseSQL(sql) {
  const tables = {};
  const relations = [];

  const regex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([`"\[]?[\w.]+[`"\]]?)\s*\(([\s\S]*?)\)\s*;/gi;
  let match;

  while ((match = regex.exec(sql)) !== null) {
    const tableName = normalizeIdentifier(match[1]);
    const body = match[2];

    tables[tableName] = [];

    const lines = splitSqlDefinitions(body);
    const primaryKeyColumns = new Set();
    const foreignKeyColumns = new Set();

    lines.forEach((line) => {
      const normalizedLine = line.trim().replace(/,$/, "");

      const tablePkMatch = normalizedLine.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i);
      if (tablePkMatch) {
        tablePkMatch[1]
          .split(",")
          .map((col) => normalizeIdentifier(col))
          .forEach((col) => primaryKeyColumns.add(col));
      }
    });

    lines.forEach((line) => {
      const cleanedLine = line.trim().replace(/,$/, "");
      if (!cleanedLine) return;

      if (/^(PRIMARY|UNIQUE|KEY|INDEX|CONSTRAINT)\b/i.test(cleanedLine) && !/^CONSTRAINT\b.*\bFOREIGN\s+KEY\b/i.test(cleanedLine)) {
        return;
      }

      const fkMatch = cleanedLine.match(/FOREIGN\s+KEY\s*\(([^)]+)\)/i);
      const refMatch = cleanedLine.match(/REFERENCES\s+([`"\[]?[\w.]+[`"\]]?)\s*\(([^)]+)\)/i);

      if (fkMatch && refMatch) {
        const fkColumns = fkMatch[1]
          .split(",")
          .map((col) => normalizeIdentifier(col))
          .filter(Boolean);
        const refTable = normalizeIdentifier(refMatch[1]);

        relations.push({
          from: tableName,
          to: refTable,
        });

        fkColumns.forEach((fkColumn) => {
          foreignKeyColumns.add(fkColumn);
          const existingColumn = tables[tableName].find((col) => col.name === fkColumn);

          if (existingColumn) {
            existingColumn.key = existingColumn.key === "PK" ? "PK,FK" : "FK";
          } else {
            tables[tableName].push({
              name: fkColumn,
              type: "INT",
              key: "FK",
            });
          }
        });

        return;
      }

      const inlineRefMatch = cleanedLine.match(/\bREFERENCES\s+([`"\[]?[\w.]+[`"\]]?)\s*\(([^)]+)\)/i);
      const columnMatch = cleanedLine.match(/^([`"\[]?[\w]+[`"\]]?)\s+([^\s,]+)(.*)$/i);

      if (columnMatch) {
        const colName = normalizeIdentifier(columnMatch[1]);
        const colType = columnMatch[2];
        const remainder = columnMatch[3] || "";

        let key = "";
        if (/PRIMARY\s+KEY/i.test(remainder) || primaryKeyColumns.has(colName)) key = "PK";
        if (/\bREFERENCES\b/i.test(remainder) || foreignKeyColumns.has(colName)) {
          key = key ? `${key},FK` : "FK";
        }

        tables[tableName].push({
          name: colName,
          type: colType,
          key,
        });

        if (inlineRefMatch) {
          relations.push({
            from: tableName,
            to: normalizeIdentifier(inlineRefMatch[1]),
          });
        }
      }
    });
  }

  return { tables, relations };
}

function convertToMermaid(parsed) {
  let output = "erDiagram\n";

  const { tables, relations } = parsed;

  for (let table in tables) {
    output += `    ${table.toUpperCase()} {\n`;

    tables[table].forEach((col) => {
      output += `        ${col.type} ${col.name} ${col.key}\n`;
    });

    output += "    }\n\n";
  }

  relations.forEach((rel) => {
    output += `    ${rel.to.toUpperCase()} ||--o{ ${rel.from.toUpperCase()} : has\n`;
  });

  return output;
}

function App() {
  const [sql, setSql] = useState("");
  const [diagram, setDiagram] = useState("");

  const generateDiagram = () => {
    const parsed = parseSQL(sql);
    const mermaidCode = convertToMermaid(parsed);
    setDiagram(mermaidCode);
  };

  return (
    <div className="container">
      <h1>SchemaViz</h1>

      <textarea
        placeholder="Paste your SQL here..."
        value={sql}
        onChange={(e) => setSql(e.target.value)}
      />

      <button onClick={generateDiagram}>Generate Diagram</button>

      <Diagram code={diagram} />
    </div>
  );
}

export default App;
