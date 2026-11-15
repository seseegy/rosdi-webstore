// check-media-order.mjs — penjaga urutan cascade CSS.
// Aturan di dalam @media kalah melawan aturan TANPA media yang datang
// SESUDAH-nya bila selektor + propertinya sama (spesifisitas sama, yang
// terakhir menang). Itu yang membuat media query header Siklus 2 mati
// (nav.main + .logo small + .hero tetap tampil di layar sempit).
// Pemeriksa ini FAIL bila ada deklarasi tanpa-media untuk selektor+properti
// yang sama SETELAH deklarasi bermedia-nya.
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");

// Kumpulkan aturan berurutan: { sel, props:Set, media:boolean, at:string }
const rules = [];
function parseBlock(text, media) {
  let i = 0;
  while (i < text.length) {
    const open = text.indexOf("{", i);
    if (open === -1) break;
    const prelude = text.slice(i, open).trim().replace(/\/\*[\s\S]*?\*\//g, "").trim();
    let depth = 1;
    let j = open + 1;
    while (j < text.length && depth > 0) {
      if (text[j] === "{") depth++;
      else if (text[j] === "}") depth--;
      j++;
    }
    const body = text.slice(open + 1, j - 1);
    if (prelude.startsWith("@media")) {
      parseBlock(body, prelude);
    } else if (prelude && !prelude.startsWith("@")) {
      const props = new Set();
      for (const decl of body.split(";")) {
        const prop = decl.split(":")[0]?.trim();
        if (prop && /^[a-z-]+$/.test(prop)) props.add(prop);
      }
      for (const sel of prelude.split(",")) {
        const s = sel.trim().replace(/\s+/g, " ");
        if (s) rules.push({ sel: s, props, media: media || null });
      }
    }
    i = j;
  }
}
parseBlock(css.replace(/\/\*[\s\S]*?\*\//g, ""), null);

const failures = [];
const lastMedia = new Map(); // "sel|prop" -> media prelude
for (const r of rules) {
  for (const prop of r.props) {
    const key = r.sel + "|" + prop;
    if (r.media) {
      lastMedia.set(key, r.media);
    } else if (lastMedia.has(key)) {
      failures.push(
        `${r.sel} { ${prop} } — aturan tanpa-media SETELAH ${lastMedia.get(key)} menimpa media query (media query mati)`,
      );
      lastMedia.delete(key); // laporkan sekali per pasangan
    }
  }
}

if (failures.length) {
  console.log("FAIL — media query yang ditimpa aturan dasar sesudahnya:");
  for (const f of failures) console.log("  " + f);
  process.exit(1);
}
console.log(`OK   urutan media query: ${rules.length} aturan, 0 media query mati`);
