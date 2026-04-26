/**
 * SentinelEngine: A high-performance content delivery system
 * Built for Veer Sentinel with an emphasis on fluid motion and modularity.
 */
class SentinelEngine {
    #state = { busy: false, cache: new Map() };

    // COMPONENT REGISTRY: Decouples JSON structure from DOM logic
    #components = {
        tile: (val, index) => {
            const div = document.createElement('div');
            div.className = 'grid-tile';
            div.style.animationDelay = `${index * 0.1}s`;
            div.innerHTML = `
                <div class="tile-content">
                    <h3>${val.title}</h3>
                    <p>${val.desc}</p>
                </div>
            `;
            div.onclick = () => { window.location.hash = val.link; };
            return div;
        },

        button: (val, index) => {
            const btn = document.createElement('button');
            btn.className = 'ui-btn-action';
            btn.style.animationDelay = `${index * 0.1}s`;
            btn.textContent = val.text;
            btn.setAttribute('data-load', val.link);
            return btn;
        },

        // DEFAULT RENDERER: Handles standard HTML tags (h1, p, li, etc.)
        default: (tag, val, index) => {
            const el = document.createElement(tag);
            el.style.animationDelay = `${index * 0.1}s`;

            // Property Mapping Strategy
            const propMap = {
                text: (e, v) => e.textContent = v,
                link: (e, v) => e.setAttribute('data-load', v)
            };

            Object.entries(val).forEach(([key, value]) => {
                if (propMap[key]) propMap[key](el, value);
                else el.setAttribute(key, value);
            });

            return el;
        }
    };

    constructor() {
        this.ui = {
            mount: document.getElementById('content-mount'),
            view: document.getElementById('view-layer'),
            sync: document.querySelector('.sync-bar') || this.#createSyncBar(),
            loader: document.getElementById('global-sync'),
            drawer: document.getElementById('nav-drawer'),
            body: document.body,
            themeBtn: document.getElementById('theme-switch'),
            shield: document.getElementById('blur-shield')
        };

        this.#init();
        this.#initTheme();
    }

    #init() {
        // Observer for hash changes
        window.addEventListener('hashchange', () => this.boot());

        // CENTRALIZED EVENT DELEGATION: Replaces messy click listeners
        document.addEventListener('click', (e) => this.#handleGlobalActions(e));

        // Initial Boot
        const initialPath = window.location.hash.slice(1) || 'data/home/index.json';
        this.boot(initialPath);
    }

    #handleGlobalActions(e) {
        const target = e.target;

        // Define Action Map
        const actions = [
            {
                selector: '[data-load]', fn: (el) => {
                    window.location.hash = el.getAttribute('data-load');
                    this.toggleNav(false);
                }
            },
            { selector: '#menu-open', fn: () => this.toggleNav(true) },
            { selector: '#menu-close', fn: () => this.toggleNav(false) },
            { selector: '#theme-switch', fn: () => this.toggleTheme() },
            { selector: '#blur-shield', fn: () => this.toggleNav(false) }
        ];

        for (const action of actions) {
            const el = target.closest(action.selector);
            if (el) {
                e.preventDefault();
                action.fn(el);
                break;
            }
        }
    }

    #initTheme() {
        const isDark = localStorage.getItem('sentinel-theme') === 'dark';
        this.ui.body.classList.toggle('dark-mode', isDark);
        this.#updateThemeUI(isDark);
    }

    toggleTheme() {
        const isDark = this.ui.body.classList.toggle('dark-mode');
        localStorage.setItem('sentinel-theme', isDark ? 'dark' : 'light');
        this.#updateThemeUI(isDark);
    }

    #updateThemeUI(isDark) {
        if (this.ui.themeBtn) {
            this.ui.themeBtn.textContent = isDark ? 'Light Mode' : 'Dark Mode';
        }
    }

    /**
     * Bootstraps the content loading process
     * @param {string|null} forcedPath - Optional override for the path
     */
    async boot(forcedPath = null) {
        if (this.#state.busy) return;

        const path = forcedPath || window.location.hash.slice(1);
        if (!path) return;

        this.#state.busy = true;
        this.#updateSync(30);

        // Visual exit animation
        if (this.ui.view) {
            this.ui.view.style.opacity = '0';
            this.ui.view.style.transform = 'translateY(10px)';
        }

        try {
            let data = this.#state.cache.get(path);

            if (!data) {
                const res = await fetch(path);
                if (!res.ok) throw new Error("Sentinel Network Error: Content Unreachable");
                data = await res.json();
                this.#state.cache.set(path, data);
            }

            this.#updateSync(70);

            // Intentional delay for "Premium" motion perception
            setTimeout(() => {
                this.#render(data.nodes);
                this.#updateSync(100);

                setTimeout(() => {
                    if (this.ui.view) {
                        this.ui.view.style.opacity = '1';
                        this.ui.view.style.transform = 'translateY(0)';
                    }
                    this.#updateSync(0);
                    this.#state.busy = false;
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }, 400);
            }, 250);

        } catch (error) {
            console.error("Critical Engine Failure:", error);
            this.#state.busy = false;
            this.#updateSync(0);
        }
    }

    /**
     * Renders nodes using the Component Registry
     * Uses DocumentFragment to minimize browser reflows
     */
    #render(nodes) {
        const fragment = document.createDocumentFragment();
        let gridGroup = null;

        nodes.forEach((node, index) => {
            const [tag, props] = Object.entries(node)[0];

            // Auto-grouping logic for 'tile' elements into grid sections
            if (tag === 'tile') {
                if (!gridGroup) {
                    gridGroup = document.createElement('section');
                    fragment.appendChild(gridGroup);
                }
                gridGroup.appendChild(this.#components.tile(props, index));
            } else {
                gridGroup = null; // Close current grid group if a non-tile appears
                const renderFunc = this.#components[tag] || ((p, i) => this.#components.default(tag, p, i));
                fragment.appendChild(renderFunc(props, index));
            }
        });

        this.ui.mount.replaceChildren(fragment); // High-performance DOM insertion
    }

    toggleNav(state) {
        this.ui.drawer?.classList.toggle('active', state);
        this.ui.shield?.classList.toggle('active', state);
        this.ui.body.classList.toggle('lock-scroll', state);
    }

    #updateSync(pct) {
        if (!this.ui.sync) return;
        this.ui.sync.style.width = `${pct}%`;
        this.ui.sync.style.opacity = (pct > 0 && pct < 100) ? '1' : '0';
    }

    #createSyncBar() {
        const bar = document.createElement('div');
        bar.className = 'sync-bar';
        document.body.appendChild(bar);
        return bar;
    }
}

// Initializing the Sentinel Core
document.addEventListener('DOMContentLoaded', () => {
    window.Sentinel = new SentinelEngine();
});