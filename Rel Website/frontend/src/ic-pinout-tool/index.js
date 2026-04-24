// ic-pinout-tool/index.js
// Main entry for IC Pinout Automation Tool (JS version)
// Modular: image analysis, parameter normalization, SVG drawing, export

import analyzeImage from './imageAnalysis.js';
import normalizeParams from './parameterNormalization.js';
import drawSVG from './svgDrawing.js';
import exportOutputs from './exporter.js';

export async function generatePinoutFromImage(imageFile) {
  // 1. Analyze image to extract parameters
  const params = await analyzeImage(imageFile);
  // 2. Normalize parameters
  const normalized = normalizeParams(params);
  // 3. Generate SVG
  const svg = drawSVG(normalized);
  // 4. Export outputs (SVG, PNG, JSON)
  const outputs = await exportOutputs(svg, normalized);
  return outputs;
}

// Example usage (for dev):
// generatePinoutFromImage('example.png').then(console.log);