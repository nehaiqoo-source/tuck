import type { TuckItem } from '../types';

export interface CalendarAction {
  label: string;
  dateText: string;
  icsContent: string;
  googleCalUrl: string;
}

export interface EmailAction {
  label: string;
  subject: string;
  body: string;
  mailtoUrl: string;
}

export interface ItemActions {
  calendar?: CalendarAction;
  email?: EmailAction;
  checklist: string[];
}

const DATE_REGEX =
  /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}\b|\b\d{1,2}:\d{2}\s?(?:am|pm)\b/i;

function formatIcsDate(daysFromNow: number): string {
  const d = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T090000Z`;
}

export function extractItemActions(item: TuckItem): ItemActions {
  const combined = `${item.title} ${item.rawContent} ${item.summary} ${item.nextAction}`;
  const lower = combined.toLowerCase();

  // 1. Calendar Action (deadlines, appointments, early train slots)
  let calendar: CalendarAction | undefined;
  const dateMatch = combined.match(DATE_REGEX);
  if (
    dateMatch ||
    /(deadline|before|follow-up|appointment|train|flight|check-in|opens at)/.test(
      lower
    )
  ) {
    const start = formatIcsDate(2);
    const end = formatIcsDate(2).replace('T090000Z', 'T093000Z');
    const summary = item.title.replace(/[\r\n]/g, ' ');
    const details = `${item.nextAction} (${item.summary})`.replace(
      /[\r\n]/g,
      ' '
    );
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Tuck//tucktabs.app//EN',
      'BEGIN:VEVENT',
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${details}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(summary)}&details=${encodeURIComponent(details)}&dates=${start}/${end}`;

    calendar = {
      label: dateMatch ? `Add to Calendar (${dateMatch[0]})` : 'Add to Calendar',
      dateText: dateMatch ? dateMatch[0] : 'Reminder',
      icsContent,
      googleCalUrl,
    };
  }

  // 2. Email Draft Action (receipts, reimbursements, bookings, confirmations)
  let email: EmailAction | undefined;
  if (/(reimbursement|receipt|invoice|hr|confirm|ryokan|booking|claim)/.test(lower)) {
    const subject = `Follow-up: ${item.title}`;
    const body = `Hi,\n\nSharing a quick follow-up regarding "${item.title}".\n\nDetails: ${item.summary}\nNext step: ${item.nextAction}\n\nThanks!`;
    email = {
      label: 'Draft email',
      subject,
      body,
      mailtoUrl: `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
    };
  }

  // 3. Mini Checklist (recipes, ratios, multi-step notes)
  const checklist: string[] = [];
  if (/(flour|water|salt|yeast|recipe|checklist|luggage|confirm)/.test(lower)) {
    const parts = item.rawContent
      .split(/[,.;]\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 6 && s.length <= 75);
    checklist.push(...parts.slice(0, 4));
  }

  return { calendar, email, checklist };
}

export function downloadIcsFile(filename: string, icsContent: string) {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename.replace(/[^a-z0-9-_]/gi, '-').slice(0, 40)}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
