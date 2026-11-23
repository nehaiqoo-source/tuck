import type { TuckItem } from '../types';

const now = Date.now();
const day = 24 * 60 * 60 * 1000;

export const SEED_ITEMS: TuckItem[] = [
  {
    id: 'seed-1',
    title: 'Kyoto backstreet ramen spots (Reddit thread)',
    rawContent:
      'https://reddit.com/r/JapanTravel/comments/kyoto-ramen - Saved 9 days ago: Menya Inoichi Hanare opens at 11am, get a ticket at 10:15am. Cash only.',
    url: 'https://reddit.com/r/JapanTravel',
    source: 'chrome-tab',
    summary:
      'Recommended Kyoto ramen spot (Menya Inoichi Hanare) with a tip to grab a queue ticket at 10:15am and bring cash.',
    nextAction: 'Pin Menya Inoichi Hanare on your Kyoto map list.',
    tags: ['travel', 'kyoto', 'food'],
    isPrivate: false,
    status: 'tucked',
    inferenceMeta: {
      source: 'on-device',
      model: 'Gemini Nano (Chrome)',
      latencyMs: 138,
      modeUsed: 'prefer_on_device',
    },
    createdAt: now - 9 * day,
    updatedAt: now - 9 * day,
  },
  {
    id: 'seed-2',
    title: 'Dentist receipt: Dr. Mehta Clinic (₹3,400)',
    rawContent:
      'Screenshot of dental cleaning & X-ray receipt dated Nov 8. Follow-up checkup recommended in 6 months. Claim under corporate OPD reimbursement before Dec 15.',
    source: 'screenshot',
    summary:
      'Dental clinic receipt for ₹3,400 with an OPD reimbursement deadline of Dec 15 and a 6-month follow-up reminder.',
    nextAction: 'Upload receipt to HR reimbursement portal before Dec 15.',
    tags: ['receipt', 'health', 'private'],
    isPrivate: true,
    status: 'tucked',
    inferenceMeta: {
      source: 'on-device',
      model: 'Gemini Nano (Android AICore)',
      latencyMs: 164,
      modeUsed: 'prefer_on_device',
      note: 'Kept strictly on-device due to private medical receipt content.',
    },
    createdAt: now - 6 * day,
    updatedAt: now - 6 * day,
  },
  {
    id: 'seed-3',
    title: 'Arashiyama bamboo grove early morning route',
    rawContent:
      'Saved link from iOS Share Sheet: Take JR Sagano Line from Kyoto Station at 6:30am to beat tour buses, then walk to Otagi Nenbutsu-ji temple and grab coffee at Arabica.',
    url: 'https://www.japan-guide.com/e/e3912.html',
    source: 'ios',
    summary:
      'Early 6:30am JR Sagano Line itinerary to visit Arashiyama before crowds, continuing to Otagi Nenbutsu-ji and Arabica coffee.',
    nextAction: 'Add 6:30am train slot to Day 2 of your Kyoto plan.',
    tags: ['travel', 'kyoto', 'itinerary'],
    isPrivate: false,
    status: 'tucked',
    inferenceMeta: {
      source: 'on-device',
      model: 'Apple Foundation Models (iOS)',
      latencyMs: 121,
      modeUsed: 'prefer_on_device',
    },
    createdAt: now - 4 * day,
    updatedAt: now - 4 * day,
  },
  {
    id: 'seed-4',
    title: 'Weekend Kyoto ryokan booking checklist',
    rawContent:
      'Note tucked from Chrome: Check luggage forwarding (Takkyubin) from Osaka hotel to Kyoto ryokan, confirm dinner dietary preference 3 days ahead.',
    source: 'chrome-tab',
    summary:
      'Pre-arrival checklist for Kyoto ryokan: arrange Takkyubin luggage forwarding from Osaka and confirm dinner preferences 3 days prior.',
    nextAction: 'Message the ryokan to confirm dinner preference.',
    tags: ['travel', 'kyoto', 'booking'],
    isPrivate: false,
    status: 'kept',
    inferenceMeta: {
      source: 'on-device',
      model: 'Gemini Nano (Chrome)',
      latencyMs: 149,
      modeUsed: 'prefer_on_device',
    },
    createdAt: now - 3 * day,
    updatedAt: now - 3 * day,
  },
  {
    id: 'seed-5',
    title: 'No-knead overnight focaccia ratios',
    rawContent:
      'Screenshot from Instagram: 500g bread flour, 400g warm water, 10g salt, 4g instant yeast, 3 tbsp olive oil. Cold ferment 18 hours, bake at 220°C for 22 mins.',
    source: 'android',
    summary:
      'Overnight focaccia recipe (80% hydration, 18-hour cold ferment, baked at 220°C for 22 minutes).',
    nextAction: 'Mix dough Saturday night for Sunday lunch.',
    tags: ['cooking', 'recipe'],
    isPrivate: false,
    status: 'kept',
    inferenceMeta: {
      source: 'on-device',
      model: 'Gemini Nano (Android AICore)',
      latencyMs: 152,
      modeUsed: 'prefer_on_device',
    },
    createdAt: now - 2 * day,
    updatedAt: now - 2 * day,
  },
];
