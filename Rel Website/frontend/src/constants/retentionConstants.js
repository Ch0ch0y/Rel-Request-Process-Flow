/**
 * Retention Constants - Box Locations and Retention Record Formats
 */

export const BOX_LOCATION_DEFAULTS = [
  'AUTOMOTIVE Q1 \'26 BOX#',
  'AUTOMOTIVE Q2 \'26 BOX#',
  'AUTOMOTIVE Q3 \'26 BOX#',
  'AUTOMOTIVE Q4 \'26 BOX#',
  'AUTOMOTIVE Q# \'(YEAR) BOX#',
  'LT Q1 \'26',
  'LT Q2 \'26',
  'LT Q3 \'26',
  'LT Q4 \'26',
  'LT Q# \'(YEAR)',
  'MRT Q1 2026',
  'MRT Q2 2026',
  'MRT Q3 2026',
  'MRT Q4 2026',
  'MRT Q# (YEAR)',
  'JEDEC',
  'AUTOMOTIVE EXCESS 2026 BOX#',
  'AUTOMOTIVE EXCESS (YEAR) BOX#',
  'QUAL EXCESS',
  'IFX 2026',
  'IFX (YEAR)',
];

export const SAMPLE_CARRIERS = [
  'Tubes',
  'JEDEC',
  'Box',
  'Pouch',
];

export const REMARKS_EXAMPLES = [
  'REL ASSESS',
  'SHIPPED',
  'PULLED OUT',
];

/**
 * Initialize retention data structure
 */
export function initializeRetentionData() {
  return {
    boxLocations: [...BOX_LOCATION_DEFAULTS],
    retentionData: {
      reliabilityTested: {
        dateRetent: '',
        boxLocation: '',
        quantity: '',
        legNum: '',
        retentBy: '',
        remarks: '',
      },
      excessUnits: {
        dateRetent: '',
        boxLocation: '',
        quantity: '',
        retentBy: '',
        remarks: '',
      },
      sentToTanyag: {
        dateRetent: '',
        sampleCarrier: '',
        quantity: '',
        retentBy: '',
        dateCheckedAtRetention: '',
        tanyagRetentionBoxNum: '',
        remarks: '',
      },
    },
  };
}

/**
 * Parse retention details from JSON string
 */
export function parseRetentionDetails(detailsStr) {
  if (!detailsStr) return initializeRetentionData();
  try {
    const parsed = JSON.parse(detailsStr);
    // Ensure boxLocations array exists and is merged with defaults
    if (!parsed.boxLocations) {
      parsed.boxLocations = [...BOX_LOCATION_DEFAULTS];
    } else {
      // Merge with defaults to ensure all defaults are available
      const defaults = new Set(BOX_LOCATION_DEFAULTS);
      parsed.boxLocations = Array.from(new Set([...parsed.boxLocations, ...defaults]));
    }
    // Ensure retentionData structure is complete
    if (!parsed.retentionData) {
      parsed.retentionData = initializeRetentionData().retentionData;
    }
    return parsed;
  } catch {
    return initializeRetentionData();
  }
}

/**
 * Serialize retention data to JSON string
 */
export function serializeRetentionDetails(retentionData) {
  return JSON.stringify(retentionData, null, 2);
}

/**
 * Check if any retention data is filled in
 */
export function hasRetentionData(retentionData) {
  if (!retentionData) return false;
  const { retentionData: data } = retentionData;
  if (!data) return false;

  const hasReliability = Object.values(data.reliabilityTested || {}).some(v => v);
  const hasExcess = Object.values(data.excessUnits || {}).some(v => v);
  const hasTanyag = Object.values(data.sentToTanyag || {}).some(v => v);

  return hasReliability || hasExcess || hasTanyag;
}
