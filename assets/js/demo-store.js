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

  /* ---------- load / save ---------- */
  var data = null;
  function load() {
    if (data) { return data; }
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.rooms && parsed.bookings && parsed.settings) { data = parsed; return data; }
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
    isBlocked: isBlocked,
    bookedCount: bookedCount,
    toggleBlocked: toggleBlocked,
    check: check,
    nightsBetween: nightsBetween,
    prettyDate: prettyDate,
    fmt: fmt
  };
})();
