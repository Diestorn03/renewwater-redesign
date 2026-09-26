// Language-neutral business data, taken from renewwaterus.com and the company's social profiles (Sep 2026).
export const phones = [
  { label: 'US', display: '+1 (689) 677-2003', tel: '+16896772003' },
  { label: 'ES', display: '+1 (407) 639-3366', tel: '+14076393366' },
];
export const emails = ['ceo@renewsolarus.com', 'info@renewsolarus.com'];
// Website address. Facebook lists 1621 E Vine St, Suite B, Kissimmee, FL 34744: confirm with the client which one is current.
export const address = { line: '102 Park Pl Blvd. Suite B1', city: 'Kissimmee, FL 34741', full: '102 Park Pl Blvd. Suite B1, Kissimmee, FL 34741' };
export const mapEmbed = 'https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d189100.20203211755!2d-81.53801219457227!3d28.275925314639238!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x88dd85b8981b4a4f%3A0xe773261dd038e797!2sRenew%20Water!5e0!3m2!1ses!2sus!4v1779444454389!5m2!1ses!2sus';
export const mapLink = 'https://www.google.com/maps/search/?api=1&query=Renew+Water+Kissimmee+FL';
export const whatsappNumber = '14076393366';
/** wa.me link with a prefilled message */
export const wa = (text) => `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`;
export const socials = {
  instagram: { url: 'https://www.instagram.com/renewwater_us', handle: '@renewwater_us', followers: 8005, posts: 250 },
  facebook: { url: 'https://www.facebook.com/profile.php?id=61569879834712', handle: 'Renew Water | Orlando FL' },
  tiktok: { url: 'https://www.tiktok.com/@renewwater', handle: '@renewwater' },
};
export const stats = { projects: 500, cities: 12, bacteria: 99, instagram: 8000 };
export const partners = [
  { name: 'Synchrony', src: '/img/partners/synchrony.webp' },
  { name: 'Time Investment', src: '/img/partners/time.webp' },
  { name: 'Ygrene', src: '/img/partners/ygrene.webp' },
  { name: 'Foundation Finance Company', src: '/img/partners/foundation.webp' },
  { name: 'Home Run Financing', src: '/img/partners/homerun.webp' },
  { name: 'PCI', src: '/img/partners/pci.webp' },
  { name: 'RFFC Financial', src: '/img/partners/rffc.webp' },
];
// Florida water-quality news shown on the current About page
export const news = [
  { key: 'news1', url: 'https://www.newsweek.com/flroida-bay-county-drinking-water-alert-2008004', source: 'Newsweek' },
  { key: 'news2', youtube: 'IDkwohOyZbs' },
  { key: 'news3', url: 'https://www.wusf.org/health-news-florida/2025-05-15/gov-ron-desantis-signs-measure-banning-fluoride-in-florida-tap-water', source: 'WUSF', youtube: '-FMpDli9ngk' },
  { key: 'news4', youtube: 'aBZwc4oA01E' },
];

/** WhatsApp link with the attribution tag the owner can count in the chat: buildWa({ text, ref: 'web-hero' }) */
export const buildWa = ({ text, ref }) => wa(ref ? `${text} (ref: ${ref})` : text);
/** Phone the visitor should see first: Spanish line on /, English line on /en/ */
export const phoneFor = (lang) => (lang === 'en' ? phones[0] : phones[1]);
