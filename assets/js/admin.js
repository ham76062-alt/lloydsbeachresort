/* Lloyds Beach Resort & Spa — staff dashboard (DEMO).
   Browser-only: every change is saved to the demo store in localStorage
   (assets/js/demo-store.js). Nothing leaves this browser. Login is a demo
   gate — any email and any password works; the session lives in
   sessionStorage until the tab is closed or the user logs out. */
(function () {
  'use strict';

  var store = window.LloydsDemo;
  var SESSION_KEY = 'lloyds-admin';
  var STATUSES = ['New', 'Confirmed', 'Cancelled', 'Completed'];

  function $(id) { return document.getElementById(id); }
  function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function fmt(n) { return 'GH₵' + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function dstr(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function parseDay(s) {
    var p = String(s || '').split('-');
    if (p.length !== 3) { return null; }
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }

  if (!store) {
    var login = $('adminLogin');
    if (login) {
      var err = login.querySelector('.form-error');
      if (err) { err.textContent = 'The demo store could not load. Please reload the page.'; err.classList.add('show'); }
    }
    return;
  }

  /* ---------- login gate ---------- */
  function isLoggedIn() {
    try { return !!sessionStorage.getItem(SESSION_KEY); } catch (e) { return false; }
  }
  function showApp() {
    $('adminLogin').style.display = 'none';
    $('adminApp').style.display = '';
    var email = '';
    try { email = sessionStorage.getItem(SESSION_KEY) || ''; } catch (e) {}
    $('adminUser').textContent = email;
    renderAll();
  }
  function showLogin() {
    $('adminApp').style.display = 'none';
    $('adminLogin').style.display = '';
  }
  var loginForm = $('adminLoginForm');
  loginForm.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var err = loginForm.querySelector('.form-error');
    var email = loginForm.querySelector('[name="email"]').value.trim();
    var pass = loginForm.querySelector('[name="password"]').value;
    err.classList.remove('show');
    if (!email || !pass) {
      err.textContent = 'Enter any email and any password — this is a demo, nothing is checked.';
      err.classList.add('show');
      return;
    }
    try { sessionStorage.setItem(SESSION_KEY, email); } catch (e) {}
    showApp();
  });
  $('adminLogout').addEventListener('click', function () {
    try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
    showLogin();
  });
  $('adminReset').addEventListener('click', function () {
    if (!window.confirm('Reset the demo? All bookings, prices, blocked dates and details go back to the sample data.')) { return; }
    store.resetDemo();
    avYear = null; avMonth = null;
    renderAll();
    window.scrollTo(0, 0);
  });

  /* ---------- tabs ---------- */
  var currentTab = 'bookings';
  document.querySelectorAll('.admin-tab').forEach(function (btn) {
    btn.addEventListener('click', function () {
      currentTab = btn.getAttribute('data-tab');
      document.querySelectorAll('.admin-tab').forEach(function (b) { b.classList.toggle('active', b === btn); });
      document.querySelectorAll('.admin-panel').forEach(function (p) { p.style.display = p.id === 'tab-' + currentTab ? '' : 'none'; });
      renderTab(currentTab);
    });
  });

  function renderAll() {
    fillRoomSelects();
    renderTab(currentTab);
  }
  function renderTab(tab) {
    if (tab === 'bookings') { renderBookings(); }
    else if (tab === 'rooms') { renderRooms(); }
    else if (tab === 'availability') { renderAvailability(); }
    else if (tab === 'details') { renderDetails(); }
  }

  function fillRoomSelects() {
    var rooms = store.getRooms();
    [['fltRoom', 'All rooms'], ['avRoom', null]].forEach(function (pair) {
      var sel = $(pair[0]);
      if (!sel) { return; }
      var cur = sel.value;
      sel.innerHTML = (pair[1] ? '<option value="">' + esc(pair[1]) + '</option>' : '') +
        rooms.map(function (r) { return '<option value="' + esc(r.id) + '">' + esc(r.name) + '</option>'; }).join('');
      if (cur && rooms.some(function (r) { return r.id === cur; })) { sel.value = cur; }
    });
    var av = $('avRoom');
    if (av && !av.value) { av.value = rooms.length ? rooms[0].id : ''; }
  }

  /* ---------- bookings ---------- */
  function renderBookings() {
    var list = store.getBookings();
    var statusF = $('fltStatus').value;
    var roomF = $('fltRoom').value;
    var filtered = list.filter(function (b) {
      if (statusF && b.status !== statusF) { return false; }
      if (roomF && b.roomId !== roomF) { return false; }
      return true;
    });
    var active = list.filter(function (b) { return b.status !== 'Cancelled'; });
    var revenue = active.reduce(function (sum, b) { return sum + (b.total || 0); }, 0);
    $('bookingStats').innerHTML =
      '<div class="admin-stat"><b>' + list.length + '</b><span>Bookings</span></div>' +
      '<div class="admin-stat"><b>' + list.filter(function (b) { return b.status === 'New'; }).length + '</b><span>New</span></div>' +
      '<div class="admin-stat"><b>' + list.filter(function (b) { return b.status === 'Confirmed'; }).length + '</b><span>Confirmed</span></div>' +
      '<div class="admin-stat"><b>' + fmt(revenue) + '</b><span>Value (not cancelled)</span></div>';
    var el = $('bookingList');
    if (!filtered.length) {
      el.innerHTML = '<p class="admin-note">No bookings match these filters.</p>';
      return;
    }
    var rows = filtered.map(function (b) {
      var opts = STATUSES.map(function (s) {
        return '<option value="' + s + '"' + (b.status === s ? ' selected' : '') + '>' + s + '</option>';
      }).join('');
      return '<tr>' +
        '<td data-label="Guest"><b>' + esc(b.guest) + '</b>' + (b.sample ? '<span class="sample-pill">Sample</span>' : '') + '<br><span style="color:var(--muted);font-size:.85rem">' + esc(b.phone || '') + '</span></td>' +
        '<td data-label="Room">' + esc(b.room) + '</td>' +
        '<td data-label="Dates">' + esc(b.checkin) + ' → ' + esc(b.checkout) + '</td>' +
        '<td data-label="Nights">' + (b.nights || '') + '</td>' +
        '<td data-label="Guests">' + esc(b.guests || '') + '</td>' +
        '<td data-label="Total">' + (b.total != null ? fmt(b.total) : '—') + '</td>' +
        '<td data-label="Status"><select data-booking-status="' + esc(b.id) + '">' + opts + '</select></td>' +
        '<td data-label=""><button class="btn ghost-dark small" type="button" data-booking-delete="' + esc(b.id) + '">Delete</button></td>' +
        '</tr>';
    }).join('');
    el.innerHTML = '<table class="admin-table"><thead><tr><th>Guest</th><th>Room</th><th>Dates</th><th>Nights</th><th>Guests</th><th>Total</th><th>Status</th><th></th></tr></thead><tbody>' + rows + '</tbody></table>';
    el.querySelectorAll('[data-booking-status]').forEach(function (sel) {
      sel.addEventListener('change', function () {
        store.updateBooking(sel.getAttribute('data-booking-status'), { status: sel.value });
        renderBookings();
      });
    });
    el.querySelectorAll('[data-booking-delete]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!window.confirm('Delete this booking? This cannot be undone.')) { return; }
        store.deleteBooking(btn.getAttribute('data-booking-delete'));
        renderBookings();
      });
    });
  }
  $('fltStatus').addEventListener('change', renderBookings);
  $('fltRoom').addEventListener('change', renderBookings);

  /* ---------- rooms & prices ---------- */
  function renderRooms() {
    var rooms = store.getRooms();
    $('roomList').innerHTML = rooms.map(function (r) {
      return '<div class="admin-room">' +
        '<h3>' + esc(r.name) + '</h3>' +
        '<p class="meta">' + esc(r.size) + ' · ' + esc(r.bed) + '</p>' +
        '<div class="row">' +
        '<div class="field"><label for="price-' + esc(r.id) + '">Nightly price (GH₵)</label><input id="price-' + esc(r.id) + '" type="number" min="0" step="1" value="' + r.price + '" data-room-price-input="' + esc(r.id) + '"></div>' +
        '<div class="field"><label for="count-' + esc(r.id) + '">Rooms of this type</label><input id="count-' + esc(r.id) + '" type="number" min="0" step="1" value="' + r.count + '" data-room-count-input="' + esc(r.id) + '"></div>' +
        '</div>' +
        '<button class="btn small" type="button" data-room-save="' + esc(r.id) + '">Save</button>' +
        '<span class="admin-saved" data-room-saved="' + esc(r.id) + '" role="status"></span>' +
        '</div>';
    }).join('');
    $('roomList').querySelectorAll('[data-room-save]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-room-save');
        var price = Number(document.querySelector('[data-room-price-input="' + id + '"]').value);
        var count = Number(document.querySelector('[data-room-count-input="' + id + '"]').value);
        if (!(price > 0) || !(count >= 0)) {
          document.querySelector('[data-room-saved="' + id + '"]').textContent = 'Enter a price above 0 and a room count of 0 or more.';
          return;
        }
        store.updateRoom(id, { price: price, count: count });
        document.querySelector('[data-room-saved="' + id + '"]').textContent = 'Saved — the public site now shows GH₵' + store.fmt(price) + ' for this room.';
      });
    });
  }

  /* ---------- availability ---------- */
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var avYear = null, avMonth = null;
  function renderAvailability() {
    var now = new Date();
    if (avYear == null) { avYear = now.getFullYear(); avMonth = now.getMonth(); }
    var roomId = $('avRoom').value;
    var room = store.getRoom(roomId) || store.getRooms()[0];
    if (!room) { $('avCal').innerHTML = '<p class="admin-note">No rooms yet.</p>'; return; }
    $('avTitle').textContent = MONTHS[avMonth] + ' ' + avYear + ' — ' + room.name + ' (' + room.count + ' rooms)';
    var first = new Date(avYear, avMonth, 1);
    var lead = (first.getDay() + 6) % 7; /* Monday first */
    var days = new Date(avYear, avMonth + 1, 0).getDate();
    var today = dstr(new Date());
    var h = '';
    ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach(function (d) { h += '<div style="text-align:center;font-size:.75rem;color:var(--muted);font-weight:600">' + d + '</div>'; });
    for (var i = 0; i < lead; i++) { h += '<div></div>'; }
    for (var d = 1; d <= days; d++) {
      var key = avYear + '-' + String(avMonth + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      var blocked = store.isBlocked(room.id, key);
      var taken = store.bookedCount(room.id, key);
      var past = key < today;
      var cls = 'av-day' + (blocked ? ' blocked' : '') + (taken > 0 && !blocked ? ' has-bookings' : '') + (key === today ? ' today' : '') + (past ? ' past' : '');
      h += '<button type="button" class="' + cls + '" data-av-day="' + key + '"' + (past ? ' disabled' : '') + '><span class="n">' + d + '</span>' +
        (blocked ? '<span class="b">Blocked</span>' : (taken > 0 ? '<span class="b">' + taken + '/' + room.count + ' booked</span>' : '<span class="b">&nbsp;</span>')) +
        '</button>';
    }
    $('avCal').innerHTML = h;
    $('avCal').querySelectorAll('[data-av-day]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-av-day');
        var res = store.toggleBlocked(room.id, key);
        $('avHint').textContent = res.ok
          ? (res.blocked ? key + ' is now blocked for the ' + room.name + '.' : key + ' is free again for the ' + room.name + '.')
          : (res.reason || 'That day cannot be blocked.');
        renderAvailability();
      });
    });
  }
  $('avRoom').addEventListener('change', function () { $('avHint').textContent = ''; renderAvailability(); });
  $('avPrev').addEventListener('click', function () {
    if (avYear == null) { var n = new Date(); avYear = n.getFullYear(); avMonth = n.getMonth(); }
    avMonth--;
    if (avMonth < 0) { avMonth = 11; avYear--; }
    renderAvailability();
  });
  $('avNext').addEventListener('click', function () {
    if (avYear == null) { var n = new Date(); avYear = n.getFullYear(); avMonth = n.getMonth(); }
    avMonth++;
    if (avMonth > 11) { avMonth = 0; avYear++; }
    renderAvailability();
  });

  /* ---------- hotel details ---------- */
  function normalizeWhatsApp(v) {
    var digits = String(v || '').replace(/\D/g, '');
    if (digits.indexOf('233') === 0) { return digits; }
    if (digits.charAt(0) === '0') { return '233' + digits.slice(1); }
    return digits;
  }
  function renderDetails() {
    var s = store.getSettings();
    var f = $('detailsForm');
    f.querySelector('[name="phone"]').value = s.phone;
    f.querySelector('[name="whatsapp"]').value = s.whatsapp;
    f.querySelector('[name="checkin"]').value = s.checkin;
    f.querySelector('[name="checkout"]').value = s.checkout;
    f.querySelector('[name="packageName"]').value = s.packageName;
    f.querySelector('[name="packagePrice"]').value = s.packagePrice;
    f.querySelector('[name="packageNote"]').value = s.packageNote;
    $('detailsSaved').textContent = '';
  }
  $('detailsForm').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var f = $('detailsForm');
    var err = f.querySelector('.form-error');
    var saved = $('detailsSaved');
    err.classList.remove('show');
    saved.textContent = '';
    var phone = f.querySelector('[name="phone"]').value.trim();
    var wa = normalizeWhatsApp(f.querySelector('[name="whatsapp"]').value);
    var checkin = f.querySelector('[name="checkin"]').value;
    var checkout = f.querySelector('[name="checkout"]').value;
    var pkgName = f.querySelector('[name="packageName"]').value.trim();
    var pkgPrice = Number(f.querySelector('[name="packagePrice"]').value);
    var pkgNote = f.querySelector('[name="packageNote"]').value.trim();
    if (!phone) { err.textContent = 'Enter the phone number guests should call.'; err.classList.add('show'); return; }
    if (!wa) { err.textContent = 'Enter the WhatsApp number for booking enquiries (digits only, e.g. 233557974777).'; err.classList.add('show'); return; }
    if (!checkin || !checkout) { err.textContent = 'Enter both the check-in and check-out times.'; err.classList.add('show'); return; }
    if (!pkgName) { err.textContent = 'Enter the package name.'; err.classList.add('show'); return; }
    if (!(pkgPrice > 0)) { err.textContent = 'Enter a package price above 0.'; err.classList.add('show'); return; }
    store.updateSettings({ phone: phone, whatsapp: wa, checkin: checkin, checkout: checkout, packageName: pkgName, packagePrice: pkgPrice, packageNote: pkgNote });
    saved.textContent = 'Saved — the public site now shows the new details.';
  });

  /* ---------- boot ---------- */
  if (isLoggedIn()) { showApp(); } else { showLogin(); }
})();
