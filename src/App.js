import { useState } from "react";
import Diagram from "./Diagram";
import "./App.css";

function App() {
  const [sql, setSql] = useState("");

  // Static diagram (Day 1 only)
  const demoDiagram = `
    erDiagram
        USERS {
            INT id PK
            VARCHAR name
        }
        ORDERS {
            INT id PK
            INT user_id FK
        }
        USERS ||--o{ ORDERS : places
  `;

  return (
    <div className="container">
      <h1>SQL -&gt; ER Diagram Visualizer</h1>

      <textarea
        placeholder="Paste your SQL here..."
        value={sql}
        onChange={(e) => setSql(e.target.value)}
      />

      <button>Generate Diagram</button>

      <Diagram code={demoDiagram} />
    </div>
  );
}

export default App;
