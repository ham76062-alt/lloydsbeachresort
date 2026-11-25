/* ============ Lloyds Beach Resort & Spa, Kokrobite — site scripts ============ */
/* CENTRAL CONFIG — edit the numbers here and the whole site follows. */
var LLOYDS = {
  name: 'Lloyds Beach Resort & Spa',
  phone: '055 797 4777',
  phoneIntl: '+233 55 797 4777',
  phoneHref: '0557974777',
  /* No messaging-app links: no number has been confirmed by management, and
     the brief says to use the number management provides. The resort must
     confirm its messaging line before any such link is added — a one-line
     change here. */
  address: 'Langma, Kokrobite, Greater Accra Region, Ghana',
  plusCode: 'FJJ5+G2 Kokrobite',
  latitude: 5.4813735,
  longitude: -0.3923891,
  mapsUrl: 'https://maps.app.goo.gl/ETEWGgzUYr9aheDc7'
};

(function () {
  'use strict';

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
  function wireForm(form, fields, validate, buildSummary) {
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
      /* No backend and no messaging-app link: show the enquiry back to the
         guest with the phone number to call, so they can confirm it with
         the resort. */
      var sum = form.querySelector('.form-summary');
      if (sum) { sum.innerHTML = buildSummary(f); }
      var fieldsEl = form.querySelector('.form-fields');
      var ok = form.querySelector('.form-ok');
      if (fieldsEl) { fieldsEl.style.display = 'none'; }
      if (ok) { ok.classList.add('show'); ok.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
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

  /* ---- Room booking enquiry forms ---- */
  document.querySelectorAll('.booking-form').forEach(function (form) {
    wireForm(form,
      ['name', 'phone', 'email', 'room', 'checkin', 'checkout', 'adults', 'children', 'requests'],
      function (f) {
        if (!f.name.value.trim()) { return 'Please enter your full name.'; }
        if (!f.phone.value.trim()) { return 'Please enter your phone number so the resort can reach you.'; }
        return needDate(f);
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
