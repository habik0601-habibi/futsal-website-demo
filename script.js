// Custom Cursor
const cursor = document.querySelector('.cursor');
const cursorFollower = document.querySelector('.cursor-follower');
const interactiveElements = document.querySelectorAll('a, button, .menu-toggle, input, .feature-card, .pricing-card');

if (window.innerWidth > 768) {
    document.addEventListener('mousemove', (e) => {
        cursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
        // Add a slight delay to the follower
        setTimeout(() => {
            cursorFollower.style.left = `${e.clientX}px`;
            cursorFollower.style.top = `${e.clientY}px`;
        }, 50);
    });

    interactiveElements.forEach(el => {
        el.addEventListener('mouseenter', () => {
            cursorFollower.classList.add('active');
            cursor.style.display = 'none';
        });
        el.addEventListener('mouseleave', () => {
            cursorFollower.classList.remove('active');
            cursor.style.display = 'block';
        });
    });
}

// Sticky Navbar
const navbar = document.getElementById('navbar');
if (navbar) {
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
}

// Mobile Menu Toggle
const mobileMenu = document.getElementById('mobile-menu');
const navLinks = document.querySelector('.nav-links');
if (mobileMenu && navLinks) {
    mobileMenu.addEventListener('click', () => {
        mobileMenu.classList.toggle('active');
        navLinks.classList.toggle('active');
    });

    // Close menu when clicking a link
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.remove('active');
            navLinks.classList.remove('active');
        });
    });
}

// Testimonial Slider
let slideIndex = 1;
const slides = document.querySelectorAll(".testimonial-card");
const dots = document.querySelectorAll(".dot");

function showSlides(n) {
    if (n > slides.length) { slideIndex = 1 }
    if (n < 1) { slideIndex = slides.length }
    
    slides.forEach(slide => slide.classList.remove("active"));
    dots.forEach(dot => dot.classList.remove("active"));
    
    slides[slideIndex-1].classList.add("active");
    dots[slideIndex-1].classList.add("active");
}

window.moveSlide = function(n) {
    showSlides(slideIndex += n);
}

window.currentSlide = function(n) {
    showSlides(slideIndex = n);
}

// CTA Form Submission (Mock)
const signupForm = document.getElementById('signupForm');
if (signupForm) {
    signupForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const btn = this.querySelector('button');
        const msg = document.getElementById('formMessage');
        const input = document.getElementById('emailInput');
        
        if(input.value) {
            btn.textContent = 'Sending...';
            btn.style.opacity = '0.7';
            
            // Mock API call
            setTimeout(() => {
                btn.textContent = 'Get Started';
                btn.style.opacity = '1';
                this.style.display = 'none';
                msg.style.display = 'block';
            }, 1500);
        }
    });
}

// ---- SUPABASE & LIVE BOOKING LOGIC ----
const SUPA_URL = 'https://xkybkhkitvfskhgarnlt.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhreWJraGtpdHZmc2toZ2Fybmx0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzODgyNDksImV4cCI6MjA5MDk2NDI0OX0.G6FeSm6Fklg7THRGCl3jZHTZYFZ4xDMXgPcFF0tvcpU';

async function sbFetch(table, options = {}) {
  const { method = 'GET', body, params = '' } = options;
  const url = `${SUPA_URL}/rest/v1/${table}${params ? '?' + params : ''}`;
  const headers = {
    'apikey': SUPA_KEY,
    'Authorization': 'Bearer ' + SUPA_KEY,
    'Content-Type': 'application/json',
    'Prefer': method === 'POST' ? 'return=representation' : 'return=representation'
  };
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) { console.error('Supabase error', await res.text()); return null; }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : [];
}

let activeCourt = 'Chak Shehzad A';
let _d = new Date();
let activeDate = `${_d.getFullYear()}-${String(_d.getMonth()+1).padStart(2,'0')}-${String(_d.getDate()).padStart(2,'0')}`;
let sliderStartDate = new Date();
const DAYS_OF_WEEK = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
const MONTHS_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

window.selectCourt = function(element) {
    document.querySelectorAll('.court-tab').forEach(tab => tab.classList.remove('active'));
    element.classList.add('active');
    activeCourt = element.innerText.trim();
    fetchSlots();
};

window.selectDate = function(element, fullDateStr) {
    document.querySelectorAll('.date-item').forEach(item => item.classList.remove('active'));
    if (element) element.classList.add('active');
    activeDate = fullDateStr;
    fetchSlots();
};

window.slideDates = function(dir) {
    sliderStartDate.setDate(sliderStartDate.getDate() + (dir * 7));
    renderDateSlider();
};

window.renderDateSlider = function() {
    const slider = document.getElementById('dateSliderDynamic');
    if (!slider) return;
    
    let html = '';
    let hasActiveDate = false;
    for(let i = 0; i < 7; i++) {
        let d = new Date(sliderStartDate);
        d.setDate(d.getDate() + i);
        
        let dayStr = String(d.getDate()).padStart(2, '0');
        let monthStr = String(d.getMonth() + 1).padStart(2, '0');
        let yearStr = d.getFullYear();
        let fullDateStr = `${yearStr}-${monthStr}-${dayStr}`;
        
        let isActive = (fullDateStr === activeDate) ? 'active' : '';
        if (isActive) hasActiveDate = true;
        
        let dayName = DAYS_OF_WEEK[d.getDay()];
        html += `<div class="date-item ${isActive}" onclick="selectDate(this, '${fullDateStr}')"><span>${dayName}</span><strong>${d.getDate()}</strong></div>`;
    }
    
    slider.innerHTML = html;
    document.getElementById('calendarMonthLabel').innerText = `${MONTHS_NAMES[sliderStartDate.getMonth()]} ${sliderStartDate.getFullYear()}`;
    
    if (!hasActiveDate && document.querySelector('.date-item')) {
        document.querySelector('.date-item').click();
    }
};

window.selectDuration = function(element) {
    document.querySelectorAll('.duration-tab').forEach(tab => tab.classList.remove('active'));
    element.classList.add('active');
    fetchSlots();
};

const TIME_SLOTS = ['06:00','07:30','09:00','10:30','12:00','13:30','15:00','16:30','18:00','19:30','21:00','22:30'];

function formatTimeLabel(time24) {
    let [h, m] = time24.split(':');
    let hr = parseInt(h);
    let ampm = hr >= 12 ? 'PM' : 'AM';
    let hr12 = hr % 12 || 12;
    return `${hr12}:${m} ${ampm}`;
}

async function fetchSlots() {
    const container = document.getElementById('slots-container');
    if (!container) return; // Prevent error on dashboard.html
    
    container.innerHTML = '<div style="color:var(--text-secondary); grid-column: 1/-1; text-align:center;">Loading live availability...</div>';

    const fetchPromises = Promise.all([
        sbFetch(`bookings`, { params: `court_name=eq.${activeCourt}&booking_date=eq.${activeDate}&status=eq.confirmed` }),
        sbFetch(`blocked_periods`, { params: `court=eq.${activeCourt}` })
    ]);
    const timeoutPromise = new Promise((_, r) => setTimeout(() => r(new Error('TIMEOUT')), 5000));
    
    let bookings = [];
    let blocked = [];
    try {
        const res = await Promise.race([fetchPromises, timeoutPromise]);
        bookings = res[0] || [];
        blocked = res[1] || [];
    } catch(err) {
        container.innerHTML = '<div style="color:#ff5555; grid-column: 1/-1; text-align:center; padding: 20px;">Failed to load slots. Please check your connection or try refreshing.</div>';
        return;
    }

    const isBlocked = (blocked || []).some(bl => activeDate >= bl.from_date && activeDate <= bl.to_date);

    let html = '';
    
    TIME_SLOTS.forEach(time => {
        let isBooked = (bookings || []).some(b => b.time_slot === time);
        let timeLabel = formatTimeLabel(time);
        
        if (isBlocked) {
            html += `<button class="slot-item waitlist-slot" disabled><strong>${timeLabel}</strong><span>Maintenance</span></button>`;
        } else if (isBooked) {
            html += `<button class="slot-item booked" disabled><strong>${timeLabel}</strong><span>Booked</span></button>`;
        } else {
            html += `<button class="slot-item available" onclick="handleSlotClick(this, '${time}')">
                        <strong style="margin-bottom:0;">${timeLabel}</strong><span style="font-size:0.75rem;margin-bottom:4px;">Available</span>
                        <div class="slot-action-drawer">
                            <div class="btn-primary" style="padding: 4px 8px; font-size:0.8rem;" onclick="event.stopPropagation(); initBookingFlow('${time}')">Book Now</div>
                        </div>
                     </button>`;
        }
    });

    container.innerHTML = html;
    
    if (window.innerWidth > 768 && typeof cursorFollower !== 'undefined') {
        container.querySelectorAll('.slot-item.available').forEach(el => {
            el.addEventListener('mouseenter', () => {
                cursorFollower.classList.add('active');
                cursor.style.display = 'none';
            });
            el.addEventListener('mouseleave', () => {
                cursorFollower.classList.remove('active');
                cursor.style.display = 'block';
            });
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const courtEl = document.querySelector('.court-tab.active');
    if (courtEl) {
        activeCourt = courtEl.innerText.trim();
    }
    
    if (document.getElementById('dateSliderDynamic')) {
        renderDateSlider();
        if (document.querySelector('.date-item.active')) {
            fetchSlots();
        }
    } else {
        fetchSlots();
    }
    
    // Bind form submission logic
    const form = document.getElementById('customerDetailsForm');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            customerModalGoTo(2);
        });
    }
});

// ---- BOOKING MODAL LOGIC ----
window.handleSlotClick = function(el, timeStr) {
    document.querySelectorAll('.slot-item').forEach(s => s.classList.remove('active-slot'));
    el.classList.add('active-slot');
};

let pendingBooking = {
    court: '', date: '', time: '', price: 5000
};

window.initBookingFlow = function(time) {
    const promoEl = document.getElementById('promoCode');
    if (promoEl) promoEl.value = '';
    pendingBooking.court = activeCourt;
    pendingBooking.date = activeDate;
    pendingBooking.time = time;
    
    let [h, m] = time.split(':');
    let hr = parseInt(h);

    if (hr >= 6 && hr < 18) {
        pendingBooking.price = 5000;
        document.getElementById('summaryPriceNote').innerText = 'Standard daylight rate applies';
    } else {
        pendingBooking.price = 5500;
        document.getElementById('summaryPriceNote').innerText = 'Night floodlight rate applies';
    }
    
    document.getElementById('summaryCourt').innerText = pendingBooking.court;
    document.getElementById('summaryDate').innerText = pendingBooking.date;
    document.getElementById('summaryTime').innerText = formatTimeLabel(time);
    document.getElementById('summaryPrice').innerText = 'Rs. ' + pendingBooking.price.toLocaleString();
    
    document.getElementById('customerBookingModal').classList.add('active');
    customerModalGoTo(1);
};

window.closeCustomerModal = function() {
    document.getElementById('customerBookingModal').classList.remove('active');
};

window.customerModalGoTo = function(stepNum) {
    document.querySelectorAll('.customer-modal-step').forEach(s => s.classList.remove('active'));
    document.getElementById('modalStep' + stepNum).classList.add('active');
};

window.applyPromo = function() {
    const code = document.getElementById('promoCode').value.toUpperCase().trim();
    if (code === 'PROMO20') {
        const discount = pendingBooking.price * 0.20;
        pendingBooking.price -= discount;
        document.getElementById('summaryPrice').innerText = 'Rs. ' + pendingBooking.price.toLocaleString();
        document.getElementById('summaryPriceNote').innerText = '20% Discount applied!';
        alert('Promo code applied successfully!');
    } else {
        alert('Invalid or expired promo code.');
    }
};

window.confirmCustomerBooking = async function() {
    const btn = document.getElementById('confirmBookBtn');
    btn.innerText = 'Processing...';
    btn.style.opacity = '0.7';
    btn.disabled = true;
    
    const name = document.getElementById('custName').value;
    const phone = document.getElementById('custPhone').value;
    const email = document.getElementById('custEmail').value;
    
    if(!name || !phone || !email) {
        alert("Please fill all required details");
        btn.innerText = 'Confirm Booking'; btn.style.opacity = '1'; btn.disabled = false;
        return customerModalGoTo(1);
    }
    
    // Sync to dashboard customers + Restricted Check
    let c = null;
    const custs = await sbFetch(`customers`, { params: `contact=eq.${phone}` });
    if (!custs || custs.length === 0) {
        const cRes = await sbFetch('customers', { method: 'POST', body: {
            name: name, contact: phone, bookings: 1, spend: pendingBooking.price, noshows: 0, tags: ['New']
        }});
        if (Array.isArray(cRes)) c = cRes[0];
    } else {
        c = custs[0];
        if (c.tags && c.tags.includes('Restricted')) {
            alert("Your account has been restricted from booking. Please contact support.");
            btn.innerText = 'Confirm Booking'; btn.style.opacity = '1'; btn.disabled = false;
            closeCustomerModal();
            return;
        }
        await sbFetch(`customers?id=eq.${c.id}`, { method: 'PATCH', body: {
            bookings: (c.bookings || 0) + 1, spend: (c.spend || 0) + pendingBooking.price
        }});
    }

    // Mock Payment Fail Check (10% chance)
    if (Math.random() < 0.10) {
        alert("Payment gateway declined. Transaction failed, slot released.");
        btn.innerText = 'Confirm Booking'; btn.style.opacity = '1'; btn.disabled = false;
        closeCustomerModal();
        return;
    }
    
    const ref = 'BK-' + Math.floor(Math.random() * 900000 + 100000);
    
    // Final booking write - race conditions inherently checked via DB unique index!
    const postRes = await sbFetch('bookings', { method: 'POST', body: {
        booking_id: ref,
        buyer_name: name,
        buyer_email: email,
        phone: phone,
        court_name: pendingBooking.court,
        booking_date: pendingBooking.date,
        time_slot: pendingBooking.time,
        price: pendingBooking.price,
        status: 'confirmed',
        payment: 'Pay at venue',
        duration: '90 min'
    }});
    
    // Check if the POST actually succeeded
    if (!postRes) {
        alert("Sorry, this slot was just taken by someone else! Please choose another.");
        btn.innerText = 'Confirm Booking';
        btn.style.opacity = '1';
        btn.disabled = false;
        closeCustomerModal();
        fetchSlots();
        return;
    }
    
    document.getElementById('successRef').innerText = '#' + ref;
    customerModalGoTo(3);
    
    btn.innerText = 'Confirm Booking';
    btn.style.opacity = '1';
    btn.disabled = false;
};

window.completeBookingFlow = function() {
    closeCustomerModal();
    fetchSlots(); // Refresh live slots
    
    // Clear form
    document.getElementById('custName').value = '';
    document.getElementById('custPhone').value = '';
    document.getElementById('custEmail').value = '';
};
