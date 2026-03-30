"""
Parses the CA Excel file and updates CA-2026-0001 in the database with the extracted data.
Run this script once to fix the missing information in the existing record.
"""
import openpyxl, sqlite3, re
from datetime import datetime, date

EXCEL = r'C:\Users\168056\OneDrive - Amkor Technology\Documents\GitHub\Rel Request Process Flow\ca-website\SR20260011_RR00142622_RRS220260140_CA-IPI Request_LTC_for dbase.xlsx'
DB = r'C:\Users\168056\OneDrive - Amkor Technology\Documents\GitHub\Rel Request Process Flow\ca-website\backend\ca_database.db'

FIELD_MAP = {
    'request number': 'title',
    'classification': 'classification',
    'originator': 'originator',
    'plant': 'plant',
    'device name': 'device_name',
    'lot no': 'lot_no',
    'customer': 'customer',
    'pkg info': 'pkg_info',
    'automotive': 'automotive',
    'date': 'sample_description',
    'purpose': 'purpose',
    'reference project': 'reference_project',
    'product hierarchy': 'product_hierarchy',
    'pdl': 'pdl',
    'body size x (mm)': 'body_size_x',
    'body size y (mm)': 'body_size_y',
    'package thickness (mm)': 'package_thickness',
    'ball pitch (mm)': 'ball_pitch',
    'ball count': 'ball_count',
    'lead pitch (mm)': 'lead_pitch',
    'lead count': 'lead_count',
    'total s/s': 'total_ss',
    'bcb material': 'bcb_material',
    'bump height': 'bump_height',
    'bump material': 'bump_material',
    'bump pitch': 'bump_pitch',
    'bump size': 'bump_size',
    'bumping house': 'bumping_house',
    'chip attach flux cleaning method': 'chip_attach_flux_cleaning_method',
    'chip attach flux': 'chip_attach_flux',
    'die attach material': 'die_attach_material',
    'die coat after w/b': 'die_coat_after_wb',
    'die pad config': 'die_pad_config',
    'die pad metal': 'die_pad_metal',
    'die pad pitch(\u00b5m)': 'die_pad_pitch',
    'die passivation': 'die_passivation',
    'die size (mm)': 'die_size',
    'die thick (\u00b5m)': 'die_thick',
    'down bond': 'down_bond',
    'emc/encap material': 'emc_encap_material',
    "heat dissipation mat'l": 'heat_dissipation_matl',
    'lf ag option': 'lf_ag_option',
    'lf etch/stamp': 'lf_etch_stamp',
    'lf inner lead pitch(\u00b5m)': 'lf_inner_lead_pitch',
    'lf/sub material': 'lf_sub_material',
    'lf/sub pad size(\u00b5m)': 'lf_sub_pad_size',
    'lf/sub supplier': 'lf_sub_supplier',
    'lf/sub thickness(\u00b5m)': 'lf_sub_thickness',
    'lid attach epoxy': 'lid_attach_epoxy',
    'line width': 'line_width',
    'mfg site': 'mfg_site',
    'masking material': 'masking_material',
    'others1': 'others1',
    'others2': 'others2',
    'others3': 'others3',
    'others4': 'others4',
    'others5': 'others5',
    'passive component': 'passive_component',
    'pcb finish': 'pcb_finish',
    'plating option': 'plating_option',
    'rel site': 'rel_site',
    'solder ball attach paste': 'solder_ball_attach_paste',
    'solder ball material': 'solder_ball_material',
    'solder ball size(mm)': 'solder_ball_size',
    'solder mask material': 'solder_mask_material',
    'solder paste material': 'solder_paste_material',
    'sub layer': 'sub_layer',
    'sub pad design': 'sub_pad_design',
    'sub pad opening size': 'sub_pad_opening_size',
    'sub surface treatment': 'sub_surface_treatment',
    'ubm material': 'ubm_material',
    'ubm opening size (\u00b5m)': 'ubm_opening_size',
    'underfill material': 'underfill_material',
    'wafer type': 'wafer_type',
    'wire length max (mm)': 'wire_length_max',
    'wire material': 'wire_material',
    'wire size(\u00b5m)': 'wire_size',
    'wire supplier': 'wire_supplier',
    'wire type': 'wire_type',
}

def normalize(val):
    if val is None:
        return ''
    s = str(val).strip()
    s = re.sub(r'\s+', ' ', s).lower()
    return s

def cell_str(val):
    if val is None:
        return ''
    if isinstance(val, datetime):
        return val.strftime('%Y-%m-%d')
    if isinstance(val, date):
        return val.strftime('%Y-%m-%d')
    return str(val).strip()

# Parse Excel
wb = openpyxl.load_workbook(EXCEL, data_only=True)
ws = wb.active

result = {}
for row in ws.iter_rows(values_only=True):
    if len(row) > 4:
        left_label = normalize(row[1])
        left_value = cell_str(row[4])
        if left_label and left_value and left_label in FIELD_MAP:
            result[FIELD_MAP[left_label]] = left_value
    if len(row) > 13:
        right_label = normalize(row[10])
        right_value = cell_str(row[13])
        if right_label and right_value and right_label in FIELD_MAP:
            result[FIELD_MAP[right_label]] = right_value

print(f'Parsed {len(result)} fields from Excel:')
for k, v in result.items():
    print(f'  {k} = {v!r}')

if not result:
    print('ERROR: No fields parsed. Check the Excel file layout.')
    exit(1)

# Update CA-2026-0001 in the database
conn = sqlite3.connect(DB)
cur = conn.cursor()

# Find the record
cur.execute("SELECT id, ca_number FROM ca_requests WHERE ca_number='CA-2026-0001'")
row = cur.fetchone()
if not row:
    print('\nERROR: CA-2026-0001 not found in database.')
    conn.close()
    exit(1)

req_id = row[0]
print(f'\nFound CA-2026-0001 with id={req_id}. Updating...')

# Build UPDATE statement
set_clauses = ', '.join(f'{col}=?' for col in result.keys())
values = list(result.values()) + [req_id]
sql = f'UPDATE ca_requests SET {set_clauses} WHERE id=?'
cur.execute(sql, values)
conn.commit()

# Verify
cur.execute("SELECT title, originator, plant, device_name, lot_no, customer, classification FROM ca_requests WHERE id=?", (req_id,))
updated = cur.fetchone()
conn.close()

print(f'\nUpdate successful! Verification:')
print(f'  title={updated[0]!r}')
print(f'  originator={updated[1]!r}')
print(f'  plant={updated[2]!r}')
print(f'  device_name={updated[3]!r}')
print(f'  lot_no={updated[4]!r}')
print(f'  customer={updated[5]!r}')
print(f'  classification={updated[6]!r}')
print('\nCA-2026-0001 has been fixed. Refresh the page to see the updated information.')
