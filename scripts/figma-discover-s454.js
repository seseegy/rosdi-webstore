// Discovery read-only s454: daftar semua frame teratas (id + nama) agar
// probe ide 61-70 bisa memakai id yang benar. Tidak mengubah apa pun.
const out = [];
for (const f of figma.currentPage.children) out.push([f.id, f.name]);
return { frameCount: out.length, frames: out };
