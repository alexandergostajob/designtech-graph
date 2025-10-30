# DesignTech Usage Visualization

View the application at: https://alexandergostajob.github.io/designtech-graph/

## Overview
This application is an interactive visualization tool built to explore and analyze the usage and interoperability of design technology tools across different companies. It provides a dynamic graph-based interface where users can explore relationships between various design tools, their users, and how they interact within the industry.

## Purpose
The application was created to:
- Visualize the interconnections between different design technology tools
- Map out which companies use specific design tools
- Identify interoperability between different tools
- Provide insights into the design technology ecosystem

## Features
- Interactive graph visualization using ReactFlow
- Force-directed layout powered by D3-force
- Floating edges and custom node designs
- Type filtering panel for different node categories
- Vertical and horizontal arrangement options
- Mini-map for easy navigation
- Controls for zooming and panning
- Node collision detection
- Dynamic edge connections

## Technology Stack
The application is built with web technologies:

### Core Technologies
- React (^19.1.0)
- Vite (for build tooling)
- @xyflow/react (^12.7.1) - For graph visualization
- D3-force (^3.0.0) - For force-directed graph layout
- Tailwind CSS - For styling

### Development Tools
- ESLint - For code linting
- Autoprefixer - For CSS compatibility
- TypeScript support
- GitHub Pages for deployment

## Getting Started

### Prerequisites
- Node.js (latest LTS version recommended)
- npm or yarn package manager

### Installation
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

### Development
Run the development server:
```bash
npm run dev
```

### Building for Production
Build the application:
```bash
npm run build
```

### Deployment
The application is configured for GitHub Pages deployment:
```bash
npm run deploy
```

## Project Structure
- `/src` - Source code
  - `App.jsx` - Main application component
  - `CustomNode.jsx` - Custom node implementations
  - `FloatingEdge.jsx` - Custom edge implementations
  - `utils.js` - Utility functions
  - `data.json` - Application data
  - Other components and assets


## Making Changes
To update the application:
```bash
git add .
git commit -m "Description of changes"
git push
npm run deploy
```

## License
Private repository - All rights reserved

## Author
Alexander Gösta