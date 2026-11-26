/* ============ Lloyds Beach Resort & Spa, Kokrobite — site scripts ============ */
/* CENTRAL CONFIG — edit the numbers here and the whole site follows. */
var LLOYDS = {
  name: 'Lloyds Beach Resort & Spa',
  phone: '055 797 4777',
  phoneIntl: '+233 55 797 4777',
  phoneHref: '0557974777',
  /* WhatsApp line, confirmed by the user 2026-11-25: booking enquiries are
     sent to the resort's WhatsApp on 055 797 4777 (wa.me/233557974777).
     Booking form only — no WhatsApp on the spa, event or contact forms,
     and no floating WhatsApp button anywhere on the site. */
  whatsapp: '233557974777',
  address: 'Langma, Kokrobite, Greater Accra Region, Ghana',
  plusCode: 'FJJ5+G2 Kokrobite',
  latitude: 5.4813735,
  longitude: -0.3923891,
  mapsUrl: 'https://maps.app.goo.gl/ETEWGgzUYr9aheDc7'
};

(function () {
  'use strict';

  /* ---- Demo store: prices, package and times from the staff dashboard ----
     The demo store (assets/js/demo-store.js) holds the dashboard's rooms,
     prices and settings in this browser only. At load, the prices on room
     cards, room detail pages, "Prices from" headers, booking-form room
     options, the package and the check-in/out times are re-rendered from
     it. The values written on the pages stay as the fallback. */
  function fmtNum(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function escHtml(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function applyDemoPrices() {
    var demo = window.LloydsDemo;
    if (!demo) { return; }
    document.querySelectorAll('[data-room-price]').forEach(function (el) {
      var price = demo.getPrice(el.getAttribute('data-room-price'));
      if (price == null) { return; }
      if (el.classList.contains('price')) {
        var small = el.querySelector('small');
        el.innerHTML = 'GH₵' + fmtNum(price) + ' ' + (small ? small.outerHTML : '');
      } else {
        el.textContent = 'GH₵' + fmtNum(price);
      }
    });
    var min = demo.getMinPrice();
    if (min != null) {
      document.querySelectorAll('[data-from-price]').forEach(function (el) { el.textContent = 'GH₵' + fmtNum(min); });
    }
    var s = demo.getSettings();
    document.querySelectorAll('[data-pkg-price]').forEach(function (el) {
      el.innerHTML = 'GH₵' + fmtNum(s.packagePrice) + '<small>' + escHtml(s.packageNote) + '</small>';
    });
    document.querySelectorAll('[data-pkg-name]').forEach(function (el) { el.textContent = s.packageName; });
    document.querySelectorAll('[data-checkinout]').forEach(function (el) {
      el.textContent = 'Check-in from ' + s.checkin + ' · Check-out before ' + s.checkout;
    });
    document.querySelectorAll('.booking-form select[name="room"] option').forEach(function (opt) {
      var price = demo.getPrice(opt.value);
      if (price != null) { opt.textContent = opt.value + ' — GH₵' + fmtNum(price) + ' / night'; }
    });
  }
  applyDemoPrices();

  /* ---- Tonight availability badges on room cards and detail pages ----
     The badge follows the staff Availability calendar: "Not available"
     when tonight is blocked or fully booked for that room type. */
  function applyDemoAvailability() {
    var demo = window.LloydsDemo;
    if (!demo || !demo.isAvailableTonight) { return; }
    document.querySelectorAll('[data-avail-for]').forEach(function (el) {
      var room = demo.getRoomByName(el.getAttribute('data-avail-for'));
      if (!room) { return; }
      var ok = demo.isAvailableTonight(room.id);
      el.textContent = ok ? 'Available' : 'Not available';
      el.classList.toggle('avail-ok', ok);
      el.classList.toggle('avail-no', !ok);
    });
  }
  applyDemoAvailability();

  /* ---- Mobile menu ---- */
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.main-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        nav.classList.remove('open');
        toggle.classList.remove('open');
      });
    });
  }

  /* ---- Footer year ---- */
  var yr = document.getElementById('year');
  if (yr) { yr.textContent = new Date().getFullYear(); }

  /* ---- Reveal on scroll ---- */
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---- Date minimums (no past dates) ---- */
  var today = new Date().toISOString().split('T')[0];
  document.querySelectorAll('input[type="date"]').forEach(function (inp) {
    inp.setAttribute('min', today);
  });

  /* ---- Shared form helpers ---- */
  function fmtDate(v) { return v || 'Not set'; }
  function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function summaryRows(rows) {
    return rows.map(function (r) { return '<dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd>'; }).join('');
  }
  function wireForm(form, fields, validate, buildSummary, onSuccess) {
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var err = form.querySelector('.form-error');
      var f = {};
      fields.forEach(function (name) {
        f[name] = form.querySelector('[name="' + name + '"]');
      });
      function fail(msg) {
        err.textContent = msg;
        err.classList.add('show');
        err.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      err.classList.remove('show');
      var problem = validate(f);
      if (problem) { return fail(problem); }
      /* No backend: show the enquiry back to the guest with the phone
         number to call, so they can confirm it with the resort. */
      var sum = form.querySelector('.form-summary');
      if (sum) { sum.innerHTML = buildSummary(f); }
      var fieldsEl = form.querySelector('.form-fields');
      var ok = form.querySelector('.form-ok');
      if (fieldsEl) { fieldsEl.style.display = 'none'; }
      if (ok) { ok.classList.add('show'); ok.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      if (onSuccess) { onSuccess(f, form); }
    });
    var again = form.querySelector('[data-again]');
    if (again) {
      again.addEventListener('click', function () {
        form.reset();
        var fieldsEl = form.querySelector('.form-fields');
        var ok = form.querySelector('.form-ok');
        if (fieldsEl) { fieldsEl.style.display = ''; }
        if (ok) { ok.classList.remove('show'); }
      });
    }
  }
  function needDate(f) {
    if (!f.checkin.value) { return 'Please choose a check-in date.'; }
    if (!f.checkout.value) { return 'Please choose a check-out date.'; }
    if (f.checkout.value <= f.checkin.value) { return 'Check-out must be after check-in.'; }
    return null;
  }

  /* ---- Booking enquiry -> WhatsApp (booking form only) ---- */
  function bookingWhatsAppUrl(f) {
    var inD = new Date(f.checkin.value + 'T00:00:00');
    var outD = new Date(f.checkout.value + 'T00:00:00');
    var nights = Math.round((outD - inD) / 86400000);
    var lines = ['Hello Lloyds Beach Resort & Spa, I would like to book:'];
    lines.push('Room: ' + f.room.value);
    lines.push('Check-in: ' + f.checkin.value);
    lines.push('Check-out: ' + f.checkout.value);
    lines.push('Nights: ' + nights);
    var guests = f.adults.value;
    if (f.children.value && f.children.value !== 'No children') { guests += ', ' + f.children.value; }
    lines.push('Guests: ' + guests);
    lines.push('Name: ' + f.name.value.trim());
    lines.push('Phone: ' + f.phone.value.trim());
    if (f.email.value.trim()) { lines.push('Email: ' + f.email.value.trim()); }
    if (f.requests.value.trim()) { lines.push('Special requests: ' + f.requests.value.trim()); }
    /* The WhatsApp number comes from the demo store when the staff
       dashboard has changed it; otherwise the confirmed number. */
    var wa = (window.LloydsDemo && LloydsDemo.getSettings().whatsapp) || LLOYDS.whatsapp;
    return 'https://wa.me/' + wa + '?text=' + encodeURIComponent(lines.join('\n'));
  }

  /* ---- Room booking enquiry forms ---- */
  document.querySelectorAll('.booking-form').forEach(function (form) {
    wireForm(form,
      ['name', 'phone', 'email', 'room', 'checkin', 'checkout', 'adults', 'children', 'requests'],
      function (f) {
        if (!f.name.value.trim()) { return 'Please enter your full name.'; }
        if (!f.phone.value.trim()) { return 'Please enter your phone number so the resort can reach you.'; }
        var d = needDate(f);
        if (d) { return d; }
        /* Demo store: refuse the enquiry when the room is full or a night
           is blocked, before anything is sent. */
        if (window.LloydsDemo) {
          var chk = LloydsDemo.check(f.room.value, f.checkin.value, f.checkout.value);
          if (!chk.ok) { return chk.reason; }
        }
        return null;
      },
      function (f) {
        return summaryRows([
          ['Room', f.room.value],
          ['Check-in', fmtDate(f.checkin.value)],
          ['Check-out', fmtDate(f.checkout.value)],
          ['Adults', f.adults.value],
          ['Children', f.children.value],
          ['Name', f.name.value.trim()],
          ['Phone', f.phone.value.trim()],
          ['Email', f.email.value.trim() || 'Not given'],
          ['Special requests', f.requests.value.trim() || 'None']
        ]);
      },
      function (f, form) {
        /* Demo store: save the booking for the staff dashboard first, so
           it shows in the bookings list with its total. */
        if (window.LloydsDemo) {
          var inD = new Date(f.checkin.value + 'T00:00:00');
          var outD = new Date(f.checkout.value + 'T00:00:00');
          var nights = Math.round((outD - inD) / 86400000);
          var guests = f.adults.value;
          if (f.children.value && f.children.value !== 'No children') { guests += ', ' + f.children.value; }
          LloydsDemo.addBooking({
            guest: f.name.value.trim(),
            phone: f.phone.value.trim(),
            email: f.email.value.trim(),
            room: f.room.value,
            checkin: f.checkin.value,
            checkout: f.checkout.value,
            nights: nights,
            guests: guests,
            requests: f.requests.value.trim(),
            status: 'New'
          });
        }
        var url = bookingWhatsAppUrl(f);
        var waBtn = form.querySelector('[data-whatsapp]');
        if (waBtn) { waBtn.href = url; }
        window.open(url, '_blank');
      });
  });

  /* ---- Contact forms ---- */
  document.querySelectorAll('.contact-form').forEach(function (form) {
    wireForm(form,
      ['name', 'phone', 'email', 'subject', 'message'],
      function (f) {
        if (!f.name.value.trim()) { return 'Please enter your full name.'; }
        if (!f.phone.value.trim()) { return 'Please enter your phone number so the resort can reach you.'; }
        if (!f.message.value.trim()) { return 'Please write your message.'; }
        return null;
      },
      function (f) {
        return summaryRows([
          ['Name', f.name.value.trim()],
          ['Phone', f.phone.value.trim()],
          ['Email', f.email.value.trim() || 'Not given'],
          ['Subject', f.subject.value.trim() || 'General enquiry'],
          ['Message', f.message.value.trim()]
        ]);
      });
  });

  /* ---- Spa appointment enquiry forms ---- */
  document.querySelectorAll('.spa-form').forEach(function (form) {
    wireForm(form,
      ['name', 'phone', 'email', 'treatment', 'date', 'time', 'requests'],
      function (f) {
        if (!f.name.value.trim()) { return 'Please enter your full name.'; }
        if (!f.phone.value.trim()) { return 'Please enter your phone number so the resort can reach you.'; }
        if (!f.date.value) { return 'Please choose a preferred date for your spa session.'; }
        return null;
      },
      function (f) {
        return summaryRows([
          ['Treatment', f.treatment.value],
          ['Preferred date', fmtDate(f.date.value)],
          ['Preferred time', f.time.value],
          ['Name', f.name.value.trim()],
          ['Phone', f.phone.value.trim()],
          ['Email', f.email.value.trim() || 'Not given'],
          ['Special requests', f.requests.value.trim() || 'None']
        ]);
      });
  });

  /* ---- Event enquiry forms ---- */
  document.querySelectorAll('.event-form').forEach(function (form) {
    wireForm(form,
      ['name', 'phone', 'email', 'type', 'date', 'guests', 'requests'],
      function (f) {
        if (!f.name.value.trim()) { return 'Please enter your full name.'; }
        if (!f.phone.value.trim()) { return 'Please enter your phone number so the resort can reach you.'; }
        if (!f.date.value) { return 'Please choose a preferred date for your event.'; }
        return null;
      },
      function (f) {
        return summaryRows([
          ['Event type', f.type.value],
          ['Preferred date', fmtDate(f.date.value)],
          ['Guests', f.guests.value],
          ['Name', f.name.value.trim()],
          ['Phone', f.phone.value.trim()],
          ['Email', f.email.value.trim() || 'Not given'],
          ['Special requirements', f.requests.value.trim() || 'None']
        ]);
      });
  });

  /* ---- Hero availability search -> feeds the booking form ---- */
  var searchForm = document.querySelector('.hero-search');
  if (searchForm) {
    searchForm.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var target = document.querySelector('#book');
      if (!target) { return; }
      var bookForm = target.querySelector('.booking-form') || document.querySelector('.booking-form');
      if (bookForm) {
        var map = { checkin: 'checkin', checkout: 'checkout', guests: 'adults', room: 'room' };
        Object.keys(map).forEach(function (k) {
          var src = searchForm.querySelector('[name="' + k + '"]');
          var dst = bookForm.querySelector('[name="' + map[k] + '"]');
          if (src && dst && src.value) { dst.value = src.value; }
        });
      }
      target.scrollIntoView({ behavior: 'smooth' });
      var nameField = bookForm && bookForm.querySelector('[name="name"]');
      if (nameField) { setTimeout(function () { nameField.focus({ preventScroll: true }); }, 700); }
    });
  }

  /* ---- "Book This Room" buttons ---- */
  document.querySelectorAll('[data-book-room]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var room = btn.getAttribute('data-book-room');
      var target = document.querySelector('#book');
      if (!target) { return; }
      var bookForm = target.querySelector('.booking-form') || document.querySelector('.booking-form');
      if (bookForm) {
        var sel = bookForm.querySelector('[name="room"]');
        if (sel) { sel.value = room; }
      }
      target.scrollIntoView({ behavior: 'smooth' });
    });
  });

  /* ---- "Book This Treatment" buttons -> pre-select the spa form ---- */
  document.querySelectorAll('[data-book-treatment]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var treatment = btn.getAttribute('data-book-treatment');
      var target = document.querySelector('#spa-book');
      if (!target) { return; }
      var spaForm = target.querySelector('.spa-form') || document.querySelector('.spa-form');
      if (spaForm) {
        var sel = spaForm.querySelector('[name="treatment"]');
        if (sel) { sel.value = treatment; }
      }
      target.scrollIntoView({ behavior: 'smooth' });
    });
  });

  /* ---- Room detail thumbnails ---- */
  var mainImg = document.querySelector('.room-detail .img-frame img');
  document.querySelectorAll('.thumb-row img').forEach(function (thumb) {
    thumb.addEventListener('click', function () {
      if (!mainImg) { return; }
      mainImg.src = thumb.getAttribute('data-full') || thumb.src;
      mainImg.alt = thumb.alt;
      document.querySelectorAll('.thumb-row img').forEach(function (t) { t.classList.remove('active'); });
      thumb.classList.add('active');
    });
  });

  /* ---- Gallery filter + lightbox ---- */
  var filterBtns = document.querySelectorAll('.filter-btn');
  var items = document.querySelectorAll('.masonry figure');
  filterBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      filterBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      var cat = btn.getAttribute('data-filter');
      items.forEach(function (it) {
        it.style.display = (cat === 'all' || it.getAttribute('data-cat') === cat) ? '' : 'none';
      });
    });
  });

  var lb = document.querySelector('.lightbox');
  if (lb) {
    var lbImg = lb.querySelector('img');
    var lbCap = lb.querySelector('.lb-cap');
    var figures = Array.prototype.slice.call(document.querySelectorAll('.masonry figure'));
    var current = 0;
    function visibleFigures() { return figures.filter(function (f) { return f.style.display !== 'none'; }); }
    function show(i) {
      var vis = visibleFigures();
      if (!vis.length) { return; }
      current = (i + vis.length) % vis.length;
      var img = vis[current].querySelector('img');
      lbImg.src = img.src;
      lbImg.alt = img.alt;
      lbCap.textContent = vis[current].querySelector('figcaption').textContent;
      lb.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
    function close() { lb.classList.remove('open'); document.body.style.overflow = ''; }
    figures.forEach(function (fig, i) {
      fig.addEventListener('click', function () { show(i); });
    });
    lb.querySelector('.lb-close').addEventListener('click', close);
    lb.querySelector('.lb-prev').addEventListener('click', function (e) { e.stopPropagation(); show(current - 1); });
    lb.querySelector('.lb-next').addEventListener('click', function (e) { e.stopPropagation(); show(current + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) { close(); } });
    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('open')) { return; }
      if (e.key === 'Escape') { close(); }
      if (e.key === 'ArrowLeft') { show(current - 1); }
      if (e.key === 'ArrowRight') { show(current + 1); }
    });
  }
})();
