// This script checks which lucide-react icons are available in your current version.
import * as LucideIcons from 'lucide-react';

const iconsToCheck = [
  'LayoutDashboard', 'ClipboardList', 'Settings', 'Users', 'LogOut', 'X', 'CheckCircle2', 'FileText', 'Archive', 'ListFilter', 'MonitorDot',
  'Sun', 'Moon', 'ShieldCheck', 'ChevronRight', 'Layers', 'Microscope', 'ExternalLink', 'PackageOpen', 'BarChart3', 'Database', 'Table',
  'ScanSearch',
];

for (const icon of iconsToCheck) {
  if (!LucideIcons[icon]) {
    console.log('MISSING:', icon);
  } else {
    console.log('OK:', icon);
  }
}
