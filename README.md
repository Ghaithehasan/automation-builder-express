# Automation Builder Project

A lightweight workflow builder built with Node.js + Express + EJS + Vanilla JavaScript. It lets you drag nodes onto a canvas, run them in sequence, and save/load workflows in a local JSON file (no database).

## Features
- Node palette served from the backend (Log + Color).
- Drag & drop nodes into a workspace (HTML5 Drag & Drop API).
- Run single nodes (Log/Color) for quick testing.
- Run a full workflow in sequence (top to bottom order in the workspace).
- Save workflows to `src/data/workflows.json`.
- Load the latest saved workflow.

## Tech Stack
- Node.js + Express.js (ES Modules)
- EJS for server-rendered UI
- Vanilla JavaScript
- CSS (custom UI)
- File system JSON storage (no database)

## Project Structure
```
Automation Project/
├── package.json
├── package-lock.json
├── .env
├── .gitignore
├── README.md
├── public/
│   ├── app.js
│   └── style.css
├── views/
│   └── index.ejs
└── src/
    ├── app.js
    ├── server.js
    ├── constants/
    │   └── nodeTypes.js
    ├── controllers/
    │   ├── executions.controller.js
    │   ├── nodeTypes.controller.js
    │   └── workflows.controller.js
    ├── routes/
    │   └── api.routes.js
    └── data/
        └── workflows.json
```

## Getting Started
1) Install dependencies:
```
npm install
```

2) Create `.env` if it does not exist:
```
PORT=3000
```

3) Run the server:
```
npm start
```

4) Open:
```
http://localhost:3000
```

## UI Usage
### 1) Node Palette (Left)
- Drag **Log** or **Color** into the canvas.
- Each drop creates a new node instance.

### 2) Workspace (Center)
- Nodes execute in the order they appear (top to bottom).
- Each node has:
  - Message text
  - Color selector for Color nodes
  - Delete button

### 3) Execution Output (Right)
- Press **Run Workflow** to execute the current workspace.
- Each node output is listed in sequence.
- Color nodes display output using the chosen color.

### 4) Node Tester (Right)
- Use Log Node Runner / Color Node Runner for isolated tests.

### 5) Workflow Actions (Header)
- **Load**: Fetch latest saved workflow and populate the UI.
- **Save**: Save current workspace to `workflows.json`.
- **Run Workflow**: Execute current workspace in order.

## API Endpoints
### GET /api/node-types
Returns available node types.

### POST /api/executions/run
Runs a single node.

Request:
```
{
  "type": "log",
  "data": { "message": "Hello" }
}
```

### POST /api/executions/run-workflow
Runs a workflow in sequence.

Request:
```
{
  "nodes": [
    {"id":"log-1","type":"log","data":{"message":"Hello"}},
    {"id":"color-1","type":"color","data":{"message":"Warning","color":"blue"}}
  ],
  "edges": [
    {"source":"log-1","target":"color-1"}
  ]
}
```

### POST /api/workflows
Saves a workflow to JSON storage.

### GET /api/workflows/latest
Returns the latest saved workflow.

## Storage
- Workflows are stored in:
  - `src/data/workflows.json`
- Each saved workflow has:
  - `id`, `name`, `nodes`, `edges`, `createdAt`

## Notes
- No React and no database.
- ES Modules only (`import/export`).
- Drag & Drop uses native HTML5 API.

## Quick Test
1) Drag Log + Color into the canvas.
2) Set messages and color.
3) Click **Run Workflow**.
4) Click **Save** and then **Load** to verify persistence.
