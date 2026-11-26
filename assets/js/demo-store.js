/* Lloyds Beach Resort & Spa — demo data store (staff dashboard demo).
   No backend, no Supabase. Everything lives in this browser only, under
   localStorage key 'lloyds-demo-v1'. The public site reads room prices,
   the package and availability from this store at runtime; the values
   written on the pages are the fallback when the store is empty.
   Room counts are DEMO numbers — the hotel has not confirmed how many
   rooms of each type it has (sources conflict: 10 / 20 / 24 / 30). */
(function () {
  'use strict';

  var KEY = 'lloyds-demo-v1';
  var ACTIVE_STATUSES = ['New', 'Confirmed', 'Completed'];

  var ROOM_DEFS = [
    { id: 'standard-double', name: 'Standard Double Room', size: '65 m²', bed: '1 double bed', price: 818, count: 4 },
    { id: 'deluxe-suite', name: 'Deluxe Suite', size: '85 m²', bed: '1 double bed', price: 960, count: 3 },
    { id: 'queen-suite', name: 'Queen Suite', size: '125 m²', bed: '1 double bed', price: 1114, count: 3 },
    { id: 'king-room', name: 'King Room', size: '200 m²', bed: '1 extra-large double bed', price: 1541, count: 2 },
    { id: 'one-bedroom-apartment', name: 'One-Bedroom Apartment', size: '185 m²', bed: '1 large double bed', price: 2429, count: 2 },
    { id: 'family-suite', name: 'Family Suite', size: '220 m²', bed: '1 double + 1 extra-large double bed', price: 2062, count: 3 },
    { id: 'family-two-bedroom', name: 'Family Two-Bedroom Apartment with View', size: '230 m²', bed: '1 double + 1 extra-large double bed', price: 3022, count: 3 }
  ];

  /* ---------- dates (plain YYYY-MM-DD strings, local time) ---------- */
  function dstr(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function parseDay(s) {
    var p = String(s || '').split('-');
    if (p.length !== 3) { return null; }
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    return isNaN(d.getTime()) ? null : d;
  }
  function plusDays(n) {
    var d = new Date();
    d.setDate(d.getDate() + n);
    return dstr(d);
  }
  function nightList(checkin, checkout) {
    var a = parseDay(checkin), b = parseDay(checkout);
    var out = [];
    if (!a || !b) { return out; }
    for (var d = new Date(a); d < b; d.setDate(d.getDate() + 1)) { out.push(dstr(d)); }
    return out;
  }
  function prettyDate(s) {
    var d = parseDay(s);
    if (!d) { return s; }
    var dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
    var mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()];
    return dow + ' ' + d.getDate() + ' ' + mon + ' ' + d.getFullYear();
  }
  function fmt(n) {
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  /* ---------- seed (first load only; dates are relative to today) ---------- */
  function seed() {
    return {
      rooms: ROOM_DEFS.map(function (r) { return { id: r.id, name: r.name, size: r.size, bed: r.bed, price: r.price, count: r.count }; }),
      bookings: [
        { id: 'demo-b1', guest: 'Ama Serwaa', phone: '024 123 4567', email: 'ama@example.com', room: 'Standard Double Room', roomId: 'standard-double', checkin: plusDays(4), checkout: plusDays(6), nights: 2, guests: '2 adults', requests: '', total: 1636, status: 'Confirmed', sample: true, created: new Date().toISOString() },
        { id: 'demo-b2', guest: 'Kwame Mensah', phone: '055 234 5678', email: 'kwame@example.com', room: 'Deluxe Suite', roomId: 'deluxe-suite', checkin: plusDays(7), checkout: plusDays(10), nights: 3, guests: '2 adults, 1 child', requests: 'Quiet room if possible', total: 2880, status: 'New', sample: true, created: new Date().toISOString() },
        { id: 'demo-b3', guest: 'Efua Boateng', phone: '020 345 6789', email: 'efua@example.com', room: 'King Room', roomId: 'king-room', checkin: plusDays(-5), checkout: plusDays(-3), nights: 2, guests: '2 adults', requests: '', total: 3082, status: 'Completed', sample: true, created: new Date().toISOString() },
        { id: 'demo-b4', guest: 'Yaw Owusu', phone: '027 456 7890', email: 'yaw@example.com', room: 'Family Suite', roomId: 'family-suite', checkin: plusDays(12), checkout: plusDays(15), nights: 3, guests: '2 adults, 2 children', requests: 'Early check-in if possible', total: 6186, status: 'New', sample: true, created: new Date().toISOString() },
        { id: 'demo-b5', guest: 'Akosua Frimpong', phone: '054 567 8901', email: 'akosua@example.com', room: 'Queen Suite', roomId: 'queen-suite', checkin: plusDays(5), checkout: plusDays(7), nights: 2, guests: '2 adults', requests: '', total: 2228, status: 'Cancelled', sample: true, created: new Date().toISOString() }
      ],
      blocked: {
        'standard-double': [plusDays(9)],
        'deluxe-suite': [plusDays(14), plusDays(15)]
      },
      guests: seedGuests(),
      followups: seedFollowups(),
      settings: {
        phone: '055 797 4777',
        whatsapp: '233557974777',
        checkin: '14:00',
        checkout: '12:00',
        packageName: 'All-Inclusive Getaway Made for Two',
        packagePrice: 2799,
        packageNote: 'for 3 days, 2 nights, for two people'
      }
    };
  }

  /* ---------- guests (CRM) ----------
     Sample guests. A guest only exists once a booking is confirmed — a
     WhatsApp enquiry ("New") never creates one. The 5 sample bookings
     are part of these guests' histories: Ama's upcoming confirmed stay
     (demo-b1) and Efua's completed stay (demo-b3). Stay totals are the
     amounts recorded for those stays; room rates have changed over time,
     so an old stay need not equal today's price x nights. */
  function seedGuests() {
    return [
      { id: 'g-ama', sample: true, name: 'Ama Serwaa', phone: '024 123 4567', email: 'ama@example.com',
        prefs: 'Prefers a quiet room; asks about the Queen Suite.',
        notes: 'Regular guest — always books ahead.',
        tags: [],
        stays: [
          { bookingId: null, checkin: '2026-10-09', checkout: '2026-10-11', room: 'Standard Double Room', roomId: 'standard-double', nights: 2, total: 1636, status: 'Completed' },
          { bookingId: null, checkin: '2026-06-12', checkout: '2026-06-14', room: 'Standard Double Room', roomId: 'standard-double', nights: 2, total: 1636, status: 'Completed' },
          { bookingId: null, checkin: '2026-03-06', checkout: '2026-03-08', room: 'Standard Double Room', roomId: 'standard-double', nights: 2, total: 1636, status: 'Completed' },
          { bookingId: 'demo-b1', checkin: plusDays(4), checkout: plusDays(6), room: 'Standard Double Room', roomId: 'standard-double', nights: 2, total: 1636, status: 'Confirmed' }
        ] },
      { id: 'g-kwame', sample: true, name: 'Kwame Mensah', phone: '055 234 5678', email: 'kwame@example.com',
        prefs: 'Quiet room if possible; early check-in.',
        notes: 'Business trips, usually midweek.',
        tags: [],
        stays: [
          { bookingId: null, checkin: '2026-09-18', checkout: '2026-09-20', room: 'Deluxe Suite', roomId: 'deluxe-suite', nights: 2, total: 1920, status: 'Completed' },
          { bookingId: null, checkin: '2026-05-08', checkout: '2026-05-09', room: 'Deluxe Suite', roomId: 'deluxe-suite', nights: 1, total: 960, status: 'Completed' }
        ] },
      { id: 'g-efua', sample: true, name: 'Efua Boateng', phone: '020 345 6789', email: 'efua@example.com',
        prefs: 'Honeymoon — asked about the spa package.',
        notes: 'First stay was her honeymoon.',
        tags: [],
        stays: [
          { bookingId: 'demo-b3', checkin: plusDays(-5), checkout: plusDays(-3), room: 'King Room', roomId: 'king-room', nights: 2, total: 3082, status: 'Completed' }
        ] },
      { id: 'g-yaw', sample: true, name: 'Yaw Owusu', phone: '027 456 7890', email: 'yaw@example.com',
        prefs: 'Always books the Family Suite; 2 kids.',
        notes: 'VIP — visits every few months.',
        tags: ['VIP'],
        stays: [
          { bookingId: null, checkin: '2026-11-06', checkout: '2026-11-07', room: 'Family Suite', roomId: 'family-suite', nights: 1, total: 2062, status: 'Completed' },
          { bookingId: null, checkin: '2026-08-14', checkout: '2026-08-15', room: 'Family Suite', roomId: 'family-suite', nights: 1, total: 2062, status: 'Completed' },
          { bookingId: null, checkin: '2026-05-01', checkout: '2026-05-02', room: 'Family Suite', roomId: 'family-suite', nights: 1, total: 2062, status: 'Completed' },
          { bookingId: null, checkin: '2026-02-13', checkout: '2026-02-14', room: 'Family Suite', roomId: 'family-suite', nights: 1, total: 2062, status: 'Completed' }
        ] },
      { id: 'g-akosua', sample: true, name: 'Akosua Frimpong', phone: '054 567 8901', email: 'akosua@example.com',
        prefs: '',
        notes: 'Cancelled a booking once; rebooked for December.',
        tags: [],
        stays: [
          { bookingId: null, checkin: '2026-07-10', checkout: '2026-07-12', room: 'Queen Suite', roomId: 'queen-suite', nights: 2, total: 2228, status: 'Completed' }
        ] },
      { id: 'g-kofi', sample: true, name: 'Kofi Asante', phone: '055 777 0011', email: '',
        prefs: 'Surfer — asks about beach conditions.',
        notes: 'Interested in surf lessons.',
        tags: [],
        stays: [
          { bookingId: null, checkin: '2026-10-02', checkout: '2026-10-03', room: 'Deluxe Suite', roomId: 'deluxe-suite', nights: 1, total: 960, status: 'Completed' },
          { bookingId: null, checkin: '2026-04-17', checkout: '2026-04-18', room: 'Deluxe Suite', roomId: 'deluxe-suite', nights: 1, total: 960, status: 'Completed' }
        ] },
      { id: 'g-adwoa', sample: true, name: 'Adwoa Osei', phone: '024 333 5566', email: '',
        prefs: 'Loved the pool.',
        notes: 'First stay in November.',
        tags: [],
        stays: [
          { bookingId: null, checkin: '2026-11-13', checkout: '2026-11-14', room: 'Deluxe Suite', roomId: 'deluxe-suite', nights: 1, total: 960, status: 'Completed' }
        ] },
      { id: 'g-nana', sample: true, name: 'Nana Yaw', phone: '020 888 7766', email: '',
        prefs: 'Always the King Room.',
        notes: 'VIP — books every month.',
        tags: ['VIP'],
        stays: [
          { bookingId: null, checkin: '2026-11-20', checkout: '2026-11-22', room: 'King Room', roomId: 'king-room', nights: 2, total: 3082, status: 'Completed' },
          { bookingId: null, checkin: '2026-09-11', checkout: '2026-09-13', room: 'King Room', roomId: 'king-room', nights: 2, total: 3082, status: 'Completed' },
          { bookingId: null, checkin: '2026-07-03', checkout: '2026-07-05', room: 'Queen Suite', roomId: 'queen-suite', nights: 2, total: 2228, status: 'Completed' },
          { bookingId: null, checkin: '2026-05-15', checkout: '2026-05-17', room: 'Deluxe Suite', roomId: 'deluxe-suite', nights: 2, total: 1920, status: 'Completed' },
          { bookingId: null, checkin: '2026-03-07', checkout: '2026-03-08', room: 'Family Suite', roomId: 'family-suite', nights: 1, total: 2138, status: 'Completed' }
        ] }
    ];
  }
  function seedFollowups() {
    return [
      { id: 'fu-ama', guestId: 'g-ama', guest: 'Ama Serwaa', reason: 'Stayed 6 months ago — send a return offer',
        message: "Hi Ama, it's Lloyds Beach Resort & Spa! It's been a while since your last stay — we'd love to welcome you back to Kokrobite. Here's 10% off your next stay this month. Shall we hold a room for you?", sent: false },
      { id: 'fu-efua', guestId: 'g-efua', guest: 'Efua Boateng', reason: 'Honeymoon anniversary in 2 weeks',
        message: "Hi Efua, happy anniversary from all of us at Lloyds! You celebrated your honeymoon with us — come back and mark your first anniversary by the beach. We'd love to have you.", sent: false },
      { id: 'fu-kofi', guestId: 'g-kofi', guest: 'Kofi Asante', reason: 'Asked about surf lessons',
        message: "Hi Kofi, you asked about surf lessons on your last stay — the waves are great this week and our instructor has slots open. Want us to book you a session with your next stay?", sent: false },
      { id: 'fu-adwoa', guestId: 'g-adwoa', guest: 'Adwoa Osei', reason: 'First stay — send a thank-you',
        message: "Hi Adwoa, thank you for staying with us at Lloyds! We hope you enjoyed the pool and the beach. We'd love to welcome you back soon.", sent: false },
      { id: 'fu-nana', guestId: 'g-nana', guest: 'Nana Yaw', reason: 'Monthly regular — confirm the next booking',
        message: "Hi Nana Yaw, your usual King Room is free next month — shall we hold it for you as usual?", sent: false }
    ];
  }

  /* ---------- load / save ---------- */
  var data = null;
  function load() {
    if (data) { return data; }
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.rooms && parsed.bookings && parsed.settings) {
          data = parsed;
          /* Stores seeded before the Guests tab existed have no guests or
             follow-ups — add the sample ones without touching the rest. */
          if (!data.guests) { data.guests = seedGuests(); }
          if (!data.followups) { data.followups = seedFollowups(); }
          save();
          return data;
        }
      }
    } catch (e) { /* corrupted store: fall through to a fresh seed */ }
    data = seed();
    save();
    return data;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* storage full or blocked */ }
  }

  /* ---------- rooms ---------- */
  function getRooms() { return load().rooms.slice(); }
  function getRoom(id) {
    var rooms = load().rooms;
    for (var i = 0; i < rooms.length; i++) { if (rooms[i].id === id) { return rooms[i]; } }
    return null;
  }
  function getRoomByName(name) {
    var rooms = load().rooms;
    for (var i = 0; i < rooms.length; i++) { if (rooms[i].name === name) { return rooms[i]; } }
    return null;
  }
  function getPrice(name) {
    var r = getRoomByName(name);
    return r ? r.price : null;
  }
  function getMinPrice() {
    var rooms = load().rooms;
    var min = null;
    rooms.forEach(function (r) { if (min == null || r.price < min) { min = r.price; } });
    return min;
  }
  function updateRoom(id, patch) {
    var r = getRoom(id);
    if (!r) { return false; }
    if (patch.price != null) { r.price = Math.max(0, Math.round(Number(patch.price) || 0)); }
    if (patch.count != null) { r.count = Math.max(0, Math.round(Number(patch.count) || 0)); }
    save();
    return true;
  }

  /* ---------- settings ---------- */
  function getSettings() { return load().settings; }
  function updateSettings(patch) {
    var s = load().settings;
    Object.keys(patch).forEach(function (k) { if (patch[k] != null && patch[k] !== '') { s[k] = patch[k]; } });
    save();
    return s;
  }

  /* ---------- bookings ---------- */
  function getBookings() {
    var list = load().bookings.slice();
    list.sort(function (a, b) { return String(a.checkin).localeCompare(String(b.checkin)); });
    return list;
  }
  function nightsBetween(checkin, checkout) {
    var a = parseDay(checkin), b = parseDay(checkout);
    if (!a || !b) { return 0; }
    return Math.round((b - a) / 86400000);
  }
  function addBooking(b) {
    var d = load();
    var room = getRoomByName(b.room);
    var nights = nightsBetween(b.checkin, b.checkout);
    var booking = {
      id: 'b' + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36),
      guest: b.guest || '',
      phone: b.phone || '',
      email: b.email || '',
      room: b.room || '',
      roomId: room ? room.id : '',
      checkin: b.checkin || '',
      checkout: b.checkout || '',
      nights: nights,
      guests: b.guests || '',
      requests: b.requests || '',
      total: (room && nights > 0) ? room.price * nights : (b.total || null),
      status: b.status || 'New',
      sample: !!b.sample,
      created: new Date().toISOString()
    };
    d.bookings.push(booking);
    save();
    return booking;
  }
  function updateBooking(id, patch) {
    var list = load().bookings;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) {
        if (patch.status) { list[i].status = patch.status; }
        save();
        return true;
      }
    }
    return false;
  }
  function deleteBooking(id) {
    var d = load();
    var before = d.bookings.length;
    d.bookings = d.bookings.filter(function (b) { return b.id !== id; });
    if (d.bookings.length !== before) { save(); return true; }
    return false;
  }

  /* ---------- guests (CRM) ----------
     A guest record is created only when a booking is CONFIRMED — a
     WhatsApp enquiry ("New") never creates one. Completing a booking
     moves its stay into the guest's stay history and total spent.
     Guests are matched by name + phone (phone compared digits-only). */
  function normName(s) { return String(s || '').trim().toLowerCase().replace(/\s+/g, ' '); }
  function normPhone(s) { return String(s || '').replace(/\D/g, '').replace(/^233/, '0'); }
  function getGuests() {
    var list = (load().guests || []).slice();
    list.sort(function (a, b) { return normName(a.name).localeCompare(normName(b.name)); });
    return list;
  }
  function getGuest(id) {
    var list = load().guests || [];
    for (var i = 0; i < list.length; i++) { if (list[i].id === id) { return list[i]; } }
    return null;
  }
  function getGuestByNamePhone(name, phone) {
    var n = normName(name), p = normPhone(phone);
    var list = load().guests || [];
    for (var i = 0; i < list.length; i++) {
      if (normName(list[i].name) === n && normPhone(list[i].phone) === p) { return list[i]; }
    }
    return null;
  }
  function completedStays(g) {
    return (g.stays || []).filter(function (s) { return s.status === 'Completed'; });
  }
  function guestTotal(g) {
    return completedStays(g).reduce(function (sum, s) { return sum + (s.total || 0); }, 0);
  }
  function guestLastStay(g) {
    var done = completedStays(g);
    if (!done.length) { return ''; }
    var last = done[0].checkout;
    done.forEach(function (s) { if (s.checkout > last) { last = s.checkout; } });
    return last;
  }
  function guestStats(g) {
    var done = completedStays(g);
    var upcoming = (g.stays || []).filter(function (s) { return s.status === 'Confirmed'; });
    return { stays: done.length, total: guestTotal(g), lastStay: guestLastStay(g), upcoming: upcoming.length,
      isRepeat: done.length >= 2, isNew: done.length <= 1, isVip: (g.tags || []).indexOf('VIP') !== -1 };
  }
  function addGuest(g) {
    var d = load();
    d.guests = d.guests || [];
    var guest = {
      id: 'g' + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36),
      sample: false,
      name: (g.name || '').trim(),
      phone: (g.phone || '').trim(),
      email: (g.email || '').trim(),
      prefs: (g.prefs || '').trim(),
      notes: (g.notes || '').trim(),
      tags: [],
      stays: []
    };
    d.guests.push(guest);
    save();
    return guest;
  }
  function updateGuest(id, patch) {
    var g = getGuest(id);
    if (!g) { return false; }
    if (patch.notes != null) { g.notes = String(patch.notes); }
    if (patch.prefs != null) { g.prefs = String(patch.prefs); }
    if (patch.tags) { g.tags = patch.tags; }
    save();
    return true;
  }
  function stayFromBooking(b, status) {
    return {
      bookingId: b.id,
      checkin: b.checkin, checkout: b.checkout,
      room: b.room, roomId: b.roomId || '',
      nights: b.nights || nightsBetween(b.checkin, b.checkout),
      total: b.total || 0,
      status: status
    };
  }
  /* Bring a booking's guest record in line with the booking's status.
     Confirmed -> guest exists with an upcoming stay for this booking.
     Completed -> that stay is in the guest's history (converted from the
     upcoming stay when there is one, added directly otherwise).
     New / Cancelled -> any stay linked to this booking is removed. */
  function syncBookingGuest(bookingId) {
    var d = load();
    var booking = null;
    d.bookings.forEach(function (b) { if (b.id === bookingId) { booking = b; } });
    if (!booking) { return null; }
    var guest = getGuestByNamePhone(booking.guest, booking.phone);
    if (booking.status === 'Confirmed') {
      if (!guest) {
        guest = addGuest({ name: booking.guest, phone: booking.phone, email: booking.email, notes: '' });
      }
      guest.stays = guest.stays || [];
      var has = guest.stays.some(function (s) { return s.bookingId === bookingId; });
      if (!has) { guest.stays.push(stayFromBooking(booking, 'Confirmed')); }
      save();
      return guest;
    }
    if (booking.status === 'Completed') {
      if (!guest) {
        guest = addGuest({ name: booking.guest, phone: booking.phone, email: booking.email, notes: '' });
      }
      guest.stays = guest.stays || [];
      var done = false;
      guest.stays.forEach(function (s) {
        if (s.bookingId === bookingId) {
          s.status = 'Completed';
          s.checkin = booking.checkin; s.checkout = booking.checkout;
          s.room = booking.room; s.roomId = booking.roomId || s.roomId;
          s.nights = booking.nights || s.nights; s.total = booking.total || s.total;
          done = true;
        }
      });
      if (!done) { guest.stays.push(stayFromBooking(booking, 'Completed')); }
      save();
      return guest;
    }
    /* New or Cancelled: drop any stay linked to this booking. */
    (d.guests || []).forEach(function (g) {
      var before = (g.stays || []).length;
      g.stays = (g.stays || []).filter(function (s) { return s.bookingId !== bookingId; });
      if (g.stays.length !== before) { save(); }
    });
    return guest;
  }
  function removeBookingStay(bookingId) {
    var d = load();
    var changed = false;
    (d.guests || []).forEach(function (g) {
      var before = (g.stays || []).length;
      g.stays = (g.stays || []).filter(function (s) { return s.bookingId !== bookingId; });
      if (g.stays.length !== before) { changed = true; }
    });
    if (changed) { save(); }
  }

  /* ---------- follow-ups ---------- */
  function getFollowups() { return (load().followups || []).slice(); }
  function markFollowupSent(id, sent) {
    var list = load().followups || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) { list[i].sent = !!sent; save(); return true; }
    }
    return false;
  }

  /* ---------- availability ----------
     A room type is free for a date range when, for every night, the active
     bookings covering that night are fewer than the rooms of that type,
     and the night is not blocked. Cancelled bookings do not count. */
  function isBlocked(roomId, dateStr) {
    var list = (load().blocked || {})[roomId] || [];
    return list.indexOf(dateStr) !== -1;
  }
  function bookedCount(roomId, dateStr) {
    var n = 0;
    load().bookings.forEach(function (b) {
      if (b.roomId !== roomId) { return; }
      if (ACTIVE_STATUSES.indexOf(b.status) === -1) { return; }
      if (b.checkin <= dateStr && dateStr < b.checkout) { n++; }
    });
    return n;
  }
  function toggleBlocked(roomId, dateStr) {
    var d = load();
    d.blocked = d.blocked || {};
    var list = d.blocked[roomId] || (d.blocked[roomId] = []);
    var i = list.indexOf(dateStr);
    if (i !== -1) {
      list.splice(i, 1);
      save();
      return { ok: true, blocked: false };
    }
    if (bookedCount(roomId, dateStr) > 0) {
      return { ok: false, reason: 'That night already has a booking — cancel the booking first.' };
    }
    list.push(dateStr);
    save();
    return { ok: true, blocked: true };
  }
  function check(roomName, checkin, checkout) {
    var room = getRoomByName(roomName);
    if (!room) { return { ok: true }; }
    var nights = nightList(checkin, checkout);
    if (!nights.length) { return { ok: false, reason: 'Check-out must be after check-in.' }; }
    for (var i = 0; i < nights.length; i++) {
      var day = nights[i];
      if (isBlocked(room.id, day)) {
        return { ok: false, reason: 'Sorry — the ' + room.name + ' is not available on ' + prettyDate(day) + '. Please pick different dates.' };
      }
      if (bookedCount(room.id, day) >= room.count) {
        return { ok: false, reason: 'Sorry — the ' + room.name + ' is fully booked on ' + prettyDate(day) + '. Please pick different dates.' };
      }
    }
    return { ok: true };
  }

  /* Tonight's availability for the rooms page badge: a room type is
     "Not available" tonight when tonight is blocked in the calendar, or
     active bookings covering tonight already fill every room of the type. */
  function isAvailableTonight(roomId) {
    var room = getRoom(roomId);
    if (!room) { return true; }
    var tonight = plusDays(0);
    if (isBlocked(roomId, tonight)) { return false; }
    return bookedCount(roomId, tonight) < room.count;
  }

  function resetDemo() {
    data = seed();
    save();
    return data;
  }

  window.LloydsDemo = {
    KEY: KEY,
    load: load,
    save: save,
    resetDemo: resetDemo,
    getRooms: getRooms,
    getRoom: getRoom,
    getRoomByName: getRoomByName,
    getPrice: getPrice,
    getMinPrice: getMinPrice,
    updateRoom: updateRoom,
    getSettings: getSettings,
    updateSettings: updateSettings,
    getBookings: getBookings,
    addBooking: addBooking,
    updateBooking: updateBooking,
    deleteBooking: deleteBooking,
    getGuests: getGuests,
    getGuest: getGuest,
    addGuest: addGuest,
    updateGuest: updateGuest,
    guestStats: guestStats,
    syncBookingGuest: syncBookingGuest,
    removeBookingStay: removeBookingStay,
    getFollowups: getFollowups,
    markFollowupSent: markFollowupSent,
    isBlocked: isBlocked,
    bookedCount: bookedCount,
    isAvailableTonight: isAvailableTonight,
    toggleBlocked: toggleBlocked,
    check: check,
    nightsBetween: nightsBetween,
    prettyDate: prettyDate,
    fmt: fmt
  };
})();
