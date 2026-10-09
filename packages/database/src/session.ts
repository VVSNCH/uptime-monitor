// The pg adapter sends dates as UTC text with no offset, and Postgres reads
// that text in the session's time zone. Anything but UTC stores every
// timestamp shifted, which Prisma's own reads hide but any SQL that does date
// arithmetic, such as grouping checks by day, does not.
export const SESSION_OPTIONS = '-c TimeZone=UTC'
