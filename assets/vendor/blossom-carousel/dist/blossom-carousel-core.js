//#region ../../node_modules/.pnpm/@bramus+style-observer@2.0.2/node_modules/@bramus/style-observer/dist/index.js
var e;
(function(e) {
	e.VALUE_ONLY = "value_only", e.OBJECT = "object";
})(e ||= {});
var t;
(function(e) {
	e.CHANGED_ONLY = "changed_only", e.ALL = "all";
})(t ||= {});
var n = class {
	_observedElements = /* @__PURE__ */ new Set();
	_cachedValues = /* @__PURE__ */ new WeakMap();
	constructor(n, r = { properties: [] }) {
		this._callback = n, this._observedVariables = r.properties, this._notificationMode = r.notificationMode ?? t.CHANGED_ONLY, this._returnFormat = r.returnFormat ?? e.OBJECT;
	}
	observe(e) {
		this._observedElements.has(e) || (this._observedElements.add(e), this._cachedValues.set(e, {}), this._setTargetElementStyles(e), e.addEventListener("transitionrun", this._eventHandler), this._handleUpdate(e));
	}
	unobserve(e) {
		let t;
		t = e ? this._observedElements.has(e) ? new Set([e]) : /* @__PURE__ */ new Set() : this._observedElements, t.size && t.forEach((e) => {
			this._unsetTargetElementStyles(e), e.removeEventListener("transitionrun", this._eventHandler), this._observedElements.delete(e), this._cachedValues.delete(e);
		});
	}
	_observedVariables;
	_callback;
	_eventHandler = this._handleUpdate.bind(this);
	_notificationMode;
	_returnFormat;
	_setTargetElementStyles(e) {
		let t = this._observedVariables.map((e) => `${e} 0.001ms step-start`).join(", ");
		e.style.setProperty("transition", t), e.style.setProperty("transition-behavior", "allow-discrete");
	}
	_unsetTargetElementStyles(e) {
		e.style.removeProperty("transition"), e.style.removeProperty("transition-behavior");
	}
	_processComputedStyle(e, n) {
		let r = {}, i = this._cachedValues.get(n) ?? {};
		return this._observedVariables.forEach((a) => {
			let o = e.getPropertyValue(a), s = i[a], c = o !== s;
			(this._notificationMode === t.ALL || c) && (r[a] = {
				value: o,
				previousValue: s,
				changed: c,
				element: n
			}, i[a] = o);
		}), r;
	}
	_getFormatter(t) {
		switch (t) {
			case e.OBJECT: return (e) => e;
			case e.VALUE_ONLY:
			default: return (e) => {
				let t = {};
				return Object.keys(e).forEach((n) => {
					t[n] = e[n].value;
				}), t;
			};
		}
	}
	_handleUpdate(e) {
		let t = e instanceof HTMLElement ? e : e.target;
		if (this._observedElements.has(t)) {
			let e = getComputedStyle(t), n = this._processComputedStyle(e, t);
			if (Object.keys(n).length === 0) return;
			let r = this._getFormatter(this._returnFormat);
			this._callback(r(n));
		}
	}
};
//#endregion
//#region src/state.ts
function r() {
	return {
		scroller: null,
		end: 300,
		isDragging: !1,
		scrollerScrollWidth: 300,
		scrollerWidth: 300,
		scrollerScrollHeight: 300,
		scrollerHeight: 300,
		padding: {
			start: 0,
			end: 0
		},
		scrollPadding: {
			start: 0,
			end: 0
		},
		slidePositions: [],
		hasSnap: !1,
		snapMandatory: !1,
		snapPositions: [],
		activeSnapPosition: {
			target: null,
			x: 0,
			y: 0
		},
		dir: 1
	};
}
//#endregion
//#region src/utils.ts
function i(e, t, n) {
	return (1 - n) * e + n * t;
}
function a(e, t, n, r) {
	return i(e, t, 1 - Math.exp(Math.log(1 - n) * (r / (1e3 / 60))));
}
function o(e, t, n) {
	return Math.max(t, Math.min(n, e));
}
function s(e, t = 0) {
	let n = 10 ** t;
	return Math.round(e * n) / n;
}
function c(e, t, n) {
	return e + t / (1 - n);
}
function l(e, t) {
	let n = parseFloat(t);
	if (!isNaN(n) && !t.includes("calc")) return n;
	if (t === "auto" || t === "normal" || !t) return 0;
	let r = document.createElement("div");
	r.style.position = "absolute", r.style.visibility = "hidden", r.style.width = `${e.clientWidth}px`;
	let i = document.createElement("div");
	i.style.width = t, r.appendChild(i), document.body.appendChild(r);
	let a = i.getBoundingClientRect().width;
	return r.remove(), a;
}
//#endregion
//#region src/constants.ts
var u = .72, d = .12, f = (e, t, n) => {
	let r = n ? new CustomEvent(t, {
		bubbles: !0,
		cancelable: !0,
		detail: n
	}) : new Event(t, {
		bubbles: !0,
		cancelable: !0
	});
	return e?.dispatchEvent(r), r;
}, p = (e, t) => f(e, "overscroll", t), m = (e) => f(e, "scrollend"), h = (e, t) => f(e, "scrollsnapchange", t), g = (e, t) => f(e, "scrollsnapchanging", t);
//#endregion
//#region src/snap.ts
function _(e) {
	for (let { el: t, value: n, priority: r } of e) n ? t.style.setProperty("position", n, r) : t.style.removeProperty("position");
}
function v(e, t) {
	let n = [], r = [], i = document.createTreeWalker(e, NodeFilter.SHOW_ELEMENT), a = i.nextNode();
	for (; a;) {
		let e = window.getComputedStyle(a), t = e.scrollSnapAlign, o = a;
		t !== "none" && n.push({
			align: t,
			el: o
		}), e.position === "sticky" && (r.push({
			el: o,
			value: o.style.getPropertyValue("position"),
			priority: o.style.getPropertyPriority("position")
		}), o.style.setProperty("position", "static", "important")), a = i.nextNode();
	}
	let o;
	try {
		let r = e.getBoundingClientRect();
		o = n.map(({ el: n, align: i }) => {
			let a = n, o = a.getBoundingClientRect(), s = a.clientWidth, c = o.left - r.left + e.scrollLeft, l = window.getComputedStyle(a), u = parseFloat(l.scrollMarginInlineStart) || 0, d = parseFloat(l.scrollMarginInlineEnd) || 0, f = c - u, p = c + s + d;
			switch (i) {
				case "start": return {
					target: a,
					x: f - t.scrollPadding.start,
					y: 0
				};
				case "end": return {
					target: a,
					x: p - t.scrollerWidth + t.scrollPadding.end,
					y: 0
				};
				case "center": return {
					target: a,
					x: (f + p) / 2 - t.scrollerWidth / 2,
					y: 0
				};
				default: return null;
			}
		});
	} finally {
		_(r);
	}
	t.snapPositions = o.filter((e) => e !== null).reduce((e, t) => ((e.length === 0 || e[e.length - 1].x !== t.x) && e.push(t), e), []);
}
function y(e, t, n, r) {
	if (!r.hasSnap || !r.snapPositions.length) return !1;
	if (r.snapMandatory) return !0;
	let i = c(e, t, n), a = Math.max(r.scrollerWidth - r.scrollPadding.start - r.scrollPadding.end, 0) / 3;
	return r.snapPositions.reduce((e, t) => Math.min(e, Math.abs(t.x - i)), Infinity) <= a;
}
function b(e, t, n, r) {
	let i = x(e, t, n, r);
	return i.x !== r.activeSnapPosition.x && g(r.scroller, {
		snapTargetInline: (i || r.activeSnapPosition).target,
		snapTargetBlock: (i || r.activeSnapPosition).target
	}), r.activeSnapPosition = i, (o(i.x, Math.min((r.scrollerScrollWidth - r.scrollerWidth) * r.dir, 0), Math.max((r.scrollerScrollWidth - r.scrollerWidth) * r.dir, 0)) - e) * (1 - u) * (1 / u);
}
function x(e, t, n, r) {
	let i = c(e, t, n);
	return r.snapPositions.length ? r.snapPositions.reduce((e, t) => Math.abs(t.x - i) < Math.abs(e.x - i) ? t : e) : {
		target: null,
		x: o(i, Math.min(r.end, 0), Math.max(r.end, 0)),
		y: 0
	};
}
function S(e) {
	h(e.scroller, {
		snapTargetInline: e.activeSnapPosition.target,
		snapTargetBlock: e.activeSnapPosition.target
	});
}
function C(e, t, n, r) {
	let i = x(e, t, n, r);
	i.x !== r.activeSnapPosition.x && (r.activeSnapPosition = i, g(r.scroller, {
		snapTargetInline: (i || r.activeSnapPosition).target,
		snapTargetBlock: (i || r.activeSnapPosition).target
	}));
}
//#endregion
//#region src/methods.ts
var w = {
	center: (e, t, n) => e + t * .5 - n.scrollerWidth / 2,
	end: (e, t, n) => e + t - n.scrollerWidth + n.scrollPadding.end,
	start: (e, t, n) => e - n.scrollPadding.start
};
function T(e, t, n, r) {
	if (r.hasSnap) return e;
	let i = w[n || "start"];
	return i(e, t, r);
}
function E(e, t, n) {
	if (!n.scroller) return null;
	let r = n.scroller.scrollLeft, i = n.snapPositions.length ? n.snapPositions : n.slidePositions;
	if (e === "prev") for (let e = i.length - 1; e >= 0; e--) {
		let a = T(i[e].x, i[e].width || 0, t, n);
		if (a < r - 1) return a;
	}
	else for (let e = 0; e < i.length; e++) {
		let a = T(i[e].x, i[e].width || 0, t, n);
		if (a > r + 1) return a;
	}
	return null;
}
function D(e, { align: t } = {}) {
	let n = E("prev", t, e);
	n !== null && e.scroller.scrollTo({
		left: n,
		behavior: "smooth"
	});
}
function O(e, { align: t } = {}) {
	let n = E("next", t, e);
	n !== null && e.scroller.scrollTo({
		left: n,
		behavior: "smooth"
	});
}
//#endregion
//#region src/index.ts
var k = /* @__PURE__ */ new Map(), A = null;
function j(e, t) {
	return k.size === 0 && (A = Element.prototype.scrollIntoView, Element.prototype.scrollIntoView = function(e) {
		for (let e of k.values()) e(this);
		return A.call(this, e);
	}), k.set(e, t), () => {
		k.delete(e), k.size === 0 && A && (Element.prototype.scrollIntoView = A, A = null);
	};
}
var M = (t, i) => {
	let o = r();
	o.scroller = t;
	let c = !0, f = {
		x: 0,
		y: 0
	}, h = {
		x: 0,
		y: 0
	}, g = {
		x: 0,
		y: 0
	}, _ = new Proxy({
		x: 0,
		y: 0
	}, { set(e, t, n) {
		return e[t] === n ? !0 : (e[t] = n, (e.x >= 10 || e.y >= 10) && (q.value = !0), !0);
	} }), x = new Proxy({
		x: !1,
		y: !1
	}, { set(e, n, r) {
		return e[n] === r ? !0 : (e[n] = r, e.x || e.y ? (t.setAttribute("has-overflow", "true"), t.addEventListener("pointerdown", B), t.addEventListener("wheel", U, { passive: !0 })) : (t.removeAttribute("has-overflow"), t.removeEventListener("pointerdown", B), t.removeEventListener("wheel", U)), !0);
	} }), w = null, T = null, E = null, k = null, A, M = null, N = !1;
	function P() {
		t?.setAttribute("blossom-carousel", "true"), T = t?.querySelectorAll("a[href]") || null, T?.forEach((e) => {
			e.addEventListener("click", F);
		}), window.addEventListener("keydown", W), t.addEventListener("scroll", R), E = new ResizeObserver(I), E.observe(t), k = new MutationObserver(L), k.observe(t, {
			attributes: !1,
			childList: !0,
			subtree: !0
		}), M = new n((e) => {
			x.x = !N && o.scrollerScrollWidth > o.scrollerWidth && ["auto", "scroll"].includes(typeof e["overflow-x"] == "string" ? e["overflow-x"] : e["overflow-x"].value), x.y = !N && o.scrollerScrollHeight > o.scrollerHeight && ["auto", "scroll"].includes(typeof e["overflow-y"] == "string" ? e["overflow-y"] : e["overflow-y"].value);
		}, {
			properties: ["overflow-x", "overflow-y"],
			returnFormat: e.OBJECT
		}), M.observe(t);
		let r = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
		o.dir = t.closest("[dir=\"rtl\"]") ? -1 : 1;
		let { scrollSnapType: a } = window.getComputedStyle(t);
		o.hasSnap = a !== "none", o.snapMandatory = a.includes("mandatory"), t.style.setProperty("--snap-type", a), r && t.style.setProperty("scroll-snap-type", "none"), t.setAttribute("has-snap", c ? "true" : "false"), t.setAttribute("has-repeat", i?.repeat ? "true" : "false"), A = j(t, (e) => {
			(e === t || t.contains(e)) && (q.value = !1);
		});
	}
	function ee() {
		t.removeAttribute("blossom-carousel"), E?.disconnect(), k?.disconnect(), M?.unobserve(t), w && cancelAnimationFrame(w), window.removeEventListener("keydown", W), t.removeEventListener("scroll", R), T?.forEach((e) => {
			e.removeEventListener("click", F);
		}), A?.(), t.scrollTo = te, t.scrollBy = ne;
	}
	function F(e) {
		_.x > 10 && e.preventDefault();
	}
	function I() {
		if (!t) return;
		N = "ontouchmove" in window, o.scrollerScrollWidth = t.scrollWidth, o.scrollerWidth = t.clientWidth, o.scrollerScrollHeight = t.scrollHeight, o.scrollerHeight = t.clientHeight;
		let e = window.getComputedStyle(t);
		x.x = !N && o.scrollerScrollWidth > o.scrollerWidth && ["auto", "scroll"].includes(e.getPropertyValue("overflow-x")), x.y = !N && o.scrollerScrollHeight > o.scrollerHeight && ["auto", "scroll"].includes(e.getPropertyValue("overflow-y")), o.padding.end = l(t, e.paddingInlineEnd), o.padding.start = l(t, e.paddingInlineStart), o.scrollPadding.start = l(t, e.scrollPaddingInlineStart), o.scrollPadding.end = l(t, e.scrollPaddingInlineEnd), o.dir = t.closest("[dir=\"rtl\"]") ? -1 : 1, o.end = (o.scrollerScrollWidth - o.scrollerWidth - 4) * o.dir, o.hasSnap ? v(t, o) : o.slidePositions = Array.from(t.children).map((e) => {
			let n = e.getBoundingClientRect(), r = t.getBoundingClientRect();
			return {
				target: e,
				x: n.left - r.left + t.scrollLeft - o.scrollPadding.start,
				y: 0,
				width: n.width,
				height: n.height
			};
		}), i?.repeat && G(null, null);
	}
	function L() {
		I();
	}
	function R() {
		if (i?.repeat) {
			G(null, null);
			return;
		}
		if (o.isDragging || !t) return;
		let e = t.scrollLeft;
		e < 0 ? p(t, { left: e * -1 }) : e > o.scrollerScrollWidth - o.scrollerWidth && p(t, { left: e * -1 + o.scrollerScrollWidth - o.scrollerWidth });
	}
	let z = {
		x: 0,
		y: 0
	};
	function B(e) {
		t && (x.x && (z.x = t.scrollLeft, h.x = t.scrollLeft, f.x = e.clientX, g.x = 0), x.y && (z.y = t.scrollTop, h.y = t.scrollTop, f.y = e.clientY, g.y = 0), _.x = 0, o.isDragging = !0, window.addEventListener("pointermove", V), window.addEventListener("pointerup", H));
	}
	function V(e) {
		if (e.preventDefault(), x.x) {
			let t = f.x - e.clientX;
			h.x += t, g.x += t, f.x = e.clientX, _.x += Math.abs(t);
		}
		if (x.y) {
			let t = f.y - e.clientY;
			h.y += t, g.y += t, f.y = e.clientY, _.y += Math.abs(t);
		}
	}
	function H() {
		window.removeEventListener("pointermove", V), window.removeEventListener("pointerup", H), o.isDragging = !1, !(_.x <= 10) && (x.x && (g.x *= 2), x.y && (g.y *= 2), (y(h.x, g.x, .72, o) || h.x < 0 || h.x > o.end) && (g.x = b(h.x, g.x, u, o)), ae());
	}
	function U(e) {
		if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
			if (q.value = !1, o.isDragging || !t) return;
			x.x && (z.x = t.scrollLeft), x.y && (z.y = t.scrollTop);
		}
	}
	function W(e) {
		[
			"ArrowLeft",
			"ArrowRight",
			"ArrowUp",
			"ArrowDown"
		].includes(e.key) && (q.value = !1);
	}
	function G(e, n) {
		if (!t) return;
		let r = n ?? t.scrollLeft, i = o.padding.start - r, a = r - (o.scrollerScrollWidth - o.scrollerWidth - o.padding.end), s = Array.from(t.children), c = (e, t, n, r) => {
			let i = 0, a = r ? -1 : 1, c = r ? -(o.scrollerScrollWidth - o.scrollerWidth) : o.scrollerScrollWidth - o.scrollerWidth;
			for (let o = e; r ? o >= t : o < t; o += a) {
				let e = i > n;
				s[o].style.translate = `${e ? 0 : c}px 0`, i += s[o].clientWidth;
			}
		};
		if (c(s.length - 1, s.length / 2, i, !0), c(0, s.length / 2, a, !1), o.isDragging) return;
		let l = r > o.end ? 4 : r < 4 ? o.end : null;
		l && ($ = !0, t.scrollTo({
			left: l,
			behavior: "instant"
		}));
	}
	function K(e) {
		q.value && e.stopPropagation();
	}
	let q = new Proxy({ value: !1 }, { set(e, n, r) {
		return c = !r, e[n] === r ? !0 : t ? (t.setAttribute("has-snap", c ? "true" : "false"), r && !q.value ? (Y = performance.now(), x.x && (h.x = t.scrollLeft), x.y && (h.y = t.scrollTop), t.addEventListener("scrollend", K, {
			capture: !0,
			passive: !1
		}), w ||= requestAnimationFrame(X)) : r || (w && cancelAnimationFrame(w), w = null, t.removeEventListener("scrollend", K)), e[n] = r, !0) : !1;
	} }), J = 0, Y = 0;
	function X(e) {
		w = requestAnimationFrame(X), J = e - Y, t && (x.x && (g.x *= u, o.isDragging ? z.x = a(z.x, h.x, u, J) : (h.x += g.x, z.x = a(z.x, h.x, d, J))), x.y && (g.y *= u, o.isDragging ? z.y = a(z.y, h.y, u, J) : (h.y += g.y, z.y = a(z.y, h.y, d, J))), i?.repeat && (z.x > o.end && (z.x = h.x = 4), z.x < 4 && (z.x = h.x = o.end)), $ = !0, t.scrollTo({
			left: z.x,
			top: z.y,
			behavior: "instant"
		}), o.isDragging && o.hasSnap && C(h.x, g.x, u, o), !o.isDragging && s(g.x, 12) === 0 && (q.value = !1, m(t), o.hasSnap && S(o)), i?.repeat ? G(null, z.x) : Q(s(z.x, 2)), Y = e);
	}
	let Z = 0;
	function Q(e) {
		if (!t) return;
		let n = o.end, r = 0;
		if (e * o.dir <= 0 ? r = o.isDragging ? e * -.2 : 0 : e * o.dir > n * o.dir && (r = o.isDragging ? (e - n) * -.2 : 0), Z = a(Z, r, o.isDragging ? .8 : d, J), Math.abs(Z) > .01) {
			if (p(t, { left: Z }).defaultPrevented) return;
			t.style.transform = `translateX(${s(Z, 3)}px)`;
			return;
		}
		t.style.transform = "", Z = 0;
	}
	let $ = !1, te = t.scrollTo, ne = t.scrollBy, re = t.scrollTo.bind(t);
	t.scrollTo = function(...e) {
		$ !== !0 && (q.value = !1), $ = !1, re(...e);
	};
	let ie = t.scrollBy.bind(t);
	t.scrollBy = function(...e) {
		$ !== !0 && (q.value = !1), $ = !1, ie(...e);
	};
	function ae() {
		let e = (t) => {
			t.preventDefault(), t.stopPropagation(), window.removeEventListener("click", e, !0);
		};
		window.addEventListener("click", e, !0);
	}
	return {
		snap: c,
		hasOverflow: x,
		init: P,
		destroy: ee,
		prev: (e) => D(o, e),
		next: (e) => O(o, e)
	};
};
//#endregion
export { M as Blossom };
