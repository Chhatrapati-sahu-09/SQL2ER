import { useState } from "react";
import Diagram from "./Diagram";
import "./App.css";

function stripIdentifierQuotes(value) {
  const trimmed = (value || "").trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed.slice(1, -1);
  }

  if (trimmed.startsWith("`") && trimmed.endsWith("`")) {
    return trimmed.slice(1, -1);
  }

  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function splitTopLevel(input, delimiter = ",") {
  const parts = [];
  let current = "";
  let depth = 0;
  let quote = "";

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    const next = input[i + 1];

    if (quote) {
      current += char;
      if ((quote === "'" || quote === '"') && char === quote && input[i - 1] !== "\\") quote = "";
      if (quote === "`") {
        if (char === "`") quote = "";
      }
      if (quote === "]") {
        if (char === "]") quote = "";
      }
      continue;
    }

    if (char === "'" || char === '"' || char === "`" || char === "[") {
      quote = char === "[" ? "]" : char;
      current += char;
      continue;
    }

    if (char === "(") depth += 1;
    if (char === ")") depth = Math.max(0, depth - 1);

    if (char === delimiter && depth === 0) {
      if (current.trim()) parts.push(current.trim());
      current = "";
      continue;
    }

    if (delimiter === ";" && char === "-" && next === "-") {
      while (i < input.length && input[i] !== "\n") i += 1;
      continue;
    }

    current += char;
  }

  if (current.trim()) parts.push(current.trim());
  return parts;
}

function splitTopLevelByWhitespace(input) {
  const parts = [];
  let current = "";
  let depth = 0;
  let quote = "";

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];

    if (quote) {
      current += char;
      if ((quote === "'" || quote === '"') && char === quote && input[i - 1] !== "\\") quote = "";
      if (quote === "`") {
        if (char === "`") quote = "";
      }
      if (quote === "]") {
        if (char === "]") quote = "";
      }
      continue;
    }

    if (char === "'" || char === '"' || char === "`" || char === "[") {
      quote = char === "[" ? "]" : char;
      current += char;
      continue;
    }

    if (char === "(") depth += 1;
    if (char === ")") depth = Math.max(0, depth - 1);

    if (/\s/.test(char) && depth === 0) {
      if (current.trim()) parts.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  if (current.trim()) parts.push(current.trim());
  return parts;
}

function normalizeColumnIdentifier(value = "") {
  const parts = value
    .split(".")
    .map((part) => stripIdentifierQuotes(part))
    .filter(Boolean);

  return parts[parts.length - 1] || stripIdentifierQuotes(value);
}

function normalizeTableIdentifier(value = "") {
  const parts = value
    .split(".")
    .map((part) => stripIdentifierQuotes(part))
    .filter(Boolean);

  return parts.join("_") || stripIdentifierQuotes(value);
}

function readIdentifierToken(input, startIndex) {
  let i = startIndex;

  while (i < input.length && /\s/.test(input[i])) i += 1;
  if (i >= input.length) return null;

  const start = i;
  if (input[i] === "[") {
    i += 1;
    while (i < input.length && input[i] !== "]") i += 1;
    return { token: input.slice(start, Math.min(i + 1, input.length)), end: Math.min(i + 1, input.length) };
  }

  if (input[i] === "`" || input[i] === '"') {
    const quote = input[i];
    i += 1;
    while (i < input.length && input[i] !== quote) i += 1;
    return { token: input.slice(start, Math.min(i + 1, input.length)), end: Math.min(i + 1, input.length) };
  }

  while (i < input.length && /[A-Za-z0-9_$#]/.test(input[i])) i += 1;
  if (i === start) return null;

  return { token: input.slice(start, i), end: i };
}

function readQualifiedIdentifier(input, startIndex) {
  const parts = [];
  let cursor = startIndex;

  while (true) {
    const part = readIdentifierToken(input, cursor);
    if (!part) break;
    parts.push(part.token);
    cursor = part.end;

    while (cursor < input.length && /\s/.test(input[cursor])) cursor += 1;
    if (input[cursor] !== ".") break;
    cursor += 1;
  }

  if (!parts.length) return null;
  return { token: parts.join("."), end: cursor };
}

function findMatchingParen(input, openIndex) {
  let depth = 0;
  let quote = "";

  for (let i = openIndex; i < input.length; i += 1) {
    const char = input[i];

    if (quote) {
      if ((quote === "'" || quote === '"') && char === quote && input[i - 1] !== "\\") quote = "";
      if (quote === "`") {
        if (char === "`") quote = "";
      }
      if (quote === "]") {
        if (char === "]") quote = "";
      }
      continue;
    }

    if (char === "'" || char === '"' || char === "`" || char === "[") {
      quote = char === "[" ? "]" : char;
      continue;
    }

    if (char === "(") depth += 1;
    if (char === ")") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }

  return -1;
}

function extractCreateTableBlocks(sql) {
  const blocks = [];
  const pattern = /CREATE\s+TABLE/gi;
  let match;

  while ((match = pattern.exec(sql)) !== null) {
    let cursor = match.index + match[0].length;

    const ifNotExists = /^\s+IF\s+NOT\s+EXISTS\b/i.exec(sql.slice(cursor));
    if (ifNotExists) cursor += ifNotExists[0].length;

    const tableToken = readQualifiedIdentifier(sql, cursor);
    if (!tableToken) continue;
    cursor = tableToken.end;

    while (cursor < sql.length && /\s/.test(sql[cursor])) cursor += 1;
    if (sql[cursor] !== "(") continue;

    const closeIndex = findMatchingParen(sql, cursor);
    if (closeIndex === -1) continue;

    blocks.push({
      tableName: normalizeTableIdentifier(tableToken.token),
      body: sql.slice(cursor + 1, closeIndex),
    });

    pattern.lastIndex = closeIndex + 1;
  }

  return blocks;
}

function parseIdentifierList(input = "") {
  return splitTopLevel(input).map((item) => normalizeColumnIdentifier(item));
}

function mergeKey(existingKey, nextKey) {
  const set = new Set();
  (existingKey || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((item) => set.add(item));
  (nextKey || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((item) => set.add(item));

  if (set.has("PK") && set.has("FK")) return "PK,FK";
  if (set.has("PK")) return "PK";
  if (set.has("FK")) return "FK";
  return "";
}

function parseColumnDefinition(line) {
  const identifier = readIdentifierToken(line, 0);
  if (!identifier) return null;

  const colName = normalizeColumnIdentifier(identifier.token);
  const remainder = line.slice(identifier.end).trim();
  if (!remainder) return null;

  const tokens = splitTopLevelByWhitespace(remainder);
  const stopKeywords = new Set([
    "CONSTRAINT",
    "PRIMARY",
    "REFERENCES",
    "NOT",
    "NULL",
    "UNIQUE",
    "DEFAULT",
    "CHECK",
    "COLLATE",
    "GENERATED",
    "IDENTITY",
    "AUTO_INCREMENT",
    "COMMENT",
    "ON",
  ]);

  const typeTokens = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const upper = tokens[i].toUpperCase();
    if (stopKeywords.has(upper)) break;
    typeTokens.push(tokens[i]);
  }

  const colType = (typeTokens.join(" ") || "TEXT").replace(/,$/, "");
  return { colName, colType, remainder };
}

function parseSQL(sql) {
  const tables = {};
  const relations = [];
  const relationKeys = new Set();

  function ensureTable(tableName) {
    if (!tables[tableName]) tables[tableName] = [];
  }

  function upsertColumn(tableName, colName, colType = "TEXT", key = "") {
    ensureTable(tableName);
    const existing = tables[tableName].find((col) => col.name === colName);
    if (!existing) {
      tables[tableName].push({ name: colName, type: colType, key });
      return;
    }

    if (existing.type === "TEXT" && colType && colType !== "TEXT") {
      existing.type = colType;
    }
    existing.key = mergeKey(existing.key, key);
  }

  function addRelation(from, to, fromColumns = [], toColumns = []) {
    const fromLabel = fromColumns.join(",");
    const toLabel = toColumns.join(",");
    const dedupe = `${from}->${to}|${fromLabel}|${toLabel}`;
    if (relationKeys.has(dedupe)) return;
    relationKeys.add(dedupe);

    const label = fromColumns.length
      ? `${fromColumns.join(",")} -> ${toColumns.join(",")}`
      : "has";

    relations.push({ from, to, label });
  }

  const createBlocks = extractCreateTableBlocks(sql);

  createBlocks.forEach(({ tableName, body }) => {
    ensureTable(tableName);
    const lines = splitTopLevel(body);
    const primaryKeyColumns = new Set();
    const foreignKeyColumns = new Set();

    lines.forEach((line) => {
      const cleanedLine = line.trim().replace(/,$/, "");
      if (!cleanedLine) return;

      const tablePkMatch = cleanedLine.match(/(?:CONSTRAINT\s+[^\s]+\s+)?PRIMARY\s+KEY\s*\(([^)]+)\)/i);
      if (tablePkMatch) {
        parseIdentifierList(tablePkMatch[1]).forEach((col) => primaryKeyColumns.add(col));
      }
    });

    lines.forEach((line) => {
      const cleanedLine = line.trim().replace(/,$/, "");
      if (!cleanedLine) return;

      const tableFkRegex = /(?:CONSTRAINT\s+[^\s]+\s+)?FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+([^\s(]+)\s*\(([^)]+)\)/gi;
      let fkMatch;
      let matchedTableLevelFk = false;

      while ((fkMatch = tableFkRegex.exec(cleanedLine)) !== null) {
        matchedTableLevelFk = true;
        const fkColumns = parseIdentifierList(fkMatch[1]);
        const refTable = normalizeTableIdentifier(fkMatch[2]);
        const refColumns = parseIdentifierList(fkMatch[3]);

        ensureTable(refTable);
        addRelation(tableName, refTable, fkColumns, refColumns);

        fkColumns.forEach((fkCol) => {
          foreignKeyColumns.add(fkCol);
          upsertColumn(tableName, fkCol, "TEXT", "FK");
        });
      }

      if (matchedTableLevelFk || /^(UNIQUE|KEY|INDEX|CHECK)\b/i.test(cleanedLine)) {
        return;
      }

      if (/^(?:CONSTRAINT\s+[^\s]+\s+)?PRIMARY\s+KEY\b/i.test(cleanedLine)) {
        return;
      }

      const parsedColumn = parseColumnDefinition(cleanedLine);
      if (!parsedColumn) return;

      const { colName, colType, remainder } = parsedColumn;
      let key = "";
      if (/\bPRIMARY\s+KEY\b/i.test(remainder) || primaryKeyColumns.has(colName)) key = mergeKey(key, "PK");
      if (/\bREFERENCES\b/i.test(remainder) || foreignKeyColumns.has(colName)) key = mergeKey(key, "FK");

      upsertColumn(tableName, colName, colType, key);

      const inlineRefMatch = remainder.match(/\bREFERENCES\s+([^\s(]+)\s*\(([^)]+)\)/i);
      if (inlineRefMatch) {
        const refTable = normalizeTableIdentifier(inlineRefMatch[1]);
        const refColumns = parseIdentifierList(inlineRefMatch[2]);
        ensureTable(refTable);
        addRelation(tableName, refTable, [colName], refColumns);
      }
    });
  });

  const statements = splitTopLevel(sql, ";");
  statements.forEach((statement) => {
    if (!/^\s*ALTER\s+TABLE\b/i.test(statement)) return;

    const alterPrefix = /ALTER\s+TABLE/i.exec(statement);
    if (!alterPrefix) return;
    const tableToken = readQualifiedIdentifier(statement, alterPrefix.index + alterPrefix[0].length);
    if (!tableToken) return;

    const tableName = normalizeTableIdentifier(tableToken.token);
    ensureTable(tableName);

    const rest = statement.slice(tableToken.end);
    const fkRegex = /FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+([^\s(]+)\s*\(([^)]+)\)/gi;
    let fkMatch;

    while ((fkMatch = fkRegex.exec(rest)) !== null) {
      const fkColumns = parseIdentifierList(fkMatch[1]);
      const refTable = normalizeTableIdentifier(fkMatch[2]);
      const refColumns = parseIdentifierList(fkMatch[3]);

      ensureTable(refTable);
      addRelation(tableName, refTable, fkColumns, refColumns);

      fkColumns.forEach((fkCol) => {
        upsertColumn(tableName, fkCol, "TEXT", "FK");
      });
    }
  });

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
    output += `    ${rel.to.toUpperCase()} ||--o{ ${rel.from.toUpperCase()} : ${rel.label || "has"}\n`;
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
