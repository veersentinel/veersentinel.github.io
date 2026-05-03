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

/**
 * APP CORE
 */
class AppCore {
    // Mount and Shell properties
    #shell = {
        mount: document.getElementById("content-mount"),
        defaultPage: "data/home/index.json",
        loadingOpacity: "0.5"
    };

    #runtime = {
        cache: new Map(),
        controller: null
    };

    constructor() {
        this.theme = new ThemeEngine("theme-switch");
        this.nav = new NavigationEngine();
    }

    init() {
        this.theme.init();
        this.nav.init();
        window.addEventListener("hashchange", () => this.boot());
        this.boot();
    }

    #getCleanPath() {
        const hash = window.location.hash.slice(1);
        const pattern = /^data\/[a-z0-9\/\-]+\.json$/i;
        return pattern.test(hash) ? hash : this.#shell.defaultPage;
    }

    async boot() {
        const path = this.#getCleanPath();
        const container = this.#shell.mount;

        if (!container) return;

        container.setAttribute("aria-busy", "true");
        container.style.opacity = this.#shell.loadingOpacity;

        this.#runtime.controller?.abort();
        this.#runtime.controller = new AbortController();

        try {
            const data = await this.#fetch(path, this.#runtime.controller.signal);
            if (data?.nodes) this.#render(data.nodes);
        } catch (err) {
            if (err.name !== "AbortError") {
                container.textContent = "Error: Content Unavailable";
            }
        } finally {
            container.removeAttribute("aria-busy");
            container.style.opacity = "1";
        }
    }

    async #fetch(path, signal) {
        if (this.#runtime.cache.has(path)) return this.#runtime.cache.get(path);

        const res = await fetch(path, { signal });
        if (!res.ok) throw new Error("Fetch Failed");

        const data = await res.json();
        this.#runtime.cache.set(path, data);
        return data;
    }

    #render(nodes) {
        const frag = document.createDocumentFragment();
        let grid = null;

        nodes.forEach((node, i) => {
            const [tag, props] = Object.entries(node)[0];

            if (tag === "tile") {
                if (!grid) {
                    grid = document.createElement("section");
                    grid.className = "tile-grid";
                    frag.appendChild(grid);
                }
                grid.appendChild(ComponentFactory.create(tag, props, i));
            } else {
                grid = null;
                frag.appendChild(ComponentFactory.create(tag, props, i));
            }
        });

        this.#shell.mount.replaceChildren(frag);
        window.scrollTo({ top: 0, behavior: "smooth" });
    }
}

/**
 * BOOTSTRAP
 */
document.addEventListener("DOMContentLoaded", () => {
    new AppCore().init();
});