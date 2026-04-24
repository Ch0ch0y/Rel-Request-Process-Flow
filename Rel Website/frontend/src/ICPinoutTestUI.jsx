// IC Pinout Tool Test UI
// Simple React component for uploading an image and running analysis
import React, { useRef, useState } from 'react';
import analyzeImage from './ic-pinout-tool/imageAnalysis';
import normalizeParams from './ic-pinout-tool/parameterNormalization';
import drawSVG from './ic-pinout-tool/svgDrawing';

export default function ICPinoutTestUI() {
  const [svg, setSvg] = useState(null);
  const [params, setParams] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInput = useRef();

  async function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    // For real use, pass file to analyzeImage
    const params = await analyzeImage(file);
    const normalized = normalizeParams(params);
    setParams(normalized);
    const svgStr = drawSVG(normalized);
    setSvg(svgStr);
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 600, margin: '2rem auto', padding: 24, background: '#f8fafc', borderRadius: 12 }}>
      <h2>IC Pinout Tool Test UI</h2>
      <input type="file" accept="image/*" ref={fileInput} onChange={handleFileChange} />
      {loading && <p>Analyzing image...</p>}
      {svg && (
        <div style={{ marginTop: 24 }}>
          <h3>Generated Pinout SVG:</h3>
          <div dangerouslySetInnerHTML={{ __html: svg }} style={{ border: '1px solid #ccc', background: '#fff', padding: 16 }} />
        </div>
      )}
      {params && (
        <pre style={{ marginTop: 24, background: '#eee', padding: 12, borderRadius: 8 }}>
          {JSON.stringify(params, null, 2)}
        </pre>
      )}
    </div>
  );
}
