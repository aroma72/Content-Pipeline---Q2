'use strict';
/**
 * Append-only JSONL helpers.
 *
 * The project tracks work in append-only JSONL (.beads/*.jsonl). Appending is
 * the only write we ever do to those files -- a run must never be able to
 * corrupt history by rewriting it.
 */

const fs = require('fs');
const path = require('path');

/** Append one record as a single line. Creates the file and parents if needed. */
function append(file, record) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, JSON.stringify(record) + '\n', 'utf8');
}

/**
 * Append and fsync before returning.
 *
 * Plain `append` leaves the line in the page cache, and Railway can stop a
 * container between the write and the disk. That is survivable for a work log;
 * it is not survivable for the queue, which is now the record of which lesson
 * was paid for. Costs a handful of fsyncs per 30-minute lesson.
 */
function appendDurable(file, record) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const fd = fs.openSync(file, 'a');
  try {
    fs.writeFileSync(fd, JSON.stringify(record) + '\n', 'utf8');
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

/**
 * Read every valid record. Malformed lines are skipped rather than thrown --
 * a half-written line from a killed process must not make the whole queue
 * unreadable and strand every remaining item.
 */
function readAll(file) {
  if (!fs.existsSync(file)) return [];
  const out = [];
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    try {
      out.push(JSON.parse(line));
    } catch {
      out.push({ __malformed: true, __line: i + 1, __raw: line });
    }
  }
  return out;
}

/** Read only well-formed records. */
function readValid(file) {
  return readAll(file).filter((r) => !r.__malformed);
}

module.exports = { append, appendDurable, readAll, readValid };
