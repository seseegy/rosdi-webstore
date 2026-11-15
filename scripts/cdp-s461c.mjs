// Diagnostik CDP s461c: urutan Tab di Beranda vs PLN + daftar elemen fokusable.
import { writeFileSync, mkdirSync } from "node:fs";
const [wsUrl, wArg, baseUrl, outDir] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const R = {};
const rec = (id, data) => { R[id] = data; console.log(id, JSON.stringify(data)); };
const ws = new WebSocket(wsUrl);
let nextId = 1;
const pending = new Map();
const send = (m, p = {}) => new Promise((res, rej) => { const id = nextId++; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method: m, params: p })); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
ws.onmessage = (ev) => { const msg = JSON.parse(ev.data); if (msg.id && pending.has(msg.id)) { const { resolve, reject } = pending.get(msg.id); pending.delete(msg.id); if (msg.error) reject(new Error(JSON.stringify(msg.error))); else resolve(msg.result); } };
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
await send("Page.enable"); await send("Runtime.enable");
const evalJs = (e) => send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true }).then((r) => { if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400)); return r.result.value; });
const nav = async (hash) => { await evalJs(`location.assign(${JSON.stringify(baseUrl + hash)}); 'ok'`); await sleep(2200); };
const keyEvent = async (type, key, code, vk) => send("Input.dispatchKeyEvent", { type, key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
const pressTab = async () => { await keyEvent("keyDown", "Tab", "Tab", 9); await keyEvent("keyUp", "Tab", "Tab", 9); await sleep(200); };
const aktif = () => evalJs(`(() => { const a = document.activeElement; if (!a) return 'none'; return a.tagName + ':' + (a.textContent || '').trim().slice(0, 30) + ':tabIndex=' + a.tabIndex; })()`);
const daftarFokus = () => evalJs(`(() => [...document.querySelectorAll('a[href], button:not([disabled]), input, select, [tabindex]')].filter((el) => el.tabIndex >= 0 && el.offsetParent !== null).slice(0, 14).map((el) => el.tagName + ':' + (el.textContent || el.value || '').trim().slice(0, 24) + ':ti=' + el.tabIndex))()`);

await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await sleep(400);

await nav("#/");
rec("diag-beranda-daftar", await daftarFokus());
{
  const jejak = [await aktif()];
  for (let i = 0; i < 10; i++) { await pressTab(); jejak.push(await aktif()); }
  rec("diag-beranda-tab10", jejak);
}
// Space langsung di tombol Masuk via .focus() (uji aktivasi Space tanpa Tab)
rec("diag-masuk-space-via-focus", await evalJs(`(() => { const b = [...document.querySelectorAll('header.site button')].find((x) => x.textContent.trim() === 'Masuk'); b.focus(); return { fokus: document.activeElement === b, teks: b.textContent.trim() }; })()`));
await keyEvent("keyDown", " ", "Space", 32); await keyEvent("keyUp", " ", "Space", 32); await sleep(400);
rec("diag-masuk-space-hasil", await evalJs(`(() => { const m = document.querySelector('.modal'); return { modalTerbuka: !!m, judul: m ? m.querySelector('h3')?.textContent : null, tombol: m ? [...m.querySelectorAll('button')].map((b) => b.textContent.trim()) : [] }; })()`));
await evalJs(`(() => { document.querySelector('.modal button')?.click(); return 'ok'; })()`);
await sleep(300);

await nav("#/pln");
rec("diag-pln-daftar", await daftarFokus());
{
  const jejak = [await aktif()];
  for (let i = 0; i < 10; i++) { await pressTab(); jejak.push(await aktif()); }
  rec("diag-pln-tab10", jejak);
}

writeFileSync(outDir + "/cdp-s461c.json", JSON.stringify(R, null, 1));
console.log("DONE", Object.keys(R).length, "ukuran");
process.exit(0);
