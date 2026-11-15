// Verifikasi perbaikan s445 ide 66: deep link #/cek/<ref> mengisi kolom Cek.
import { writeFileSync, mkdirSync } from "node:fs";
const [wsUrl, widthArg, _baseUrl, outDir] = process.argv.slice(2);
const WIDTH = parseInt(widthArg || "390", 10);
mkdirSync(outDir, { recursive: true });
const ws = new WebSocket(wsUrl);
let nextId = 1;
const pending = new Map();
const send = (m, p = {}) => new Promise((res, rej) => { const id = nextId++; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method: m, params: p })); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
ws.onmessage = (ev) => { const msg = JSON.parse(ev.data); if (msg.id && pending.has(msg.id)) { const { resolve, reject } = pending.get(msg.id); pending.delete(msg.id); if (msg.error) reject(new Error(JSON.stringify(msg.error))); else resolve(msg.result); } };
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
await send("Page.enable"); await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: 900, deviceScaleFactor: 1, mobile: true });
const evalJs = (e) => send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true }).then((r) => { if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400)); return r.result.value; });
const R = {};
// 1) deep link langsung (mount baru CekPage)
await evalJs("localStorage.clear(); 'ok'");
await evalJs("location.hash = '#/cek/RSD-DEMO1234'; 'ok'"); await sleep(1200);
R.deeplink_langsung = await evalJs("(() => ({ hash: location.hash, input: document.querySelector('.step .input')?.value ?? 'NO-INPUT' }))()");
// 2) tekan Cek -> hasil demo muncul (prefill bisa dipakai langsung)
await evalJs("(() => { [...document.querySelectorAll('.step .btn')].find((x) => x.textContent.trim() === 'Cek').click(); return 'ok'; })()");
await sleep(600);
R.klik_cek_setelah_prefill = await evalJs("(() => ({ adaHasil: !!document.querySelector('.cek-result'), refHasil: document.querySelector('.cek-result .sum-row b')?.textContent || null }))()");
// 3) deep link huruf kecil di path -> dinormalisasi ke huruf besar
await evalJs("location.hash = '#/cek/rsd-demo1234'; 'ok'"); await sleep(1200);
R.deeplink_huruf_kecil = await evalJs("(() => ({ hash: location.hash, input: document.querySelector('.step .input')?.value ?? 'NO-INPUT' }))()");
// 4) ketikan pengguna tidak ditimpa hashchange: ketik manual, lalu ubah hash
await evalJs("location.hash = '#/cek'; 'ok'"); await sleep(900);
await evalJs("(() => { const el = document.querySelector('.step .input'); const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(el, 'RSD-KETIKAN'); el.dispatchEvent(new Event('input', { bubbles: true })); return 'ok'; })()");
await sleep(300);
await evalJs("location.hash = '#/cek/RSD-LAIN123'; 'ok'"); await sleep(900);
R.ketikan_tidak_ditimpa = await evalJs("(() => ({ input: document.querySelector('.step .input')?.value }))()");
writeFileSync(`${outDir}/verify-ide66-${WIDTH}.json`, JSON.stringify(R, null, 1));
console.log(JSON.stringify(R, null, 1));
try { ws.close(); } catch {}
process.exit(0);
