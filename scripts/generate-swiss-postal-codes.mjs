#!/usr/bin/env node
// Regenerates frontend/public/data/swiss-postal-codes.json - the NPA/town
// pairs the address forms suggest from (see the frontend's
// postal-code.service.ts) - from swisstopo's official directory of
// localities (Amtliches Ortschaftenverzeichnis, open data, source to be
// credited: "© swisstopo"). Run by hand now and then, the result is
// committed: `node scripts/generate-swiss-postal-codes.mjs`. No dependency -
// the zip is read with node:zlib directly.
//
// One row per NPA + town, sorted: the source has one row per NPA + town +
// municipality (a town spread over several municipalities is listed once
// for each), and Liechtenstein's rows (no canton) are left out - only Swiss
// addresses are typed in for now.

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateRawSync } from "node:zlib";

const SOURCE_URL =
  "https://data.geo.admin.ch/ch.swisstopo-vd.ortschaftenverzeichnis_plz/ortschaftenverzeichnis_plz/ortschaftenverzeichnis_plz_2056.csv.zip";
const OUTPUT = join(dirname(fileURLToPath(import.meta.url)), "..", "frontend", "public", "data", "swiss-postal-codes.json");

// The one .csv entry of the archive, through its central directory (the
// local header's sizes can be left at 0 when the archive was streamed).
const readCsvFromZip = (zip) => {
  const eocd = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) throw new Error("Not a zip archive");
  const entries = zip.readUInt16LE(eocd + 10);
  let pos = zip.readUInt32LE(eocd + 16);

  for (let i = 0; i < entries; i++) {
    const method = zip.readUInt16LE(pos + 10);
    const compressedSize = zip.readUInt32LE(pos + 20);
    const nameLength = zip.readUInt16LE(pos + 28);
    const extraLength = zip.readUInt16LE(pos + 30);
    const commentLength = zip.readUInt16LE(pos + 32);
    const localOffset = zip.readUInt32LE(pos + 42);
    const name = zip.toString("utf8", pos + 46, pos + 46 + nameLength);

    if (name.toLowerCase().endsWith(".csv")) {
      const dataStart = localOffset + 30 + zip.readUInt16LE(localOffset + 26) + zip.readUInt16LE(localOffset + 28);
      const data = zip.subarray(dataStart, dataStart + compressedSize);
      if (method === 0) return data.toString("utf8");
      if (method === 8) return inflateRawSync(data).toString("utf8");
      throw new Error(`Unsupported zip compression method ${method}`);
    }
    pos += 46 + nameLength + extraLength + commentLength;
  }
  throw new Error("No .csv file in the archive");
};

const response = await fetch(SOURCE_URL);
if (!response.ok) throw new Error(`Download failed: ${response.status}`);
const csv = readCsvFromZip(Buffer.from(await response.arrayBuffer())).replace(/^﻿/, "");

const [header, ...rows] = csv.split(/\r?\n/).filter(Boolean);
const columns = header.split(";");
const col = (name) => {
  const index = columns.indexOf(name);
  if (index < 0) throw new Error(`Column ${name} missing - has the source's format changed?`);
  return index;
};
const TOWN = col("Ortschaftsname");
const NPA = col("PLZ4");
const CANTON = col("Kantonskürzel");

const pairs = new Map();
for (const row of rows) {
  const fields = row.split(";");
  if (!fields[CANTON]) continue;
  const npa = fields[NPA].trim();
  const town = fields[TOWN].trim();
  pairs.set(`${npa};${town}`, [npa, town]);
}

const sorted = [...pairs.values()].sort(([npaA, townA], [npaB, townB]) =>
  npaA.localeCompare(npaB) || townA.localeCompare(townB, "fr")
);

mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, JSON.stringify(sorted) + "\n");
console.log(`${sorted.length} NPA/town pairs written to ${OUTPUT}`);
