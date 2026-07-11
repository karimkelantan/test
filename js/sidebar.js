// === SHARED SIDEBAR CONTROLLER ===
(function() {
    'use strict';

    var sidebar = document.getElementById('sidebar');
    var overlay = document.getElementById('sidebarOverlay');
    if (!sidebar || !overlay) return;

    function isMobile() { return window.innerWidth < 1024; }

    function openSidebar() {
        sidebar.classList.remove('-translate-x-full');
        overlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    function closeSidebar() {
        sidebar.classList.add('-translate-x-full');
        overlay.classList.add('hidden');
        document.body.style.overflow = '';
    }

    // Mobile default: sidebar hidden
    if (isMobile()) {
        sidebar.classList.add('-translate-x-full');
    }

    // Toggle buttons (hamburger, close X)
    document.querySelectorAll('[data-sidebar-toggle]').forEach(function(el) {
        el.addEventListener('click', function(e) {
            e.stopPropagation();
            if (sidebar.classList.contains('-translate-x-full')) {
                openSidebar();
            } else {
                closeSidebar();
            }
        });
    });

    // Overlay click closes sidebar
    overlay.addEventListener('click', closeSidebar);

    // ESC key closes sidebar
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && !sidebar.classList.contains('-translate-x-full')) {
            closeSidebar();
        }
    });

    // Nav link click closes sidebar on mobile
    sidebar.querySelectorAll('nav a').forEach(function(link) {
        link.addEventListener('click', function() {
            if (isMobile()) closeSidebar();
        });
    });

    // Resize: reset to desktop layout at lg+
    window.addEventListener('resize', function() {
        if (!isMobile()) {
            sidebar.classList.remove('-translate-x-full');
            overlay.classList.add('hidden');
            document.body.style.overflow = '';
        } else {
            sidebar.classList.add('-translate-x-full');
        }
    });

})();
