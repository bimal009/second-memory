import type {
  DayRecap,
  Memory,
  Reminder,
} from "@/types";

/**
 * Single source of all seed data. Neutral, everyday examples only.
 * Frames are generated gradients (frameSeed) — no remote URLs.
 */

const now = new Date();
const todayAt = (h: number, m: number) => {
  const d = new Date(now);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};
const yesterdayAt = (h: number, m: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() - 1);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

export const mockMemories: Memory[] = [
  {
    id: "memory-passport-drawer",
    kind: "clip",
    title: "Passport goes in the blue drawer",
    summary: "You showed the hallway dresser and said the passport lives in the blue drawer, second from the top.",
    transcript: "This is where the passport goes — blue drawer, top of the hall dresser.",
    createdAt: todayAt(9, 14),
    startedAtLabel: "9:14 AM",
    frameSeed: 11,
    tags: ["home", "documents"],
    location: { label: "Home — Hallway", lat: 40.7412, lng: -73.9896 },
    highlight: {
      mask: [
        { x: 0.42, y: 0.3 },
        { x: 0.72, y: 0.3 },
        { x: 0.72, y: 0.62 },
        { x: 0.42, y: 0.62 },
      ],
      objectLabel: "blue drawer",
    },
    clipDurationSec: 24,
  },
  {
    id: "memory-car-level3",
    kind: "place",
    title: "Car parked level 3, pillar C4",
    summary: "Recited the garage spot so you'd remember it: level 3, next to pillar C4, near the elevator.",
    transcript: "Car is parked level 3, pillar C4, two rows from the elevator.",
    createdAt: todayAt(10, 5),
    startedAtLabel: "10:05 AM",
    frameSeed: 23,
    tags: ["car", "garage"],
    location: { label: "City Garage", lat: 40.7445, lng: -73.9845 },
    highlight: {
      mask: [
        { x: 0.3, y: 0.42 },
        { x: 0.58, y: 0.42 },
        { x: 0.58, y: 0.7 },
        { x: 0.3, y: 0.7 },
      ],
      objectLabel: "pillar C4",
    },
    clipDurationSec: 18,
  },
  {
    id: "memory-library-book",
    kind: "clip",
    title: "Library book due back Friday",
    summary: "Cover shown: The Design of Everyday Things. Needs to go back to the Northgate branch by Friday.",
    transcript: "Remind me to return this library book on Friday — Northgate branch.",
    createdAt: todayAt(11, 47),
    startedAtLabel: "11:47 AM",
    frameSeed: 35,
    tags: ["library", "todo"],
    location: { label: "Home — Living room", lat: 40.7412, lng: -73.9896 },
    highlight: {
      mask: [
        { x: 0.36, y: 0.36 },
        { x: 0.66, y: 0.36 },
        { x: 0.66, y: 0.68 },
        { x: 0.36, y: 0.68 },
      ],
      objectLabel: "book cover",
    },
    clipDurationSec: 21,
  },
  {
    id: "memory-toolbox",
    kind: "clip",
    title: "Toolbox inventory",
    summary: "Opened the toolbox and listed the contents: screwdriver, tape measure, and two hex keys.",
    transcript: "In the toolbox right now: screwdriver, tape measure, hex keys.",
    createdAt: todayAt(13, 22),
    startedAtLabel: "1:22 PM",
    frameSeed: 47,
    tags: ["home", "tools"],
    location: { label: "Home — Utility closet", lat: 40.7412, lng: -73.9896 },
    highlight: {
      mask: [
        { x: 0.48, y: 0.44 },
        { x: 0.84, y: 0.4 },
        { x: 0.86, y: 0.62 },
        { x: 0.5, y: 0.66 },
      ],
      objectLabel: "screwdriver",
    },
    clipDurationSec: 32,
  },
  {
    id: "memory-receipt",
    kind: "clip",
    title: "Coffee receipt on the counter",
    summary: "Photographed the receipt from the corner café — $4.20, card ending 8823.",
    transcript: "Keep the receipt for the coffee — $4.20 on the counter.",
    createdAt: todayAt(15, 8),
    startedAtLabel: "3:08 PM",
    frameSeed: 59,
    tags: ["receipt", "shopping"],
    location: { label: "Corner Café", lat: 40.7459, lng: -73.9938 },
    clipDurationSec: 12,
  },
  {
    id: "memory-keys-shelf",
    kind: "clip",
    title: "Keys on the hallway shelf",
    summary: "You dropped the keys on the little wooden shelf by the door and told {name} to remember it.",
    transcript: "I put my keys on the hallway shelf by the door.",
    createdAt: todayAt(17, 35),
    startedAtLabel: "5:35 PM",
    frameSeed: 71,
    tags: ["keys", "home"],
    location: { label: "Home — Hallway", lat: 40.7412, lng: -73.9896 },
    highlight: {
      mask: [
        { x: 0.4, y: 0.5 },
        { x: 0.68, y: 0.5 },
        { x: 0.68, y: 0.74 },
        { x: 0.4, y: 0.74 },
      ],
      objectLabel: "keys",
    },
    clipDurationSec: 9,
  },
  {
    id: "memory-bike-route",
    kind: "note",
    title: "Shortcut through Elm Court",
    summary: "Noted a quieter Cycling route via Elm Court that avoids the construction on 3rd.",
    transcript: "New bike shortcut: Elm Court, then the footbridge — saves 10 minutes.",
    createdAt: todayAt(18, 51),
    startedAtLabel: "6:51 PM",
    frameSeed: 83,
    tags: ["cycling", "routes"],
    location: { label: "Elm Court", lat: 40.7398, lng: -73.9961 },
  },
  {
    id: "memory-bike-lock",
    kind: "clip",
    title: "Bike locked at the footbridge",
    summary: "Bike chained to the south rack at the Elm Court footbridge, locked, helmet in the basket.",
    transcript: "Bike is locked at the south footbridge rack.",
    createdAt: todayAt(19, 2),
    startedAtLabel: "7:02 PM",
    frameSeed: 95,
    tags: ["bike", "places"],
    location: { label: "Elm Court Footbridge", lat: 40.7391, lng: -73.9973 },
    clipDurationSec: 15,
  },
  {
    id: "memory-plant-watering",
    kind: "note",
    title: "Monstera gets water on Sundays",
    summary: "I was reminded that the monstera is fine on Sundays only — the fern needs nothing.",
    transcript: "Watering day note: monstera Sundays, fern skip it.",
    createdAt: todayAt(20, 15),
    startedAtLabel: "8:15 PM",
    frameSeed: 107,
    tags: ["home", "plants"],
  },
  {
    id: "memory-umbrella",
    kind: "clip",
    title: "Umbrella left by the café",
    summary: "The travel umbrella is hanging on your chair back at the corner café, next to the outlet.",
    transcript: "My umbrella is on the chair back at the café, by the window.",
    createdAt: yesterdayAt(12, 30),
    startedAtLabel: "12:30 PM",
    frameSeed: 121,
    tags: ["lost", "places"],
    location: { label: "Corner Café", lat: 40.7459, lng: -73.9938 },
    clipDurationSec: 11,
  },
  {
    id: "memory-bookstore-dog",
    kind: "clip",
    title: "Bookshop dog is called Fig",
    summary: "The grey dog that sleeps behind the counter at Northgate Books is named Fig.",
    transcript: "The bookshop dog is named Fig — grey, sleeps behind the counter.",
    createdAt: yesterdayAt(14, 5),
    startedAtLabel: "2:05 PM",
    frameSeed: 133,
    tags: ["people", "places"],
    location: { label: "Northgate Books", lat: 40.749, lng: -73.9902 },
    highlight: {
      mask: [
        { x: 0.44, y: 0.52 },
        { x: 0.75, y: 0.5 },
        { x: 0.76, y: 0.76 },
        { x: 0.45, y: 0.78 },
      ],
      objectLabel: "Fig",
    },
    clipDurationSec: 26,
  },
  {
    id: "memory-camera-cable",
    kind: "note",
    title: "Spare cable is the camera one",
    summary: "The braided cable left in your bag is the backup for the desk camera, not the charger.",
    transcript: "Note: the braided cable in my bag is the camera backup.",
    createdAt: yesterdayAt(18, 44),
    startedAtLabel: "6:44 PM",
    frameSeed: 145,
    tags: ["tech", "notes"],
  },
  {
    id: "memory-spare-key",
    kind: "place",
    title: "Spare key under the plant pot",
    summary: "Spare house key sits under the green pot on the window ledge, not the old spot.",
    transcript: "Spare key moved: under the green pot, window ledge.",
    createdAt: yesterdayAt(20, 12),
    startedAtLabel: "8:12 PM",
    frameSeed: 157,
    tags: ["keys", "home"],
    location: { label: "Home — Window ledge", lat: 40.7412, lng: -73.9896 },
    highlight: {
      mask: [
        { x: 0.34, y: 0.4 },
        { x: 0.6, y: 0.4 },
        { x: 0.6, y: 0.66 },
        { x: 0.34, y: 0.66 },
      ],
      objectLabel: "green pot",
    },
  },
  {
    id: "memory-film-night",
    kind: "clip",
    title: "Film list from the café chat",
    summary: "Three films to watch, written on the café napkin: Playtime, Marco Bellocchio's The Traitor, and Children of Men.",
    transcript: "Films to watch: Playtime, The Traitor, Children of Men.",
    createdAt: yesterdayAt(21, 3),
    startedAtLabel: "9:03 PM",
    frameSeed: 169,
    tags: ["films", "lists"],
    clipDurationSec: 19,
  },
  {
    id: "memory-morning-coffee",
    kind: "clip",
    title: "Grinder setting is 14",
    summary: "Morning coffee: grinder works best at setting 14 for this bag of beans.",
    transcript: "Grinder setting 14 for the new bag — perfect morning coffee.",
    createdAt: yesterdayAt(8, 5),
    startedAtLabel: "8:05 AM",
    frameSeed: 181,
    tags: ["coffee", "home"],
    location: { label: "Home — Kitchen", lat: 40.7412, lng: -73.9896 },
  },
];

export const mockReminders: Reminder[] = [
  {
    id: "reminder-library",
    text: "Return The Design of Everyday Things to Northgate branch",
    timeLabel: "Fri · before 6:00 PM",
    done: false,
  },
  {
    id: "reminder-trash",
    text: "Bins out tonight",
    timeLabel: "Today · 9:00 PM",
    done: false,
  },
  {
    id: "reminder-call-mom",
    text: "Call Mum back about Sunday dinner",
    timeLabel: "Today · 6:30 PM",
    done: true,
  },
];

export const mockRecap: DayRecap = {
  dateLabel: "Today",
  headline: "A day of small, important things",
  summary:
    "You captured 8 moments today. The passport now officially lives in the blue drawer, the car is parked at level 3, pillar C4, and the library book needs to go back before Friday.",
  keyMoments: [
    { label: "Passport in blue drawer", timeLabel: "9:14 AM", frameSeed: 11 },
    { label: "Car, level 3 / C4", timeLabel: "10:05 AM", frameSeed: 23 },
    { label: "Library book, Friday", timeLabel: "11:47 AM", frameSeed: 35 },
    { label: "Toolbox inventory", timeLabel: "1:22 PM", frameSeed: 47 },
  ],
};

/** Seeded example questions on the Ask screen. */
export const exampleQuestions = [
  "Where did I put my passport?",
  "Where is my car parked?",
  "Why is my toolbox missing?",
] as const;
