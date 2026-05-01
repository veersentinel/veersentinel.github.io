"use strict";

/**
 * THEME ENGINE
 */
class ThemeEngine {
    #btn;
    #root = document.body;
    #storageKey = "app_theme";

    constructor(buttonId) {
        this.#btn = document.getElementById(buttonId);
    }

    init() {
        const stored = localStorage.getItem(this.#storageKey);
        const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        const theme = stored || (systemPrefersDark ? "dark" : "light");

        this.#apply(theme);
        this.#btn?.addEventListener("click", () => this.toggle());
    }

    toggle() {
        const isDark = this.#root.classList.contains("dark-mode");
        this.#apply(isDark ? "light" : "dark");
    }

    #apply(theme) {
        const isDark = theme === "dark";

        this.#root.classList.toggle("dark-mode", isDark);
        localStorage.setItem(this.#storageKey, theme);

        if (this.#btn) {
            this.#btn.textContent = isDark ? "Light Mode" : "Dark Mode";
        }
    }
}


/**
 * NAVIGATION ENGINE
 */
class NavigationEngine {
    #drawer = document.getElementById("nav-drawer");
    #shield = document.getElementById("blur-shield");
    #trigger = document.getElementById("menu-open");

    init() {
        this.#trigger?.addEventListener("click", () => this.open());
        document.getElementById("menu-close")?.addEventListener("click", () => this.close());
        this.#shield?.addEventListener("click", () => this.close());

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") this.close();
        });

        this.#drawer?.addEventListener("click", (e) => {
            const link = e.target.closest(".nav-link");
            if (!link) return;

            e.preventDefault();
            const path = link.getAttribute("data-load");
            if (path) window.location.hash = path;

            setTimeout(() => this.close(), 120);
        });
    }

    open() {
        this.#drawer?.classList.add("active");
        this.#shield?.classList.add("active");
        document.body.classList.add("drawer-open");

        this.#drawer?.setAttribute("aria-hidden", "false");
        this.#trigger?.setAttribute("aria-expanded", "true");

        this.#drawer?.querySelector("button, a")?.focus();
    }

    close() {
        this.#drawer?.classList.remove("active");
        this.#shield?.classList.remove("active");
        document.body.classList.remove("drawer-open");

        this.#drawer?.setAttribute("aria-hidden", "true");
        this.#trigger?.setAttribute("aria-expanded", "false");

        this.#trigger?.focus();
    }
}

/**
 * COMPONENT FACTORY (SAFE)
 */
class ComponentFactory {

    static create(type, data, index = 0) {
        switch (type) {
            case "h1": return this.#text("h1", data);
            case "h2": return this.#text("h2", data);
            case "p": return this.#text("p", data);
            case "img": return this.#image(data);
            case "tile": return this.#tile(data, index);
            case "button": return this.#button(data);
            default: return document.createTextNode("");
        }
    }

    static #text(tag, data) {
        const el = document.createElement(tag);
        el.textContent = typeof data === "object" ? data.text ?? "" : data;
        return el;
    }

    static #image(data) {
        const img = document.createElement("img");
        img.src = typeof data === "object" ? data.src : data;
        img.alt = data?.alt || "";
        img.loading = "lazy";
        img.decoding = "async";
        img.referrerPolicy = "no-referrer";
        img.onerror = () => img.remove();
        return img;
    }

    static #tile(data, index) {
        const wrapper = document.createElement("div");
        wrapper.className = "grid-tile";
        wrapper.style.animationDelay = `${index * 80}ms`;

        const content = document.createElement("div");
        content.className = "tile-content";

        const title = document.createElement("h3");
        title.textContent = data.title || "";

        const desc = document.createElement("p");
        desc.textContent = data.desc || "";

        content.append(title, desc);
        wrapper.appendChild(content);

        wrapper.addEventListener("click", () => {
            if (data.link) window.location.hash = data.link;
        });

        return wrapper;
    }

    static #button(data) {
        const btn = document.createElement("button");
        btn.className = "ui-btn-action";
        btn.type = "button";
        btn.textContent = data.text || "";

        btn.addEventListener("click", () => {
            if (data.link) window.location.hash = data.link;
        });

        return btn;
    }
}


/**
 * APP CORE
 */
class AppCore {
    #mount = document.getElementById("content-mount");
    #cache = new Map();
    #abortController = null;

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
    #safePath(hash) {
        const allowed = /^data\/[a-z0-9\/\-]+\.json$/i;
        return allowed.test(hash) ? hash : "data/home/index.json";
    }

    async boot() {
        const raw = window.location.hash.slice(1);
        const path = this.#safePath(raw);

        if (!this.#mount) return;

        this.#mount.setAttribute("aria-busy", "true");
        this.#mount.style.opacity = "0.4";

        this.#abortController?.abort();
        this.#abortController = new AbortController();

        try {
            const data = await this.#load(path, this.#abortController.signal);
            if (!data || !Array.isArray(data.nodes)) throw new Error("Invalid data format");
            this.#render(data.nodes);
        } catch (err) {
            if (err.name !== "AbortError") {
                this.#mount.textContent = "Content failed to load";
            }
        } finally {
            this.#mount.removeAttribute("aria-busy");
            this.#mount.style.opacity = "1";
        }
    }

    async #load(path, signal) {
        if (this.#cache.has(path)) {
            return this.#cache.get(path);
        }

        const res = await fetch(path, { signal });

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();
        this.#cache.set(path, data);

        return data;
    }

    #render(nodes) {
        const fragment = document.createDocumentFragment();
        let grid = null;

        nodes.forEach((node, i) => {
            const [tag, props] = Object.entries(node)[0];

            if (tag === "tile") {
                if (!grid) {
                    grid = document.createElement("section");
                    grid.className = "tile-grid";
                    fragment.appendChild(grid);
                }
                grid.appendChild(ComponentFactory.create(tag, props, i));
            } else {
                grid = null;
                fragment.appendChild(ComponentFactory.create(tag, props, i));
            }
        });

        this.#mount.replaceChildren(fragment);

        requestAnimationFrame(() => {
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    }
}


/**
 * INIT
 */
document.addEventListener("DOMContentLoaded", () => {
    const app = new AppCore();
    app.init();
});