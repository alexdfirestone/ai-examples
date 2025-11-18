import type { ScheduleBlock, ScheduleWindow } from '../../api/schedule-planner/tools';

// Format date for ICS (e.g., 20250506T090000)
function formatICSDate(isoString: string): string {
  const date = new Date(isoString);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

// Generate ICS file content from schedule blocks
export function generateICS(blocks: ScheduleBlock[], window: ScheduleWindow): string {
  const lines: string[] = [];
  
  // ICS header
  lines.push('BEGIN:VCALENDAR');
  lines.push('VERSION:2.0');
  lines.push('PRODID:-//AI Schedule Planner//EN');
  lines.push('CALSCALE:GREGORIAN');
  lines.push('METHOD:PUBLISH');
  
  // Add timezone if specified
  if (window.tz) {
    lines.push(`X-WR-TIMEZONE:${window.tz}`);
  }
  
  // Add each block as an event
  for (const block of blocks) {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${block.id}@schedule-planner`);
    lines.push(`DTSTAMP:${formatICSDate(new Date().toISOString())}`);
    lines.push(`DTSTART:${formatICSDate(block.start)}`);
    lines.push(`DTEND:${formatICSDate(block.end)}`);
    lines.push(`SUMMARY:${block.title}`);
    
    if (block.location) {
      lines.push(`LOCATION:${block.location}`);
    }
    
    if (block.notes) {
      // Escape special characters and line breaks in description
      const description = block.notes
        .replace(/\\/g, '\\\\')
        .replace(/,/g, '\\,')
        .replace(/;/g, '\\;')
        .replace(/\n/g, '\\n');
      lines.push(`DESCRIPTION:${description}`);
    }
    
    if (block.category) {
      lines.push(`CATEGORIES:${block.category}`);
    }
    
    lines.push('END:VEVENT');
  }
  
  // ICS footer
  lines.push('END:VCALENDAR');
  
  return lines.join('\r\n');
}

// Trigger download of ICS file
export function downloadICS(blocks: ScheduleBlock[], window: ScheduleWindow, filename: string = 'schedule.ics'): void {
  const icsContent = generateICS(blocks, window);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the URL object
  URL.revokeObjectURL(url);
}

