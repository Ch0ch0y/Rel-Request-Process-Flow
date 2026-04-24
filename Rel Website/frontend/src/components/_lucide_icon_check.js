// Utility to check lucide-react icon existence
import * as LucideIcons from 'lucide-react';

export function checkIcon(name) {
  return Object.prototype.hasOwnProperty.call(LucideIcons, name);
}
