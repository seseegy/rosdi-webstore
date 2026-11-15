// Probe kecil s454b (read-only): isi frame Voucher mobile 3:118 agar ide 65
// bisa digambarkan akurat (frame "Voucher — Desktop" 3 merek tidak ada).
const F = (id) => figma.getNodeById(id);
const texts = (frame) => frame.findAllWithCriteria({ types: ["TEXT"] }).map((t) => t.characters);
return {
  v118: texts(F("3:118")).slice(0, 30),
  v177: texts(F("3:177")).slice(0, 10),
  gpDesktop: texts(F("33:2")).filter((t) => /Google Play|Voucher/.test(t)).slice(0, 8),
};
