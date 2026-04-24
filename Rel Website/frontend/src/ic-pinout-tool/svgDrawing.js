// ic-pinout-tool/svgDrawing.js
// Step 3: Generate SVG pinout drawing from normalized params
export default function drawSVG(params) {
  const { bodySize, layout, centerPad, pinLabels, packageType } = params;
  const w = 200, h = 200;
  const pad = 30;
  const pinLen = 16;
  const pinW = 6;
  const fontSize = 10;
  let svg = [];
  // Outline
  svg.push(`<rect x="${pad}" y="${pad}" width="${w-2*pad}" height="${h-2*pad}" fill="white" stroke="black" stroke-width="2"/>`);
  // Center pad
  if (centerPad) {
    svg.push(`<rect x="${w/2-18}" y="${h/2-18}" width="36" height="36" fill="#eee" stroke="#888" stroke-width="1.5"/>`);
  }
  // Pins
  let sides = layout.length;
  for (let s = 0; s < sides; s++) {
    let pins = layout[s].pins;
    for (let i = 0; i < pins.length; i++) {
      let pinNum = pins[i];
      let x, y, dx=0, dy=0, labelX, labelY;
      if (s === 0) { // Top
        x = pad + ((w-2*pad)/(pins.length+1))*(i+1);
        y = pad;
        dy = -pinLen;
        labelX = x;
        labelY = y - pinLen - 2;
      } else if (s === 1) { // Right
        x = w-pad;
        y = pad + ((h-2*pad)/(pins.length+1))*(i+1);
        dx = pinLen;
        labelX = x + pinLen + 2;
        labelY = y + 3;
      } else if (s === 2) { // Bottom
        x = pad + ((w-2*pad)/(pins.length+1))*(pins.length-i);
        y = h-pad;
        dy = pinLen;
        labelX = x;
        labelY = y + pinLen + fontSize;
      } else { // Left
        x = pad;
        y = pad + ((h-2*pad)/(pins.length+1))*(pins.length-i);
        dx = -pinLen;
        labelX = x - pinLen - 2;
        labelY = y + 3;
      }
      svg.push(`<rect x="${x-pinW/2}" y="${y-pinW/2}" width="${pinW}" height="${pinW}" fill="#fff" stroke="#333"/>`);
      svg.push(`<line x1="${x}" y1="${y}" x2="${x+dx}" y2="${y+dy}" stroke="#333" stroke-width="2"/>`);
      svg.push(`<text x="${labelX}" y="${labelY}" font-size="${fontSize}" text-anchor="middle" fill="#222">${pinLabels[pinNum-1]}</text>`);
    }
  }
  // SVG wrapper
  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${svg.join('')}</svg>`;
}
