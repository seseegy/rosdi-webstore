// Inventaris B3-2 — read-only: struktur 6 frame kunci (FF/Genshin mobile,
// Paket Data Telkomsel, E-Wallet DANA, PLN + Game Desktop) + kartu nominal.
const F = (id) => figma.getNodeById(id);
const out = {};
const frameTexts = (fid) => {
  const fr = F(fid);
  if (!fr) return null;
  return { name: fr.name, id: fr.id, w: Math.round(fr.width), h: Math.round(fr.height),
    texts: fr.findAllWithCriteria({ types: ["TEXT"] }).map((t) => t.characters).filter((s, i, a) => a.indexOf(s) === i).slice(0, 50) };
};
out.ffMobile = frameTexts("111:2");
out.genshinMobile = frameTexts("6:2");
out.telkomselMobile = frameTexts("41:2");
out.emoneyMobile = frameTexts("3:2");
out.plnDesk = frameTexts("30:2");
out.gameDesk = frameTexts("26:2");
// Kartu nominal Telkomsel (pola kloning operator lain)
{
  const fr = F("41:2");
  if (fr) {
    const noms = fr.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => /GB|Unlimited|Malam|Lokal|Mingguan/.test(t.characters)).slice(0, 12);
    out.telkomselCards = noms.map((t) => {
      const p = t.parent;
      return { text: t.characters, card: p ? { name: p.name, type: p.type, w: Math.round(p.width), h: Math.round(p.height) } : null,
        cardTexts: p ? p.findAllWithCriteria({ types: ["TEXT"] }).map((x) => x.characters) : [] };
    });
  }
}
// Kartu nominal DANA (pola kloning GoPay)
{
  const fr = F("3:2");
  if (fr) {
    const noms = fr.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => /^Saldo [\d.]+$/.test(t.characters.trim())).slice(0, 10);
    out.danaCards = noms.map((t) => {
      const p = t.parent;
      return { text: t.characters, card: p ? { name: p.name, type: p.type } : null,
        cardTexts: p ? p.findAllWithCriteria({ types: ["TEXT"] }).map((x) => x.characters) : [] };
    });
  }
}
// Tab + nominal FF mobile (untuk tambah Membership)
{
  const fr = F("111:2");
  if (fr) {
    const tabs = fr.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => /^(Diamonds|Membership)$/.test(t.characters.trim()));
    out.ffTabs = tabs.map((t) => ({ text: t.characters, id: t.id, parent: t.parent ? t.parent.name : "?" }));
    const noms = fr.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => /Diamonds$/.test(t.characters.trim()));
    out.ffNominals = noms.slice(0, 10).map((t) => ({ text: t.characters, id: t.id,
      card: t.parent ? { name: t.parent.name, type: t.parent.type, w: Math.round(t.parent.width), h: Math.round(t.parent.height) } : null }));
  }
}
return out;
