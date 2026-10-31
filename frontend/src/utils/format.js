// Pure helpers extracted from components so they can be unit-tested.
// Dates are kept as the calendar date of the stored ISO string (first 10 characters), which
// avoids the off-by-one-day bugs that new Date(...).toLocaleDateString() causes across timezones.
export function formatDueDate(iso) {
  return iso ? `Due: ${iso.slice(0, 10)}` : "No due date";
}
export function toDateInput(iso) {
  return iso ? iso.slice(0, 10) : "";
}
