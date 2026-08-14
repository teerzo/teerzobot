function manageNavHtml() {
    return (
        `<nav class="nav">` +
            `<a class="brand" href="/">teerzobot</a>` +
            `<a href="/manage/overlays">Overlays</a>` +
            `<a href="/manage/dance">Dance</a>` +
            `<a href="/manage/account">Account</a>` +
            `<a href="/manage/followers">Followers</a>` +
            `<span id="status" class="status"><span class="dot"></span>checking…</span>` +
        `</nav>`
    );
}

function markActiveNav() {
    const path = location.pathname.replace(/\/$/, '') || '/';
    document.querySelectorAll('.nav a').forEach((link) => {
        const href = link.getAttribute('href');
        const home = href === '/' && (path === '/' || path === '/manage');
        if (home || href === path) {
            link.classList.add('active');
        }
    });
}

function fillStatus(el) {
    if (!el) {
        return;
    }
    fetch('/api/status')
        .then((res) => res.json())
        .then((status) => {
            const channel = status.channel ? `#${status.channel}` : 'no channel';
            if (status.connected) {
                el.className = 'status ok';
                el.innerHTML = `<span class="dot"></span>connected · ${channel}`;
            } else {
                el.className = 'status bad';
                el.innerHTML = `<span class="dot"></span>offline · ${channel}`;
            }
        })
        .catch(() => {
            el.className = 'status bad';
            el.innerHTML = '<span class="dot"></span>status unavailable';
        });
}

function bootManageChrome() {
    const mount = document.getElementById('chrome');
    if (mount) {
        mount.outerHTML = manageNavHtml();
    }
    markActiveNav();
    fillStatus(document.getElementById('status'));
}
