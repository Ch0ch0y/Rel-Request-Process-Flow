import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import ProcessTimeline from '../components/ProcessTimeline';
import {
  ArrowLeft, Save, CheckCircle2, Clock, AlertTriangle, Calendar,
  ChevronDown, ChevronUp, Edit3, X, ImagePlus, Trash2,
  GripVertical, PlusCircle, Plus, Settings2, Check, Download, FileSpreadsheet,
  MessageSquarePlus, Pencil, LayoutList, Archive,
  Send, ShieldCheck, ThumbsUp, ThumbsDown, FileCheck
} from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';
import EmployeeSelect from '../components/EmployeeSelect';
import MachineSelect from '../components/MachineSelect';
import EnhancedRetentionDetails from '../components/EnhancedRetentionDetails';
import { parseRetentionDetails, hasRetentionData } from '../constants/retentionConstants';

// ─── Cycle Time (CT) lookup tables (source: standard reference Excel) ─────────
// Bake CT by stored test_condition string
const BAKE_CT = {
  '90°C / 4 hrs': 1,
  '125°C / 1 hr': 1, '125°C / 2 hrs': 1, '125°C / 3 hrs': 1, '125°C / 4 hrs': 1,
  '125°C / 5 hrs': 1, '125°C / 6 hrs': 1, '125°C / 7 hrs': 1, '125°C / 8 hrs': 1,
  '125°C / 9 hrs': 1, '125°C / 10 hrs': 1, '125°C / 12 hrs': 1, '125°C / 16 hrs': 1,
  '125°C / 24 hrs': 2, '125°C / 48 hrs': 2,
  '130°C / 6 hrs': 1,
  '150°C / 1 hr': 1, '150°C / 2 hr': 1, '150°C / 3 hr': 1, '150°C / 4 hr': 1,
  '150°C / 5 hr': 1, '150°C / 6 hr': 1, '150°C / 7 hr': 1, '150°C / 8 hr': 1,
  '150°C / 9 hr': 1, '150°C / 10 hr': 1, '150°C / 12 hr': 1, '150°C / 16 hr': 1,
  '150°C / 24 hr': 2, '150°C / 48 hr': 2,
};
const DRY_BAKE_CT = {
  'DRY BAKE 125°C / 1 hr': 0.1,  'DRY BAKE 125°C / 2 hrs': 0.1,
  'DRY BAKE 125°C / 3 hrs': 0.2, 'DRY BAKE 125°C / 4 hrs': 0.2,
  'DRY BAKE 125°C / 5 hrs': 0.5, 'DRY BAKE 125°C / 6 hrs': 0.5,
  'DRY BAKE 125°C / 7 hrs': 0.5, 'DRY BAKE 125°C / 8 hrs': 0.5,
  'DRY BAKE 125°C / 9 hrs': 0.5, 'DRY BAKE 125°C / 10 hrs': 0.5,
  'DRY BAKE 125°C / 11 hrs': 1,  'DRY BAKE 125°C / 12 hrs': 1,
  'DRY BAKE 125°C / 14 hrs': 1,  'DRY BAKE 125°C / 16 hrs': 1,
  'DRY BAKE 125°C / 18 hrs': 1,  'DRY BAKE 125°C / 20 hrs': 1,
  'DRY BAKE 125°C / 22 hrs': 1,  'DRY BAKE 125°C / 24 hrs': 1,
  'DRY BAKE 150°C / 2 hrs': 0.1,  'DRY BAKE 150°C / 4 hrs': 0.2,
  'DRY BAKE 150°C / 6 hrs': 0.5,  'DRY BAKE 150°C / 8 hrs': 0.5,
  'DRY BAKE 150°C / 10 hrs': 0.5, 'DRY BAKE 150°C / 12 hrs': 1,
  'DRY BAKE 150°C / 16 hrs': 1,   'DRY BAKE 150°C / 24 hrs': 1,
  'DRY BAKE 150°C / 48 hrs': 2,
};
const TH_SOAK_CT = {
  'L1 85/85-168': 7,  'L2 85/60-168': 7,   'L2A 30/60-696': 29,
  'L2Aacc 60/60-120': 5, 'L3 30/60-192': 8, 'L3acc 60/60-40': 2,
  'L4 30/60-96': 4,   'L4acc 60/60-20': 1, 'L5 30/60-72': 3,
  'L5acc 60/60-15': 1, 'L5A 30/60-48': 2,  'L5Aacc 60/60-10': 1,
  '1J 1JC 85°C / 85%, 168hrs': 7,
  '2J 2JC 85°C / 65%, 168hrs': 7,
  '3J 3JC 85°C / 30%, 168hrs + 30°C / 70%, 168hrs': 14,
};
const ETEST_CT = { 'P4': 2, 'P1': 4 };
const MRT_TC_CT = {
  'MTC -40°C to +60°C / 5 cyc': 1,   'MTC -55°C to +85°C / 5 cyc': 1,
  'MTC -55°C to +125°C (B)': 1,       'MTC -55°C to +125°C (B) / 5 cyc': 1,
  'MTC -55°C to +150°C': 1,           'MTC -65°C to +150°C (C)': 1,
  'MTC -65°C to +150°C (C) / 5 cyc': 1, 'MTC -65°C to +150°C (C) / 10 cyc': 1,
  'MTC -65°C to +150°C (C) / 20 cyc': 1, 'MTC -65°C to +150°C (C) / 30 cyc': 1,
};
// TC: CT depends on read-point at end of condition string
const TC_READ_POINT_CT = { '500X': 17, '1000X': 38, '1500X': 50, '2000X': 76 };
const HTS_CT = {
  'HTS 125°C / 500 hrs': 21,  'HTS 125°C / 1000 hrs': 42,
  'HTS 125°C / 1500 hrs': 63, 'HTS 125°C / 2000 hrs': 84,
  'HTS 150°C / 500 hrs': 21,  'HTS 150°C / 1000 hrs': 42,
  'HTS 150°C / 1500 hrs': 63, 'HTS 150°C / 2000 hrs': 84,
  'HTS 175°C / 500 hrs': 21,  'HTS 175°C / 1000 hrs': 42,
  'HTS 175°C / 1500 hrs': 63, 'HTS 175°C / 2000 hrs': 84,
};
const HAST_CT = {
  'HAST unbiased 130/85 / 96 hrs': 4,   'HAST unbiased 130/85 / 192 hrs': 8,
  'HAST unbiased 130/85 / 288 hrs': 12, 'HAST unbiased 130/85 / 384 hrs': 16,
  'HAST unbiased 130/85 / 480 hrs': 20,
  'HAST unbiased 110/85 / 264 hrs': 11, 'HAST unbiased 110/85 / 528 hrs': 22,
  'HAST unbiased 110/85 / 792 hrs': 33,
  'HAST biased 130/85 / 96 hrs': 4,   'HAST biased 130/85 / 192 hrs': 8,
  'HAST biased 130/85 / 288 hrs': 12, 'HAST biased 130/85 / 384 hrs': 16,
  'HAST biased 130/85 / 480 hrs': 20,
  'HAST biased 110/85 / 264 hrs': 11, 'HAST biased 110/85 / 528 hrs': 22,
  'HAST biased 110/85 / 792 hrs': 33,
};
const TH_CT = {
  'T&H unbiased 85/85 / 500 hrs': 21, 'T&H unbiased 85/85 / 1000 hrs': 42,
  'T&H biased 85/85 / 500 hrs': 21,   'T&H biased 85/85 / 1000 hrs': 42,
};
const PCT_FIXED_CT = {
  'PCT 121°C / 100%rh / 2 atm / 96 hrs': 4,
  'PCT 121°C / 100%rh / 2 atm / 192 hrs': 8,
  'PCT 121°C / 100%rh / 2 atm / 288 hrs': 12,
};
const MAD_CT = {
  'L1 - 85°C/85%RH': 7, 'L2 - 85°C/60%RH': 7, 'L3 - 30°C/60%RH': 8,
};
const WHISKER_TH_CT = {
  '500hrs': 21, '1000hrs': 42, '1500hrs': 63, '2000hrs': 84, '3000hrs': 125, '4000hrs': 167,
};
const _CA_IPI_PCA_ITEMS = new Set([
  'full ca', 'non-std fca', 'non-std con ana (complex)', 'non-std con ana (easy)',
  'ipi (plasma decap)', 'ipi (chemical decap)', 'full pca', 'non-std pca', 'non-std con ana',
]);

/**
 * Get the standard Cycle Time (CT) in days for a step, based on its name and
 * custom_fields.test_condition. Returns a number (may be fractional) or null
 * when CT is variable / TBA.
 */
function getStepCT(step) {
  const name = (step.step_name || '').toLowerCase().trim();
  const cf   = step.custom_fields || {};
  const cond = (cf.test_condition || '').trim();
  const item = (cf.test_item || '').toLowerCase().trim();

  // ── Fixed CTs by step name ────────────────────────────────────────────────
  if (name === 'incoming inspection') return 1;
  if (name === 'visual')              return 1;
  if (name === 'serialize samples' || name === 'serialize sample') return 1;
  if (name === 'o/s' || name === 'open/short') return 2;
  if (name === 'sat') return 2;
  if (name === 'staging') return null;

  // CA / IPI / PCA / Product Audit items — all 2 days
  if (_CA_IPI_PCA_ITEMS.has(item)) return 2;

  // ── Electrical Test ───────────────────────────────────────────────────────
  if (name === 'electrical test') return ETEST_CT[cond] ?? null;

  // ── Bake ──────────────────────────────────────────────────────────────────
  if (name === 'bake') {
    const v = BAKE_CT[cond];
    if (v !== undefined) return v;
    // Custom hours formula: #hrs / 24 (rounded up)
    const m = cond.match(/^(?:125|150)°C \/ (\d+(?:\.\d+)?) hrs?$/);
    if (m) return Math.ceil(parseFloat(m[1]) / 24);
    return null;
  }

  // ── Dry Bake ──────────────────────────────────────────────────────────────
  if (name === 'dry bake') {
    const v = DRY_BAKE_CT[cond];
    if (v !== undefined) return v;
    const m = cond.match(/^DRY BAKE (?:125|150)°C \/ (\d+(?:\.\d+)?) hrs?$/);
    if (m) return Math.ceil(parseFloat(m[1]) / 24);
    return null;
  }

  // ── T&H Soak ────────────────────────────────────────────────────────────
  if (name === 't&h soak') {
    // New format: test_item='L1', test_condition='85/85-168' → lookup 'L1 85/85-168'
    // Legacy format: test_condition='L1 85/85-168' (backward compat)
    const v = TH_SOAK_CT[item + ' ' + cond] ?? TH_SOAK_CT[cond];
    if (v !== undefined) return v;
    // Fallback: parse last number from condition, e.g. "30/60-192" → 192 hrs, "30/60-72 hrs" → 72 hrs
    const m = cond.match(/-(\d+(?:\.\d+)?)\s*(?:hrs?)?$/i);
    if (m) return Math.ceil(parseFloat(m[1]) / 24);
    return null;
  }

  // ── FCR / Reflow ──────────────────────────────────────────────────────────
  if (name === 'forced convection reflow (fcr)') return 1;
  if (name === 'reflow') return 1;

  // ── MRT TC ────────────────────────────────────────────────────────────────
  if (name === 'moisture resistance test') {
    if (MRT_TC_CT[cond] !== undefined) return MRT_TC_CT[cond];
    if (TH_SOAK_CT[cond] !== undefined) return TH_SOAK_CT[cond];
    return 1; // reflow-cycle MRT conditions
  }

  // ── Temperature Cycle ─────────────────────────────────────────────────────
  if (name === 'temperature cycle') {
    for (const [rp, ct] of Object.entries(TC_READ_POINT_CT)) {
      if (cond.endsWith(rp)) return ct;
    }
    // Custom cycles: #cyc / 30
    const m = cond.match(/(\d+)X$/);
    if (m) return Math.ceil(parseInt(m[1], 10) / 30);
    // Custom hours: "TC C -65/+150 192hrs"
    const mhrs = cond.match(/(\d+(?:\.\d+)?)hrs$/i);
    if (mhrs) return Math.ceil(parseFloat(mhrs[1]) / 24);
    return null;
  }

  // ── Reliability Test (HTS / HAST / T&H / PCT / TC) ──────────────────────
  if (name === 'reliability test' || name === 'hts' || name === 'high temp storage') {
    if (HTS_CT[cond]        !== undefined) return HTS_CT[cond];
    if (HAST_CT[cond]       !== undefined) return HAST_CT[cond];
    if (TH_CT[cond]         !== undefined) return TH_CT[cond];
    if (PCT_FIXED_CT[cond]  !== undefined) return PCT_FIXED_CT[cond];
    // TC condition within reliability test (e.g. "TC A -55/+85 500X")
    for (const [rp, ct] of Object.entries(TC_READ_POINT_CT)) {
      if (cond.endsWith(rp)) return ct;
    }
    // Custom hours formula: "HTS 125°C / 192 hrs" style
    const m = cond.match(/\/ (\d+(?:\.\d+)?) hrs?$/);
    if (m) return Math.ceil(parseFloat(m[1]) / 24);
    // TC custom hours within reliability test: "TC C -65/+150 192hrs"
    const mhrs = cond.match(/(\d+(?:\.\d+)?)hrs$/i);
    if (mhrs) return Math.ceil(parseFloat(mhrs[1]) / 24);
    return null;
  }

  // ── MAD ───────────────────────────────────────────────────────────────────
  if (name === 'moisture absorption and desorption' || item === 'mad') return MAD_CT[cond] ?? null;

  // ── Whisker Test ──────────────────────────────────────────────────────────
  if (name === 'whisker test') {
    if ((item === 'th 30/60' || item === 'th 55/85') && WHISKER_TH_CT[cond] !== undefined)
      return WHISKER_TH_CT[cond];
    // Custom hours for TH 55/85: e.g. "2500hrs"
    if (item === 'th 55/85') {
      const m = cond.match(/^(\d+(?:\.\d+)?)hrs$/i);
      if (m) return Math.ceil(parseFloat(m[1]) / 24);
    }
    if (item === 'visual' || item === 'reflow' || item === 'sem') return 1;
    return null;
  }

  return null;
}

const SAT_CATEGORIES = [
  { key: 't_scan_1_24',    label: 'T-Scan 1\u201324',           optional: false },
  { key: 'c_scan_1_1_24',  label: '1. C-Scan 1\u201324',        optional: false },
  { key: 'c_scan_2_1_24',  label: '2. C-Scan 1\u201324',        optional: true  },
  { key: 't_scan_25_48',   label: 'T-Scan 25\u201348',          optional: false },
  { key: 'c_scan_1_25_48', label: '1. C-Scan 25\u201348',       optional: false },
  { key: 'c_scan_2_25_48', label: '2. C-Scan 25\u201348',       optional: true  },
  { key: 't_scan_49_77',   label: 'T-Scan 49\u201377',          optional: false },
  { key: 'c_scan_1_49_77', label: '1. C-Scan 49\u201377',       optional: false },
  { key: 'c_scan_2_49_77', label: '2. C-Scan 49\u201377',       optional: true  },
];

const BAKE_TEST_ITEMS = ['Bake'];

const VISUAL_TEST_ITEMS = ['Visual'];
const VISUAL_TEST_CONDITIONS = ['X40'];

const INSPECTION_TEST_ITEMS = ['Inspection'];
const INSPECTION_TEST_CONDITIONS = ['Note if units are in Jedec tray, Canister, TNR, etc.'];

const SERIALIZE_TEST_ITEMS = ['Serialize'];
// SERIALIZE_TEST_CONDITIONS is built dynamically from totalSS — see StepDetailPanel

const OS_TEST_ITEMS = ['Open/Short'];
const OS_TEST_CONDITIONS = ['Open/Short'];

const SAT_TEST_ITEMS = ['SAT'];
const SAT_TEST_CONDITIONS = ['T&C Scan'];

/**
 * Returns the default { item, cond } for the Rel Test Traveller table.
 * Used when a step has no saved test_item / test_condition yet.
 */
function getDefaultTravCells(stepName, totalSS) {
  const n = (stepName || '').toLowerCase().trim();
  if (n === 'inspection' || n === 'incoming inspection') {
    return { item: 'Inspection', cond: 'Note if units are in Jedec tray, Canister, TNR, etc.' };
  }
  if (n === 'visual') {
    return { item: 'Visual', cond: 'X40' };
  }
  if (n === 'serialize samples' || n === 'serialize sample') {
    const cond = totalSS
      ? `Mark units from 1 to ${totalSS} for SAT identification`
      : 'Mark units from 1 to (TOTAL SS) for SAT identification';
    return { item: 'Serialize', cond };
  }
  if (n === 'o/s' || n === 'open/short') {
    return { item: 'Open/Short', cond: 'Open/Short' };
  }
  if (n === 'sat') {
    return { item: 'SAT', cond: 'T&C Scan' };
  }
  return { item: stepName || '', cond: '' };
}

const CA_TEST_ITEMS = ['Full CA', 'NON-STD FCA', 'NON-STD CON ANA (Complex)', 'NON-STD CON ANA (Easy)'];
// No predefined conditions for CA — users can add via the pencil editor if needed

const IPI_TEST_ITEMS = ['IPI (Plasma Decap)', 'IPI (Chemical Decap)'];
// No predefined conditions for IPI — users can add via the pencil editor if needed

const PCA_TEST_ITEMS = ['Full PCA', 'NON-STD PCA'];
// No predefined conditions for PCA — users can add via the pencil editor if needed

const PRODUCT_AUDIT_TEST_ITEMS = ['NON-STD CON ANA'];
// No predefined conditions for Product Audit — users can add via the pencil editor if needed

const MAD_TEST_ITEMS = ['MAD'];
const MAD_TEST_CONDITIONS = [
  'L1 - 85°C/85%RH',
  'L2 - 85°C/60%RH',
  'L3 - 30°C/60%RH',
];

const MRT_TEST_ITEMS = ['Moisture Resistance Test (JEDEC MRT)', 'Moisture Resistance Test (EIAJ MRT)', 'MRT TC', 'Reflow'];

const TH_SOAK_TEST_ITEMS = ['L1', 'L2', 'L2A', 'L2Aacc', 'L3', 'L3acc', 'L4', 'L4acc', 'L5', 'L5acc', 'L5A', 'L5Aacc', 'L6', 'non-standard'];
// T&H Soak Test Condition Options (separate from test item)
const TH_SOAK_TEST_CONDITIONS = [
  '85/85-168',
  '85/60-168',
  '30/60-696',
  '60/60-120',
  '30/60-192',
  '60/60-40',
  '30/60-96',
  '60/60-20',
  '30/60-72',
  '60/60-15',
  '30/60-48',
  '60/60-10',
  '30/60-Xhrs',
];
const TH_SOAK_FIXED_CONDITIONS = new Set(TH_SOAK_TEST_CONDITIONS.filter(c => c !== '30/60-Xhrs'));
const MRT_JEDEC_CONDITIONS = [
  'L1 85/85-168',
  'L2 85/60-168',
  'L2A 30/60-696',
  'L2Aacc 60/60-120',
  'L3 30/60-192',
  'L3acc 60/60-40',
  'L4 30/60-96',
  'L4acc 60/60-20',
  'L5 30/60-72',
  'L5acc 60/60-15',
  'L5A 30/60-48',
  'L5Aacc 60/60-10',
  'L6 30/60-custom_hrs',
  'non-standard',
];
const MRT_EIAJ_CONDITIONS = [
  "1J / 1JC 85\u00b0C / 85%, 168hrs",
  "2J / 2JC 85\u00b0C / 65%, 168hrs",
  "3J / 3JC 85\u00b0C / 30%, 168hrs + 30\u00b0C / 70%, 168hrs",
];
const MRT_TC_CONDITIONS = [
  'MTC -40°C to +60°C / 5 cyc',
  'MTC -55°C to +85°C / 5 cyc',
  'MTC -55°C to +125°C (B)',
  'MTC -55°C to +125°C (B) / 5 cyc',
  'MTC -55°C to +150°C',
  'MTC -65°C to +150°C (C)',
  'MTC -65°C to +150°C (C) / 5 cyc',
  'MTC -65°C to +150°C (C) / 10 cyc',
  'MTC -65°C to +150°C (C) / 20 cyc',
  'MTC -65°C to +150°C (C) / 30 cyc',
];
const MRT_REFLOW_CONDITIONS = [
  '220°C 1x', '220°C 2x', '220°C 3x', '220°C 4x', '220°C 5x', '220°C 6x', '220°C custom_cyc',
  '235°C 1x', '235°C 2x', '235°C 3x', '235°C 4x', '235°C 5x', '235°C 6x', '235°C custom_cyc',
  '245°C 1x', '245°C 2x', '245°C 3x', '245°C 4x', '245°C 5x', '245°C 6x', '245°C custom_cyc',
  '250°C 1x', '250°C 2x', '250°C 3x', '250°C 4x', '250°C 5x', '250°C 6x', '250°C custom_cyc',
  '260°C 1x', '260°C 2x', '260°C 3x', '260°C 4x', '260°C 5x', '260°C 6x', '260°C custom_cyc',
];
const MRT_FIXED_CONDITIONS = new Set([
  ...MRT_JEDEC_CONDITIONS.filter(c => !c.includes('custom_hrs')),
  ...MRT_EIAJ_CONDITIONS,
  ...MRT_TC_CONDITIONS,
  ...MRT_REFLOW_CONDITIONS.filter(c => !c.includes('custom_cyc')),
]);
const MRT_TEST_CONDITIONS = [...MRT_JEDEC_CONDITIONS, ...MRT_EIAJ_CONDITIONS, ...MRT_TC_CONDITIONS, ...MRT_REFLOW_CONDITIONS];

const PRECON_TEST_ITEMS = ['L1', 'L2', 'L2A', 'L2Aacc', 'L3', 'L3acc', 'L4', 'L4acc', 'L5', 'L5acc', 'L5A', 'L5Aacc', 'L6', 'non-standard'];
const PRECON_TEST_CONDITIONS = [
  '85/85-168',
  '85/60-168',
  '30/60-696',
  '60/60-120',
  '30/60-192',
  '60/60-40',
  '30/60-96',
  '60/60-20',
  '30/60-72',
  '60/60-15',
  '30/60-48',
  '60/60-10',
  '30/60-custom_hrs',
];
const PRECON_FIXED_CONDITIONS = new Set(PRECON_TEST_CONDITIONS.filter(c => !c.includes('custom_hrs')));

const FCR_TEST_ITEMS = ['Reflow'];
const FCR_TEST_CONDITIONS = [
  '220°C 1x', '220°C 2x', '220°C 3x', '220°C 4x', '220°C 5x', '220°C 6x', '220°C custom_cyc',
  '235°C 1x', '235°C 2x', '235°C 3x', '235°C 4x', '235°C 5x', '235°C 6x', '235°C custom_cyc',
  '245°C 1x', '245°C 2x', '245°C 3x', '245°C 4x', '245°C 5x', '245°C 6x', '245°C custom_cyc',
  '250°C 1x', '250°C 2x', '250°C 3x', '250°C 4x', '250°C 5x', '250°C 6x', '250°C custom_cyc',
  '260°C 1x', '260°C 2x', '260°C 3x', '260°C 4x', '260°C 5x', '260°C 6x', '260°C custom_cyc',
];
const FCR_FIXED_CONDITIONS = new Set(FCR_TEST_CONDITIONS.filter(c => !c.includes('custom_cyc')));

const RELIABILITY_TEST_ITEMS = ['High Temp Storage (HTS)', 'HAST unbiased', 'HAST biased', 'T&H unbiased', 'T&H biased', 'PCT', 'Temperature Cycle'];
const HTS_TEST_CONDITIONS = [
  'HTS 125°C / 500 hrs',  'HTS 125°C / 1000 hrs',
  'HTS 125°C / 1500 hrs', 'HTS 125°C / 2000 hrs',
  'HTS 125°C / custom_hrs',
  'HTS 150°C / 500 hrs',  'HTS 150°C / 1000 hrs',
  'HTS 150°C / 1500 hrs', 'HTS 150°C / 2000 hrs',
  'HTS 150°C / custom_hrs',
  'HTS 175°C / 500 hrs',  'HTS 175°C / 1000 hrs',
  'HTS 175°C / 1500 hrs', 'HTS 175°C / 2000 hrs',
  'HTS 175°C / custom_hrs',
  'HTS 200°C / custom_hrs',
];
const HAST_UNBIASED_TEST_CONDITIONS = [
  'HAST unbiased 130/85 / 96 hrs',  'HAST unbiased 130/85 / 192 hrs',
  'HAST unbiased 130/85 / 288 hrs', 'HAST unbiased 130/85 / 384 hrs',
  'HAST unbiased 130/85 / 480 hrs', 'HAST unbiased 130/85 / custom_hrs',
  'HAST unbiased 110/85 / 264 hrs', 'HAST unbiased 110/85 / 528 hrs',
  'HAST unbiased 110/85 / 792 hrs', 'HAST unbiased 110/85 / custom_hrs',
];
const HAST_BIASED_TEST_CONDITIONS = [
  'HAST biased 130/85 / 96 hrs',  'HAST biased 130/85 / 192 hrs',
  'HAST biased 130/85 / 288 hrs', 'HAST biased 130/85 / 384 hrs',
  'HAST biased 130/85 / 480 hrs', 'HAST biased 130/85 / custom_hrs',
  'HAST biased 110/85 / 264 hrs', 'HAST biased 110/85 / 528 hrs',
  'HAST biased 110/85 / 792 hrs', 'HAST biased 110/85 / custom_hrs',
];
const TH_UNBIASED_TEST_CONDITIONS = [
  'T&H unbiased 85/85 / 500 hrs',
  'T&H unbiased 85/85 / 1000 hrs',
  'T&H unbiased 85/85 / custom_hrs',
];
const TH_BIASED_TEST_CONDITIONS = [
  'T&H biased 85/85 / 500 hrs',
  'T&H biased 85/85 / 1000 hrs',
  'T&H biased 85/85 / custom_hrs',
];
const PCT_TEST_CONDITIONS = [
  'PCT 121°C / 100%rh / 2 atm / 96 hrs',
  'PCT 121°C / 100%rh / 2 atm / 192 hrs',
  'PCT 121°C / 100%rh / 2 atm / 288 hrs',
  'PCT 121°C / 100%rh / 2 atm / custom_hrs',
];

// ── Temperature Cycle ─────────────────────────────────────────────
const TC_TEST_ITEMS = [
  'TC A -55/+85',
  'TC B -55/+125',
  'TC C -65/+150',
  'TC G -40/+125',
  'TC H -55/+150',
  'TC N -40/+85',
];
const TC_TYPE_CONDITIONS = (prefix) => [
  `${prefix} 500X`,
  `${prefix} 1000X`,
  `${prefix} 1500X`,
  `${prefix} 2000X`,
  `${prefix} Custom`,
];
const TC_TEST_CONDITIONS = [
  ...TC_TYPE_CONDITIONS('TC A -55/+85'),
  ...TC_TYPE_CONDITIONS('TC B -55/+125'),
  ...TC_TYPE_CONDITIONS('TC C -65/+150'),
  ...TC_TYPE_CONDITIONS('TC G -40/+125'),
  ...TC_TYPE_CONDITIONS('TC H -55/+150'),
  ...TC_TYPE_CONDITIONS('TC N -40/+85'),
];
const TC_FIXED_CONDITIONS = new Set(TC_TEST_CONDITIONS.filter(c => !c.endsWith('Custom')));

// Fixed (non-custom) reliability conditions — must not be converted to sentinels on load
const RELIABILITY_FIXED_CONDITIONS = new Set([
  ...HTS_TEST_CONDITIONS.filter(c => !c.includes('custom_hrs')),
  ...HAST_UNBIASED_TEST_CONDITIONS.filter(c => !c.includes('custom_hrs')),
  ...HAST_BIASED_TEST_CONDITIONS.filter(c => !c.includes('custom_hrs')),
  ...TH_UNBIASED_TEST_CONDITIONS.filter(c => !c.includes('custom_hrs')),
  ...TH_BIASED_TEST_CONDITIONS.filter(c => !c.includes('custom_hrs')),
  ...PCT_TEST_CONDITIONS.filter(c => !c.includes('custom_hrs')),
  ...TC_FIXED_CONDITIONS,
]);
// Combined list — used as the default for the options-editor modal
const RELIABILITY_TEST_CONDITIONS = [...HTS_TEST_CONDITIONS, ...HAST_UNBIASED_TEST_CONDITIONS, ...HAST_BIASED_TEST_CONDITIONS, ...TH_UNBIASED_TEST_CONDITIONS, ...TH_BIASED_TEST_CONDITIONS, ...PCT_TEST_CONDITIONS, ...TC_TEST_CONDITIONS];

// ── Whisker Test ────────────────────────────────────────────────────────────
const WHISKER_TEST_ITEMS = ['Visual', 'Reflow', 'TH 30/60', 'TH 55/85', 'TC A -55/85', 'SEM'];
const WHISKER_TH_30_60_CONDITIONS = ['500hrs', '1000hrs', '1500hrs', '2000hrs', '3000hrs', '4000hrs'];
const WHISKER_TH_55_85_CONDITIONS = ['500hrs', '1000hrs', '1500hrs', '2000hrs', '3000hrs', '4000hrs', 'Custom'];
const WHISKER_TC_A_CONDITIONS = ['500X', '1000X', '1500X', '2000X'];
const WHISKER_SEM_CONDITIONS = ['Grain measurement'];
const WHISKER_TEST_CONDITIONS = [...WHISKER_TH_30_60_CONDITIONS, ...WHISKER_TH_55_85_CONDITIONS, ...WHISKER_TC_A_CONDITIONS, ...WHISKER_SEM_CONDITIONS];

const BAKE_TEST_CONDITIONS = [
  '90°C / 4 hrs',
  '125°C / 1 hr',
  '125°C / 2 hrs',
  '125°C / 3 hrs',
  '125°C / 4 hrs',
  '125°C / 5 hrs',
  '125°C / 6 hrs',
  '125°C / 7 hrs',
  '125°C / 8 hrs',
  '125°C / 9 hrs',
  '125°C / 10 hrs',
  '125°C / 12 hrs',
  '125°C / 16 hrs',
  '125°C / 24 hrs',
  '125°C / 48 hrs',
  '125°C / custom_hrs',
  '130°C / 6 hrs',
  '150°C / 1 hr',
  '150°C / 2 hr',
  '150°C / 3 hr',
  '150°C / 4 hr',
  '150°C / 5 hr',
  '150°C / 6 hr',
  '150°C / 7 hr',
  '150°C / 8 hr',
  '150°C / 9 hr',
  '150°C / 10 hr',
  '150°C / 12 hr',
  '150°C / 16 hr',
  '150°C / 24 hr',
  '150°C / 48 hr',
  '150°C / custom_hrs',
];

const BAKE_FIXED_CONDITIONS = new Set(BAKE_TEST_CONDITIONS.filter(c => !c.includes('custom_hrs')));

const DRY_BAKE_TEST_ITEMS = ['DRY BAKE'];
const DRY_BAKE_TEST_CONDITIONS = [
  'DRY BAKE 125°C / 1 hr',
  'DRY BAKE 125°C / 2 hrs',
  'DRY BAKE 125°C / 3 hrs',
  'DRY BAKE 125°C / 4 hrs',
  'DRY BAKE 125°C / 5 hrs',
  'DRY BAKE 125°C / 6 hrs',
  'DRY BAKE 125°C / 7 hrs',
  'DRY BAKE 125°C / 8 hrs',
  'DRY BAKE 125°C / 9 hrs',
  'DRY BAKE 125°C / 10 hrs',
  'DRY BAKE 125°C / 11 hrs',
  'DRY BAKE 125°C / 12 hrs',
  'DRY BAKE 125°C / 14 hrs',
  'DRY BAKE 125°C / 16 hrs',
  'DRY BAKE 125°C / 18 hrs',
  'DRY BAKE 125°C / 20 hrs',
  'DRY BAKE 125°C / 22 hrs',
  'DRY BAKE 125°C / 24 hrs',
  'DRY BAKE 125°C / custom_hrs',
  'DRY BAKE 150°C / 2 hrs',
  'DRY BAKE 150°C / 4 hrs',
  'DRY BAKE 150°C / 6 hrs',
  'DRY BAKE 150°C / 8 hrs',
  'DRY BAKE 150°C / 10 hrs',
  'DRY BAKE 150°C / 12 hrs',
  'DRY BAKE 150°C / 16 hrs',
  'DRY BAKE 150°C / 24 hrs',
  'DRY BAKE 150°C / 48 hrs',
  'DRY BAKE 150°C / custom_hrs',
];
const DRY_BAKE_FIXED_CONDITIONS = new Set(DRY_BAKE_TEST_CONDITIONS.filter(c => !c.includes('custom_hrs')));

const DEFAULT_STEP_PRESETS = [
  'Incoming Inspection', 'Visual', 'Serialize Samples',
  'O/S', 'SAT', 'Bake', 'Dry Bake', 'T&H Soak', 'Reflow',
  'Electrical Test', // Added Electrical Test step
  'Reliability Test', 'Temperature Cycle', 'HTS', 'Moisture Resistance Test',
  'Preconditioning (Precon)', 'Forced Convection Reflow (FCR)', 'Whisker Test', 'Staging',
];
// Electrical Test Step
const ELECTRICAL_TEST_ITEMS = ['E-Test'];
const ELECTRICAL_TEST_CONDITIONS = ['P4', 'P1', 'Customer Site', 'Other 3rd Party'];

// Staging Step
const STAGING_TEST_ITEMS = ['ROOM TEMP'];
const STAGING_TEST_CONDITIONS = ['ROOM TEMP'];


const DEFAULT_PROCESS_PRESETS = [
  {
    id: 'default',
    label: '15-Step Flow',
    description: 'Standard reliability qualification flow',
    steps: [
      'Incoming Inspection', 'Visual', 'Serialize Samples', 'O/S', 'SAT',
      'Bake', 'Dry Bake', 'T&H Soak', 'Reflow', 'SAT', 'O/S', 'Visual',
      'Reliability Test', 'Temperature Cycle', 'SAT', 'O/S', 'Visual',
    ],
  },
  {
    id: 'mrt',
    label: 'MRT Process',
    description: 'Moisture Resistance Test qualification flow',
    steps: [
      'Incoming Inspection', 'Visual', 'Serialize Samples', 'O/S', 'SAT',
      'Bake', 'Dry Bake', 'Preconditioning (Precon)',
      'Moisture Resistance Test', 'Forced Convection Reflow (FCR)',
      'Temperature Cycle', 'SAT', 'O/S', 'Visual',
    ],
  },
  {
    id: 'reliability',
    label: 'Reliability Test',
    description: 'Reliability testing qualification flow',
    steps: [
      'Incoming Inspection', 'Visual', 'Serialize Samples', 'O/S', 'SAT',
      'Bake', 'Dry Bake', 'T&H Soak', 'Reflow',
      'Reliability Test', 'Temperature Cycle', 'SAT', 'O/S', 'Visual',
    ],
  },
  {
    id: 'relmon',
    label: 'RelMon',
    description: 'Reliability Monitor qualification flow',
    steps: [
      'Incoming Inspection', 'Visual', 'Serialize Samples', 'O/S', 'SAT',
      'Bake', 'Reflow', 'Temperature Cycle', 'SAT', 'O/S', 'Visual',
    ],
  },
];

const LS_PRESETS_KEY = 'rel_step_presets';
const LS_STEP_OPTS_PREFIX = 'rel_step_opts_';

function NewProcessModal({ onClose, onSave, createdByUsername }) {
  const [label, setLabel] = useState('');
  const [selectedSteps, setSelectedSteps] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const addStep = (step) => setSelectedSteps(prev => [...prev, step]);
  const removeStep = (index) => setSelectedSteps(prev => prev.filter((_, i) => i !== index));

  const handleSave = async () => {
    if (!label.trim()) { setError('Process name is required'); return; }
    if (selectedSteps.length === 0) { setError('Add at least one step'); return; }
    setSaving(true); setError('');
    try {
      await onSave({ label: label.trim(), description: '', steps: selectedSteps });
    } catch (e) {
      setError(e.message || 'Failed to save');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h4 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">New Process Template</h4>
            <p className="text-[10px] text-slate-400 mt-0.5">Created by: <span className="font-medium text-slate-500 dark:text-slate-300">{createdByUsername}</span></p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Process Name</label>
            <input
              type="text" autoFocus
              value={label}
              onChange={e => setLabel(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="e.g. My Custom Flow"
              className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 transition-all"
            />
          </div>

          {selectedSteps.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Selected Steps ({selectedSteps.length})</p>
              <div className="flex flex-wrap gap-1.5">
                {selectedSteps.map((step, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-medium">
                    <span className="text-blue-400 dark:text-blue-500 text-[10px]">{i + 1}.</span> {step}
                    <button onClick={() => removeStep(i)} className="ml-0.5 text-blue-400 hover:text-blue-600 dark:hover:text-blue-200 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Available Steps — click to add</p>
            <div className="flex flex-wrap gap-1.5">
              {DEFAULT_STEP_PRESETS.map(step => (
                  <button key={step} type="button" onClick={() => addStep(step)}
                    className="px-2 py-1 rounded-lg text-xs font-medium transition-colors border bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 cursor-pointer">
                    {step}
                  </button>
                ))}
            </div>
          </div>

          {error && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>}
        </div>

        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors flex items-center gap-1.5">
            {saving
              ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
              : <><Plus className="w-3.5 h-3.5" /> Save Process</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function loadStepOpts(key, defaults) {
  try {
    const raw = localStorage.getItem(LS_STEP_OPTS_PREFIX + key);
    return raw ? JSON.parse(raw) : defaults;
  } catch { return defaults; }
}
function saveStepOpts(key, list) {
  try { localStorage.setItem(LS_STEP_OPTS_PREFIX + key, JSON.stringify(list)); } catch {}
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Queue' },
  { value: 'hold', label: 'Hold' },
  { value: 'completed', label: 'Done' },
  { value: 'failed', label: 'Failed' },
];

function InfoRow({ label, value }) {
  const display = (value === null || value === undefined || value === '') ? '—' : (typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value);
  return (
    <div className="flex justify-between py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</span>
      <span className={`text-sm text-right ${display === '—' ? 'text-slate-300' : 'text-slate-700'}`}>{display}</span>
    </div>
  );
}

function OptionsEditorModal({ title, options, onSave, onClose }) {
  const [list, setList] = useState([...options]);
  const [editIdx, setEditIdx] = useState(null);
  const [editVal, setEditVal] = useState('');
  const [newInput, setNewInput] = useState('');

  const commitEdit = (i) => {
    const t = editVal.trim();
    if (t) setList(l => l.map((x, idx) => idx === i ? t : x));
    setEditIdx(null);
  };
  const addNew = () => {
    const t = newInput.trim();
    if (t) { setList(l => [...l, t]); setNewInput(''); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h4 className="font-semibold text-slate-800 text-sm">{title}</h4>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-1 overflow-y-auto flex-1">
          {list.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-3">No options yet — add one below.</p>
          )}
          {list.map((opt, i) => (
            <div key={i} className="flex items-center gap-2 group rounded-lg px-2 py-1 hover:bg-slate-50">
              {editIdx === i ? (
                <>
                  <input
                    autoFocus
                    value={editVal}
                    onChange={e => setEditVal(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') commitEdit(i); if (e.key === 'Escape') setEditIdx(null); }}
                    className="flex-1 border border-blue-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                  <button onClick={() => commitEdit(i)} className="p-1 rounded hover:bg-emerald-100 text-emerald-600"><Check className="w-3 h-3" /></button>
                  <button onClick={() => setEditIdx(null)} className="p-1 rounded hover:bg-slate-100 text-slate-400"><X className="w-3 h-3" /></button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-xs text-slate-700 truncate">{opt}</span>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditIdx(i); setEditVal(opt); }} className="p-1 rounded hover:bg-blue-100 text-slate-400 hover:text-blue-600" title="Rename"><Pencil className="w-3 h-3" /></button>
                    <button onClick={() => setList(l => l.filter((_, idx) => idx !== i))} className="p-1 rounded hover:bg-red-100 text-slate-400 hover:text-red-500" title="Delete"><Trash2 className="w-3 h-3" /></button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">
          <div className="flex gap-2">
            <input
              value={newInput}
              onChange={e => setNewInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addNew(); }}
              placeholder="Add new option…"
              className="flex-1 border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
            />
            <button onClick={addNew} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium flex items-center gap-1">
              <Plus className="w-3 h-3" /> Add
            </button>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={onClose} className="px-3 py-1.5 border border-slate-200 rounded text-xs text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={() => onSave(list)} className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-medium flex items-center gap-1">
              <Save className="w-3 h-3" /> Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepDetailPanel({ step, requestId, onUpdated, canUpdate, totalSteps, leg = 1, totalSS, estimatedStart = null, steps = [] }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [imageUploading, setImageUploading] = useState(null); // category key being uploaded, or null
  const [satImages, setSatImages] = useState({});             // { categoryKey: [url, ...] }
  const [employeeMap, setEmployeeMap] = useState({});

  const isSATStep          = step.step_name?.toUpperCase() === 'SAT';
  const isBakeStep         = step.step_name?.toLowerCase() === 'bake';
  const isDryBakeStep      = step.step_name?.toLowerCase() === 'dry bake';
  const isVisualStep       = step.step_name?.toLowerCase() === 'visual';
  const isInspectionStep   = step.step_name?.toLowerCase() === 'incoming inspection';
  const isSerializeStep    = step.step_name?.toLowerCase() === 'serialize samples';
  const isOSStep           = step.step_name?.toLowerCase() === 'o/s';
  const isReliabilityStep  = step.step_name?.toLowerCase() === 'reliability test';
  const isCAStep           = step.step_name?.toLowerCase() === 'construction analysis (ca)';
  const isIPIStep          = step.step_name?.toLowerCase() === 'internal physical inspection (ipi)';
  const isPCAStep          = step.step_name?.toLowerCase() === 'physical construction analysis (pca)';
  const isProductAuditStep = step.step_name?.toLowerCase() === 'product audit';
  const isMADStep          = step.step_name?.toLowerCase() === 'moisture absorption and desorption';
  const isMRTStep          = step.step_name?.toLowerCase() === 'moisture resistance test';
  const isPreconStep       = step.step_name?.toLowerCase() === 'preconditioning (precon)';
  const isFCRStep          = step.step_name?.toLowerCase() === 'forced convection reflow (fcr)';
  const isTCStep            = step.step_name?.toLowerCase() === 'temperature cycle';
  const isWhiskerTestStep   = step.step_name?.toLowerCase() === 'whisker test';
  const isElectricalStep     = step.step_name?.toLowerCase() === 'electrical test';
  const isTHSoakStep         = step.step_name?.toLowerCase() === 't&h soak';
  const isStagingStep        = step.step_name?.toLowerCase() === 'staging';

  const serializeCondition = totalSS
    ? `Mark units from 1 to ${totalSS} for SAT identification`
    : 'Mark units from 1 to (TOTAL SS) for SAT identification';
  const SERIALIZE_TEST_CONDITIONS = [serializeCondition];

  // Determine which step "slot" we're in for per-type option editing
  const stepOptKey = isBakeStep ? 'bake'
    : isDryBakeStep ? 'dry_bake'
    : isVisualStep ? 'visual'
    : isInspectionStep ? 'inspection'
    : isSerializeStep ? 'serialize'
    : isOSStep ? 'os'
    : isSATStep ? 'sat'
    : isReliabilityStep ? 'reliability'
    : isCAStep ? 'ca'
    : isIPIStep ? 'ipi'
    : isPCAStep ? 'pca'
    : isProductAuditStep ? 'product_audit'
    : isMADStep ? 'mad'
    : isMRTStep ? 'mrt'
    : isPreconStep ? 'precon'
    : isFCRStep ? 'fcr'
    : isTCStep ? 'tc'
    : isWhiskerTestStep ? 'whisker_test'
    : isElectricalStep ? 'electrical_test'
    : isTHSoakStep ? 'th_soak'
    : isStagingStep ? 'staging'
    : null;

  // Default option lists indexed by stepOptKey
  const defaultItemOpts = isBakeStep ? BAKE_TEST_ITEMS
    : isDryBakeStep ? DRY_BAKE_TEST_ITEMS
    : isVisualStep ? VISUAL_TEST_ITEMS
    : isInspectionStep ? INSPECTION_TEST_ITEMS
    : isSerializeStep ? SERIALIZE_TEST_ITEMS
    : isOSStep ? OS_TEST_ITEMS
    : isSATStep ? SAT_TEST_ITEMS
    : isReliabilityStep ? RELIABILITY_TEST_ITEMS
    : isCAStep ? CA_TEST_ITEMS
    : isIPIStep ? IPI_TEST_ITEMS
    : isPCAStep ? PCA_TEST_ITEMS
    : isProductAuditStep ? PRODUCT_AUDIT_TEST_ITEMS
    : isMADStep ? MAD_TEST_ITEMS
    : isMRTStep ? MRT_TEST_ITEMS
    : isPreconStep ? PRECON_TEST_ITEMS
    : isFCRStep ? FCR_TEST_ITEMS
    : isTCStep ? TC_TEST_ITEMS
    : isWhiskerTestStep ? WHISKER_TEST_ITEMS
    : isElectricalStep ? ELECTRICAL_TEST_ITEMS
    : isTHSoakStep ? TH_SOAK_TEST_ITEMS
    : isStagingStep ? STAGING_TEST_ITEMS
    : [];

  const defaultCondOpts = isBakeStep ? BAKE_TEST_CONDITIONS
    : isDryBakeStep ? DRY_BAKE_TEST_CONDITIONS
    : isVisualStep ? VISUAL_TEST_CONDITIONS
    : isInspectionStep ? INSPECTION_TEST_CONDITIONS
    : isSerializeStep ? SERIALIZE_TEST_CONDITIONS
    : isOSStep ? OS_TEST_CONDITIONS
    : isSATStep ? SAT_TEST_CONDITIONS
    : isReliabilityStep ? RELIABILITY_TEST_CONDITIONS
    : isCAStep ? []
    : isIPIStep ? []
    : isPCAStep ? []
    : isProductAuditStep ? []
    : isMADStep ? MAD_TEST_CONDITIONS
    : isMRTStep ? MRT_TEST_CONDITIONS
    : isPreconStep ? PRECON_TEST_CONDITIONS
    : isFCRStep ? FCR_TEST_CONDITIONS
    : isTCStep ? TC_TEST_CONDITIONS
    : isWhiskerTestStep ? WHISKER_TEST_CONDITIONS
    : isElectricalStep ? ELECTRICAL_TEST_CONDITIONS
    : isTHSoakStep ? TH_SOAK_TEST_CONDITIONS
    : isStagingStep ? STAGING_TEST_CONDITIONS
    : [];

  // State that tracks which options popover is open: null | { key, label, defaults }
  const [optionsEditor, setOptionsEditor] = useState(null);
  // Refresh key increments when an options list is saved, forcing re-read from localStorage
  const [optsRefreshKey, setOptsRefreshKey] = useState(0);

  // Read active option lists from localStorage (plain vars, re-computed on every render)
  const activeItemOpts = stepOptKey ? loadStepOpts(`${stepOptKey}_items`, defaultItemOpts) : [];
  const activeCondOpts = stepOptKey ? loadStepOpts(`${stepOptKey}_conds`, defaultCondOpts) : [];
  void optsRefreshKey; // referenced so state update forces re-render to refresh above vars

  // For Temperature Cycle: show only conditions relevant to the selected TC type
  const tcVisibleConds = isTCStep
    ? activeCondOpts.filter(c =>
        form.test_item ? c.startsWith(form.test_item) : true)
    : activeCondOpts;

  // For Reliability Test: show only conditions relevant to the selected test item
  const reliabilityVisibleConds = isReliabilityStep
    ? activeCondOpts.filter(c =>
        form.test_item === 'High Temp Storage (HTS)' ? c.startsWith('HTS')
        : form.test_item === 'HAST unbiased' ? c.startsWith('HAST unbiased')
        : form.test_item === 'HAST biased' ? c.startsWith('HAST biased')
        : form.test_item === 'T&H unbiased' ? c.startsWith('T&H unbiased')
        : form.test_item === 'T&H biased' ? c.startsWith('T&H biased')
        : form.test_item === 'PCT' ? c.startsWith('PCT')
        : form.test_item === 'Temperature Cycle' ? c.startsWith('TC')
        : true)
    : activeCondOpts;

  // MRT: per-item condition keys so each sub-type always loads its own isolated list
  const mrtCondKey = isMRTStep
    ? form.test_item === 'Moisture Resistance Test (JEDEC MRT)' ? 'mrt_jedec'
    : form.test_item === 'Moisture Resistance Test (EIAJ MRT)' ? 'mrt_eiaj'
    : form.test_item === 'MRT TC' ? 'mrt_tc'
    : form.test_item === 'Reflow' ? 'mrt_reflow'
    : null
    : null;
  const mrtCondDefaults =
    form.test_item === 'Moisture Resistance Test (JEDEC MRT)' ? MRT_JEDEC_CONDITIONS
    : form.test_item === 'Moisture Resistance Test (EIAJ MRT)' ? MRT_EIAJ_CONDITIONS
    : form.test_item === 'MRT TC' ? MRT_TC_CONDITIONS
    : form.test_item === 'Reflow' ? MRT_REFLOW_CONDITIONS
    : [];
  const mrtVisibleConds = mrtCondKey ? loadStepOpts(`${mrtCondKey}_conds`, mrtCondDefaults) : [];

  // Whisker Test: per-item condition keys
  const whiskerCondKey = isWhiskerTestStep
    ? form.test_item === 'TH 30/60' ? 'whisker_th_30_60'
    : form.test_item === 'TH 55/85' ? 'whisker_th_55_85'
    : form.test_item === 'TC A -55/85' ? 'whisker_tc_a'
    : form.test_item === 'SEM' ? 'whisker_sem'
    : null
    : null;
  const whiskerCondDefaults =
    form.test_item === 'TH 30/60' ? WHISKER_TH_30_60_CONDITIONS
    : form.test_item === 'TH 55/85' ? WHISKER_TH_55_85_CONDITIONS
    : form.test_item === 'TC A -55/85' ? WHISKER_TC_A_CONDITIONS
    : form.test_item === 'SEM' ? WHISKER_SEM_CONDITIONS
    : [];
  const whiskerVisibleConds = whiskerCondKey ? loadStepOpts(`${whiskerCondKey}_conds`, whiskerCondDefaults) : [];

  useEffect(() => {
    api.get('/employees').then(data => {
      const map = {};
      (data.employees || []).forEach(e => { map[e.id] = e; });
      setEmployeeMap(map);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    // Detect if a previously saved custom-hours value needs a sentinel (Bake or Reliability)
    let test_condition_init = step.custom_fields?.test_condition || '';
    let bake_custom_hrs_init = '';
    let hts_custom_hrs_init = '';
    if (step.step_name?.toLowerCase() === 'bake' && test_condition_init && !BAKE_FIXED_CONDITIONS.has(test_condition_init) && !test_condition_init.includes('custom_hrs')) {
      const m125 = test_condition_init.match(/^125°C \/ (\d+(?:\.\d+)?) hrs?$/);
      const m150 = test_condition_init.match(/^150°C \/ (\d+(?:\.\d+)?) hrs?$/);
      if (m125) { bake_custom_hrs_init = m125[1]; test_condition_init = '125°C / custom_hrs'; }
      else if (m150) { bake_custom_hrs_init = m150[1]; test_condition_init = '150°C / custom_hrs'; }
    } else if (step.step_name?.toLowerCase() === 'dry bake' && test_condition_init && !DRY_BAKE_FIXED_CONDITIONS.has(test_condition_init) && !test_condition_init.includes('custom_hrs')) {
      const mDB125 = test_condition_init.match(/^DRY BAKE 125°C \/ (\d+(?:\.\d+)?) hrs?$/);
      const mDB150 = test_condition_init.match(/^DRY BAKE 150°C \/ (\d+(?:\.\d+)?) hrs?$/);
      if (mDB125) { bake_custom_hrs_init = mDB125[1]; test_condition_init = 'DRY BAKE 125°C / custom_hrs'; }
      else if (mDB150) { bake_custom_hrs_init = mDB150[1]; test_condition_init = 'DRY BAKE 150°C / custom_hrs'; }
    } else if (step.step_name?.toLowerCase() === 'reliability test' && test_condition_init && !test_condition_init.includes('custom_hrs') && !RELIABILITY_FIXED_CONDITIONS.has(test_condition_init)) {
      // Matches "HTS 125°C / 168 hrs", "HAST unbiased 130/85 / 96 hrs", etc. (not fixed T&H values)
      const mReliab = test_condition_init.match(/^(.+) \/ (\d+(?:\.\d+)?) hrs?$/);
      if (mReliab) {
        hts_custom_hrs_init = mReliab[2];
        test_condition_init = `${mReliab[1]} / custom_hrs`;
      }
      // TC custom hours within reliability: "TC C -65/+150 192hrs" → restore Custom sentinel
      const mTCrel = test_condition_init.match(/^(TC [A-Z] [-\d/+]+) (\d+(?:\.\d+)?)hrs$/);
      if (mTCrel) {
        hts_custom_hrs_init = mTCrel[2];
        test_condition_init = `${mTCrel[1]} Custom`;
      }
    } else if (step.step_name?.toLowerCase() === 'moisture resistance test' && test_condition_init && !test_condition_init.includes('custom_hrs') && !test_condition_init.includes('custom_cyc') && !MRT_FIXED_CONDITIONS.has(test_condition_init)) {
      // Matches "L6 30/60-168 hrs" → L6 sentinel
      const mMRT = test_condition_init.match(/^L6 30\/60-(\d+(?:\.\d+)?) hrs?$/);
      if (mMRT) {
        hts_custom_hrs_init = mMRT[1];
        test_condition_init = 'L6 30/60-custom_hrs';
      }
      // Matches "220°C 7x" etc. (custom Reflow cycles, not in fixed 1x–6x set) → sentinel
      const mMRTReflow = test_condition_init.match(/^(\d+°C) (\d+)x$/);
      if (mMRTReflow) {
        hts_custom_hrs_init = mMRTReflow[2];
        test_condition_init = `${mMRTReflow[1]} custom_cyc`;
      }
    } else if (step.step_name?.toLowerCase() === 'preconditioning (precon)' && test_condition_init && !test_condition_init.includes('custom_hrs') && !PRECON_FIXED_CONDITIONS.has(test_condition_init)) {
      // Matches "30/60-168 hrs" → sentinel
      const mPrecon = test_condition_init.match(/^30\/60-(\d+(?:\.\d+)?) hrs?$/);
      if (mPrecon) {
        hts_custom_hrs_init = mPrecon[1];
        test_condition_init = '30/60-custom_hrs';
      }
    } else if (step.step_name?.toLowerCase() === 'forced convection reflow (fcr)' && test_condition_init && !test_condition_init.includes('custom_cyc') && !FCR_FIXED_CONDITIONS.has(test_condition_init)) {
      // Matches custom "220°C 7x" etc. (not in the fixed 1x–6x set) → sentinel
      const mFCR = test_condition_init.match(/^(\d+°C) (\d+)x$/);
      if (mFCR) {
        hts_custom_hrs_init = mFCR[2];
        test_condition_init = `${mFCR[1]} custom_cyc`;
      }
    } else if (step.step_name?.toLowerCase() === 'temperature cycle' && test_condition_init && !TC_FIXED_CONDITIONS.has(test_condition_init)) {
      // Matches saved custom hours: "TC C -65/+150 192hrs" → restore sentinel + hours
      const mTC = test_condition_init.match(/^(TC [A-Z] [-\d/+]+) (\d+(?:\.\d+)?)hrs$/);
      if (mTC) {
        hts_custom_hrs_init = mTC[2];
        test_condition_init = `${mTC[1]} Custom`;
      }
    } else if (step.step_name?.toLowerCase() === 'whisker test' && test_condition_init
        && step.custom_fields?.test_item === 'TH 55/85'
        && test_condition_init !== 'Custom'
        && WHISKER_TH_CT[test_condition_init] === undefined) {
      // Saved custom hours: "2500hrs" → restore 'Custom' sentinel
      const mW = test_condition_init.match(/^(\d+(?:\.\d+)?)hrs$/i);
      if (mW) {
        hts_custom_hrs_init = mW[1];
        test_condition_init = 'Custom';
      }
    }
    const isVisual       = step.step_name?.toLowerCase() === 'visual';
    const isInspection   = step.step_name?.toLowerCase() === 'incoming inspection';
    const isSerialize    = step.step_name?.toLowerCase() === 'serialize samples';
    const isOS           = step.step_name?.toLowerCase() === 'o/s';
    const isSAT          = step.step_name?.toUpperCase() === 'SAT';
    const isReliability  = step.step_name?.toLowerCase() === 'reliability test';
    const isMAD          = step.step_name?.toLowerCase() === 'moisture absorption and desorption';
    const isFCR          = step.step_name?.toLowerCase() === 'forced convection reflow (fcr)';
    const isBake         = step.step_name?.toLowerCase() === 'bake';
    const isDryBake      = step.step_name?.toLowerCase() === 'dry bake';
    const isTC           = step.step_name?.toLowerCase() === 'temperature cycle';
    setForm({
      status: step.status,
      machine_no: step.machine_no || '',
      rack_no: step.rack_no || '',
      operator_id: step.operator_id || '',
      tray_no: step.tray_no || '',
      qty_in: step.qty_in ?? '',
      qty_out: step.qty_out ?? '',
      notes: step.notes || '',
      test_item: step.custom_fields?.test_item || (isVisual ? 'Visual' : isInspection ? 'Inspection' : isSerialize ? 'Serialize' : isOS ? 'Open/Short' : isSAT ? 'SAT' : isReliability ? 'High Temp Storage (HTS)' : isMAD ? 'MAD' : isFCR ? 'Reflow' : isBake ? 'Bake' : isDryBake ? 'DRY BAKE' : isTC ? 'TC A -55/+85' : ''),
      test_condition: test_condition_init || (isVisual ? 'X40' : isInspection ? 'Note if units are in Jedec tray, Canister, TNR, etc.' : isSerialize ? serializeCondition : isOS ? 'Open/Short' : isSAT ? 'T&C Scan' : ''),
      bake_custom_hrs: bake_custom_hrs_init,
      hts_custom_hrs: hts_custom_hrs_init,
      // Extract datetime-local format (YYYY-MM-DDTHH:mm) directly without timezone conversion
      // This preserves the original datetime as stored in the database
      started_at: step.started_at ? step.started_at.slice(0, 16) : '',
      completed_at: step.completed_at ? step.completed_at.slice(0, 16) : '',
    });
    // Initialise satImages: new dict format, or empty dict for legacy list
    const rawAtt = step.attachments;
    if (rawAtt && !Array.isArray(rawAtt) && typeof rawAtt === 'object') {
      setSatImages(rawAtt);
    } else {
      setSatImages({});
    }
    setMessage('');
  }, [step]);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    // Validate required fields when completing a step
    if (form.status === 'completed') {
      const missing = [];
      if (!form.operator_id) missing.push('Employee No.');
      if (!form.started_at) missing.push('Start of Process');
      if (!form.completed_at) missing.push('End of Process');
      if (missing.length > 0) {
        setMessage(`Cannot complete step — required: ${missing.join(', ')}`);
        setSaving(false);
        return;
      }
    }
    try {
      const updateData = {};
      if (form.status !== step.status) updateData.status = form.status;
      if (form.machine_no !== (step.machine_no || '')) updateData.machine_no = form.machine_no;
      if (form.rack_no !== (step.rack_no || '')) updateData.rack_no = form.rack_no;
      if (form.operator_id !== (step.operator_id || '')) updateData.operator_id = form.operator_id;
      if (form.tray_no !== (step.tray_no || '')) updateData.tray_no = form.tray_no;
      if (form.qty_in !== '' && form.qty_in !== (step.qty_in ?? '')) updateData.qty_in = parseInt(form.qty_in) || 0;
      if (form.qty_out !== '' && form.qty_out !== (step.qty_out ?? '')) updateData.qty_out = parseInt(form.qty_out) || 0;
      if (form.notes !== (step.notes || '')) updateData.notes = form.notes;
      if (form.started_at) {
        // Send datetime-local value directly (format: YYYY-MM-DDTHH:mm) without timezone conversion
        // This preserves the user's manually entered time instead of converting to UTC
        const newStarted = form.started_at;
        const existingStarted = step.started_at ? step.started_at.slice(0, 16) : '';
        if (newStarted !== existingStarted) updateData.started_at = newStarted;
      }
      if (form.completed_at) {
        // Send datetime-local value directly (format: YYYY-MM-DDTHH:mm) without timezone conversion
        // This preserves the user's manually entered time instead of converting to UTC
        const newCompleted = form.completed_at;
        const existingCompleted = step.completed_at ? step.completed_at.slice(0, 16) : '';
        if (newCompleted !== existingCompleted) updateData.completed_at = newCompleted;
      }

      // Include attachments if they changed (SAT steps)
      const origAtt = (step.attachments && !Array.isArray(step.attachments)) ? step.attachments : {};
      if (JSON.stringify(origAtt) !== JSON.stringify(satImages)) {
        updateData.attachments = satImages;
      }

      // Persist test_item and test_condition via custom_fields
      // Resolve Bake / Reliability sentinel values → real strings before saving
      const resolveCustomHrs = (cond, hrs) => {
        const m = cond.match(/^(.+) \/ custom_hrs$/);
        return m ? `${m[1]} / ${hrs} hrs` : cond;
      };
      const finalTestCondition =
        form.test_condition === '125°C / custom_hrs' ? `125°C / ${form.bake_custom_hrs} hrs` :
        form.test_condition === '150°C / custom_hrs' ? `150°C / ${form.bake_custom_hrs} hrs` :
        form.test_condition === 'DRY BAKE 125°C / custom_hrs' ? `DRY BAKE 125°C / ${form.bake_custom_hrs} hrs` :
        form.test_condition === 'DRY BAKE 150°C / custom_hrs' ? `DRY BAKE 150°C / ${form.bake_custom_hrs} hrs` :
        form.test_condition?.includes('custom_hrs') && isReliabilityStep ? resolveCustomHrs(form.test_condition, form.hts_custom_hrs) :
        form.test_condition === 'L6 30/60-custom_hrs' && isMRTStep ? `L6 30/60-${form.hts_custom_hrs} hrs` :
        form.test_condition?.includes('custom_cyc') && isMRTStep ? `${form.test_condition.replace(' custom_cyc', '')} ${form.hts_custom_hrs}x` :
        form.test_condition === '30/60-custom_hrs' && isPreconStep ? `30/60-${form.hts_custom_hrs} hrs` :
        form.test_condition === '30/60-Xhrs' && isTHSoakStep ? `30/60-${form.th_soak_custom_hrs} hrs` :
        form.test_condition?.includes('custom_cyc') && isFCRStep ? `${form.test_condition.replace(' custom_cyc', '')} ${form.hts_custom_hrs}x` :
        form.test_condition?.endsWith(' Custom') && isTCStep && form.hts_custom_hrs ? `${form.test_condition.replace(/ Custom$/, '')} ${form.hts_custom_hrs}hrs` :
        form.test_condition?.endsWith(' Custom') && isReliabilityStep && form.hts_custom_hrs ? `${form.test_condition.replace(/ Custom$/, '')} ${form.hts_custom_hrs}hrs` :
        form.test_condition === 'Custom' && isWhiskerTestStep && form.hts_custom_hrs ? `${form.hts_custom_hrs}hrs` :
        form.test_condition;
      const origTestItem = step.custom_fields?.test_item || '';
      const origTestCondition = step.custom_fields?.test_condition || '';
      if (form.test_item !== origTestItem || finalTestCondition !== origTestCondition) {
        updateData.custom_fields = { ...(step.custom_fields || {}), test_item: form.test_item, test_condition: finalTestCondition };
      }

      if (Object.keys(updateData).length === 0) {
        setMessage('No changes to save.');
        setSaving(false);
        return;
      }
      await api.updateStep(requestId, step.step_number, updateData, leg);
      // Auto-advance: when a step is marked Done, set the next pending step to In Queue
      if (updateData.status === 'completed' && steps.length > 0) {
        const sorted = steps.slice().sort((a, b) => a.step_number - b.step_number);
        const idx = sorted.findIndex(s => s.step_number === step.step_number && (s.leg || 1) === (leg || 1));
        if (idx >= 0 && idx < sorted.length - 1) {
          const nextStep = sorted[idx + 1];
          if (nextStep.status === 'pending') {
            try { await api.updateStep(requestId, nextStep.step_number, { status: 'in_progress' }, leg); } catch (_) {}
          }
        }
      }
      setMessage('Step updated successfully!');
      onUpdated();
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e, catKey) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const existing = satImages[catKey] || [];
    const remaining = 2 - existing.length;
    if (remaining <= 0) {
      setMessage(`Maximum 2 images allowed per section.`);
      return;
    }
    const toUpload = files.slice(0, remaining);
    setImageUploading(catKey);
    try {
      const uploaded = [];
      for (const file of toUpload) {
        const res = await api.upload(file);
        uploaded.push(res.url);
      }
      setSatImages(prev => ({ ...prev, [catKey]: [...(prev[catKey] || []), ...uploaded] }));
    } catch (err) {
      setMessage(`Error uploading: ${err.message}`);
    } finally {
      setImageUploading(null);
      e.target.value = '';
    }
  };

  const removeImage = (catKey, idx) => {
    setSatImages(prev => ({ ...prev, [catKey]: (prev[catKey] || []).filter((_, i) => i !== idx) }));
  };

  const handleFileAttach = async (e, groupKey) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const existing = satImages[groupKey] || [];
    const remaining = 3 - existing.length;
    if (remaining <= 0) { setMessage('Maximum 3 extra images allowed.'); return; }
    const toUpload = files.slice(0, remaining);
    setImageUploading(groupKey);
    try {
      const uploaded = [];
      for (const file of toUpload) {
        const res = await api.upload(file);
        uploaded.push(res.url);
      }
      setSatImages(prev => ({ ...prev, [groupKey]: [...(prev[groupKey] || []), ...uploaded] }));
    } catch (err) {
      setMessage(`Error uploading: ${err.message}`);
    } finally {
      setImageUploading(null);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold
          ${step.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
            step.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
            step.status === 'hold' ? 'bg-orange-100 text-orange-600' :
            step.status === 'failed' ? 'bg-red-100 text-red-700' :
            'bg-slate-100 text-slate-500'}`}>
          {step.step_number}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-heading font-semibold text-slate-800">{step.step_name}</h3>
            {(() => { const ct = getStepCT(step); return ct !== null && ct !== undefined ? (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-violet-100 text-violet-700 leading-none" title="Standard Cycle Time">
                Std {ct}d
              </span>
            ) : null; })()}
          </div>
          <p className="text-xs text-slate-400">Step {step.step_number} of {totalSteps}</p>
        </div>
      </div>

      {canUpdate ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium uppercase tracking-wider text-slate-500">Test Item</label>
                {stepOptKey && (
                  <button
                    onClick={() => setOptionsEditor({ key: `${stepOptKey}_items`, label: 'Edit Test Item Options', defaults: defaultItemOpts })}
                    className="p-0.5 rounded hover:bg-blue-100 text-slate-400 hover:text-blue-600 transition-colors"
                    title="Edit options"
                    type="button"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                )}
              </div>
              {isElectricalStep ? (
                <select value={form.test_item || 'E-Test'}
                  onChange={e => setForm(f => ({ ...f, test_item: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm">
                  {activeItemOpts.map(item => <option key={item} value={item}>{item}</option>)}
                </select>
              ) : stepOptKey ? (
                <select value={form.test_item}
                  onChange={e => setForm(f => ({
                    ...f,
                    test_item: e.target.value,
                    ...((isReliabilityStep || isMRTStep || isPreconStep || isWhiskerTestStep || isTHSoakStep) ? { test_condition: '', th_soak_custom_hrs: '', hts_custom_hrs: '' } : {}),
                  }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm">
                  <option value="">— Select item —</option>
                  {activeItemOpts.map(item => <option key={item} value={item}>{item}</option>)}
                </select>
              ) : (
                <input type="text" value={form.test_item} onChange={e => setForm(f => ({ ...f, test_item: e.target.value }))}
                  placeholder="Enter test item..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm" />
              )}
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium uppercase tracking-wider text-slate-500">Test Condition</label>
                {(stepOptKey && !isMRTStep) && (
                  <button
                    onClick={() => setOptionsEditor({ key: `${stepOptKey}_conds`, label: 'Edit Test Condition Options', defaults: defaultCondOpts })}
                    className="p-0.5 rounded hover:bg-blue-100 text-slate-400 hover:text-blue-600 transition-colors"
                    title="Edit options"
                    type="button"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                )}
                {(isMRTStep && mrtCondKey) && (
                  <button
                    onClick={() => setOptionsEditor({ key: `${mrtCondKey}_conds`, label: 'Edit Test Condition Options', defaults: mrtCondDefaults })}
                    className="p-0.5 rounded hover:bg-blue-100 text-slate-400 hover:text-blue-600 transition-colors"
                    title="Edit options"
                    type="button"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                )}
              </div>
              {isElectricalStep ? (
                <select value={form.test_condition}
                  onChange={e => setForm(f => ({ ...f, test_condition: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm">
                  <option value="">— Select condition —</option>
                  {activeCondOpts.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              ) : isBakeStep ? (
                <div className="space-y-2">
                  <select value={form.test_condition}
                    onChange={e => setForm(f => ({ ...f, test_condition: e.target.value, bake_custom_hrs: '' }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm">
                    <option value="">— Select condition —</option>
                    {activeCondOpts.map(c => (
                      <option key={c} value={c}>
                        {c === '125°C / custom_hrs' ? '125°C / (enter hrs)' : c === '150°C / custom_hrs' ? '150°C / (enter hrs)' : c}
                      </option>
                    ))}
                  </select>
                  {(form.test_condition === '125°C / custom_hrs' || form.test_condition === '150°C / custom_hrs') && (
                    <div className="flex items-center gap-2">
                      <input type="number" value={form.bake_custom_hrs}
                        onChange={e => setForm(f => ({ ...f, bake_custom_hrs: e.target.value }))}
                        placeholder="Enter hours" min="1"
                        className="flex-1 border border-slate-200 rounded-lg px-3 py-2.5 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm" />
                      <span className="text-sm text-slate-500 whitespace-nowrap">hrs</span>
                    </div>
                  )}
                </div>
              ) : isDryBakeStep ? (
                <div className="space-y-2">
                  <select value={form.test_condition}
                    onChange={e => setForm(f => ({ ...f, test_condition: e.target.value, bake_custom_hrs: '' }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm">
                    <option value="">— Select condition —</option>
                    {activeCondOpts.map(c => (
                      <option key={c} value={c}>
                        {c === 'DRY BAKE 125°C / custom_hrs' ? 'DRY BAKE 125°C / (enter hrs)'
                          : c === 'DRY BAKE 150°C / custom_hrs' ? 'DRY BAKE 150°C / (enter hrs)'
                          : c}
                      </option>
                    ))}
                  </select>
                  {(form.test_condition === 'DRY BAKE 125°C / custom_hrs' || form.test_condition === 'DRY BAKE 150°C / custom_hrs') && (
                    <div className="flex items-center gap-2">
                      <input type="number" value={form.bake_custom_hrs}
                        onChange={e => setForm(f => ({ ...f, bake_custom_hrs: e.target.value }))}
                        placeholder="Enter hours" min="1"
                        className="flex-1 border border-slate-200 rounded-lg px-3 py-2.5 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm" />
                      <span className="text-sm text-slate-500 whitespace-nowrap">hrs</span>
                    </div>
                  )}
                </div>
              ) : isReliabilityStep ? (
                <div className="space-y-2">
                  {!form.test_item && (
                    <p className="text-xs text-slate-400 italic">Select a Test Item first to see conditions.</p>
                  )}
                  {form.test_item && (
                  <select value={form.test_condition}
                    onChange={e => setForm(f => ({ ...f, test_condition: e.target.value, hts_custom_hrs: '' }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm">
                    <option value="">— Select condition —</option>
                    {reliabilityVisibleConds.map(c => (
                      <option key={c} value={c}>
                        {c.replace('/ custom_hrs', '/ (enter hrs)')}
                      </option>
                    ))}
                  </select>
                  )}
                  {(form.test_condition?.includes('custom_hrs') || form.test_condition?.endsWith(' Custom')) && (
                    <div className="flex items-center gap-2">
                      <input type="number" value={form.hts_custom_hrs}
                        onChange={e => setForm(f => ({ ...f, hts_custom_hrs: e.target.value }))}
                        placeholder="Enter hours" min="1"
                        className="flex-1 border border-slate-200 rounded-lg px-3 py-2.5 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm" />
                      <span className="text-sm text-slate-500 whitespace-nowrap">hrs</span>
                    </div>
                  )}
                </div>
              ) : isMRTStep ? (
                <div className="space-y-2">
                  {!form.test_item && (
                    <p className="text-xs text-slate-400 italic">Select a Test Item first to see conditions.</p>
                  )}
                  {form.test_item && (
                  <select value={form.test_condition}
                    onChange={e => setForm(f => ({ ...f, test_condition: e.target.value, hts_custom_hrs: '' }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm">
                    <option value="">— Select condition —</option>
                    {mrtVisibleConds.map(c => (
                      <option key={c} value={c}>
                        {c.replace('-custom_hrs', '-(enter hrs)').replace(' custom_cyc', ' (enter cycles)')}
                      </option>
                    ))}
                  </select>
                  )}
                  {form.test_condition?.includes('custom_hrs') && (
                    <div className="flex items-center gap-2">
                      <input type="number" value={form.hts_custom_hrs}
                        onChange={e => setForm(f => ({ ...f, hts_custom_hrs: e.target.value }))}
                        placeholder="Enter hours" min="1"
                        className="flex-1 border border-slate-200 rounded-lg px-3 py-2.5 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm" />
                      <span className="text-sm text-slate-500 whitespace-nowrap">hrs</span>
                    </div>
                  )}
                  {form.test_condition?.includes('custom_cyc') && (
                    <div className="flex items-center gap-2">
                      <input type="number" value={form.hts_custom_hrs}
                        onChange={e => setForm(f => ({ ...f, hts_custom_hrs: e.target.value }))}
                        placeholder="Enter number" min="1"
                        className="flex-1 border border-slate-200 rounded-lg px-3 py-2.5 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm" />
                      <span className="text-sm text-slate-500 whitespace-nowrap">x</span>
                    </div>
                  )}
                </div>
              ) : isWhiskerTestStep ? (
                <div className="space-y-2">
                  {!form.test_item && (
                    <p className="text-xs text-slate-400 italic">Select a Test Item first to see conditions.</p>
                  )}
                  {form.test_item && ['Visual', 'Reflow'].includes(form.test_item) && (
                    <p className="text-xs text-slate-400 italic">No condition required for {form.test_item}.</p>
                  )}
                  {form.test_item && !['Visual', 'Reflow'].includes(form.test_item) && (
                    <select value={form.test_condition}
                      onChange={e => setForm(f => ({ ...f, test_condition: e.target.value, hts_custom_hrs: '' }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2.5 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm">
                      <option value="">— Select condition —</option>
                      {whiskerVisibleConds.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  )}
                  {form.test_condition === 'Custom' && (
                    <div className="flex items-center gap-2">
                      <input type="number" value={form.hts_custom_hrs || ''}
                        onChange={e => setForm(f => ({ ...f, hts_custom_hrs: e.target.value }))}
                        placeholder="Enter hours" min="1"
                        className="flex-1 border border-slate-200 rounded-lg px-3 py-2.5 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm" />
                      <span className="text-sm text-slate-500 whitespace-nowrap">hrs</span>
                    </div>
                  )}
                </div>
              ) : isTHSoakStep ? (
                <div className="space-y-2">
                  {!form.test_item && (
                    <p className="text-xs text-slate-400 italic">Select a Test Item first to see conditions.</p>
                  )}
                  {form.test_item && (
                  <select value={form.test_condition}
                    onChange={e => setForm(f => ({ ...f, test_condition: e.target.value, th_soak_custom_hrs: '' }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm">
                    <option value="">— Select condition —</option>
                    {activeCondOpts.map(c => (
                      <option key={c} value={c}>{c === '30/60-Xhrs' ? '30/60-(enter hrs)' : c}</option>
                    ))}
                  </select>
                  )}
                  {form.test_condition === '30/60-Xhrs' && (
                    <div className="flex items-center gap-2">
                      <input type="number" value={form.th_soak_custom_hrs || ''}
                        onChange={e => setForm(f => ({ ...f, th_soak_custom_hrs: e.target.value }))}
                        placeholder="Enter hours" min="1"
                        className="flex-1 border border-slate-200 rounded-lg px-3 py-2.5 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm" />
                      <span className="text-sm text-slate-500 whitespace-nowrap">hrs</span>
                    </div>
                  )}
                </div>
              ) : isPreconStep ? (
                <div className="space-y-2">
                  {form.test_item && (
                  <select value={form.test_condition}
                    onChange={e => setForm(f => ({ ...f, test_condition: e.target.value, hts_custom_hrs: '' }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm">
                    <option value="">— Select condition —</option>
                    {activeCondOpts.map(c => (
                      <option key={c} value={c}>
                        {c === '30/60-custom_hrs' ? '30/60-(enter hrs)' : c}
                      </option>
                    ))}
                  </select>
                  )}
                  {form.test_condition === '30/60-custom_hrs' && (
                    <div className="flex items-center gap-2">
                      <input type="number" value={form.hts_custom_hrs}
                        onChange={e => setForm(f => ({ ...f, hts_custom_hrs: e.target.value }))}
                        placeholder="Enter hours" min="1"
                        className="flex-1 border border-slate-200 rounded-lg px-3 py-2.5 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm" />
                      <span className="text-sm text-slate-500 whitespace-nowrap">hrs</span>
                    </div>
                  )}
                </div>
              ) : isTCStep ? (
                <div className="space-y-2">
                  {!form.test_item && (
                    <p className="text-xs text-slate-400 italic">Select a TC Type above to see cycle options.</p>
                  )}
                  {form.test_item && (
                    <select value={form.test_condition}
                      onChange={e => setForm(f => ({ ...f, test_condition: e.target.value, hts_custom_hrs: '' }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2.5 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm">
                      <option value="">— Select cycles —</option>
                      {tcVisibleConds.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  )}
                  {form.test_condition?.endsWith(' Custom') && (
                    <div className="flex items-center gap-2">
                      <input type="number" value={form.hts_custom_hrs || ''}
                        onChange={e => setForm(f => ({ ...f, hts_custom_hrs: e.target.value }))}
                        placeholder="Enter hours" min="1"
                        className="flex-1 border border-slate-200 rounded-lg px-3 py-2.5 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm" />
                      <span className="text-sm text-slate-500 whitespace-nowrap">hrs</span>
                    </div>
                  )}
                </div>
              ) : isFCRStep ? (
                <div className="space-y-2">
                  <select value={form.test_condition}
                    onChange={e => setForm(f => ({ ...f, test_condition: e.target.value, hts_custom_hrs: '' }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm">
                    <option value="">— Select condition —</option>
                    {activeCondOpts.map(c => (
                      <option key={c} value={c}>
                        {c.replace(' custom_cyc', ' (enter cycles)')}
                      </option>
                    ))}
                  </select>
                  {form.test_condition?.includes('custom_cyc') && (
                    <div className="flex items-center gap-2">
                      <input type="number" value={form.hts_custom_hrs}
                        onChange={e => setForm(f => ({ ...f, hts_custom_hrs: e.target.value }))}
                        placeholder="Enter number" min="1"
                        className="flex-1 border border-slate-200 rounded-lg px-3 py-2.5 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm" />
                      <span className="text-sm text-slate-500 whitespace-nowrap">x</span>
                    </div>
                  )}
                </div>
              ) : stepOptKey ? (
                <select value={form.test_condition} onChange={e => setForm(f => ({ ...f, test_condition: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm">
                  <option value="">— Select condition —</option>
                  {activeCondOpts.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              ) : (
                <input type="text" value={form.test_condition} onChange={e => setForm(f => ({ ...f, test_condition: e.target.value }))}
                  placeholder="Enter test condition..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm" />
              )}
            </div>
          </div>


          <div className="border-t border-slate-100 pt-4">
            <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-1.5">Status</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm">
              {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Timing</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  Start of Process
                  {form.status === 'completed' && <span className="text-red-500 ml-1">*</span>}
                </label>
                <input type="datetime-local" value={form.started_at || ''} onChange={e => setForm(f => ({ ...f, started_at: e.target.value }))}
                  className={`w-full border rounded-lg px-3 py-2.5 bg-slate-50 focus:bg-white focus:ring-2 text-sm ${
                    form.status === 'completed' && !form.started_at
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                      : 'border-slate-200 focus:border-blue-500 focus:ring-blue-200'
                  }`} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  End of Process
                  {form.status === 'completed' && <span className="text-red-500 ml-1">*</span>}
                </label>
                <input type="datetime-local" value={form.completed_at || ''} onChange={e => setForm(f => ({ ...f, completed_at: e.target.value }))}
                  className={`w-full border rounded-lg px-3 py-2.5 bg-slate-50 focus:bg-white focus:ring-2 text-sm ${
                    form.status === 'completed' && !form.completed_at
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                      : 'border-slate-200 focus:border-blue-500 focus:ring-blue-200'
                  }`} />
              </div>
            </div>
            {/* Estimated Date & Time — moved outside canUpdate, shown after timing section */}
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Machine #</label>
                <MachineSelect
                  value={form.machine_no}
                  onChange={val => setForm(f => ({ ...f, machine_no: val }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Rack No# / Name</label>
                <input type="text" value={form.rack_no} onChange={e => setForm(f => ({ ...f, rack_no: e.target.value }))}
                  placeholder="Enter rack no or name"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  Employee No.
                  {form.status === 'completed' && <span className="text-red-500 ml-1">*</span>}
                </label>
                <EmployeeSelect
                  value={form.operator_id}
                  onChange={val => setForm(f => ({ ...f, operator_id: val }))}
                  highlightRequired={form.status === 'completed' && !form.operator_id}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Tray #</label>
                <input type="text" value={form.tray_no} onChange={e => setForm(f => ({ ...f, tray_no: e.target.value }))}
                  placeholder="Enter tray number"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm" />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Quantity</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Quantity In</label>
                <input type="number" value={form.qty_in} onChange={e => setForm(f => ({ ...f, qty_in: e.target.value }))}
                  placeholder="Enter quantity in" min="0"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Quantity Out</label>
                <input type="number" value={form.qty_out} onChange={e => setForm(f => ({ ...f, qty_out: e.target.value }))}
                  placeholder="Enter quantity out" min="0"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm" />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3}
              placeholder="Add any notes or observations..."
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm" />
          </div>

          {/* SAT Image Attachments — 3 row-groups: 1-24 | 25-48 | 49-77 */}
          {isSATStep && (
            <div className="border-t border-slate-100 pt-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">SAT Images</p>
              {[['1–24', 'sat_files_1_24', 0], ['25–48', 'sat_files_25_48', 3], ['49–77', 'sat_files_49_77', 6]].map(([rangeLabel, fileKey, groupStart]) => {
                const extraImgs = satImages[fileKey] || [];
                const isUploadingExtra = imageUploading === fileKey;
                return (
                <div key={groupStart} className="rounded-lg border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-200">
                    <span className="text-xs font-bold text-slate-600">Samples {rangeLabel}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-200">
                    {SAT_CATEGORIES.slice(groupStart, groupStart + 3).map(({ key, label, optional }) => {
                      const catImgs = satImages[key] || [];
                      const isUploading = imageUploading === key;
                      return (
                        <div key={key} className="p-2 space-y-2">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-semibold text-slate-600 truncate">{label}</span>
                            <div className="flex items-center gap-1 shrink-0">
                              {optional && <span className="text-xs text-slate-400 italic">Opt.</span>}
                              <span className="text-xs text-slate-400">{catImgs.length}/2</span>
                            </div>
                          </div>
                          {catImgs.length > 0 && (
                            <div className="grid grid-cols-2 gap-1">
                              {catImgs.map((url, idx) => (
                                <div key={idx} className="relative group rounded overflow-hidden border border-slate-200 aspect-square">
                                  <img src={url} alt={`${label} ${idx + 1}`} className="w-full h-full object-cover" />
                                  <button type="button" onClick={() => removeImage(key, idx)}
                                    className="absolute top-1 right-1 p-0.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                          {catImgs.length < 2 && (
                            <label className="flex items-center justify-center gap-1 px-2 py-1.5 border-2 border-dashed border-slate-300 rounded text-xs text-slate-500 hover:border-blue-400 hover:text-blue-600 cursor-pointer transition-colors">
                              <ImagePlus className="w-3 h-3 shrink-0" />
                              {isUploading ? 'Uploading…' : `Add (${2 - catImgs.length} left)`}
                              <input type="file" accept="image/*" multiple
                                onChange={e => handleImageUpload(e, key)}
                                className="hidden" disabled={isUploading} />
                            </label>
                          )}
                        </div>
                      );
                    })}
                    {/* 4th column: extra image attachments */}
                    <div className="p-2 space-y-2 bg-slate-50/60">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-semibold text-slate-500">Attachments</span>
                        <span className="text-xs text-slate-400">{extraImgs.length}/3</span>
                      </div>
                      {extraImgs.length > 0 && (
                        <div className="grid grid-cols-2 gap-1">
                          {extraImgs.map((url, idx) => (
                            <div key={idx} className="relative group rounded overflow-hidden border border-slate-200 aspect-square">
                              <img src={url} alt={`Attach ${idx + 1}`} className="w-full h-full object-cover" />
                              <button type="button" onClick={() => removeImage(fileKey, idx)}
                                className="absolute top-1 right-1 p-0.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      {extraImgs.length < 3 && (
                        <label className="flex flex-col items-center justify-center gap-1 px-2 py-2 border-2 border-dashed border-blue-200 rounded text-xs text-blue-500 hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-colors">
                          <ImagePlus className="w-4 h-4" />
                          <span className="text-center leading-tight">{isUploadingExtra ? 'Uploading…' : 'Add Attach File'}</span>
                          <input type="file" accept="image/*" multiple
                            onChange={e => handleFileAttach(e, fileKey)}
                            className="hidden" disabled={isUploadingExtra} />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          )}

          {message && (
            <p className={`text-xs ${message.startsWith('Error') ? 'text-red-600' : 'text-emerald-600'}`}>{message}</p>
          )}

          <button onClick={handleSave} disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-50 shadow-sm">
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Step'}
          </button>
        </div>
      ) : (
        <div className="space-y-0">
          <InfoRow label="Test Item" value={step.custom_fields?.test_item} />
          <InfoRow label="Test Condition" value={step.custom_fields?.test_condition} />
          <InfoRow label="Status" value={step.status?.replace('_', ' ')} />
          <InfoRow label="Start of Process" value={step.started_at ? new Date(step.started_at).toLocaleString() : null} />
          <InfoRow label="End of Process" value={step.completed_at ? new Date(step.completed_at).toLocaleString() : null} />
          <InfoRow label="Machine #" value={step.machine_no || null} />
          <InfoRow label="Rack No# / Name" value={step.rack_no || null} />
          <InfoRow label="Employee No." value={
            step.operator_id
              ? (employeeMap[step.operator_id]
                  ? `${step.operator_id} — ${employeeMap[step.operator_id].name}`
                  : step.operator_id)
              : null
          } />
          <InfoRow label="Tray #" value={step.tray_no} />
          <InfoRow label="Qty In" value={step.qty_in} />
          <InfoRow label="Qty Out" value={step.qty_out} />
          <InfoRow label="Notes" value={step.notes} />
          {isSATStep && (
            <div className="pt-2 space-y-2">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400">SAT Images</span>
              {[['1–24', 'sat_files_1_24', 0], ['25–48', 'sat_files_25_48', 3], ['49–77', 'sat_files_49_77', 6]].map(([rangeLabel, fileKey, groupStart]) => {
                const group = SAT_CATEGORIES.slice(groupStart, groupStart + 3);
                const hasAny = group.some(({ key }) => (satImages[key] || []).length > 0);
                const extraImgs = (satImages[fileKey] || []).filter(v => typeof v === 'string');
                if (!hasAny && extraImgs.length === 0) return null;
                return (
                  <div key={groupStart} className="rounded-lg border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-200">
                      <span className="text-xs font-bold text-slate-600">Samples {rangeLabel}</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-200">
                      {group.map(({ key, label, optional }) => {
                        const catImgs = satImages[key] || [];
                        return (
                          <div key={key} className="p-2">
                            <p className="text-xs font-semibold text-slate-500 mb-1.5 truncate">
                              {label}{optional ? ' (Opt.)' : ''}
                            </p>
                            {catImgs.length > 0 ? (
                              <div className="grid grid-cols-2 gap-1">
                                {catImgs.map((url, idx) => (
                                  <a key={idx} href={url} target="_blank" rel="noopener noreferrer"
                                    className="rounded overflow-hidden border border-slate-200 aspect-square block">
                                    <img src={url} alt={`${label} ${idx + 1}`} className="w-full h-full object-cover" />
                                  </a>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-slate-300 italic">—</p>
                            )}
                          </div>
                        );
                      })}
                      {/* 4th column: extra image attachments (read-only) */}
                      <div className="p-2 bg-slate-50/60">
                        <p className="text-xs font-semibold text-slate-500 mb-1.5">Attachments</p>
                        {extraImgs.length > 0 ? (
                          <div className="grid grid-cols-2 gap-1">
                            {extraImgs.map((url, idx) => (
                              <a key={idx} href={url} target="_blank" rel="noopener noreferrer"
                                className="rounded overflow-hidden border border-slate-200 aspect-square block">
                                <img src={url} alt={`Attach ${idx + 1}`} className="w-full h-full object-cover" />
                              </a>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-300 italic">—</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      {/* ── Estimated Time ─ always visible below either edit or read-only view ──── */}
      {(() => {
        // Estimated time is PURELY standard — uses only the cascaded standard anchor,
        // regardless of any actual started_at the user may have entered.
        const startDt = estimatedStart ? new Date(estimatedStart) : null;
        if (!startDt) return null;
        const stdDays = getStepCT(step);
        const estEndDt = typeof stdDays === 'number' ? new Date(startDt.getTime() + stdDays * 86400000) : null;
        const fmt = d => d.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        return (
          <div className="mt-4 border-t border-violet-100 pt-4">
            <div className="flex items-center gap-1.5 mb-3">
              <Clock className="w-3.5 h-3.5 text-violet-400" />
              <p className="text-xs font-semibold uppercase tracking-wider text-violet-400">Estimated Time</p>
              <span className="ml-1 text-xs text-slate-400 font-normal">(Standard — not affected by actual dates)</span>
              {stdDays && <span className="ml-auto text-xs text-violet-400 font-medium">Std {stdDays}d</span>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Est. Start of Process</label>
                <div className="w-full border border-violet-200 rounded-lg px-3 py-2.5 bg-violet-50 text-sm text-violet-700 font-medium">
                  {fmt(startDt)}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Est. End of Process</label>
                <div className={`w-full border rounded-lg px-3 py-2.5 text-sm font-medium ${
                  estEndDt
                    ? 'border-violet-200 bg-violet-50 text-violet-700'
                    : 'border-slate-200 bg-slate-50 text-slate-400 italic'
                }`}>
                  {estEndDt ? fmt(estEndDt) : 'No standard CT defined'}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {optionsEditor && (
        <OptionsEditorModal
          title={optionsEditor.label}
          options={loadStepOpts(optionsEditor.key, optionsEditor.defaults)}
          onSave={(list) => {
            saveStepOpts(optionsEditor.key, list);
            setOptsRefreshKey(k => k + 1);
            setOptionsEditor(null);
          }}
          onClose={() => setOptionsEditor(null)}
        />
      )}
    </div>
  );
}

export default function RequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasRole, hasPerm, user } = useAuth();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStep, setSelectedStep] = useState(null);
  const [showInfo, setShowInfo] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saveMsg, setSaveMsg] = useState('');
  const [editingSteps, setEditingSteps] = useState(false);
  const [editStepList, setEditStepList] = useState([]);
  const [stepSaving, setStepSaving] = useState(false);
  const [selectedLeg, setSelectedLeg] = useState(1);
  const [addingStep, setAddingStep] = useState(false);
  const [customStepInput, setCustomStepInput] = useState('');
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [downloadingSatReport, setDownloadingSatReport] = useState(false);
  const [downloadingLtc, setDownloadingLtc] = useState(false);
  const [showTraveller, setShowTraveller] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const [travEmployees, setTravEmployees] = useState({});
  const [travMachines, setTravMachines] = useState([]);
  const [travEditCell, setTravEditCell] = useState(null); // { key: 'leg-stepNum', field }
  const [travEditVal, setTravEditVal] = useState('');
  const [travCellSaving, setTravCellSaving] = useState(false);
  const [stepPresets, setStepPresets] = useState(() => {
    try {
      const saved = localStorage.getItem(LS_PRESETS_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_STEP_PRESETS;
    } catch { return DEFAULT_STEP_PRESETS; }
  });
  const [editingPresets, setEditingPresets] = useState(false);
  const [presetRenameIdx, setPresetRenameIdx] = useState(null);
  const [presetRenameVal, setPresetRenameVal] = useState('');
  const [presetNewInput, setPresetNewInput] = useState('');
  // Process presets (loaded from settings)
  const [processPresets, setProcessPresets] = useState([]);
  const [legProcessSaving, setLegProcessSaving] = useState(false);
  const [showNewProcessModal, setShowNewProcessModal] = useState(false);
  // Note
  const [noteEditing, setNoteEditing] = useState(false);
  const [noteInput, setNoteInput] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  // Retention Details (visible on completed requests)
  const [retentionEditing, setRetentionEditing] = useState(false);
  const [retentionInput, setRetentionInput] = useState('');
  const [retentionSaving, setRetentionSaving] = useState(false);
  // Workflow transitions
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [workflowMsg, setWorkflowMsg] = useState('');
  // Analysis notes
  const [analysisNotes, setAnalysisNotes] = useState('');
  const [analysisNotesSaving, setAnalysisNotesSaving] = useState(false);
  // Planner Estimation (Admin/Planner only)
  const [plannerEstEditing, setPlannerEstEditing] = useState(false);
  const [plannerEstForm, setPlannerEstForm] = useState({ planner_est_start: '', planner_est_end: '', planner_note: '' });
  const [plannerEstSaving, setPlannerEstSaving] = useState(false);

  // Technicians can now edit all steps, but must provide Date and Employee number before saving
  const canUpdateStep = hasPerm('update_steps') || hasRole('Admin') || hasRole('Technician') || !!user?.isGuest;
  const canEdit = hasPerm('edit_request') || hasRole('Admin');
  // Admin can manage steps anytime; Reliability Engineer only before approval
  const POST_APPROVAL_STATUSES = ['testing', 'in_progress', 'analysis', 'completed', 'discontinued'];
  const notYetApproved = !POST_APPROVAL_STATUSES.includes(request?.status);
  const canManageSteps = hasRole('Admin') || ((hasPerm('manage_steps') || hasRole('Reliability Engineer')) && notYetApproved);
  // Admin and Rel Engineer can freely edit any step regardless of order
  const canBypassOrder = canUpdateStep; // All users who can update steps can unlock any step

  const [lockedStepMsg, setLockedStepMsg] = useState('');

  const savePresets = (list) => {    setStepPresets(list);
    try { localStorage.setItem(LS_PRESETS_KEY, JSON.stringify(list)); } catch {}
  };
  const deletePreset = (idx) => savePresets(stepPresets.filter((_, i) => i !== idx));
  const commitPresetRename = (idx) => {
    const trimmed = presetRenameVal.trim();
    if (!trimmed) return;
    const updated = [...stepPresets];
    updated[idx] = trimmed;
    savePresets(updated);
    setPresetRenameIdx(null);
  };
  const addPresetDirect = () => {
    const trimmed = presetNewInput.trim();
    if (!trimmed || stepPresets.includes(trimmed)) return;
    savePresets([...stepPresets, trimmed]);
    setPresetNewInput('');
  };

  const reloadProcessPresets = () => {
    api.getSettings().then(s => {
      if (s.process_presets && s.process_presets.length) {
        const saved = s.process_presets;
        const missing = DEFAULT_PROCESS_PRESETS.filter(bp => !saved.some(sp => sp.id === bp.id));
        setProcessPresets([...saved, ...missing]);
      } else {
        setProcessPresets(DEFAULT_PROCESS_PRESETS);
      }
    }).catch(() => {});
  };
  const handleCreateProcessPreset = async (data) => {
    await api.createProcessPreset(data);
    setShowNewProcessModal(false);
    reloadProcessPresets();
  };
  const handleDeleteProcessPreset = async (presetId) => {
    if (!window.confirm('Delete this process template? This cannot be undone.')) return;
    await api.deleteProcessPreset(presetId);
    reloadProcessPresets();
  };

  const loadRequest = () => {
    api.getRequest(id)
      .then(r => {
        setRequest(r);
        // Refresh selected step with updated data
        if (selectedStep) {
          const updated = r.steps.find(s => s.step_number === selectedStep.step_number && (s.leg || 1) === (selectedStep.leg || 1));
          if (updated) setSelectedStep(updated);
        } else {
          const firstLegStep = r.steps.find(s => (s.leg || 1) === selectedLeg);
          setSelectedStep(firstLegStep || r.steps[0]);
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  // Workflow Transition Handlers
  const handleWorkflow = async (action, confirmMsg) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setWorkflowLoading(true);
    setWorkflowMsg('');
    try {
      let res;
      if (action === 'submit-review')   res = await api.submitReview(id);
      else if (action === 'submit-approval') res = await api.submitApproval(id);
      else if (action === 'approve')    res = await api.approveRequest(id);
      else if (action === 'reject')     res = await api.rejectRequest(id);
      if (res?.request) setRequest(res.request);
      setWorkflowMsg(res?.message || 'Done');
      setTimeout(() => setWorkflowMsg(''), 3000);
    } catch (e) {
      setWorkflowMsg('Error: ' + e.message);
    } finally {
      setWorkflowLoading(false);
    }
  };

  const handleCompleteReport = async () => {
    if (!window.confirm('Mark this request as Completed and finalize the report?')) return;
    setWorkflowLoading(true);
    setWorkflowMsg('');
    try {
      const res = await api.completeReport(id, analysisNotes || null);
      if (res?.request) setRequest(res.request);
      setWorkflowMsg(res?.message || 'Report completed');
      setTimeout(() => setWorkflowMsg(''), 3000);
    } catch (e) {
      setWorkflowMsg('Error: ' + e.message);
    } finally {
      setWorkflowLoading(false);
    }
  };

  const handleDiscontinue = async () => {
    const reason = window.prompt('Reason for discontinuing this request (optional):');
    if (reason === null) return; // user pressed Cancel
    if (!window.confirm('Mark this request as Discontinued? This cannot be undone from the UI.')) return;
    setWorkflowLoading(true);
    setWorkflowMsg('');
    try {
      const res = await api.discontinueRequest(id, reason.trim() || null);
      if (res?.request) setRequest(res.request);
      setWorkflowMsg(res?.message || 'Request discontinued');
      setTimeout(() => setWorkflowMsg(''), 3000);
    } catch (e) {
      setWorkflowMsg('Error: ' + e.message);
    } finally {
      setWorkflowLoading(false);
    }
  };

  const handleSaveAnalysisNotes = async () => {
    setAnalysisNotesSaving(true);
    try {
      await api.updateRequest(id, { analysis_notes: analysisNotes });
      setWorkflowMsg('Analysis notes saved');
      setTimeout(() => setWorkflowMsg(''), 2000);
    } catch (e) {
      setWorkflowMsg('Error: ' + e.message);
    } finally {
      setAnalysisNotesSaving(false);
    }
  };

  const handleSavePlannerEst = async () => {
    setPlannerEstSaving(true);
    try {
      await api.updatePlannerEstimation(id, {
        planner_est_start: plannerEstForm.planner_est_start || null,
        planner_est_end:   plannerEstForm.planner_est_end   || null,
        planner_note:      plannerEstForm.planner_note      || null,
      });
      await loadRequest();
      setPlannerEstEditing(false);
      setWorkflowMsg('Planner estimation saved');
      setTimeout(() => setWorkflowMsg(''), 2000);
    } catch (e) {
      setWorkflowMsg('Error: ' + e.message);
    } finally {
      setPlannerEstSaving(false);
    }
  };

  const handleDownloadReport = async () => {
    setDownloadingReport(true);
    try {
      const blob = await api.downloadRequestReport(id);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `ReliabilityReport_${request?.request_number || id}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setSaveMsg(`Report error: ${err.message}`);
      setTimeout(() => setSaveMsg(''), 3000);
    } finally {
      setDownloadingReport(false);
    }
  };

  const handleDownloadSatReport = async () => {
    setDownloadingSatReport(true);
    try {
      const blob = await api.downloadSatReport(id);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `SATReport_${request?.request_number || id}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setSaveMsg(`SAT report error: ${err.message}`);
      setTimeout(() => setSaveMsg(''), 3000);
    } finally {
      setDownloadingSatReport(false);
    }
  };

  const handleDownloadLtcReport = async () => {
    setDownloadingLtc(true);
    try {
      const blob = await api.downloadLtcReport(id);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `LTC_${request?.request_number || id}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setSaveMsg(`LTC error: ${err.message}`);
      setTimeout(() => setSaveMsg(''), 3000);
    } finally {
      setDownloadingLtc(false);
    }
  };

  useEffect(() => { loadRequest(); }, [id]);

  // Sync analysis notes when request updates
  useEffect(() => {
    if (request?.analysis_notes !== undefined) {
      setAnalysisNotes(request.analysis_notes || '');
    }
  }, [request?.analysis_notes]);

  useEffect(() => {
    api.getEmployees().then(res => {
      const m = {};
      (res.employees || []).forEach(emp => { m[emp.id] = emp; });
      setTravEmployees(m);
    }).catch(() => {});
    api.getMachines().then(res => setTravMachines(res.machines || [])).catch(() => {});
  }, []);

  const commitTravCell = async (step, field, rawVal, leg) => {
    if (travCellSaving) return;
    setTravCellSaving(true);
    try {
      let payload = {};
      if (field === 'qty_in')        payload = { qty_in:  rawVal === '' ? null : parseInt(rawVal, 10) };
      else if (field === 'qty_out') payload = { qty_out: rawVal === '' ? null : parseInt(rawVal, 10) };
      else if (field === 'tray_no')    payload = { tray_no: rawVal };
      else if (field === 'machine_no') payload = { machine_no: rawVal };
      else if (field === 'operator_id') payload = { operator_id: rawVal };
      else if (field === 'started_at')  payload = { started_at:  rawVal ? new Date(rawVal).toISOString() : null };
      else if (field === 'completed_at') payload = { completed_at: rawVal ? new Date(rawVal).toISOString() : null };
      else if (field === 'test_item') {
        payload = { custom_fields: { ...(step.custom_fields || {}), test_item: rawVal } };
      } else if (field === 'test_condition') {
        payload = { custom_fields: { ...(step.custom_fields || {}), test_condition: rawVal } };
      }
      await api.updateStep(request.id, step.step_number, payload, leg);
      loadRequest();
    } catch (err) {
      setSaveMsg(`Cell save error: ${err.message}`);
      setTimeout(() => setSaveMsg(''), 3000);
    } finally {
      setTravCellSaving(false);
      setTravEditCell(null);
    }
  };

  // Load settings (including electrical_test_conditions) from backend
  const [settings, setSettings] = useState({});
  useEffect(() => {
    api.getSettings().then(s => {
      setSettings(s);
      if (s.process_presets && s.process_presets.length) {
        // Merge: keep saved presets, append any built-in ones that are missing
        const saved = s.process_presets;
        const missing = DEFAULT_PROCESS_PRESETS.filter(bp => !saved.some(sp => sp.id === bp.id));
        setProcessPresets([...saved, ...missing]);
      } else {
        setProcessPresets(DEFAULT_PROCESS_PRESETS);
      }
    }).catch(() => {
      setSettings({});
      setProcessPresets(DEFAULT_PROCESS_PRESETS);
    });
  }, []);

  const handleApplyLegProcess = async (preset) => {
    if (legProcessSaving) return;
    const currentNames = legSteps.map(s => s.step_name);
    const alreadyApplied = preset.steps.length === currentNames.length &&
      preset.steps.every((st, i) => st === currentNames[i]);
    if (alreadyApplied) return;
    if (currentNames.length > 0 &&
      !window.confirm(`Replace LEG ${selectedLeg} steps with "${preset.label}" (${preset.steps.length} steps)?`)) return;
    setLegProcessSaving(true);
    try {
      await api.replaceSteps(id, preset.steps, selectedLeg);
      setSelectedStep(null);
      setEditingSteps(false);
      loadRequest();
      setSaveMsg(`LEG ${selectedLeg} process set to "${preset.label}"`);
      setTimeout(() => setSaveMsg(''), 2500);
    } catch (err) {
      setSaveMsg(`Error: ${err.message}`);
    } finally {
      setLegProcessSaving(false);
    }
  };

  const startEdit = () => {
    setEditForm({
      classification: request.classification || '',
      originator: request.originator || '',
      plant: request.plant || '',
      device_name: request.device_name || '',
      lot_no: request.lot_no || '',
      customer: request.customer || '',
      pkg_info: request.pkg_info || '',
      purpose: request.purpose || '',
      deadline: request.deadline || '',
    });
    setEditing(true);
  };

  const saveEdit = async () => {
    try {
      await api.updateRequest(id, editForm);
      setSaveMsg('Saved!');
      setEditing(false);
      loadRequest();
      setTimeout(() => setSaveMsg(''), 2000);
    } catch (err) { setSaveMsg(`Error: ${err.message}`); }
  };

  const saveNote = async () => {
    if (!noteInput.trim()) return;
    setNoteSaving(true);
    try {
      await api.updateNote(id, noteInput.trim());
      setSaveMsg('Note saved!');
      setNoteEditing(false);
      loadRequest();
      setTimeout(() => setSaveMsg(''), 2000);
    } catch (err) { setSaveMsg(`Error: ${err.message}`); }
    finally { setNoteSaving(false); }
  };

  const deleteNote = async () => {
    if (!window.confirm('Remove this note?')) return;
    setNoteSaving(true);
    try {
      await api.deleteNote(id);
      setSaveMsg('Note removed.');
      setNoteEditing(false);
      loadRequest();
      setTimeout(() => setSaveMsg(''), 2000);
    } catch (err) { setSaveMsg(`Error: ${err.message}`); }
    finally { setNoteSaving(false); }
  };

  const saveRetention = async () => {
    setRetentionSaving(true);
    try {
      await api.updateRequest(id, { retention_details: retentionInput.trim() || null });
      setSaveMsg('Retention details saved!');
      setRetentionEditing(false);
      loadRequest();
      setTimeout(() => setSaveMsg(''), 2000);
    } catch (err) { setSaveMsg(`Error: ${err.message}`); }
    finally { setRetentionSaving(false); }
  };

  const deleteRetention = async () => {
    if (!window.confirm('Clear retention details?')) return;
    setRetentionSaving(true);
    try {
      await api.updateRequest(id, { retention_details: null });
      setSaveMsg('Retention details cleared.');
      setRetentionEditing(false);
      loadRequest();
      setTimeout(() => setSaveMsg(''), 2000);
    } catch (err) { setSaveMsg(`Error: ${err.message}`); }
    finally { setRetentionSaving(false); }
  };

  const startEditSteps = () => {
    const legSteps = request.steps.filter(s => (s.leg || 1) === selectedLeg);
    setEditStepList(legSteps.map(s => s.step_name));
    setEditingSteps(true);
  };

  const addEditStep = (name) => setEditStepList(prev => [...prev, name]);
  const removeEditStep = (idx) => setEditStepList(prev => prev.filter((_, i) => i !== idx));
  const moveEditStep = (idx, dir) => {
    setEditStepList(prev => {
      const arr = [...prev];
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= arr.length) return arr;
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr;
    });
  };

  const saveSteps = async () => {
    if (editStepList.length === 0) return;
    setStepSaving(true);
    try {
      await api.replaceSteps(id, editStepList, selectedLeg);
      setEditingSteps(false);
      setSelectedStep(null);
      loadRequest();
      setSaveMsg('Steps updated!');
      setTimeout(() => setSaveMsg(''), 2000);
    } catch (err) { setSaveMsg(`Error: ${err.message}`); }
    finally { setStepSaving(false); }
  };

  const handleQuickAddStep = async (stepName) => {
    const name = (stepName || customStepInput).trim();
    if (!name) return;
    setStepSaving(true);
    try {
      const currentNames = legSteps.map(s => s.step_name);
      await api.replaceSteps(id, [...currentNames, name], selectedLeg);
      // Auto-save custom name to presets
      if (!stepPresets.includes(name)) savePresets([...stepPresets, name]);
      setAddingStep(false);
      setCustomStepInput('');
      loadRequest();
      setSaveMsg('Step added!');
      setTimeout(() => setSaveMsg(''), 2000);
    } catch (err) {
      setSaveMsg(`Error: ${err.message}`);
    } finally {
      setStepSaving(false);
    }
  };

  const handleRenameStep = async (step, newName) => {
    try {
      const names = legSteps.map(s =>
        s.step_number === step.step_number ? newName : s.step_name
      );
      await api.replaceSteps(id, names, selectedLeg);
      loadRequest();
      setSaveMsg('Step renamed!');
      setTimeout(() => setSaveMsg(''), 2000);
    } catch (err) { setSaveMsg(`Error: ${err.message}`); }
  };

  const handleDeleteStep = async (step) => {
    if (!window.confirm(`Delete step "${step.step_name}"? This cannot be undone.`)) return;
    try {
      const names = legSteps
        .filter(s => s.step_number !== step.step_number)
        .map(s => s.step_name);
      await api.replaceSteps(id, names, selectedLeg);
      if (selectedStep?.step_number === step.step_number) setSelectedStep(null);
      loadRequest();
      setSaveMsg('Step deleted.');
      setTimeout(() => setSaveMsg(''), 2000);
    } catch (err) { setSaveMsg(`Error: ${err.message}`); }
  };

  const handleSetSATType = async (step, satType) => {
    try {
      const existingFields = step.custom_fields || {};
      const updated = { ...existingFields };
      if (satType) updated.sat_type = satType;
      else delete updated.sat_type;
      await api.updateStep(id, step.step_number, { custom_fields: updated }, selectedLeg);
      loadRequest();
    } catch (err) { setSaveMsg(`Error: ${err.message}`); }
  };

  const handleAddLeg = async () => {
    try {
      const result = await api.addLeg(id);
      loadRequest();
      setSelectedLeg(result.leg);
      setSelectedStep(null);
      setSaveMsg(`LEG ${result.leg} added!`);
      setTimeout(() => setSaveMsg(''), 2000);
    } catch (err) { setSaveMsg(`Error: ${err.message}`); }
  };

  const handleDuplicateLeg = async () => {
    if (!confirm(`Duplicate LEG ${selectedLeg}? A new LEG will be created with the same steps, test items, and conditions.`)) return;
    try {
      const result = await api.duplicateLeg(id, selectedLeg);
      loadRequest();
      setSelectedLeg(result.leg);
      setSelectedStep(null);
      setSaveMsg(`LEG ${selectedLeg} duplicated as LEG ${result.leg}!`);
      setTimeout(() => setSaveMsg(''), 2500);
    } catch (err) { setSaveMsg(`Error: ${err.message}`); }
  };

  const handleRemoveLeg = async (legNumber) => {
    if (!confirm(`Remove LEG ${legNumber}? All its steps and data will be deleted.`)) return;
    try {
      await api.removeLeg(id, legNumber);
      setSelectedLeg(1);
      setSelectedStep(null);
      loadRequest();
      setSaveMsg(`LEG ${legNumber} removed!`);
      setTimeout(() => setSaveMsg(''), 2000);
    } catch (err) { setSaveMsg(`Error: ${err.message}`); }
  };

  const legSteps = request ? request.steps.filter(s => (s.leg || 1) === selectedLeg) : [];

  // Returns true when a step cannot be edited because a prior step is not yet completed
  // All users with canUpdateStep can edit any step freely (no order lock)
  const isStepLocked = (step) => {
    if (!step) return false;
    // All users who can update steps bypass order locking
    if (canBypassOrder) return false;
    const sorted = legSteps.slice().sort((a, b) => a.step_number - b.step_number);
    const idx = sorted.findIndex(s => s.step_number === step.step_number);
    if (idx <= 0) return false;
    return sorted.slice(0, idx).some(s => s.status !== 'completed');
  };

  const handleStepClick = (step) => {
    setSelectedStep(step);
    if (!canBypassOrder && isStepLocked(step)) {
      const sorted = legSteps.slice().sort((a, b) => a.step_number - b.step_number);
      const idx = sorted.findIndex(s => s.step_number === step.step_number);
      const firstIncomplete = sorted.slice(0, idx).find(s => s.status !== 'completed');
      setLockedStepMsg(
        firstIncomplete
          ? `Step ${firstIncomplete.step_number} "${firstIncomplete.step_name}" must be completed first.`
          : 'A previous step must be completed first.'
      );
    } else if (!canBypassOrder && step.status === 'completed') {
      setLockedStepMsg('This step is already Done and cannot be edited.');
    } else {
      setLockedStepMsg('');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>;
  }

  if (!request) return null;

  const legs = [...new Set(request.steps.map(s => s.leg || 1))].sort((a, b) => a - b);
  const completedSteps = request.steps.filter(s => s.status === 'completed').length;
  const allStepsCompleted = request.steps.length > 0 && request.steps.every(s => s.status === 'completed');
  const pct = Math.round((completedSteps / request.steps.length) * 100);
  const legCompleted = legSteps.filter(s => s.status === 'completed').length;
  const legPct = legSteps.length > 0 ? Math.round((legCompleted / legSteps.length) * 100) : 0;

  const fmtTimestamp = (d) =>
    d.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  // ── Cascaded per-step estimates ──────────────────────────────────────────
  // All legs start from the SAME base anchor (approval date) because legs run
  // in parallel. Within each leg, steps cascade sequentially.
  // If a step's actual started_at is set (process step changed / re-started),
  // it re-anchors the cursor for the remainder of that leg.
  // Keyed by both id and "leg-stepNum".
  const stepEstimates = (() => {
    const sorted = [...request.steps].sort((a, b) =>
      (a.leg || 1) - (b.leg || 1) || a.step_number - b.step_number
    );
    const map = {};

    // Determine base anchor (shared by all legs) ─────────────────────────
    let baseAnchor = null;
    // 1st choice: approved_at
    if (request.approved_at) {
      const t = new Date(request.approved_at).getTime();
      if (!isNaN(t)) baseAnchor = t;
    }
    // 2nd choice: updated_at when request is already in testing/analysis/completed/discontinued
    // NOTE: started_at from individual steps is intentionally NOT used as a fallback —
    // estimates must remain fixed regardless of any manually-entered actual start dates.
    if (baseAnchor === null && ['testing','analysis','completed','discontinued'].includes(request.status)) {
      const t = new Date(request.updated_at).getTime();
      if (!isNaN(t)) baseAnchor = t;
    }

    // Group steps by leg, then cascade independently per leg ─────────────
    const legs = {};
    for (const s of sorted) {
      const legNum = s.leg || 1;
      if (!legs[legNum]) legs[legNum] = [];
      legs[legNum].push(s);
    }

    for (const legNum of Object.keys(legs)) {
      // Each leg resets to the shared base anchor.
      // Standard estimates are PURELY based on approval date + cumulative CT.
      // Actual started_at is the real date and does NOT affect the standard estimate.
      let cursor = baseAnchor;

      for (const s of legs[legNum]) {
        const legKey = `${s.leg || 1}-${s.step_number}`;
        // Store under both id (new backend) and leg-step key (fallback)
        if (s.id != null) map[s.id] = cursor;
        map[legKey] = cursor;
        const stdDays = getStepCT(s);
        if (cursor !== null && typeof stdDays === 'number') {
          cursor = cursor + stdDays * 86400000;
        }
      }
    }

    return map;
  })();

  return (
    <div className="space-y-6 stagger-children">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/requests')}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-heading font-bold text-blue-700 dark:text-blue-400 tracking-tight font-mono">
              {request.original_rr_number || request.request_number}
            </h1>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
              request.status === 'completed'    ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
              request.status === 'discontinued' ? 'bg-rose-100 text-rose-700 border-rose-200' :
              request.status === 'analysis'     ? 'bg-teal-100 text-teal-700 border-teal-200' :
              request.status === 'testing'      ? 'bg-orange-100 text-orange-700 border-orange-200' :
              request.status === 'approval'     ? 'bg-violet-100 text-violet-700 border-violet-200' :
              request.status === 'review'       ? 'bg-blue-100 text-blue-700 border-blue-200' :
              request.status === 'in_progress'  ? 'bg-orange-100 text-orange-700 border-orange-200' :
              request.status === 'incoming'     ? 'bg-amber-100 text-amber-700 border-amber-200' :
              'bg-slate-100 text-slate-600 border-slate-200'
            }`}>
              {request.status === 'incoming' || request.status === 'pending' ? 'Request' :
               request.status === 'in_progress' ? 'Testing' :
               request.status === 'discontinued' ? 'Discontinued' :
               request.status ? request.status.charAt(0).toUpperCase() + request.status.slice(1) : ''}
            </span>
            {saveMsg && <span className="text-xs text-emerald-600">{saveMsg}</span>}
          </div>
          {request.original_rr_number && (
            <p className="text-sm font-mono text-amber-500 dark:text-amber-400 mt-0.5 font-semibold">
              RR# {request.request_number}
            </p>
          )}
          <p className="text-sm text-slate-400 mt-0.5">
            Created by {request.created_by_username} • {new Date(request.created_at).toLocaleString()}
            {request.deadline && <> • Due: {request.deadline}</>}
          </p>
        </div>
        {canEdit && !editing && (
          <button onClick={startEdit}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-medium transition-all">
            <Edit3 className="w-4 h-4" /> Edit
          </button>
        )}
        <button
          onClick={handleDownloadLtcReport}
          disabled={downloadingLtc}
          title="Download LTC Format (.xlsx)"
          className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 rounded-lg text-sm font-medium transition-all">
          {downloadingLtc
            ? <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
            : <FileSpreadsheet className="w-4 h-4" />}
          Download LTC
        </button>
        <button
          onClick={handleDownloadSatReport}
          disabled={downloadingSatReport}
          title="Download SAT Observation Report (.xlsx)"
          className="flex items-center gap-2 px-3 py-2 bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 rounded-lg text-sm font-medium transition-all">
          {downloadingSatReport
            ? <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
            : <FileSpreadsheet className="w-4 h-4" />}
          SAT Report
        </button>
        <button
          onClick={handleDownloadReport}
          disabled={downloadingReport}
          title="Download full Reliability Test Report (.xlsx)"
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium transition-all">
          {downloadingReport
            ? <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
            : <Download className="w-4 h-4" />}
          Download Report
        </button>
      </div>

      {/* Progress bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-slate-700">Progress</span>
          <span className="text-sm text-slate-500">{completedSteps} / {request.steps.length} steps ({pct}%)</span>
        </div>
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-600 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* ── Planner Estimation ───────────────────────────────── */}
      {(() => {
        const canPlan = hasRole('Admin', 'Planner');
        const hasPlannerData = request.planner_est_start || request.planner_est_end || request.planner_note;
        if (!canPlan && !hasPlannerData) return null;

        // Convert ISO string → datetime-local input value (YYYY-MM-DDTHH:mm)
        const isoToLocal = (isoStr) => {
          if (!isoStr) return '';
          const d = new Date(isoStr);
          if (isNaN(d.getTime())) return '';
          const pad = n => String(n).padStart(2, '0');
          return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        };
        const fmt = (isoStr) => {
          if (!isoStr) return null;
          const d = new Date(isoStr);
          return isNaN(d.getTime()) ? null : fmtTimestamp(d);
        };
        const startEdit = () => {
          setPlannerEstForm({
            planner_est_start: isoToLocal(request.planner_est_start),
            planner_est_end:   isoToLocal(request.planner_est_end),
            planner_note:      request.planner_note || '',
          });
          setPlannerEstEditing(true);
        };

        return (
          <div className="bg-white border border-amber-200 rounded-lg px-5 py-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-500" />
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-500">Planner Estimation</p>
                {!hasPlannerData && (
                  <span className="text-xs text-slate-400 italic">Not yet set</span>
                )}
              </div>
              {canPlan && !plannerEstEditing && (
                <button
                  onClick={startEdit}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg transition-colors">
                  <Edit3 className="w-3 h-3" /> {hasPlannerData ? 'Edit' : 'Add Estimation'}
                </button>
              )}
            </div>

            {plannerEstEditing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Est. Start Date</label>
                    <input
                      type="datetime-local"
                      value={plannerEstForm.planner_est_start}
                      onChange={e => setPlannerEstForm(f => ({ ...f, planner_est_start: e.target.value }))}
                      className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-amber-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Est. End Date</label>
                    <input
                      type="datetime-local"
                      value={plannerEstForm.planner_est_end}
                      onChange={e => setPlannerEstForm(f => ({ ...f, planner_est_end: e.target.value }))}
                      className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-amber-50"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Planner Note</label>
                  <textarea
                    rows={2}
                    value={plannerEstForm.planner_note}
                    onChange={e => setPlannerEstForm(f => ({ ...f, planner_note: e.target.value }))}
                    placeholder="Optional note from planner…"
                    className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-amber-50 resize-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSavePlannerEst}
                    disabled={plannerEstSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                    {plannerEstSaving
                      ? <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                      : <Save className="w-4 h-4" />}
                    Save
                  </button>
                  <button
                    onClick={() => setPlannerEstEditing(false)}
                    disabled={plannerEstSaving}
                    className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-sm font-medium transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            ) : hasPlannerData ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Est. Start</p>
                  {request.planner_est_start
                    ? <p className="text-sm font-semibold text-amber-700">{fmt(request.planner_est_start)}</p>
                    : <p className="text-sm text-slate-400 italic">—</p>}
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Est. End</p>
                  {request.planner_est_end
                    ? <p className="text-sm font-semibold text-amber-700">{fmt(request.planner_est_end)}</p>
                    : <p className="text-sm text-slate-400 italic">—</p>}
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Note</p>
                  <p className="text-sm text-slate-600">{request.planner_note || <span className="italic text-slate-400">—</span>}</p>
                </div>
                {request.planner_est_start && request.planner_est_end && (() => {
                  const s = new Date(request.planner_est_start);
                  const e = new Date(request.planner_est_end);
                  const days = Math.round((e - s) / 86400000);
                  return days > 0 ? (
                    <div className="sm:col-span-3 mt-1 pt-3 border-t border-amber-100">
                      <span className="text-xs text-slate-500">
                        Planner estimates <span className="font-semibold text-amber-600">{days} day{days !== 1 ? 's' : ''}</span> total processing time
                      </span>
                    </div>
                  ) : null;
                })()}
              </div>
            ) : null}
          </div>
        );
      })()}

      {/* ── Workflow Action Buttons ─────────────────────────── */}
      {!['completed','discontinued'].includes(request.status) && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm px-5 py-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Workflow Actions</p>
          <div className="flex flex-wrap items-center gap-3">
            {/* incoming / pending → Review */}
            {(request.status === 'incoming' || request.status === 'pending') && canEdit && (
              <button
                onClick={() => handleWorkflow('submit-review', 'Submit this request for review?')}
                disabled={workflowLoading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                <Send className="w-4 h-4" /> Submit for Review
              </button>
            )}
            {/* review → Approval */}
            {request.status === 'review' && canEdit && (
              <button
                onClick={() => handleWorkflow('submit-approval', 'Submit this request for management approval?')}
                disabled={workflowLoading}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                <ShieldCheck className="w-4 h-4" /> Submit for Approval
              </button>
            )}
            {/* approval → Admin/Planner Approve or Reject */}
            {request.status === 'approval' && hasRole('Admin', 'Planner') && (
              <>
                <button
                  onClick={() => handleWorkflow('approve', 'Approve this request and start testing?')}
                  disabled={workflowLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                  <ThumbsUp className="w-4 h-4" /> Approve
                </button>
                <button
                  onClick={() => handleWorkflow('reject', 'Reject and send back to Review?')}
                  disabled={workflowLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                  <ThumbsDown className="w-4 h-4" /> Reject
                </button>
              </>
            )}
            {/* analysis / testing → Complete Report (disabled until all steps done) */}
            {(request.status === 'analysis' || request.status === 'testing' || request.status === 'in_progress') && canEdit && (
              <span title={!allStepsCompleted ? 'All process steps must be completed before closing the report' : ''}>
                <button
                  onClick={handleCompleteReport}
                  disabled={workflowLoading || !allStepsCompleted}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors text-white
                    ${allStepsCompleted
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-slate-300 cursor-not-allowed opacity-60'}`}>
                  <FileCheck className="w-4 h-4" /> Complete Report
                </button>
              </span>
            )}
            {/* Discontinued — Admin / Planner only, any active status */}
            {hasRole('Admin', 'Planner') && (
              <button
                onClick={handleDiscontinue}
                disabled={workflowLoading}
                className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                <X className="w-4 h-4" /> Discontinued
              </button>
            )}
            {workflowLoading && <span className="w-4 h-4 border-2 border-blue-400 border-t-blue-600 rounded-full animate-spin" />}
            {workflowMsg && (
              <span className={`text-xs font-medium ${workflowMsg.startsWith('Error') ? 'text-red-600' : 'text-emerald-600'}`}>
                {workflowMsg}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Analysis Section (status = analysis) ──────────── */}
      {request.status === 'analysis' && (
        <div className="bg-teal-50 border border-teal-200 rounded-xl shadow-sm">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-teal-100">
            <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
              <FileCheck className="w-4 h-4 text-teal-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-teal-800">Analysis</p>
              <p className="text-xs text-teal-500">All testing steps completed — review results and complete the report</p>
            </div>
          </div>
          <div className="px-5 py-4 space-y-3">
            <p className="text-xs font-semibold text-teal-700 uppercase tracking-wider">Analysis Notes</p>
            <textarea
              rows={5}
              value={analysisNotes}
              onChange={e => setAnalysisNotes(e.target.value)}
              placeholder="Enter analysis summary, key findings, recommendations…"
              className="w-full border border-teal-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 rounded-lg px-3 py-2 text-sm bg-white text-slate-800 resize-y"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveAnalysisNotes}
                disabled={analysisNotesSaving}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors">
                {analysisNotesSaving
                  ? <span className="w-3 h-3 border border-white/50 border-t-white rounded-full animate-spin" />
                  : <Save className="w-3 h-3" />}
                Save Notes
              </button>
              <span title={!allStepsCompleted ? 'All process steps must be completed before closing the report' : ''}>
                <button
                  onClick={handleCompleteReport}
                  disabled={workflowLoading || !allStepsCompleted}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors text-white
                    ${allStepsCompleted
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-slate-300 cursor-not-allowed opacity-60'}`}>
                  <FileCheck className="w-3 h-3" /> Complete Report
                </button>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Retention Details (completed requests only) ───── */}
      {request.status === 'completed' && (
        <div className={`rounded-xl border shadow-sm ${request.retention_details ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
          <div className="flex items-start justify-between px-5 py-4 gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center mt-0.5 ${request.retention_details ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                <Archive className={`w-4 h-4 ${request.retention_details ? 'text-emerald-600' : 'text-slate-400'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold uppercase tracking-wider mb-3 ${request.retention_details ? 'text-emerald-700' : 'text-slate-400'}`}>
                  Retention Details
                </p>

                {retentionEditing ? (
                  <div className="space-y-4">
                    <EnhancedRetentionDetails
                      request={request}
                      isEditing={retentionEditing}
                      setIsEditing={setRetentionEditing}
                      onSave={saveRetention}
                      disabled={retentionSaving}
                    />
                  </div>
                ) : request.retention_details ? (
                  (() => {
                    const retentionData = parseRetentionDetails(request.retention_details);
                    const hasData = hasRetentionData(retentionData);
                    return (
                      <div className="space-y-3">
                        {/* Display structured retention data if available */}
                        {hasData && (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                            {/* Reliability Tested */}
                            {Object.values(retentionData.retentionData.reliabilityTested).some(v => v) && (
                              <div className="border border-emerald-200 bg-white rounded p-2">
                                <p className="text-xs font-semibold text-emerald-600 mb-2">Reliability Tested</p>
                                <p className="text-xs text-slate-600 space-y-1">
                                  {retentionData.retentionData.reliabilityTested.boxLocation && (
                                    <div><span className="font-medium">Location:</span> {retentionData.retentionData.reliabilityTested.boxLocation}</div>
                                  )}
                                  {retentionData.retentionData.reliabilityTested.quantity && (
                                    <div><span className="font-medium">Qty:</span> {retentionData.retentionData.reliabilityTested.quantity}</div>
                                  )}
                                  {retentionData.retentionData.reliabilityTested.dateRetent && (
                                    <div><span className="font-medium">Date:</span> {retentionData.retentionData.reliabilityTested.dateRetent}</div>
                                  )}
                                </p>
                              </div>
                            )}

                            {/* Excess Units */}
                            {Object.values(retentionData.retentionData.excessUnits).some(v => v) && (
                              <div className="border border-amber-200 bg-white rounded p-2">
                                <p className="text-xs font-semibold text-amber-600 mb-2">Excess Units</p>
                                <p className="text-xs text-slate-600 space-y-1">
                                  {retentionData.retentionData.excessUnits.boxLocation && (
                                    <div><span className="font-medium">Location:</span> {retentionData.retentionData.excessUnits.boxLocation}</div>
                                  )}
                                  {retentionData.retentionData.excessUnits.quantity && (
                                    <div><span className="font-medium">Qty:</span> {retentionData.retentionData.excessUnits.quantity}</div>
                                  )}
                                  {retentionData.retentionData.excessUnits.dateRetent && (
                                    <div><span className="font-medium">Date:</span> {retentionData.retentionData.excessUnits.dateRetent}</div>
                                  )}
                                </p>
                              </div>
                            )}

                            {/* Sent to Tanyag */}
                            {Object.values(retentionData.retentionData.sentToTanyag).some(v => v) && (
                              <div className="border border-blue-200 bg-white rounded p-2">
                                <p className="text-xs font-semibold text-blue-600 mb-2">Sent to Tanyag</p>
                                <p className="text-xs text-slate-600 space-y-1">
                                  {retentionData.retentionData.sentToTanyag.sampleCarrier && (
                                    <div><span className="font-medium">Carrier:</span> {retentionData.retentionData.sentToTanyag.sampleCarrier}</div>
                                  )}
                                  {retentionData.retentionData.sentToTanyag.quantity && (
                                    <div><span className="font-medium">Qty:</span> {retentionData.retentionData.sentToTanyag.quantity}</div>
                                  )}
                                  {retentionData.retentionData.sentToTanyag.tanyagRetentionBoxNum && (
                                    <div><span className="font-medium">Box #:</span> {retentionData.retentionData.sentToTanyag.tanyagRetentionBoxNum}</div>
                                  )}
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Fallback: Show raw JSON if it looks like structured data */}
                        {retentionData && typeof retentionData === 'object' && retentionData.retentionData ? (
                          <p className="text-xs text-slate-500">
                            <a
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                setRetentionInput(request.retention_details || '');
                                setRetentionEditing(true);
                              }}
                              className="text-emerald-600 hover:underline"
                            >
                              View full details
                            </a>
                          </p>
                        ) : (
                          <p className="text-sm text-emerald-900 whitespace-pre-wrap leading-relaxed">{request.retention_details}</p>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  <p className="text-sm text-slate-400 italic">No retention details recorded yet.</p>
                )}
              </div>
            </div>

            {canEdit && !retentionEditing && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => {
                    setRetentionInput(request.retention_details || '');
                    setRetentionEditing(true);
                  }}
                  title={request.retention_details ? 'Edit retention details' : 'Add retention details'}
                  className="p-1.5 rounded-lg hover:bg-emerald-100 text-slate-400 hover:text-emerald-600 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                {request.retention_details && (
                  <button
                    onClick={deleteRetention}
                    disabled={retentionSaving}
                    title="Clear retention details"
                    className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Discontinued Info (discontinued requests only) ── */}
      {request.status === 'discontinued' && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl shadow-sm px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <X className="w-4 h-4 text-rose-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-rose-600 mb-3">Request Discontinued</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Discontinued On</p>
                  <p className="font-medium text-rose-700">
                    {request.discontinued_at ? fmtTimestamp(new Date(request.discontinued_at)) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Discontinued By</p>
                  <p className="font-medium text-slate-700">{request.discontinued_by || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Reason</p>
                  <p className="text-slate-600">
                    {request.discontinued_reason || <span className="italic text-slate-400">No reason provided</span>}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Public Note ─────────────────────────────────────── */}
      <div className={`rounded-xl border shadow-sm ${request.note ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
        <div className="flex items-start justify-between px-5 py-4 gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center mt-0.5 ${request.note ? 'bg-amber-100' : 'bg-slate-100'}`}>
              <MessageSquarePlus className={`w-4 h-4 ${request.note ? 'text-amber-600' : 'text-slate-400'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${request.note ? 'text-amber-700' : 'text-slate-400'}`}>
                Public Notice
              </p>
              {noteEditing ? (
                <div className="space-y-2">
                  <textarea
                    autoFocus
                    rows={3}
                    value={noteInput}
                    onChange={e => setNoteInput(e.target.value)}
                    placeholder="Type a note visible to everyone…"
                    className="w-full border border-amber-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 rounded-lg px-3 py-2 text-sm bg-white text-slate-800 resize-y"
                  />
                  <div className="flex items-center gap-2">
                    <button onClick={saveNote} disabled={noteSaving || !noteInput.trim()}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors">
                      <Save className="w-3.5 h-3.5" /> {noteSaving ? 'Saving…' : 'Save'}
                    </button>
                    <button onClick={() => setNoteEditing(false)}
                      className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-medium transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : request.note ? (
                <p className="text-sm text-amber-900 whitespace-pre-wrap leading-relaxed">{request.note}</p>
              ) : (
                <p className="text-sm text-slate-400 italic">No notice set — visible to everyone once added.</p>
              )}
            </div>
          </div>
          {canEdit && !noteEditing && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={() => { setNoteInput(request.note || ''); setNoteEditing(true); }}
                title={request.note ? 'Edit notice' : 'Add notice'}
                className="p-1.5 rounded-lg hover:bg-amber-100 text-slate-400 hover:text-amber-600 transition-colors">
                <Pencil className="w-4 h-4" />
              </button>
              {request.note && (
                <button onClick={deleteNote} disabled={noteSaving}
                  title="Remove notice"
                  className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Request Info (collapsible) */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
        <button onClick={() => setShowInfo(!showInfo)}
          className="w-full flex items-center justify-between px-6 py-4 text-left">
          <h3 className="font-heading font-semibold text-slate-800">Request Information</h3>
          {showInfo ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>
        {showInfo && (
          <div className="px-6 pb-4">
            {editing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {['classification', 'originator', 'plant', 'device_name', 'lot_no', 'customer', 'pkg_info', 'deadline'].map(key => (
                  <div key={key}>
                    <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-1">{key.replace('_', ' ')}</label>
                    <input type={key === 'deadline' ? 'date' : 'text'}
                      value={editForm[key] || ''} onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white focus:border-blue-500 text-sm" />
                  </div>
                ))}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-1">Purpose</label>
                  <textarea value={editForm.purpose || ''} onChange={e => setEditForm(f => ({ ...f, purpose: e.target.value }))} rows={2}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white focus:border-blue-500 text-sm" />
                </div>
                <div className="sm:col-span-2 flex gap-2 justify-end">
                  <button onClick={() => setEditing(false)}
                    className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-sm">Cancel</button>
                  <button onClick={saveEdit}
                    className="px-3 py-1.5 bg-slate-900 text-white hover:bg-slate-800 rounded-lg text-sm font-medium">Save Changes</button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                <div>
                  <InfoRow label="Classification" value={request.classification} />
                  <InfoRow label="Originator" value={request.originator} />
                  <InfoRow label="Plant" value={request.plant} />
                  <InfoRow label="Device Name" value={request.device_name} />
                  <InfoRow label="Lot No." value={request.lot_no} />
                  <InfoRow label="Customer" value={request.customer} />
                  <InfoRow label="Pkg Info" value={request.pkg_info} />
                  <InfoRow label="Automotive" value={request.automotive} />
                </div>
                <div>
                  {request.original_rr_number && (
                    <div className="flex items-center gap-3 mb-3 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-700/50">
                      <div className="flex-shrink-0">
                        <span className="block text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-0.5">RR#</span>
                        <span className="font-mono text-base font-bold text-amber-800 dark:text-amber-300 tracking-tight">{request.request_number}</span>
                      </div>
                    </div>
                  )}
                  <InfoRow label="Date LTC" value={request.date_ltc} />
                  <InfoRow label="Product Hierarchy" value={request.product_hierarchy} />
                  <InfoRow label="PDL" value={request.pdl} />
                  <InfoRow label="Body Size" value={request.body_size_x && request.body_size_y ? `${request.body_size_x} × ${request.body_size_y} mm` : null} />
                  <InfoRow label="Package Thickness" value={request.package_thickness && `${request.package_thickness} mm`} />
                  <InfoRow label="Ball (Pitch / Count)" value={request.ball_pitch || request.ball_count ? `${request.ball_pitch || '—'} / ${request.ball_count || '—'}` : null} />
                  <InfoRow label="Lead (Pitch / Count)" value={request.lead_pitch || request.lead_count ? `${request.lead_pitch || '—'} / ${request.lead_count || '—'}` : null} />
                  <InfoRow label="Total SS" value={request.total_ss} />
                  <InfoRow label="Purpose" value={request.purpose} />
                  <InfoRow label="Deadline" value={request.deadline} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* LEG Tabs */}
      {legs.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mr-1">LEGs</span>
            {legs.map(leg => (
              <button key={leg} onClick={() => { setSelectedLeg(leg); setSelectedStep(null); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedLeg === leg
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                }`}>
                LEG {leg}
              </button>
            ))}
            {canManageSteps && legs.length < 50 && (
              <button onClick={handleAddLeg}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors">
                + Add LEG
              </button>
            )}
            {canManageSteps && legs.length < 50 && (
              <button onClick={handleDuplicateLeg}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-200 transition-colors">
                Duplicate
              </button>
            )}
            {canManageSteps && legs.length > 1 && (
              <button onClick={() => handleRemoveLeg(selectedLeg)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-colors ml-auto">
                Remove LEG {selectedLeg}
              </button>
            )}
          </div>

          {/* Per-leg process selector */}
          {processPresets.length > 0 && canManageSteps && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 shrink-0 flex items-center gap-1">
                  <LayoutList className="w-3 h-3" /> Process
                </span>
                {processPresets.map(preset => {
                  const names = legSteps.map(s => s.step_name);
                  const active = preset.steps.length === names.length &&
                    preset.steps.every((st, i) => st === names[i]);
                  return (
                    <div key={preset.id} className="relative inline-flex group">
                      <button type="button"
                        disabled={legProcessSaving}
                        onClick={() => handleApplyLegProcess(preset)}
                        className={`inline-flex flex-col items-start px-3 py-1.5 rounded-lg border text-left transition-all disabled:opacity-50 ${
                          active
                            ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-blue-50 hover:border-blue-300'
                        } ${preset.is_custom ? 'pr-6' : ''}`}>
                        <span className={`text-xs font-semibold leading-tight ${active ? 'text-white' : 'text-slate-700'}`}>
                          {preset.label}
                        </span>
                        <span className={`text-[10px] ${active ? 'text-blue-100' : 'text-slate-400'}`}>
                          {preset.steps.length} steps
                          {preset.is_custom && preset.created_by_username && (
                            <span className={`ml-1 ${active ? 'text-blue-200' : 'text-slate-300'}`}>· {preset.created_by_username}</span>
                          )}
                        </span>
                      </button>
                      {preset.is_custom && hasRole('Admin') && (
                        <button
                          onClick={e => { e.stopPropagation(); handleDeleteProcessPreset(preset.id); }}
                          title="Delete process template"
                          className="absolute top-0.5 right-0.5 w-4 h-4 rounded flex items-center justify-center bg-red-100 text-red-400 hover:bg-red-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
                {canManageSteps && (
                  <button
                    onClick={() => setShowNewProcessModal(true)}
                    title="Create a new process template"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 text-slate-400 hover:border-blue-400 hover:text-blue-600 text-xs font-medium transition-colors">
                    <Plus className="w-3 h-3" /> New Process
                  </button>
                )}
                {legProcessSaving && <span className="text-xs text-slate-400">Applying…</span>}
                {(() => {
                  const names = legSteps.map(s => s.step_name);
                  const matched = processPresets.find(p =>
                    p.steps.length === names.length && p.steps.every((st, i) => st === names[i]));
                  return !matched && names.length > 0 ? (
                    <span className="text-[10px] text-slate-400 italic ml-1">Custom flow ({names.length} steps)</span>
                  ) : null;
                })()}
              </div>
            </div>
          )}

          {legs.length > 1 && (
            <div className="mt-3 flex items-center gap-3">
              <span className="text-xs text-slate-400">LEG {selectedLeg}: {legCompleted}/{legSteps.length} steps ({legPct}%)</span>
              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${legPct}%` }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Process Steps - Master-Detail layout */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        {/* Collapsible header */}
        <button
          onClick={() => setShowSteps(v => !v)}
          className="w-full flex items-center justify-between px-5 py-3.5 bg-slate-700 hover:bg-slate-600 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <LayoutList className="w-4 h-4 text-slate-300" />
            <span className="font-heading font-semibold text-slate-100 text-sm">
              Process Steps {legs.length > 1 ? `(LEG ${selectedLeg})` : ''}
            </span>
            {!showSteps && legSteps.length > 0 && (
              <span className="text-xs text-slate-400">{legSteps.length} steps</span>
            )}
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${showSteps ? '' : '-rotate-90'}`} />
        </button>
        <div className={showSteps ? '' : 'hidden'}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-4">
        {/* Step list */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between mb-4 px-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-heading font-semibold text-slate-800">Process Steps {legs.length > 1 ? `(LEG ${selectedLeg})` : ''}</h3>
                {canManageSteps && !editingSteps && processPresets.length > 0 && (() => {
                  const names = legSteps.map(s => s.step_name);
                  const matched = processPresets.find(p =>
                    p.steps.length === names.length && p.steps.every((st, i) => st === names[i]));
                  return (
                    <select
                      value={matched ? String(matched.id) : ''}
                      disabled={legProcessSaving}
                      onChange={e => {
                        const p = processPresets.find(x => String(x.id) === e.target.value);
                        if (p) handleApplyLegProcess(p);
                      }}
                      className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-slate-50 focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all disabled:opacity-50 cursor-pointer max-w-[180px]"
                      title="Select process template"
                    >
                      <option value="">— Select Process —</option>
                      {processPresets.map(p => (
                        <option key={p.id} value={String(p.id)}>
                          {p.label} ({p.steps.length} steps)
                        </option>
                      ))}
                    </select>
                  );
                })()}
              </div>
              {processPresets.length > 0 && (() => {
                const names = legSteps.map(s => s.step_name);
                const matched = processPresets.find(p =>
                  p.steps.length === names.length && p.steps.every((st, i) => st === names[i]));
                return !matched && names.length > 0 ? (
                  <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 italic mt-0.5">
                    Custom flow ({names.length} steps)
                  </span>
                ) : null;
              })()}
            </div>
            {canManageSteps && !editingSteps && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { setAddingStep(v => !v); setCustomStepInput(''); }}
                  title="Add Step"
                  className={`p-1.5 rounded transition-colors ${
                    addingStep
                      ? 'bg-emerald-100 text-emerald-600'
                      : 'hover:bg-slate-100 text-slate-400 hover:text-emerald-600'
                  }`}>
                  <PlusCircle className="w-4 h-4" />
                </button>
                <button onClick={startEditSteps} title="Edit Steps"
                  className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors">
                  <Settings2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Quick Add Step Panel */}
          {addingStep && !editingSteps && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Add Process Step</p>
                <button
                  onClick={() => { setEditingPresets(v => !v); setPresetRenameIdx(null); setPresetNewInput(''); }}
                  title="Manage step presets"
                  className={`p-1 rounded transition-colors ${editingPresets ? 'bg-emerald-200 text-emerald-700' : 'text-emerald-500 hover:bg-emerald-200'}`}>
                  <Settings2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {editingPresets ? (
                <div className="space-y-2">
                  <p className="text-xs text-emerald-600">Hover a preset to edit or delete it.</p>
                  <div className="flex flex-wrap gap-1.5">
                    {stepPresets.map((name, idx) => (
                      <div key={idx} className="group flex items-center bg-white border border-slate-200 rounded-md overflow-hidden">
                        {presetRenameIdx === idx ? (
                          <>
                            <input
                              autoFocus
                              value={presetRenameVal}
                              onChange={e => setPresetRenameVal(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') commitPresetRename(idx); if (e.key === 'Escape') setPresetRenameIdx(null); }}
                              className="w-28 px-2 py-1 text-xs border-r border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-300"
                            />
                            <button onClick={() => commitPresetRename(idx)} className="px-1 py-1 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50">
                              <Check className="w-3 h-3" />
                            </button>
                            <button onClick={() => setPresetRenameIdx(null)} className="px-1 py-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50">
                              <X className="w-3 h-3" />
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="px-2 py-1 text-xs text-slate-600">{name}</span>
                            <button onClick={() => { setPresetRenameIdx(idx); setPresetRenameVal(name); }}
                              className="px-1 py-1 text-slate-300 hover:text-blue-500 hover:bg-blue-50 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Edit3 className="w-3 h-3" />
                            </button>
                            <button onClick={() => deletePreset(idx)}
                              className="px-1 py-1 text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity">
                              <X className="w-3 h-3" />
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={presetNewInput}
                      onChange={e => setPresetNewInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addPresetDirect()}
                      placeholder="Add new preset name..."
                      className="flex-1 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200 text-xs"
                    />
                    <button onClick={addPresetDirect} disabled={!presetNewInput.trim() || stepPresets.includes(presetNewInput.trim())}
                      className="px-2.5 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-xs font-medium disabled:opacity-50 transition-colors">
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-1.5">
                    {stepPresets.map(name => (
                      <button key={name} type="button"
                        onClick={() => handleQuickAddStep(name)}
                        disabled={stepSaving}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-white text-slate-600 hover:bg-emerald-100 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 transition-colors disabled:opacity-50">
                        <PlusCircle className="w-3 h-3" /> {name}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customStepInput}
                      onChange={e => setCustomStepInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleQuickAddStep()}
                      placeholder="Custom step name..."
                      className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 text-sm"
                    />
                    <button
                      onClick={() => handleQuickAddStep()}
                      disabled={!customStepInput.trim() || stepSaving}
                      className="px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-xs font-medium disabled:opacity-50 transition-colors">
                      {stepSaving ? '...' : 'Add'}
                    </button>
                    <button
                      onClick={() => { setAddingStep(false); setCustomStepInput(''); setEditingPresets(false); }}
                      className="px-3 py-1.5 bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-lg text-xs font-medium">
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {editingSteps ? (
            <div className="space-y-3">
              {/* Process preset selector */}
              {processPresets.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider flex items-center gap-1">
                    <LayoutList className="w-3 h-3" /> Select Process
                  </p>
                  <div className="grid grid-cols-1 gap-1">
                    {processPresets.map(preset => {
                      const names = editStepList;
                      const active = preset.steps.length === names.length &&
                        preset.steps.every((st, i) => st === names[i]);
                      return (
                        <button key={preset.id} type="button"
                          onClick={() => setEditStepList([...preset.steps])}
                          className={`flex items-center justify-between px-3 py-2 rounded-lg border text-left transition-all ${
                            active
                              ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-400'
                              : 'bg-slate-50 border-slate-200 hover:bg-blue-50 hover:border-blue-300'
                          }`}>
                          <span className={`text-xs font-semibold ${active ? 'text-blue-700' : 'text-slate-700'}`}>
                            {preset.label}
                          </span>
                          <span className={`text-[10px] ${active ? 'text-blue-500' : 'text-slate-400'}`}>
                            {preset.steps.length} steps
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {editStepList.length > 0 && (
                <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-64 overflow-y-auto">
                  {editStepList.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-2 px-3 py-2 group text-sm">
                      <GripVertical className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                      <span className="text-xs font-medium text-slate-400 w-5">{idx + 1}.</span>
                      <span className="flex-1 text-slate-700">{step}</span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button type="button" onClick={() => moveEditStep(idx, -1)} disabled={idx === 0}
                          className="p-0.5 rounded hover:bg-slate-100 text-slate-400 disabled:opacity-30">▲</button>
                        <button type="button" onClick={() => moveEditStep(idx, 1)} disabled={idx === editStepList.length - 1}
                          className="p-0.5 rounded hover:bg-slate-100 text-slate-400 disabled:opacity-30">▼</button>
                        <button type="button" onClick={() => removeEditStep(idx)}
                          className="p-0.5 rounded hover:bg-red-50 text-slate-300 hover:text-red-500">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-1.5">
                {stepPresets.map(name => (
                  <button key={name} type="button" onClick={() => addEditStep(name)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 border border-slate-200 hover:border-blue-200 transition-colors">
                    <PlusCircle className="w-3 h-3" /> {name}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditingSteps(false)}
                  className="flex-1 px-3 py-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-medium">Cancel</button>
                <button onClick={saveSteps} disabled={stepSaving || editStepList.length === 0}
                  className="flex-1 px-3 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-lg text-xs font-medium disabled:opacity-50">
                  {stepSaving ? 'Saving...' : 'Save Steps'}
                </button>
              </div>
            </div>
          ) : (
            <ProcessTimeline
              steps={legSteps}
              currentStep={request.current_step}
              selectedStepNumber={selectedStep?.step_number}
              onStepClick={handleStepClick}
              canManage={canManageSteps && !editingSteps}
              onRenameStep={handleRenameStep}
              onDeleteStep={handleDeleteStep}
              isStepLocked={isStepLocked}
              onSetSATType={handleSetSATType}
            />
          )}
        </div>

        {/* Step detail */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg shadow-sm p-6">
          {selectedStep ? (
            <>
              {lockedStepMsg && (
                <div className="mb-4 flex items-center gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  <span>{lockedStepMsg}</span>
                </div>
              )}
              <StepDetailPanel
                step={selectedStep}
                requestId={request.id}
                leg={selectedLeg}
                onUpdated={() => { loadRequest(); }}
                canUpdate={canUpdateStep && (!isStepLocked(selectedStep) || canBypassOrder)}
                steps={legSteps}
                totalSteps={legSteps.length}
                totalSS={request.total_ss}
                estimatedStart={
                  stepEstimates[selectedStep?.id] ??
                  stepEstimates[`${selectedStep?.leg || 1}-${selectedStep?.step_number}`] ??
                  null
                }
              />
            </>
          ) : (
            <p className="text-slate-400 text-center py-12">Select a step to view details</p>
          )}
        </div>
      </div>
        </div>
      </div>

      {/* ── Rel Test Traveller ─────────────────────────────── */}
      {legs.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          {/* Section header */}
          <button
            onClick={() => setShowTraveller(v => !v)}
            className="w-full flex items-center justify-between px-5 py-3.5 bg-slate-700 hover:bg-slate-600 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <LayoutList className="w-4 h-4 text-slate-300" />
              <span className="text-sm font-bold text-white tracking-wide">
                Rel Test Traveller — {request.request_number}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">
                {showTraveller ? 'Collapse' : 'Expand'}
              </span>
              {showTraveller
                ? <ChevronUp className="w-4 h-4 text-slate-300" />
                : <ChevronDown className="w-4 h-4 text-slate-300" />}
            </div>
          </button>

          {showTraveller && (
            <div className="divide-y divide-slate-100">
              {legs.map(leg => {
                const lSteps = request.steps
                  .filter(s => (s.leg || 1) === leg)
                  .sort((a, b) => a.step_number - b.step_number);
                return (
                  <div key={leg} className="overflow-x-auto">
                    {/* Per-leg sub-header */}
                    <div className="flex items-center gap-3 px-5 py-2 bg-slate-100 border-b border-slate-200">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                        Rel Test Traveller — REL
                      </span>
                      <span className="px-2.5 py-0.5 bg-slate-700 text-white text-xs font-extrabold rounded">
                        LEG {leg}
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          {[
                            'Test Item',
                            'Test Condition',
                            'Qty IN',
                            'Date / Time IN',
                            'Date / Time OUT',
                            'Operator',
                            'Machine No.',
                            'Qty OUT Result',
                            'Tray No.',
                          ].map(col => (
                            <th
                              key={col}
                              className="px-3 py-2.5 text-left font-semibold text-slate-600 whitespace-nowrap border-r border-slate-200 last:border-r-0"
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {lSteps.map(step => {
                          const cf = step.custom_fields || {};
                          const cellKey = `${leg}-${step.step_number}`;
                          const isComplete = step.status === 'completed';
                          const isPending  = step.status === 'pending';
                          // For technician, allow edit always, but require date and employee number before saving
                          let canEdit = canUpdateStep && (!isStepLocked(step) || canBypassOrder) && (!isComplete || canBypassOrder);
                          if (hasRole('Technician')) canEdit = true;

                          const fmtDt = v => v
                            ? new Date(v).toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
                            : '';
                          const toLocalDt = v => v ? new Date(v).toISOString().slice(0, 16) : '';
                          const opName = step.operator_id ? (travEmployees[step.operator_id]?.name || step.operator_id) : '';
                          const travDefaults = getDefaultTravCells(step.step_name, request.total_ss);

                          // Renders an editable cell
                          const EditCell = ({ field, display, inputType = 'text', extraCls = '', tdCls = '' }) => {
                            const active = travEditCell?.key === cellKey && travEditCell?.field === field;
                            const start  = () => {
                              if (!canEdit) return;
                              let init = '';
                              if      (field === 'test_item')      init = cf.test_item || travDefaults.item;
                              else if (field === 'test_condition') init = cf.test_condition || travDefaults.cond;
                              else if (field === 'qty_in')         init = step.qty_in != null ? String(step.qty_in) : '';
                              else if (field === 'qty_out')        init = step.qty_out != null ? String(step.qty_out) : '';
                              else if (field === 'tray_no')        init = step.tray_no || '';
                              else if (field === 'machine_no')     init = step.machine_no || '';
                              else if (field === 'operator_id')    init = step.operator_id || '';
                              else if (field === 'started_at')     init = toLocalDt(step.started_at);
                              else if (field === 'completed_at')   init = toLocalDt(step.completed_at);
                              setTravEditVal(init);
                              setTravEditCell({ key: cellKey, field });
                            };
                            // For Technician, require started_at and operator_id before saving any field
                            const commit = () => {
                              if (hasRole('Technician')) {
                                if ((field !== 'started_at' && !step.started_at) || (field !== 'operator_id' && !step.operator_id)) {
                                  setSaveMsg('Please enter Date/Time IN and Employee No. before saving.');
                                  setTimeout(() => setSaveMsg(''), 3000);
                                  return;
                                }
                              }
                              commitTravCell(step, field, travEditVal, leg);
                            };
                            const cancel = () => setTravEditCell(null);

                            if (active) {
                              if (field === 'operator_id') {
                                return (
                                  <td className={`px-1 py-1 border-r border-slate-100 ${tdCls}`}>
                                    <select
                                      autoFocus
                                      value={travEditVal}
                                      onChange={e => setTravEditVal(e.target.value)}
                                      onBlur={commit}
                                      onKeyDown={e => { if (e.key === 'Escape') cancel(); }}
                                      className="w-full min-w-[120px] border border-blue-400 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                                    >
                                      <option value="">(none)</option>
                                      {Object.values(travEmployees).map(emp => (
                                        <option key={emp.id} value={emp.id}>{emp.name} ({emp.id})</option>
                                      ))}
                                    </select>
                                  </td>
                                );
                              }
                              if (field === 'machine_no') {
                                return (
                                  <td className={`px-1 py-1 border-r border-slate-100 ${tdCls}`}>
                                    <input
                                      autoFocus
                                      list={`mach-list-${cellKey}`}
                                      value={travEditVal}
                                      onChange={e => setTravEditVal(e.target.value)}
                                      onBlur={commit}
                                      onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel(); }}
                                      className="w-full min-w-[100px] border border-blue-400 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                                    />
                                    <datalist id={`mach-list-${cellKey}`}>
                                      {travMachines.map(m => <option key={m.machine_no} value={m.machine_no}>{m.description}</option>)}
                                    </datalist>
                                  </td>
                                );
                              }
                              return (
                                <td className={`px-1 py-1 border-r border-slate-100 ${tdCls}`}>
                                  <input
                                    autoFocus
                                    type={inputType}
                                    value={travEditVal}
                                    onChange={e => setTravEditVal(e.target.value)}
                                    onBlur={commit}
                                    onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel(); }}
                                    className={`w-full border border-blue-400 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 ${extraCls}`}
                                  />
                                </td>
                              );
                            }

                            return (
                              <td
                                className={`px-3 py-2.5 border-r border-slate-100 ${tdCls} ${canEdit ? 'cursor-pointer group/cell hover:bg-blue-50' : ''}`}
                                title={canEdit ? 'Click to edit' : ''}
                                onClick={canEdit ? start : undefined}
                              >
                                <span className={extraCls}>
                                  {display !== '' && display != null
                                    ? display
                                    : <span className="text-slate-300">{canEdit ? <span className="opacity-0 group-hover/cell:opacity-100 text-[10px] text-blue-400">click to edit</span> : '—'}</span>}
                                </span>
                              </td>
                            );
                          };

                          return (
                            <tr
                              key={cellKey}
                              className={`transition-colors ${
                                isComplete ? 'bg-emerald-50/40' :
                                step.status === 'in_progress' ? 'bg-blue-50/40' : 'hover:bg-slate-50/60'
                              }`}
                            >
                              {/* Test Item */}
                              <EditCell
                                field="test_item"
                                display={cf.test_item || travDefaults.item}
                                tdCls={isPending && !cf.test_item ? 'text-slate-400 italic' : 'font-medium text-slate-800'}
                              />
                              {/* Test Condition */}
                              <EditCell
                                field="test_condition"
                                display={cf.test_condition || travDefaults.cond}
                                tdCls={`text-slate-600${!cf.test_condition && travDefaults.cond ? ' italic text-slate-400' : ''}`}
                              />
                              {/* Qty IN */}
                              <EditCell
                                field="qty_in"
                                display={step.qty_in != null ? step.qty_in : ''}
                                inputType="number"
                                tdCls="text-center text-slate-700"
                                extraCls="text-center w-20"
                              />
                              {/* Date / Time IN */}
                              <EditCell
                                field="started_at"
                                display={fmtDt(step.started_at)}
                                inputType="datetime-local"
                                tdCls="text-slate-600 whitespace-nowrap"
                                extraCls="min-w-[160px]"
                              />
                              {/* Date / Time OUT */}
                              <EditCell
                                field="completed_at"
                                display={fmtDt(step.completed_at)}
                                inputType="datetime-local"
                                tdCls="text-slate-600 whitespace-nowrap"
                                extraCls="min-w-[160px]"
                              />
                              {/* Operator */}
                              <EditCell
                                field="operator_id"
                                display={opName}
                                tdCls="text-slate-700"
                              />
                              {/* Machine No. */}
                              <EditCell
                                field="machine_no"
                                display={step.machine_no || ''}
                                tdCls="text-slate-700"
                              />
                              {/* Qty OUT Result */}
                              <EditCell
                                field="qty_out"
                                display={step.qty_out != null ? step.qty_out : ''}
                                inputType="number"
                                tdCls={`text-center font-semibold ${isComplete ? 'text-emerald-600' : 'text-slate-700'}`}
                                extraCls="text-center w-20"
                              />
                              {/* Tray No. — no border-r on last */}
                              {(() => {
                                const field = 'tray_no';
                                const active = travEditCell?.key === cellKey && travEditCell?.field === field;
                                const start  = () => { if (!canEdit) return; setTravEditVal(step.tray_no || ''); setTravEditCell({ key: cellKey, field }); };
                                const commit = () => commitTravCell(step, field, travEditVal, leg);
                                const cancel = () => setTravEditCell(null);
                                return active
                                  ? <td className="px-1 py-1 text-slate-700">
                                      <input autoFocus type="text" value={travEditVal}
                                        onChange={e => setTravEditVal(e.target.value)}
                                        onBlur={commit}
                                        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel(); }}
                                        className="w-full min-w-[80px] border border-blue-400 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-400" />
                                    </td>
                                  : <td className={`px-3 py-2.5 text-slate-700 ${canEdit ? 'cursor-pointer group/cell hover:bg-blue-50' : ''}`}
                                      title={canEdit ? 'Click to edit' : ''}
                                      onClick={canEdit ? start : undefined}>
                                      {step.tray_no || <span className="text-slate-300">{canEdit ? <span className="opacity-0 group-hover/cell:opacity-100 text-[10px] text-blue-400">click to edit</span> : '—'}</span>}
                                    </td>;
                              })()}
                            </tr>
                          );
                        })}
                        {lSteps.length === 0 && (
                          <tr>
                            <td colSpan={9} className="px-4 py-6 text-center text-slate-400 italic text-xs">
                              No steps in this leg yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* New Process Template Modal */}
      {showNewProcessModal && (
        <NewProcessModal
          onClose={() => setShowNewProcessModal(false)}
          onSave={handleCreateProcessPreset}
          createdByUsername={user?.username || user?.name || 'Unknown'}
        />
      )}
    </div>
  );
}
