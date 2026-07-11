(function() {
    'use strict';

    const CONFIG = {
        roles: {
            admin: {
                label: 'Administrator',
                color: 'text-purple-600',
                bgColor: 'bg-purple-100',
                icon: 'fa-user-shield'
            },
            supervisor: {
                label: 'Supervisor',
                color: 'text-blue-600',
                bgColor: 'bg-blue-100',
                icon: 'fa-user-tie'
            },
            staff: {
                label: 'Staff',
                color: 'text-green-600',
                bgColor: 'bg-green-100',
                icon: 'fa-user'
            }
        },

        sidebar: {
            admin: [
                { section: 'Main', items: [
                    { label: 'Dashboard', icon: 'fa-tachometer-alt', href: 'dashboard.html' },
                    { label: 'Bookings', icon: 'fa-calendar-check', href: 'bookings.html' },
                    { label: 'Vehicles', icon: 'fa-car', href: 'settings.html#fleet' },
                    { label: 'Brands', icon: 'fa-tag', href: 'settings.html#brands' },
                    { label: 'Calendar', icon: 'fa-calendar-alt', href: 'bookings.html' }
                ]},
                { section: 'Reports', items: [
                    { label: 'Reports', icon: 'fa-chart-bar', href: 'reports.html' },
                    { label: 'Activity Log', icon: 'fa-history', href: 'activity-log.html' }
                ]},
                { section: 'Administration', items: [
                    { label: 'Settings', icon: 'fa-cog', href: 'settings.html' },
                    { label: 'User Management', icon: 'fa-users-cog', href: 'settings.html#users' }
                ]}
            ],
            supervisor: [
                { section: 'Main', items: [
                    { label: 'Dashboard', icon: 'fa-tachometer-alt', href: 'supervisor-index.html' },
                    { label: 'Bookings', icon: 'fa-calendar-check', href: 'bookings.html' },
                    { label: 'Vehicles', icon: 'fa-car', href: 'settings.html#fleet' },
                    { label: 'Calendar', icon: 'fa-calendar-alt', href: 'bookings.html' }
                ]},
                { section: 'Reports', items: [
                    { label: 'Reports', icon: 'fa-chart-bar', href: 'reports.html' },
                    { label: 'Activity Log', icon: 'fa-history', href: 'activity-log.html' }
                ]}
            ],
            staff: [
                { section: 'Main', items: [
                    { label: 'Dashboard', icon: 'fa-tachometer-alt', href: 'staff-index.html' },
                    { label: 'Bookings', icon: 'fa-calendar-check', href: 'bookings.html' },
                    { label: 'Calendar', icon: 'fa-calendar-alt', href: 'bookings.html' }
                ]}
            ]
        },

        pages: {
            'dashboard.html': ['admin', 'supervisor', 'staff'],
            'staff-index.html': ['admin', 'supervisor', 'staff'],
            'supervisor-index.html': ['admin', 'supervisor', 'staff'],
            'bookings.html': ['admin', 'supervisor', 'staff'],
            'settings.html': ['admin'],
            'reports.html': ['admin', 'supervisor'],
            'activity-log.html': ['admin', 'supervisor']
        },

        permissions: {
            'booking:create': ['admin', 'supervisor', 'staff'],
            'booking:edit': ['admin', 'supervisor', 'staff'],
            'booking:view': ['admin', 'supervisor', 'staff'],
            'booking:complete': ['admin', 'supervisor', 'staff'],
            'booking:cancel': ['admin', 'supervisor'],
            'booking:delete': ['admin'],
            'vehicle:view': ['admin', 'supervisor'],
            'vehicle:create': ['admin'],
            'vehicle:edit': ['admin', 'supervisor'],
            'vehicle:edit-status': ['admin', 'supervisor'],
            'vehicle:delete': ['admin'],
            'vehicle:pricing': ['admin'],
            'brand:manage': ['admin'],
            'report:view': ['admin', 'supervisor'],
            'report:export': ['admin', 'supervisor'],
            'settings:view': ['admin'],
            'settings:edit': ['admin'],
            'user:manage': ['admin'],
            'activity:view': ['admin', 'supervisor']
        }
    };

    var _currentRole = null;
    var _initialized = false;

    function getCurrentRole() {
        if (_currentRole) return _currentRole;
        var role = localStorage.getItem('staffRole') || 'admin';
        if (!CONFIG.roles[role]) role = 'admin';
        _currentRole = role;
        return _currentRole;
    }

    function getRoleConfig() {
        return CONFIG.roles[getCurrentRole()] || CONFIG.roles.admin;
    }

    function hasPageAccess(page) {
        var allowed = CONFIG.pages[page];
        if (!allowed) return false;
        return allowed.indexOf(getCurrentRole()) !== -1;
    }

    function can(permission) {
        var allowed = CONFIG.permissions[permission];
        if (!allowed) return false;
        return allowed.indexOf(getCurrentRole()) !== -1;
    }

    function getSidebarItems() {
        return CONFIG.sidebar[getCurrentRole()] || CONFIG.sidebar.admin;
    }

    function renderSidebar(containerId) {
        var container = document.getElementById(containerId || 'sidebarNav');
        if (!container) return;

        var items = getSidebarItems();
        var currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
        var idx = currentPage.indexOf('?');
        if (idx !== -1) currentPage = currentPage.substring(0, idx);

        var html = '';
        items.forEach(function(section, si) {
            if (si > 0) {
                html += '<div class="mt-6"></div>';
            }
            html += '<div class="px-4 mb-2">' +
                '<span class="text-xs font-semibold text-gray-500 uppercase tracking-wider sidebar-text">' +
                section.section + '</span></div>';

            section.items.forEach(function(item) {
                var itemPage = item.href.split('/').pop().split('?')[0].split('#')[0];
                var isActive = currentPage === itemPage ||
                    (itemPage === 'dashboard.html' && currentPage === '');
                if (isActive) {
                    html += '<a href="' + item.href + '" class="flex items-center gap-3 px-6 py-3 bg-primary/20 border-l-4 border-accent text-white">' +
                        '<i class="fas ' + item.icon + ' w-5"></i>' +
                        '<span class="sidebar-text font-medium">' + item.label + '</span></a>';
                } else {
                    html += '<a href="' + item.href + '" class="flex items-center gap-3 px-6 py-3 text-gray-400 hover:bg-sidebar-hover hover:text-white transition">' +
                        '<i class="fas ' + item.icon + ' w-5"></i>' +
                        '<span class="sidebar-text">' + item.label + '</span></a>';
                }
            });
        });

        container.innerHTML = html;
    }

    function renderRoleBadge(containerId) {
        var container = document.getElementById(containerId || 'roleBadge');
        if (!container) return;
        var config = getRoleConfig();
        container.innerHTML = '<span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ' +
            config.bgColor + ' ' + config.color + '">' +
            '<i class="fas ' + config.icon + '"></i> ' + config.label + '</span>';
    }

    function enforceUI() {
        document.querySelectorAll('[data-permission]').forEach(function(el) {
            var perm = el.getAttribute('data-permission');
            if (!can(perm)) {
                el.classList.add('hidden');
            }
        });
        document.querySelectorAll('[data-role]').forEach(function(el) {
            var role = el.getAttribute('data-role');
            if (role !== getCurrentRole()) {
                el.classList.add('hidden');
            }
        });
    }

    function checkPageAccess() {
        var page = window.location.pathname.split('/').pop() || 'dashboard.html';
        var idx = page.indexOf('?');
        if (idx !== -1) page = page.substring(0, idx);
        if (!hasPageAccess(page)) {
            window.location.href = 'access-denied.html?from=' + encodeURIComponent(page);
            return false;
        }
        return true;
    }

    function init(options) {
        if (_initialized) return;

        if (options && options.role && CONFIG.roles[options.role]) {
            localStorage.setItem('staffRole', options.role);
        }

        var role = getCurrentRole();
        var roleConfig = getRoleConfig();
        var name = localStorage.getItem('staffName');

        if (!name) {
            name = role === 'admin' ? 'Admin User' :
                  role === 'supervisor' ? 'Supervisor User' : 'Staff User';
            localStorage.setItem('staffName', name);
        }

        document.querySelectorAll('[data-user-name]').forEach(function(el) {
            el.textContent = name;
        });
        document.querySelectorAll('[data-user-role]').forEach(function(el) {
            el.textContent = roleConfig.label;
        });
        document.querySelectorAll('[data-user-initial]').forEach(function(el) {
            el.textContent = name.charAt(0).toUpperCase();
        });

        if (document.getElementById('sidebarNav')) {
            renderSidebar('sidebarNav');
        }
        if (document.getElementById('roleBadge')) {
            renderRoleBadge('roleBadge');
        }

        enforceUI();

        var welcomeEl = document.getElementById('welcomeName');
        if (welcomeEl) {
            welcomeEl.textContent = name.split(' ')[0];
        }

        _initialized = true;
    }

    // ─── Public API ──────────────────────────────────────────
    window.RBAC = {
        init: init,
        getCurrentRole: getCurrentRole,
        getRoleConfig: getRoleConfig,
        hasPageAccess: hasPageAccess,
        can: can,
        getSidebarItems: getSidebarItems,
        renderSidebar: renderSidebar,
        renderRoleBadge: renderRoleBadge,
        enforceUI: enforceUI,
        checkPageAccess: checkPageAccess,
        CONFIG: CONFIG
    };
})();
