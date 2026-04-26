# Simple Workflow

This document shows a simple workflow of the SQL2ER application using a Mermaid diagram.

## Workflow Diagram

```mermaid
flowchart TD
    A[User provides SQL input (paste or upload file)]
    B[App parses SQL (parseSQL)]
    C[Convert to Mermaid code (convertToMermaid)]
    D[Render ER Diagram (Diagram.js + Mermaid)]
    E[User can Export PNG or Share Link]

    A --> B
    B --> C
    C --> D
    D --> E
```

## Steps Explained

1. **User provides SQL input**: The user either pastes SQL code or uploads a `.sql` file.
2. **App parses SQL**: The app extracts tables and relationships from the SQL using `parseSQL`.
3. **Convert to Mermaid code**: The parsed data is converted to Mermaid ER diagram syntax.
4. **Render ER Diagram**: The diagram is rendered as an interactive SVG using Mermaid in `Diagram.js`.
5. **Export/Share**: The user can export the diagram as a PNG image or share a link with the SQL encoded in the URL.

---

**Summary:**

1. Input SQL → 2. Parse SQL → 3. Generate Mermaid code → 4. Render Diagram → 5. Export/Share

This workflow makes it easy to visualize and share database structures from raw SQL, with no setup required.
