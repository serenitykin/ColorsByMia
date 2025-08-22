/* ==========================
   Settings
   ========================== */
const DEFAULT_PRICE = 2.99;
const CURRENCY = 'USD';
const ETSY_SHOP_URL = 'https://www.etsy.com/shop/YOUR_SHOP';
const SHOW_WELCOME = true;

/* ==========================
   Helpers
   ========================== */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const formatPrice = (num) => `${CURRENCY} ${Number(num).toFixed(2)}`;

function generateFallbackProducts(count = 30) { // ← now 30 to match your PNGS
  return Array.from({ length: count }, (_, i) => {
    const id = i + 1;
    return {
      id,
      title: `Coloring Page #${id}`,
      image: `PNGS/${id}.png`,
      price: DEFAULT_PRICE,             // explicit price on fallback too
      etsyUrl: ETSY_SHOP_URL,
    };
  });
}

/* ==========================
   State
   ========================== */
let products = [];
let lastFocusedEl = null;

/* ==========================
   Card UI
   ========================== */
function buildCard(item) {
  const price = (item.price ?? DEFAULT_PRICE);
  const card = document.createElement('article');
  card.className = 'card';
  card.tabIndex = 0;
  card.setAttribute('role', 'button');
  card.setAttribute('aria-label', `${item.title}, ${formatPrice(price)}. Open preview.`);

  const media = document.createElement('div'); media.className = 'card-media';
  const img = document.createElement('img');
  img.src = item.image; img.alt = `Mia coloring page #${item.id}`; img.loading = 'lazy';
  media.appendChild(img);

  const body = document.createElement('div'); body.className = 'card-body';

  const title = document.createElement('h3'); title.className = 'card-title'; title.textContent = item.title;

  const priceEl = document.createElement('div'); priceEl.className = 'card-price';
  priceEl.innerHTML = `<span class="badge">${formatPrice(price)}</span>`;

  const actions = document.createElement('div'); actions.className = 'card-actions';
  const btn = document.createElement('a');
  btn.className = 'btn btn-pill btn-primary';
  btn.href = item.etsyUrl || ETSY_SHOP_URL; btn.target = '_blank'; btn.rel = 'noopener';
  btn.textContent = 'Buy on Etsy';

  actions.appendChild(btn);
  body.append(title, priceEl, actions);

  const open = (e) => { if (e?.target === btn) return; openModal(item); };
  card.addEventListener('click', open);
  card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(e); } });

  card.append(media, body);
  return card;
}

function renderGrid() {
  const grid = $('#grid');
  if (!grid) return;
  grid.innerHTML = '';
  products.forEach(p => grid.appendChild(buildCard(p)));
  grid.setAttribute('aria-busy', 'false');
}

/* ==========================
   Product Modal
   ========================== */
const modal = $('#productModal');
const backdrop = $('#modalBackdrop');
const modalImg = $('#modalImg');
const modalTitle = $('#modalTitle');
const modalDesc = $('#modalDesc');
const modalEtsyBtn = $('#modalEtsyBtn');
const modalCloseBtn = $('#modalCloseBtn');

function getFocusable(root) {
  return $$('a, button, [href], [tabindex]:not([tabindex="-1"])', root)
    .filter(el => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'));
}

function openModal(item) {
  if (!modal) return;
  lastFocusedEl = document.activeElement;

  const price = (item.price ?? DEFAULT_PRICE);
  modalImg.src = item.image;
  modalImg.alt = `Mia coloring page #${item.id} large preview`;
  modalTitle.textContent = item.title;
  modalDesc.textContent = formatPrice(price);
  modalEtsyBtn.href = item.etsyUrl || ETSY_SHOP_URL;

  backdrop.hidden = false; modal.hidden = false; document.body.style.overflow = 'hidden';

  const f = getFocusable(modal); (f[0] || modalCloseBtn).focus();
  const trap = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); closeModal(); return; }
    if (e.key === 'Tab') {
      const fs = getFocusable(modal); if (!fs.length) return;
      const first = fs[0], last = fs[fs.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };
  modal._trapHandler = trap; document.addEventListener('keydown', trap);
}

function closeModal() {
  if (!modal) return;
  backdrop.hidden = true; modal.hidden = true; document.body.style.overflow = '';
  if (modal._trapHandler) { document.removeEventListener('keydown', modal._trapHandler); modal._trapHandler = null; }
  if (lastFocusedEl) lastFocusedEl.focus();
}
backdrop?.addEventListener('click', closeModal);
modalCloseBtn?.addEventListener('click', closeModal);

/* ==========================
   Welcome Modal (first thing you see)
   ========================== */
const welcomeModal = $('#welcomeModal');
const welcomeBackdrop = $('#welcomeBackdrop');
const welcomeCloseBtn = $('#welcomeCloseBtn');
const welcomeOkay = $('#welcomeOkay');

function openWelcome() {
  if (!SHOW_WELCOME || !welcomeModal) return;
  welcomeBackdrop.hidden = false; welcomeModal.hidden = false; document.body.style.overflow = 'hidden';
}
function closeWelcome() {
  if (!welcomeModal) return;
  welcomeBackdrop.hidden = true; welcomeModal.hidden = true; document.body.style.overflow = '';
}
welcomeBackdrop?.addEventListener('click', closeWelcome);
welcomeCloseBtn?.addEventListener('click', closeWelcome);
welcomeOkay?.addEventListener('click', closeWelcome);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeModal(); closeWelcome(); } });

/* ==========================
   Init
   ========================== */
function connectEtsyNav(url) {
  $('#etsyNavLink')?.setAttribute('href', url);
  $('#etsyContactLink')?.setAttribute('href', url);
  $('#etsyFooterLink')?.setAttribute('href', url);
}

async function loadProducts() {
  try {
    const res = await fetch('data/products.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to load products.json');
    const data = await res.json();

    products = (Array.isArray(data) ? data : []).map(item => ({
      id: Number(item.id),
      title: item.title || `Coloring Page #${item.id}`,
      image: item.image || `PNGS/${item.id}.png`,
      price: (item.price ?? DEFAULT_PRICE),
      etsyUrl: item.etsyUrl || ETSY_SHOP_URL,
    })).sort((a, b) => a.id - b.id);

    if (products.length === 0) products = generateFallbackProducts(30);
  } catch {
    products = generateFallbackProducts(30);
  } finally {
    renderGrid();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  modal && (modal.hidden = true); backdrop && (backdrop.hidden = true);
  $('#year') && ($('#year').textContent = new Date().getFullYear());
  connectEtsyNav(ETSY_SHOP_URL);
  loadProducts();
  setTimeout(openWelcome, 0);
});
