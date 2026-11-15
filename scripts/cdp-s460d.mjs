// Konfirmasi A3b ulang: paksa :active via CSS.forcePseudoState — DOM.enable DULU.
import { writeFileSync, mkdirSync } from "node:fs";
const [wsUrl, wArg, baseUrl, outDir] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
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
try {
  await send("DOM.enable");
  await send("CSS.enable");
  await evalJs(`(() => { const o = { ref: 'RSD-S460A3C', kind: 'game', product: 'Mobile Legends', item: '172 Diamonds', qty: 1, target: '12345678 (1234)', base: 43500, fee: 0, disc: 0, total: 43500, method: 'QRIS', time: Date.now(), status: 'Selesai', email: '', wa: '', token: null }; localStorage.setItem('rosdi_orders', JSON.stringify([o])); return 'seeded'; })()`);
  await nav("#/sukses/RSD-S460A3C");
  const id = await evalJs(`(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Belanja Lagi'); if (!b) return null; if (!b.id) b.id = 'belanja-lagi-probe'; return b.id; })()`);
  console.log("buttonId:", id);
  const doc = await send("DOM.getDocument", { depth: -1 });
  const findNode = (node, targetId) => {
    if (node.attributes) { for (let i = 0; i < node.attributes.length; i += 2) { if (node.attributes[i] === "id" && node.attributes[i + 1] === targetId) return node.nodeId; } }
    for (const c of (node.children || [])) { const f = findNode(c, targetId); if (f) return f; }
    if (node.contentDocument) { const f = findNode(node.contentDocument, targetId); if (f) return f; }
    return null;
  };
  const nodeId = findNode(doc.root, id);
  console.log("nodeId:", nodeId);
  await send("CSS.forcePseudoState", { nodeId, forcedPseudoClasses: ["active"] });
  await sleep(200);
  const t = await evalJs(`(() => { const b = document.getElementById('belanja-lagi-probe'); const cs = getComputedStyle(b); return { transform: cs.transform, active: b.matches(':active') }; })()`);
  console.log("A3b-active-paksa:", JSON.stringify(t));
  await send("CSS.forcePseudoState", { nodeId, forcedPseudoClasses: [] });
  writeFileSync(outDir + "/cdp-s460d-390.json", JSON.stringify({ A3b: t }, null, 1));
} catch (e) {
  console.log("A3b ERROR:", String(e).slice(0, 400));
  writeFileSync(outDir + "/cdp-s460d-390.json", JSON.stringify({ A3b: { ERROR: String(e).slice(0, 400) } }, null, 1));
}
console.log("SELESAI-CD PD-390");
ws.close();
process.exit(0);
