(function() {
    'use strict';

    // ─── State (matches booking.html reference) ────────────────
    var calState = 'idle';
    var calYear = 0, calMonth = 0;
    var calPickupDate = '', calPickupTime = '';
    var calReturnDate = '', calReturnTime = '';
    var calExcludeRef = null;
    var calDayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    var calMonthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

    // ─── Config (set per trigger click) ────────────────────────
    var currentConfig = null;

    // ─── DOM cache ──────────────────────────────────────────────
    var $ = {};
    var initialized = false;

    function pad2(n) { return n < 10 ? '0' + n : '' + n; }

    // ─── Booking check (matches booking.html exactly) ──────────
    function isDayBooked(vehicle, dateStr, excludeRef) {
        if (!vehicle) return true;
        var dayStart = new Date(dateStr + 'T00:00:00').getTime();
        var dayEnd = new Date(dateStr + 'T23:59:59').getTime();
        var all = JSON.parse(localStorage.getItem('anbelBookings') || '[]');
        for (var i = 0; i < all.length; i++) {
            var b = all[i];
            if (b.vehicle !== vehicle) continue;
            if (b.status === 'canceled') continue;
            if (excludeRef && b.ref === excludeRef) continue;
            var bs = new Date(b.start + 'T' + (b.startTime || '00:00')).getTime();
            var be = new Date(b.end + 'T' + (b.endTime || '23:59')).getTime();
            if (bs <= dayEnd && be >= dayStart) return true;
        }
        return false;
    }

    // ─── Vehicle getter (delegates to config) ──────────────────
    function getCalVehicle() {
        return currentConfig && currentConfig.getVehicle ? currentConfig.getVehicle() : '';
    }

    // ─── Day status (matches booking.html exactly) ─────────────
    function getDayStatus(vehicle, dateStr, excludeRef) {
        var d = new Date(dateStr + 'T00:00:00');
        var today = new Date(); today.setHours(0,0,0,0);
        if (d < today) return 'gray';
        if (!vehicle) return 'gray';
        var rangeComplete = calPickupDate && calPickupTime && calReturnDate && calReturnTime;
        if (rangeComplete) {
            if (dateStr < calPickupDate || dateStr > calReturnDate) return 'gray';
            return 'green';
        }
        if (calState === 'selecting_return' && calPickupDate && dateStr <= calPickupDate) return 'gray';
        if (isDayBooked(vehicle, dateStr, excludeRef)) return 'red';
        var next = new Date(d); next.setDate(next.getDate() + 1);
        var nextStr = next.getFullYear() + '-' + pad2(next.getMonth()+1) + '-' + pad2(next.getDate());
        if (isDayBooked(vehicle, nextStr, excludeRef)) return 'red';
        return 'green';
    }

    // ─── Format time (matches booking.html exactly) ────────────
    function formatTimeLabel(val) {
        var h = parseInt(val.split(':')[0]);
        var m = val.split(':')[1];
        var hr12 = h > 12 ? h - 12 : (h === 0 ? 12 : h);
        return hr12 + ':' + m + ' ' + (h >= 12 ? 'PM' : 'AM');
    }

    // ─── Build time slots (matches booking.html exactly) ───────
    function buildTimeSlots(minTime) {
        var minIdx = 0;
        if (minTime) {
            var p = minTime.split(':');
            minIdx = parseInt(p[0]) * 2 + (parseInt(p[1]) >= 30 ? 1 : 0);
        }
        var slots = [];
        for (var s = minIdx; s < 48; s++) {
            var h = Math.floor(s / 2);
            var m = (s % 2) * 30;
            slots.push(pad2(h) + ':' + pad2(m));
        }
        return slots;
    }

    // ─── HTML injection (matches booking.html structure) ───────
    function injectHTML() {
        if (document.getElementById('calBackdrop')) return;
        var div = document.createElement('div');
        div.innerHTML =
            '<div id="calBackdrop" class="fixed inset-0 bg-black/40 z-50 hidden flex items-center justify-center p-4" onclick="window._calCancel()">' +
            '<div id="calendarWidget" class="bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 w-full max-w-sm max-h-[85vh] flex flex-col" onclick="event.stopPropagation()">' +
            '<div class="flex-shrink-0">' +
            '<div class="flex items-center justify-between mb-3">' +
            '<h3 class="text-sm font-bold text-gray-800"><i class="fas fa-calendar-alt mr-1 text-primary"></i>Select Rental Period</h3>' +
            '<button type="button" onclick="window._calCancel()" class="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"><i class="fas fa-times text-sm"></i></button>' +
            '</div>' +
            '<div id="calPickupBanner" class="hidden bg-green-50 border border-green-200 rounded-xl px-3 py-2 mb-3 text-sm flex items-center gap-2">' +
            '<i class="fas fa-check-circle text-green-500"></i>' +
            '<span class="text-green-700 font-semibold">Pickup:</span>' +
            '<span id="calPickupLabel" class="text-green-800"></span>' +
            '</div>' +
            '<div id="calPrompt" class="text-xs font-semibold text-gray-500 mb-2"><i class="fas fa-calendar-day mr-1"></i> Select Pickup Date</div>' +
            '<div class="flex items-center justify-between mb-3">' +
            '<button type="button" onclick="window._calPrev()" class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600 transition"><i class="fas fa-chevron-left text-sm"></i></button>' +
            '<span id="calTitle" class="font-bold text-gray-800 text-sm"></span>' +
            '<button type="button" onclick="window._calNext()" class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600 transition"><i class="fas fa-chevron-right text-sm"></i></button>' +
            '</div></div>' +
            '<div class="overflow-y-auto flex-1 min-h-0">' +
            '<div class="grid grid-cols-7 gap-0.5 mb-1" id="calWeekdays"></div>' +
            '<div class="grid grid-cols-7 gap-0.5" id="calDays"></div>' +
            '<div id="calTimeSection" class="hidden mt-3 pt-3 border-t border-gray-100">' +
            '<div id="calTimeLabel" class="text-xs font-semibold text-gray-500 mb-2"></div>' +
            '<div id="calTimeSlots" class="grid grid-cols-4 gap-1.5 max-h-32 overflow-y-auto"></div>' +
            '</div></div>' +
            '<div class="flex-shrink-0 mt-3 pt-3 border-t border-gray-100">' +
            '<div id="calFooterInfo" class="hidden text-sm space-y-1 mb-3 bg-gray-50 rounded-xl px-3 py-2">' +
            '<div class="flex justify-between items-center">' +
            '<span class="text-gray-500 text-xs"><i class="fas fa-calendar-check mr-1 text-green-600"></i>Pickup</span>' +
            '<span class="font-semibold text-gray-800 text-sm" id="calFooterPickup">-</span>' +
            '</div>' +
            '<div class="flex justify-between items-center">' +
            '<span class="text-gray-500 text-xs"><i class="fas fa-flag-checkered mr-1 text-red-500"></i>Return</span>' +
            '<span class="font-semibold text-gray-800 text-sm" id="calFooterReturn">-</span>' +
            '</div></div>' +
            '<div class="flex gap-2">' +
            '<button id="calCancelBtn" type="button" onclick="window._calCancel()" class="flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition">Cancel</button>' +
            '<button id="calConfirmBtn" type="button" onclick="window._calConfirm()" disabled class="flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl bg-primary text-white opacity-50 cursor-not-allowed transition">Confirm</button>' +
            '</div></div></div></div>';
        document.body.appendChild(div.firstElementChild);
        $ = {
            backdrop: document.getElementById('calBackdrop'),
            widget: document.getElementById('calendarWidget'),
            pickupBanner: document.getElementById('calPickupBanner'),
            pickupLabel: document.getElementById('calPickupLabel'),
            prompt: document.getElementById('calPrompt'),
            title: document.getElementById('calTitle'),
            weekdays: document.getElementById('calWeekdays'),
            days: document.getElementById('calDays'),
            timeSection: document.getElementById('calTimeSection'),
            timeLabel: document.getElementById('calTimeLabel'),
            timeSlots: document.getElementById('calTimeSlots'),
            footerInfo: document.getElementById('calFooterInfo'),
            footerPickup: document.getElementById('calFooterPickup'),
            footerReturn: document.getElementById('calFooterReturn'),
            confirmBtn: document.getElementById('calConfirmBtn'),
            cancelBtn: document.getElementById('calCancelBtn')
        };
    }

    // ─── Open (matches booking.html exactly) ───────────────────
    function openDatePicker() {
        calExcludeRef = currentConfig && currentConfig.getExcludeRef ? currentConfig.getExcludeRef() : null;
        calState = 'idle';
        calPickupDate = ''; calPickupTime = ''; calReturnDate = ''; calReturnTime = '';
        var now = new Date();
        calYear = now.getFullYear();
        calMonth = now.getMonth();
        renderCalMonth();
        updateCalPrompt();
        $.backdrop.classList.remove('hidden');
        $.timeSection.classList.add('hidden');
        $.pickupBanner.classList.add('hidden');
        $.footerInfo.classList.add('hidden');
        $.confirmBtn.disabled = true;
        $.confirmBtn.classList.add('opacity-50', 'cursor-not-allowed');
        document.body.style.overflow = 'hidden';
    }

    // ─── Hide (matches booking.html exactly) ───────────────────
    function hideCalendar() {
        $.backdrop.classList.add('hidden');
        $.timeSection.classList.add('hidden');
        document.body.style.overflow = '';
    }

    // ─── Update prompt (matches booking.html exactly) ──────────
    function updateCalPrompt() {
        var rangeComplete = calPickupDate && calPickupTime && calReturnDate && calReturnTime;
        if (rangeComplete) {
            $.pickupBanner.classList.remove('hidden');
            $.pickupLabel.innerHTML = '<span class="font-bold">' + calPickupDate + '</span> <i class="fas fa-arrow-right mx-1"></i> <span class="font-bold">' + calReturnDate + '</span> at ' + formatTimeLabel(calPickupTime);
            $.prompt.innerHTML = '<i class="fas fa-check-circle mr-1 text-green-500"></i> Rental period ready — tap Confirm to save';
        } else if (calState === 'idle') {
            $.pickupBanner.classList.add('hidden');
            $.prompt.innerHTML = '<i class="fas fa-calendar-day mr-1"></i> Select Pickup Date';
        } else if (calState === 'selecting_return') {
            $.pickupBanner.classList.remove('hidden');
            $.pickupLabel.textContent = calPickupDate + ' at ' + formatTimeLabel(calPickupTime);
            $.prompt.innerHTML = '<i class="fas fa-flag-checkered mr-1 text-red-500"></i> Select Return Date';
        }
    }

    // ─── Render month (matches booking.html exactly) ───────────
    function renderCalMonth() {
        $.title.textContent = calMonthNames[calMonth] + ' ' + calYear;
        var wdHtml = '';
        calDayNames.forEach(function(d) { wdHtml += '<div class="text-center text-xs font-semibold text-gray-400 py-1">' + d + '</div>'; });
        $.weekdays.innerHTML = wdHtml;
        var vehicle = getCalVehicle();
        var firstDay = new Date(calYear, calMonth, 1).getDay();
        var daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
        var rangeComplete = calPickupDate && calPickupTime && calReturnDate && calReturnTime;
        var html = '';
        for (var i = 0; i < firstDay; i++) html += '<div></div>';
        for (var d = 1; d <= daysInMonth; d++) {
            var dateStr = calYear + '-' + pad2(calMonth + 1) + '-' + pad2(d);
            var status = getDayStatus(vehicle, dateStr, calExcludeRef);
            var isPickup = (dateStr === calPickupDate);
            var isReturn = (dateStr === calReturnDate && calReturnDate !== calPickupDate);
            var label = d;
            if (isPickup) label += '<span class="block text-[9px] leading-tight mt-0.5 font-bold">PICKUP</span>';
            else if (isReturn) label += '<span class="block text-[9px] leading-tight mt-0.5 font-bold">RETURN</span>';
            var colors = {
                gray: 'bg-gray-100 text-gray-400 cursor-not-allowed',
                green: isPickup ? 'bg-green-600 text-white font-bold ring-2 ring-green-300' : (isReturn ? 'bg-green-500 text-white font-bold ring-2 ring-green-200' : (rangeComplete ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-green-100 text-green-700 hover:bg-green-200 cursor-pointer border border-green-200')),
                red: 'bg-red-100 text-red-400 cursor-not-allowed border border-red-200'
            };
            var click = (status === 'green' && !rangeComplete) ? ' onclick="window._calSelectDate(\'' + dateStr + '\')"' : '';
            html += '<div class="text-center text-sm py-2 min-h-[38px] flex flex-col items-center justify-center rounded-lg ' + (colors[status] || '') + ' transition font-medium"' + click + '>' + label + '</div>';
        }
        $.days.innerHTML = html;
    }

    // ─── Navigation ────────────────────────────────────────────
    function calPrev() { calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; } renderCalMonth(); }
    function calNext() { calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; } renderCalMonth(); }

    // ─── Date selection (matches booking.html exactly) ─────────
    function calSelectDate(dateStr) {
        if (calState === 'idle') {
            calPickupDate = dateStr;
            calState = 'selecting_time_pickup';
            renderCalMonth();
            renderTimeSlots('pickup');
            updateCalFooter();
        } else if (calState === 'selecting_return') {
            if (dateStr <= calPickupDate) return;
            calReturnDate = dateStr;
            if (dateStr === calPickupDate) {
                calState = 'selecting_time_return';
                renderCalMonth();
                renderTimeSlots('return');
            } else {
                calReturnTime = calPickupTime;
                renderCalMonth();
                updateCalPrompt();
                updateCalFooter();
            }
        }
    }

    // ─── Time slots (matches booking.html exactly) ─────────────
    function renderTimeSlots(type) {
        $.timeSection.classList.remove('hidden');
        if (type === 'pickup') {
            $.timeLabel.innerHTML = '<i class="fas fa-clock mr-1"></i> Select Pickup Time';
            var slots = buildTimeSlots(null);
            var html = '';
            for (var i = 0; i < slots.length; i++) {
                html += '<button type="button" onclick="window._calSelectTime(\'' + slots[i] + '\',\'pickup\')" class="px-2 py-1.5 text-xs rounded-lg bg-white border border-gray-200 hover:border-primary hover:bg-primary/5 text-gray-700 transition font-medium">' + formatTimeLabel(slots[i]) + '</button>';
            }
            $.timeSlots.innerHTML = html;
        } else {
            if (!calPickupTime) return;
            $.timeLabel.innerHTML = '<i class="fas fa-clock mr-1"></i> Select Return Time';
            var slots = buildTimeSlots(calPickupTime);
            var html = '';
            for (var i = 0; i < slots.length; i++) {
                html += '<button type="button" onclick="window._calSelectTime(\'' + slots[i] + '\',\'return\')" class="px-2 py-1.5 text-xs rounded-lg bg-white border border-gray-200 hover:border-primary hover:bg-primary/5 text-gray-700 transition font-medium">' + formatTimeLabel(slots[i]) + '</button>';
            }
            $.timeSlots.innerHTML = html;
        }
    }

    // ─── Time selection (matches booking.html exactly) ─────────
    function calSelectTime(timeValue, type) {
        if (type === 'pickup') {
            calPickupTime = timeValue;
            calState = 'selecting_return';
            $.timeSection.classList.add('hidden');
            updateCalPrompt();
            renderCalMonth();
            updateCalFooter();
        } else {
            calReturnTime = timeValue;
            renderCalMonth();
            updateCalPrompt();
            updateCalFooter();
        }
    }

    // ─── Set form values (configurable via fields) ─────────────
    function calSetValues() {
        if (currentConfig && currentConfig.fields) {
            var f = currentConfig.fields;
            var el = document.getElementById(f.display);
            if (el) el.value = 'Pickup: ' + calPickupDate + ' ' + formatTimeLabel(calPickupTime) + '  →  Return: ' + calReturnDate + ' ' + formatTimeLabel(calReturnTime);
            el = document.getElementById(f.startDate);
            if (el) el.value = calPickupDate;
            el = document.getElementById(f.endDate);
            if (el) el.value = calReturnDate;
            el = document.getElementById(f.startTime);
            if (el) el.value = calPickupTime;
            el = document.getElementById(f.endTime);
            if (el) el.value = calReturnTime;
        }
        if (currentConfig && currentConfig.onConfirm) {
            currentConfig.onConfirm({
                startDate: calPickupDate,
                endDate: calReturnDate,
                startTime: calPickupTime,
                endTime: calReturnTime
            });
        }
    }

    // ─── Update footer (matches booking.html exactly) ──────────
    function updateCalFooter() {
        var hasPickup = calPickupDate && calPickupTime;
        var hasReturn = calReturnDate && calReturnTime;
        if (hasPickup) {
            $.footerPickup.textContent = calPickupDate + ' at ' + formatTimeLabel(calPickupTime);
        }
        if (hasReturn) {
            $.footerReturn.textContent = calReturnDate + ' at ' + formatTimeLabel(calReturnTime);
        }
        if (hasPickup && hasReturn) {
            $.footerInfo.classList.remove('hidden');
            $.confirmBtn.disabled = false;
            $.confirmBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        } else {
            $.footerInfo.classList.add('hidden');
            $.confirmBtn.disabled = true;
            $.confirmBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }
    }

    // ─── Confirm / Cancel / Reset (matches booking.html) ───────
    function calConfirm() {
        if (!calPickupDate || !calPickupTime || !calReturnDate || !calReturnTime) return;
        calSetValues();
        hideCalendar();
    }

    function calCancel() {
        calReset();
        hideCalendar();
    }

    function calReset() {
        calState = 'idle';
        calPickupDate = ''; calPickupTime = ''; calReturnDate = ''; calReturnTime = '';
        $.pickupBanner.classList.add('hidden');
        $.timeSection.classList.add('hidden');
        $.footerInfo.classList.add('hidden');
        $.confirmBtn.disabled = true;
        $.confirmBtn.classList.add('opacity-50', 'cursor-not-allowed');
    }

    // ─── Expose globals for onclick attributes ─────────────────
    window._calCancel = calCancel;
    window._calConfirm = calConfirm;
    window._calPrev = calPrev;
    window._calNext = calNext;
    window._calSelectDate = calSelectDate;
    window._calSelectTime = calSelectTime;

    // ─── Trigger binding ───────────────────────────────────────
    function bindTrigger(cfg) {
        var els = document.querySelectorAll(cfg.selector);
        for (var i = 0; i < els.length; i++) {
            els[i].addEventListener('click', function(e) {
                e.preventDefault();
                currentConfig = cfg;
                openDatePicker();
            });
        }
    }

    // ─── Init ──────────────────────────────────────────────────
    function init(config) {
        if (!initialized) {
            injectHTML();
            initialized = true;
        }
        currentConfig = null;
        var triggers = config && config.triggers ? config.triggers : [];
        for (var t = 0; t < triggers.length; t++) {
            bindTrigger(triggers[t]);
        }
    }

    // ─── Public API ─────────────────────────────────────────────
    window.CalendarPicker = {
        init: init,
        close: function() { calCancel(); }
    };
})();
