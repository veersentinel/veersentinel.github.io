"use strict";

/**
 * THEME ENGINE
 * Purely property-driven. No local storage dependency.
 */
class ThemeEngine {
    // 1. Define all properties in a single configuration object
    #config = {
        btn: null,
        mount: document.body,
        tokens: {
            dark: "dark-mode",
            active: "theme-active"
        },
        labels: {
            toLight: "Light Mode",
            toDark: "Dark Mode"
        }
    };

    constructor(buttonId) {
        // Set the button property directly from the ID passed
        this.#config.btn = document.getElementById(buttonId);
    }

    init() {
        // Safety check: if button isn't found, log it so you know why it's "not working"
        if (!this.#config.btn) {
            console.warn(`ThemeEngine: Button with ID "${this.#config.btn}" not found.`);
        }

        // Logic based on system preference
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        this.#update(prefersDark);

        // Attach listener via property
        this.#config.btn?.addEventListener("click", () => {
            const isDark = this.#config.mount.classList.contains(this.#config.tokens.dark);
            this.#update(!isDark);
        });
    }

    #update(shouldBeDark) {
        const { mount, tokens, labels, btn } = this.#config;

        // Toggle the class property on the mount property
        mount.classList.toggle(tokens.dark, shouldBeDark);

        // Update the button label property
        if (btn) {
            btn.textContent = shouldBeDark ? labels.toLight : labels.toDark;
        }
    }
}

/**
 * NAVIGATION ENGINE
 */
class NavigationEngine {
    #ui = {
        drawer: document.getElementById("nav-drawer"),
        shield: document.getElementById("blur-shield"),
        openBtn: document.getElementById("menu-open"),
        closeBtn: document.getElementById("menu-close"),
        body: document.body
    };

    #config = {
        activeClass: "active",
        lockClass: "drawer-open",
        closeDelay: 120,
        swipeThreshold: 70 // Minimum pixels to travel to count as a swipe
    };

    // Properties for touch tracking
    #touch = {
        startX: 0,
        endX: 0
    };

    init() {
        const { openBtn, closeBtn, shield, drawer } = this.#ui;

        openBtn?.addEventListener("click", () => this.open());
        closeBtn?.addEventListener("click", () => this.close());
        shield?.addEventListener("click", () => this.close());

        // Keyboard support
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") this.close();
        });

        // Swipe support for Android/iOS
        this.#initTouchEvents();

        drawer?.addEventListener("click", (e) => {
            const link = e.target.closest(".nav-link");
            if (!link) return;

            e.preventDefault();
            const path = link.getAttribute("data-load");
            if (path) window.location.hash = path;

            setTimeout(() => this.close(), this.#config.closeDelay);
        });
    }

    /**
     * Set up touch listeners on the drawer property
     */
    #initTouchEvents() {
        const { drawer } = this.#ui;
        if (!drawer) return;

        drawer.addEventListener("touchstart", (e) => {
            this.#touch.startX = e.changedTouches[0].screenX;
        }, { passive: true });

        drawer.addEventListener("touchend", (e) => {
            this.#touch.endX = e.changedTouches[0].screenX;
            this.#handleSwipe();
        }, { passive: true });
    }

    /**
     * Logic to determine if swipe was to the right
     */
    #handleSwipe() {
        const distance = this.#touch.endX - this.#touch.startX;
        const isSwipeRight = distance > this.#config.swipeThreshold;

        // If the drawer is active and user swiped right, close it
        if (this.#ui.drawer.classList.contains(this.#config.activeClass) && isSwipeRight) {
            this.close();
        }
    }

    open() {
        const { drawer, shield, body, openBtn } = this.#ui;
        drawer?.classList.add(this.#config.activeClass);
        shield?.classList.add(this.#config.activeClass);
        body.classList.add(this.#config.lockClass);

        drawer?.setAttribute("aria-hidden", "false");
        openBtn?.setAttribute("aria-expanded", "true");
        drawer?.querySelector("button, a")?.focus();
    }

    close() {
        const { drawer, shield, body, openBtn } = this.#ui;
        drawer?.classList.remove(this.#config.activeClass);
        shield?.classList.remove(this.#config.activeClass);
        body.classList.remove(this.#config.lockClass);

        drawer?.setAttribute("aria-hidden", "true");
        openBtn?.setAttribute("aria-expanded", "false");
        openBtn?.focus();
    }
}

/**
 * COMPONENT FACTORY
 */

/**
 * COMPONENT FACTORY (FULL IMPLEMENTATION)
 * Every element property is derived from the #schema or the passed data object.
 */
class ComponentFactory {
    // Properties are centralized here to avoid hardcoding strings in methods
    static #schema = {
        grid: { tag: "section", class: "tile-grid" },
        tile: { tag: "div", class: "grid-tile" },
        content: { tag: "div", class: "tile-content" },
        button: { tag: "button", class: "ui-btn-action" },
        image: { loading: "lazy", decoding: "async" },
        animation: { staggerMs: 80 }
    };

    /**
     * Entry point for component generation
     */
    static create(type, data, index = 0) {
        const typeMap = {
            h1: () => this.#buildText("h1", data),
            h2: () => this.#buildText("h2", data),
            h3: () => this.#buildText("h3", data),
            p: () => this.#buildText("p", data),
            img: () => this.#buildImage(data),
            tile: () => this.#buildTile(data, index),
            button: () => this.#buildButton(data),
            spacer: () => this.#buildSpacer(data)
        };

        return (typeMap[type] || (() => document.createTextNode("")))();
    }

    /**
     * Internal: Applies all property-based metadata (id, class, style, custom attrs)
     */
    static #applyProps(el, data) {
        if (!data || typeof data !== "object") return;

        // Set Class via property if provided, otherwise preserve defaults
        if (data.class) el.className = data.class;

        // Set ID
        if (data.id) el.id = data.id;

        // Set Inline Styles (HD animations or specific positioning)
        if (data.style) el.style.cssText = data.style;

        // Set Custom Attributes (data-*, aria-*, etc.)
        if (data.attrs && typeof data.attrs === "object") {
            Object.entries(data.attrs).forEach(([key, value]) => {
                el.setAttribute(key, String(value));
            });
        }
    }

    /**
     * FULL METHOD: TEXT ELEMENTS
     */
    static #buildText(tag, data) {
        const el = document.createElement(tag);

        // Content Property
        el.textContent = typeof data === "object" ? (data.text ?? "") : data;

        // Apply Metadata
        this.#applyProps(el, data);

        return el;
    }

    /**
     * FULL METHOD: HIGH-DEFINITION IMAGES
     */
    static #buildImage(data) {
        const img = document.createElement("img");
        const props = this.#schema.image;

        // Setup Source & Alt Properties
        if (typeof data === "object") {
            img.src = data.src || "";
            img.alt = data.alt || "Image content";
            this.#applyProps(img, data);
        } else {
            img.src = data;
            img.alt = "";
        }

        // Performance Properties
        img.loading = props.loading;
        img.decoding = props.decoding;

        // Error Handling Property
        img.onerror = () => {
            console.error(`Failed to load image: ${img.src}`);
            img.style.display = "none";
        };

        return img;
    }

    /**
     * FULL METHOD: INTERACTIVE TILES (GRID ITEMS)
     */
    static #buildTile(data, index) {
        const config = this.#schema;

        // 1. Create Wrapper
        const wrapper = document.createElement(config.tile.tag);
        wrapper.className = config.tile.class;

        // 2. Set Staggered Animation Property
        const delay = index * config.animation.staggerMs;
        wrapper.style.animationDelay = `${delay}ms`;

        // 3. Create Content Container
        const content = document.createElement(config.content.tag);
        content.className = config.content.class;

        // 4. Populate Content Properties
        const title = document.createElement("h3");
        title.textContent = data.title || "";

        const desc = document.createElement("p");
        desc.textContent = data.desc || "";

        content.append(title, desc);
        wrapper.appendChild(content);

        // 5. Interaction Properties
        if (data.link) {
            wrapper.setAttribute("role", "link");
            wrapper.setAttribute("tabindex", "0");
            wrapper.style.cursor = "pointer";

            const navigate = () => { window.location.hash = data.link; };
            wrapper.onclick = navigate;
            wrapper.onkeydown = (e) => { if (e.key === "Enter") navigate(); };
        }

        // 6. Final Property Application
        this.#applyProps(wrapper, data);

        return wrapper;
    }

    /**
     * FULL METHOD: ACTION BUTTONS (HD SMOOTH)
     */
    static #buildButton(data) {
        const config = this.#schema.button;
        const btn = document.createElement(config.tag);

        // Class Property
        btn.className = config.class;
        btn.type = "button";

        if (typeof data === "object") {
            // Text Property
            btn.textContent = data.text || "Click Here";

            // Click Interaction Property
            if (data.link) {
                btn.onclick = () => {
                    window.location.hash = data.link;
                };
            }

            // Accessibility Properties
            if (data.label) btn.setAttribute("aria-label", data.label);

            // Metadata Application
            this.#applyProps(btn, data);
        }

        return btn;
    }

    /**
     * FULL METHOD: LAYOUT SPACERS
     */
    static #buildSpacer(data) {
        const spacer = document.createElement("div");
        spacer.className = "ui-spacer";

        if (typeof data === "object" && data.size) {
            spacer.style.height = typeof data.size === "number" ? `${data.size}px` : data.size;
        } else if (typeof data === "string" || typeof data === "number") {
            spacer.style.height = typeof data === "number" ? `${data}px` : data;
        }

        this.#applyProps(spacer, data);
        return spacer;
    }
}
"use strict";

/**
 * APP CORE - PROFESSIONAL MULTI-LANGUAGE EDITION
 * Features: Path Resolution, Language Injection, and State Persistence.
 */
class AppCore {
    // 1. Shell Configuration: Core UI references and defaults
    #shell = {
        mount: document.getElementById("content-mount"),
        baseDir: "data",
        defaultPage: "home/index.json",
        loadingOpacity: "0.6",
        transitionSpeed: 400 // matches CSS transitions
    };

    // 2. Locale State: Management of languages
    #locale = {
        current: "en",
        supported: ["en", "hn", "french"],
        fallback: "en",
        // Map browser codes to your folder names
        map: { "hi": "hn", "fr": "french", "en": "en" }
    };

    // 3. Runtime State: Caching and Fetch control
    #runtime = {
        cache: new Map(),
        controller: null,
        isBooting: false
    };

    constructor() {
        // Initialize sub-engines from script.js[cite: 1]
        this.theme = new ThemeEngine("theme-switch");
        this.nav = new NavigationEngine();
    }

    /**
     * Entry point: Prepares locale, initializes engines, and boots the UI.
     */
    init() {
        this.#detectLanguage();
        this.theme.init();
        this.nav.init();

        // Listen for SPA route changes
        window.addEventListener("hashchange", () => this.boot());
        
        // Initial Page Load
        this.boot();
    }

    /**
     * Language Logic: Detects browser preference or saved choice
     */
    #detectLanguage() {
        const saved = localStorage.getItem("user-lang");
        if (saved && this.#locale.supported.includes(saved)) {
            this.#locale.current = saved;
            return;
        }

        const browserPref = navigator.language.split('-')[0];
        const mapped = this.#locale.map[browserPref];
        
        this.#locale.current = this.#locale.supported.includes(mapped) 
            ? mapped 
            : this.#locale.fallback;
    }

    /**
     * Public Method: Change language dynamically
     * Can be called by UI buttons via: app.setLanguage('hn')
     */
    setLanguage(langCode) {
        if (!this.#locale.supported.includes(langCode)) return;
        if (this.#locale.current === langCode) return;

        this.#locale.current = langCode;
        localStorage.setItem("user-lang", langCode);
        
        // Clear cache as the translations will be different
        this.#runtime.cache.clear();
        
        // Reboot the UI to fetch new language data
        this.boot();
        
        // Optional: Notify UI components (like the Nav Button label)
        console.log(`Locale changed to: ${langCode}`);
    }

    /**
     * Path Resolution Engine
     * Converts a hash like #home/aditya/index.json 
     * into data/hn/home/aditya/index.json
     */
    #resolvePath() {
        const hash = window.location.hash.slice(1);
        const lang = this.#locale.current;
        const base = this.#shell.baseDir;

        // Clean the hash: remove leading/trailing slashes
        const cleanHash = hash.replace(/^\/+|\/+$/g, '');

        if (!cleanHash || cleanHash === "") {
            return `${base}/${lang}/${this.#shell.defaultPage}`;
        }

        // Validate structure (must end in .json for security)
        if (!cleanHash.endsWith(".json")) {
            return `${base}/${lang}/${cleanHash}/index.json`;
        }

        return `${base}/${lang}/${cleanHash}`;
    }

    /**
     * Boot Engine: Handles the fetching and rendering lifecycle
     */
    async boot() {
        if (this.#runtime.isBooting) return;
        
        const path = this.#resolvePath();
        const container = this.#shell.mount;

        if (!container) return;

        // Start Visual Feedback
        this.#runtime.isBooting = true;
        container.setAttribute("aria-busy", "true");
        container.style.transition = `opacity ${this.#shell.transitionSpeed}ms ease`;
        container.style.opacity = this.#shell.loadingOpacity;

        // Cancel pending requests
        this.#runtime.controller?.abort();
        this.#runtime.controller = new AbortController();

        try {
            const data = await this.#fetch(path, this.#runtime.controller.signal);
            
            // Artificial delay for HD "smooth" transition feel
            setTimeout(() => {
                if (data?.nodes) this.#render(data.nodes);
                this.#finalizeBoot(container);
            }, 100);

        } catch (err) {
            if (err.name !== "AbortError") {
                this.#handleError(path);
                this.#finalizeBoot(container);
            }
        }
    }

    #finalizeBoot(container) {
        container.removeAttribute("aria-busy");
        container.style.opacity = "1";
        this.#runtime.isBooting = false;
    }

    async #fetch(path, signal) {
        if (this.#runtime.cache.has(path)) return this.#runtime.cache.get(path);

        const res = await fetch(path, { signal });
        if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);

        const data = await res.json();
        this.#runtime.cache.set(path, data);
        return data;
    }

    #render(nodes) {
        const frag = document.createDocumentFragment();
        let gridContext = null;

        nodes.forEach((node, i) => {
            const [tag, props] = Object.entries(node)[0];

            // Auto-grouping logic for Grid Tiles
            if (tag === "tile") {
                if (!gridContext) {
                    gridContext = document.createElement("section");
                    gridContext.className = "tile-grid";
                    frag.appendChild(gridContext);
                }
                gridContext.appendChild(ComponentFactory.create(tag, props, i));
            } else {
                gridContext = null; // Break the grid if a non-tile appears
                frag.appendChild(ComponentFactory.create(tag, props, i));
            }
        });

        this.#shell.mount.replaceChildren(frag);
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    #handleError(path) {
        console.error(`AppCore: Failed to resolve [${path}]`);
        this.#shell.mount.innerHTML = `
            <div class="error-state">
                <h2>Content Unavailable</h2>
                <p>The requested page is not available in ${this.#locale.current.toUpperCase()}.</p>
                <button onclick="location.hash=''">Return Home</button>
            </div>
        `;
    }
}

/**
 * BOOTSTRAP: Singleton instance
 */
window.app = new AppCore();
document.addEventListener("DOMContentLoaded", () => window.app.init());