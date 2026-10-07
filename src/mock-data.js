// Fake data for the prototype. Replaced by Google Calendar / Tasks API data later.
// Day offsets are relative to the Sunday of the current week, so the demo always looks "live".
const MOCK = {
  calendars: [
    { id: "personal", name: "Personal", color: "#e8a0a8" },
    { id: "school", name: "School", color: "#b9a6e0" },
    { id: "exams", name: "Exams, Tests, Quiz", color: "#9cc9f2" },
    { id: "work", name: "Work", color: "#a9d5a4" },
    { id: "study", name: "Study blocks", color: "#f3dfa2" },
  ],
  // day: 0 = Sun ... 6 = Sat; start/end in decimal hours
  events: [
    { day: 0, start: 9, end: 11, title: "Study: Intro block", cal: "study" },
    { day: 1, start: 9, end: 12, title: "Reading day + Quiz prep", cal: "study" },
    { day: 2, start: 9.08, end: 11.08, title: "Quiz 5 + Recitation", cal: "exams", loc: "Kowalski Hall, Room 160", desc: "Bring a pencil and a calculator.\nCovers weeks 4 and 5." },
    { day: 2, start: 11.25, end: 12.17, title: "PHCS 9102", cal: "school" },
    { day: 2, start: 12.33, end: 13.33, title: "Patient presentation", cal: "work", desc: "Rubric: https://example.com/rubric\nPractice once out loud first!" },
    { day: 2, start: 13.42, end: 14.33, title: "PHRX 9150", cal: "school" },
    { day: 3, start: 7, end: 9, title: "Study: TBI + flashcards", cal: "study" },
    { day: 3, start: 10.75, end: 11.75, title: "Appointment", cal: "personal" },
    { day: 4, start: 9.08, end: 10, title: "PHTH 9170", cal: "school" },
    { day: 4, start: 10.17, end: 11.08, title: "PHTH 9170", cal: "school" },
    { day: 4, start: 11.25, end: 12.17, title: "PHCS 9102", cal: "school" },
    { day: 4, start: 12.25, end: 13.25, title: "Meeting", cal: "work", meet: "https://meet.google.com/abc-defg-hij", guests: [{ name: "Dr. Wigle", status: "accepted", organizer: true }, { name: "Sam Lee", status: "tentative" }, { name: "Priya Shah", status: "declined" }, { name: "You", status: "accepted", self: true }] },
    { day: 5, start: 9.08, end: 10, title: "PHTH 9170", cal: "school" },
    { day: 5, start: 13.42, end: 15.42, title: "PHTH 9140 Clinical", cal: "school" },
    { day: 5, start: 15.58, end: 17, title: "Study: Pharm", cal: "study" },
    { day: 6, start: 9, end: 12, title: "Study: Pharmacology", cal: "study" },
  ],
  allDay: [
    { day: 2, title: "Quiz #6", cal: "exams" },
    { day: 2, title: "Homework due", cal: "work" },
    { day: 5, title: "Peer Review", cal: "work" },
  ],
  tasks: [
    { id: 1, day: 0, title: "Vacuum", done: true },
    { id: 2, day: 0, title: "Prep meals", done: false },
    { id: 3, day: 1, title: "Finish slides", done: false },
    { id: 4, day: 1, title: "Email prof", done: true },
    { id: 5, day: 2, title: "Review flashcards", done: false },
    { id: 6, day: 3, title: "Laundry", done: false },
    { id: 7, day: 3, title: "Pay bill", done: false },
    { id: 8, day: 4, title: "Print notes", done: false },
    { id: 9, day: 5, title: "Groceries", done: false },
  ],
  habits: ["Take vitamins", "Digital planning", "Track expenses", "Journal"],
  goals: ["Declutter desk", "Finish exam 3 study", "Weekly spread plan"],
};
