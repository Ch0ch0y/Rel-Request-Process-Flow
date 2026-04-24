// ic-pinout-tool/parameterNormalization.js
// Step 2: Normalize extracted parameters for drawing
export default function normalizeParams(params) {
  // Ensure all required fields are present and valid
  // Calculate pins per side, layout, etc.
  const { pinCount, bodySize, centerPad, pinLabels, packageType } = params;
  let sides = 4;
  let pinsPerSide = Math.floor(pinCount / sides);
  let extra = pinCount % sides;
  let layout = [];
  let pinNum = 1;
  for (let s = 0; s < sides; s++) {
    let count = pinsPerSide + (s < extra ? 1 : 0);
    layout.push({ side: s, pins: Array(count).fill(0).map(() => pinNum++) });
  }
  return { ...params, layout };
}
