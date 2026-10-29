import type { BufferState, CaptureDraft, DemoMemory, DemoReminder, PrivacyReceipt, SessionResult } from "./types/demo";

function timestamp(daysAgo: number, hour: number, minute: number) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}
const frames = (id: string, count: number) => Array.from({ length: count }, (_, i) => `https://picsum.photos/seed/${id}-${i}/600/400`);
const places = [
  { latitude: 27.7172, longitude: 85.3240 },
  { latitude: 27.7180, longitude: 85.3252 },
  { latitude: 27.7158, longitude: 85.3230 },
];
export const buffer: BufferState = { seconds: 102, capacity: 120, recording: true };
export const capturePlan: CaptureDraft = {
  clip: { enabled: true, seconds: 30 }, location: { enabled: true },
  note: { enabled: true, text: "passport" }, reminder: { enabled: false, time: "5 PM" }, frames: { enabled: true }, source: "Voice",
};
export const memories: DemoMemory[] = [
  { id: "1", title: "Passport in the desk drawer", source: "Voice", timestamp: timestamp(0, 9, 15), timeLabel: "9:15 AM", dayLabel: "Today", place: "Home office", tags: ["passport", "drawer", "desk"], frames: frames("passport-desk", 2), highlight: { x: .35, y: .4, w: .25, h: .2 }, coordinates: places[0] },
  { id: "2", title: "Keys on the kitchen counter", source: "Buffer", timestamp: timestamp(0, 8, 2), timeLabel: "8:02 AM", dayLabel: "Today", place: "Kitchen", tags: ["keys", "counter"], frames: frames("keys", 1), highlight: { x: .5, y: .55, w: .2, h: .15 }, coordinates: places[0] },
  { id: "3", title: "Appointment notes: meeting moved to Friday 3 PM, bring the signed form", source: "Session", timestamp: timestamp(1, 16, 40), timeLabel: "4:40 PM", dayLabel: "Yesterday", place: "Office", tags: ["meeting", "form"], frames: frames("meeting", 1), coordinates: places[1] },
  { id: "4", title: "Passport on the bedroom shelf", source: "Buffer", timestamp: timestamp(4, 20, 10), timeLabel: "8:10 PM", dayLabel: "4 days ago", place: "Bedroom", tags: ["passport", "shelf"], frames: frames("passport-shelf", 1), highlight: { x: .2, y: .3, w: .25, h: .2 }, coordinates: places[0] },
  { id: "5", title: "Umbrella by the front door", source: "Voice", timestamp: timestamp(5, 7, 30), timeLabel: "7:30 AM", dayLabel: "5 days ago", place: "Hallway", tags: ["umbrella", "door"], frames: frames("umbrella", 1), coordinates: places[2] },
  { id: "6", title: "Charger in the backpack", source: "Buffer", timestamp: timestamp(6, 18, 50), timeLabel: "6:50 PM", dayLabel: "6 days ago", place: "Living room", tags: ["charger", "backpack"], frames: frames("charger", 1), coordinates: places[0] },
];
export const recentQuestions = ["Where are my keys?", "What did I plan for Friday?", "Where's my umbrella?"];
export const passportAnswer = "Your passport was last in the top desk drawer, seen today at 9:15 AM.";
export const noMemoryAnswer = "I don't have a memory of that.";
export const reminders: DemoReminder[] = [
  { id: "r1", text: "Call the bank", timeLabel: "Today, 5:00 PM", source: "Voice", done: false },
  { id: "r2", text: "Bring the signed form", timeLabel: "Tomorrow, 2:30 PM", source: "Session", done: false },
  { id: "r3", text: "Pay electricity bill", timeLabel: "In 3 days, 10:00 AM", source: "Voice", done: false },
  { id: "r4", text: "Buy printer paper", timeLabel: "Done", source: "Voice", done: true },
];
export const dailyRecap = "Today: 2 memories, 2 reminders";
export const sessionResult: SessionResult = {
  summary: "Short meeting about the project schedule. The deadline moved to Friday and the signed form must be brought to the next meeting.",
  actionItems: ["Bring the signed form to Friday's meeting", "Email the updated schedule", "Confirm the room booking"],
  transcript: [
    { timestamp: "00:05", text: "Let's go over the project schedule." },
    { timestamp: "00:21", text: "The deadline has moved to Friday." },
    { timestamp: "00:48", text: "Please bring the signed form to the next meeting." },
    { timestamp: "01:12", text: "I'll email the updated schedule this afternoon." },
    { timestamp: "01:35", text: "Can we confirm the room booking too?" },
    { timestamp: "01:52", text: "Yes, I'll check the room and send everyone a note." },
  ],
};
// Demo counts; the supplied privacy fixture ends after the third upload's day.
export const privacyReceipt: PrivacyReceipt = {
  uploads: [{ time: "Today, 9:15 AM", size: "1.2 MB" }, { time: "Today, 8:02 AM", size: "0.9 MB" }, { time: "Yesterday, 4:40 PM", size: "0.6 MB" }],
  deletedRawFiles: 3, storedMemories: 6, storedFrames: 7,
};
