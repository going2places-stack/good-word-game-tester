'use strict';
/**
 * Daily rotation for The Good Word Game — shared by build.js and tools/check-runway.mjs.
 *
 * Day numbers count from EPOCH (Daily #1) on the America/New_York calendar.
 * Before REBASE.date, day N plays pool index (N-1) mod 50 (the launch cycle).
 * From REBASE.date on, rotation resumes at pool index REBASE.index, so questions
 * appended in a top-up play next.
 *
 * On a top-up: append to the pools and leave REBASE alone — the rotation reaches the
 * new questions on its own as long as you top up before the fresh runway ends.
 * Only move REBASE if the runway already ran out (set date = the day after the deploy,
 * index = the first never-played index). Never set it to today or earlier: that swaps
 * today's verses mid-day for anyone playing.
 */
const EPOCH = '2026-07-14';
const REBASE = { date: '2026-11-10', index: 50 };
const ARC = ['Cold Open', 'Recovery Grace', 'Middle Test', 'Deep Water', 'Pulpit Ready'];

const dayOf = (iso) => Math.round((Date.parse(iso + 'T00:00:00Z') - Date.parse(EPOCH + 'T00:00:00Z')) / 864e5) + 1;
/** Eastern-calendar date (YYYY-MM-DD) of a day number. */
const dateOf = (day) => new Date(Date.parse(EPOCH + 'T00:00:00Z') + (day - 1) * 864e5).toISOString().slice(0, 10);
const todayET = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date());
const REBASE_DAY = dayOf(REBASE.date);

// Days before REBASE played the launch cycle of 50 questions per pool. Pin that cycle
// length so growing the bank can never change a past day — or today, before REBASE.
const LAUNCH_CYCLE = 50;

function slot(day, len) {
  return day < REBASE_DAY ? (day - 1) % LAUNCH_CYCLE : (REBASE.index + day - REBASE_DAY) % len;
}

/** The five questions for a day, in arc order. */
function questionsFor(bank, day) {
  return ARC.map((role) => bank[role][slot(day, bank[role].length)]);
}

/** Last day before any pool wraps back to an already-played question. */
function lastFreshDay(bank) {
  return Math.min(...ARC.map((role) => REBASE_DAY + bank[role].length - REBASE.index - 1));
}

function validate(bank) {
  for (const role of ARC) {
    if (!Array.isArray(bank[role]) || bank[role].length <= REBASE.index) {
      throw new Error(`daily bank: pool "${role}" must have more than ${REBASE.index} questions (REBASE.index)`);
    }
  }
}

module.exports = { EPOCH, REBASE, ARC, dayOf, dateOf, todayET, slot, questionsFor, lastFreshDay, validate };
