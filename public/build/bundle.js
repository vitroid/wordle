
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35730/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        if (value === null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            // @ts-ignore
            callbacks.slice().forEach(fn => fn.call(this, event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.46.4' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/words.svelte generated by Svelte v3.46.4 */

    const words = [
    	"which",
    	"there",
    	"their",
    	"about",
    	"would",
    	"these",
    	"other",
    	"words",
    	"could",
    	"write",
    	"first",
    	"water",
    	"after",
    	"where",
    	"right",
    	"think",
    	"three",
    	"years",
    	"place",
    	"sound",
    	"great",
    	"again",
    	"still",
    	"every",
    	"small",
    	"found",
    	"those",
    	"never",
    	"under",
    	"might",
    	"while",
    	"house",
    	"world",
    	"below",
    	"asked",
    	"going",
    	"large",
    	"until",
    	"along",
    	"shall",
    	"being",
    	"often",
    	"earth",
    	"began",
    	"since",
    	"study",
    	"night",
    	"light",
    	"above",
    	"paper",
    	"parts",
    	"young",
    	"story",
    	"point",
    	"times",
    	"heard",
    	"whole",
    	"white",
    	"given",
    	"means",
    	"music",
    	"miles",
    	"thing",
    	"today",
    	"later",
    	"using",
    	"money",
    	"lines",
    	"order",
    	"group",
    	"among",
    	"learn",
    	"known",
    	"space",
    	"table",
    	"early",
    	"trees",
    	"short",
    	"hands",
    	"state",
    	"black",
    	"shown",
    	"stood",
    	"front",
    	"voice",
    	"kinds",
    	"makes",
    	"comes",
    	"close",
    	"power",
    	"lived",
    	"vowel",
    	"taken",
    	"built",
    	"heart",
    	"ready",
    	"quite",
    	"class",
    	"bring",
    	"round",
    	"horse",
    	"shows",
    	"piece",
    	"green",
    	"stand",
    	"birds",
    	"start",
    	"river",
    	"tried",
    	"least",
    	"field",
    	"whose",
    	"girls",
    	"leave",
    	"added",
    	"color",
    	"third",
    	"hours",
    	"moved",
    	"plant",
    	"doing",
    	"names",
    	"forms",
    	"heavy",
    	"ideas",
    	"cried",
    	"check",
    	"floor",
    	"begin",
    	"woman",
    	"alone",
    	"plane",
    	"spell",
    	"watch",
    	"carry",
    	"wrote",
    	"clear",
    	"named",
    	"books",
    	"child",
    	"glass",
    	"human",
    	"takes",
    	"party",
    	"build",
    	"seems",
    	"blood",
    	"sides",
    	"seven",
    	"mouth",
    	"solve",
    	"north",
    	"value",
    	"death",
    	"maybe",
    	"happy",
    	"tells",
    	"gives",
    	"looks",
    	"shape",
    	"lives",
    	"steps",
    	"areas",
    	"sense",
    	"speak",
    	"force",
    	"ocean",
    	"speed",
    	"women",
    	"metal",
    	"south",
    	"grass",
    	"scale",
    	"cells",
    	"lower",
    	"sleep",
    	"wrong",
    	"pages",
    	"ships",
    	"needs",
    	"rocks",
    	"eight",
    	"major",
    	"level",
    	"total",
    	"ahead",
    	"reach",
    	"stars",
    	"store",
    	"sight",
    	"terms",
    	"catch",
    	"works",
    	"board",
    	"cover",
    	"songs",
    	"equal",
    	"stone",
    	"waves",
    	"guess",
    	"dance",
    	"spoke",
    	"break",
    	"cause",
    	"radio",
    	"weeks",
    	"lands",
    	"basic",
    	"liked",
    	"trade",
    	"fresh",
    	"final",
    	"fight",
    	"meant",
    	"drive",
    	"spent",
    	"local",
    	"waxes",
    	"knows",
    	"train",
    	"bread",
    	"homes",
    	"teeth",
    	"coast",
    	"thick",
    	"brown",
    	"clean",
    	"quiet",
    	"sugar",
    	"facts",
    	"steel",
    	"forth",
    	"rules",
    	"notes",
    	"units",
    	"peace",
    	"month",
    	"verbs",
    	"seeds",
    	"helps",
    	"sharp",
    	"visit",
    	"woods",
    	"chief",
    	"walls",
    	"cross",
    	"wings",
    	"grown",
    	"cases",
    	"foods",
    	"crops",
    	"fruit",
    	"stick",
    	"wants",
    	"stage",
    	"sheep",
    	"nouns",
    	"plain",
    	"drink",
    	"bones",
    	"apart",
    	"turns",
    	"moves",
    	"touch",
    	"angle",
    	"based",
    	"range",
    	"marks",
    	"tired",
    	"older",
    	"farms",
    	"spend",
    	"shoes",
    	"goods",
    	"chair",
    	"twice",
    	"cents",
    	"empty",
    	"alike",
    	"style",
    	"broke",
    	"pairs",
    	"count",
    	"enjoy",
    	"score",
    	"shore",
    	"roots",
    	"paint",
    	"heads",
    	"shook",
    	"serve",
    	"angry",
    	"crowd",
    	"wheel",
    	"quick",
    	"dress",
    	"share",
    	"alive",
    	"noise",
    	"solid",
    	"cloth",
    	"signs",
    	"hills",
    	"types",
    	"drawn",
    	"worth",
    	"truck",
    	"piano",
    	"upper",
    	"loved",
    	"usual",
    	"faces",
    	"drove",
    	"cabin",
    	"boats",
    	"towns",
    	"proud",
    	"court",
    	"model",
    	"prime",
    	"fifty",
    	"plans",
    	"yards",
    	"prove",
    	"tools",
    	"price",
    	"sheet",
    	"smell",
    	"boxes",
    	"raise",
    	"match",
    	"truth",
    	"roads",
    	"threw",
    	"enemy",
    	"lunch",
    	"chart",
    	"scene",
    	"graph",
    	"doubt",
    	"guide",
    	"winds",
    	"block",
    	"grain",
    	"smoke",
    	"mixed",
    	"games",
    	"wagon",
    	"sweet",
    	"topic",
    	"extra",
    	"plate",
    	"title",
    	"knife",
    	"fence",
    	"falls",
    	"cloud",
    	"wheat",
    	"plays",
    	"enter",
    	"broad",
    	"steam",
    	"atoms",
    	"press",
    	"lying",
    	"basis",
    	"clock",
    	"taste",
    	"grows",
    	"thank",
    	"storm",
    	"agree",
    	"brain",
    	"track",
    	"smile",
    	"funny",
    	"beach",
    	"stock",
    	"hurry",
    	"saved",
    	"sorry",
    	"giant",
    	"trail",
    	"offer",
    	"ought",
    	"rough",
    	"daily",
    	"avoid",
    	"keeps",
    	"throw",
    	"allow",
    	"cream",
    	"laugh",
    	"edges",
    	"teach",
    	"frame",
    	"bells",
    	"dream",
    	"magic",
    	"occur",
    	"ended",
    	"chord",
    	"false",
    	"skill",
    	"holes",
    	"dozen",
    	"brave",
    	"apple",
    	"climb",
    	"outer",
    	"pitch",
    	"ruler",
    	"holds",
    	"fixed",
    	"costs",
    	"calls",
    	"blank",
    	"staff",
    	"labor",
    	"eaten",
    	"youth",
    	"tones",
    	"honor",
    	"globe",
    	"gases",
    	"doors",
    	"poles",
    	"loose",
    	"apply",
    	"tears",
    	"exact",
    	"brush",
    	"chest",
    	"layer",
    	"whale",
    	"minor",
    	"faith",
    	"tests",
    	"judge",
    	"items",
    	"worry",
    	"waste",
    	"hoped",
    	"strip",
    	"begun",
    	"aside",
    	"lakes",
    	"bound",
    	"depth",
    	"candy",
    	"event",
    	"worse",
    	"aware",
    	"shell",
    	"rooms",
    	"ranch",
    	"image",
    	"snake",
    	"aloud",
    	"dried",
    	"likes",
    	"motor",
    	"pound",
    	"knees",
    	"refer",
    	"fully",
    	"chain",
    	"shirt",
    	"flour",
    	"drops",
    	"spite",
    	"orbit",
    	"banks",
    	"shoot",
    	"curve",
    	"tribe",
    	"tight",
    	"blind",
    	"slept",
    	"shade",
    	"claim",
    	"flies",
    	"theme",
    	"queen",
    	"fifth",
    	"union",
    	"hence",
    	"straw",
    	"entry",
    	"issue",
    	"birth",
    	"feels",
    	"anger",
    	"brief",
    	"rhyme",
    	"glory",
    	"guard",
    	"flows",
    	"flesh",
    	"owned",
    	"trick",
    	"yours",
    	"sizes",
    	"noted",
    	"width",
    	"burst",
    	"route",
    	"lungs",
    	"uncle",
    	"bears",
    	"royal",
    	"kings",
    	"forty",
    	"trial",
    	"cards",
    	"brass",
    	"opera",
    	"chose",
    	"owner",
    	"vapor",
    	"beats",
    	"mouse",
    	"tough",
    	"wires",
    	"meter",
    	"tower",
    	"finds",
    	"inner",
    	"stuck",
    	"arrow",
    	"poems",
    	"label",
    	"swing",
    	"solar",
    	"truly",
    	"tense",
    	"beans",
    	"split",
    	"rises",
    	"weigh",
    	"hotel",
    	"stems",
    	"pride",
    	"swung",
    	"grade",
    	"digit",
    	"badly",
    	"boots",
    	"pilot",
    	"sales",
    	"swept",
    	"lucky",
    	"prize",
    	"stove",
    	"tubes",
    	"acres",
    	"wound",
    	"steep",
    	"slide",
    	"trunk",
    	"error",
    	"porch",
    	"slave",
    	"exist",
    	"faced",
    	"mines",
    	"marry",
    	"juice",
    	"raced",
    	"waved",
    	"goose",
    	"trust",
    	"fewer",
    	"favor",
    	"mills",
    	"views",
    	"joint",
    	"eager",
    	"spots",
    	"blend",
    	"rings",
    	"adult",
    	"index",
    	"nails",
    	"horns",
    	"balls",
    	"flame",
    	"rates",
    	"drill",
    	"trace",
    	"skins",
    	"waxed",
    	"seats",
    	"stuff",
    	"ratio",
    	"minds",
    	"dirty",
    	"silly",
    	"coins",
    	"hello",
    	"trips",
    	"leads",
    	"rifle",
    	"hopes",
    	"bases",
    	"shine",
    	"bench",
    	"moral",
    	"fires",
    	"meals",
    	"shake",
    	"shops",
    	"cycle",
    	"movie",
    	"slope",
    	"canoe",
    	"teams",
    	"folks",
    	"fired",
    	"bands",
    	"thumb",
    	"shout",
    	"canal",
    	"habit",
    	"reply",
    	"ruled",
    	"fever",
    	"crust",
    	"shelf",
    	"walks",
    	"midst",
    	"crack",
    	"print",
    	"tales",
    	"coach",
    	"stiff",
    	"flood",
    	"verse",
    	"awake",
    	"rocky",
    	"march",
    	"fault",
    	"swift",
    	"faint",
    	"civil",
    	"ghost",
    	"feast",
    	"blade",
    	"limit",
    	"germs",
    	"reads",
    	"ducks",
    	"dairy",
    	"worst",
    	"gifts",
    	"lists",
    	"stops",
    	"rapid",
    	"brick",
    	"claws",
    	"beads",
    	"beast",
    	"skirt",
    	"cakes",
    	"lions",
    	"frogs",
    	"tries",
    	"nerve",
    	"grand",
    	"armed",
    	"treat",
    	"honey",
    	"moist",
    	"legal",
    	"penny",
    	"crown",
    	"shock",
    	"taxes",
    	"sixty",
    	"altar",
    	"pulls",
    	"sport",
    	"drums",
    	"talks",
    	"dying",
    	"dates",
    	"drank",
    	"blows",
    	"lever",
    	"wages",
    	"proof",
    	"drugs",
    	"tanks",
    	"sings",
    	"tails",
    	"pause",
    	"herds",
    	"arose",
    	"hated",
    	"clues",
    	"novel",
    	"shame",
    	"burnt",
    	"races",
    	"flash",
    	"weary",
    	"heels",
    	"token",
    	"coats",
    	"spare",
    	"shiny",
    	"alarm",
    	"dimes",
    	"sixth",
    	"clerk",
    	"mercy",
    	"sunny",
    	"guest",
    	"float",
    	"shone",
    	"pipes",
    	"worms",
    	"bills",
    	"sweat",
    	"suits",
    	"smart",
    	"upset",
    	"rains",
    	"sandy",
    	"rainy",
    	"parks",
    	"sadly",
    	"fancy",
    	"rider",
    	"unity",
    	"bunch",
    	"rolls",
    	"crash",
    	"craft",
    	"newly",
    	"gates",
    	"hatch",
    	"paths",
    	"funds",
    	"wider",
    	"grace",
    	"grave",
    	"tides",
    	"admit",
    	"shift",
    	"sails",
    	"pupil",
    	"tiger",
    	"angel",
    	"cruel",
    	"agent",
    	"drama",
    	"urged",
    	"patch",
    	"nests",
    	"vital",
    	"sword",
    	"blame",
    	"weeds",
    	"screw",
    	"vocal",
    	"bacon",
    	"chalk",
    	"cargo",
    	"crazy",
    	"acted",
    	"goats",
    	"arise",
    	"witch",
    	"loves",
    	"queer",
    	"dwell",
    	"backs",
    	"ropes",
    	"shots",
    	"merry",
    	"phone",
    	"cheek",
    	"peaks",
    	"ideal",
    	"beard",
    	"eagle",
    	"creek",
    	"cries",
    	"ashes",
    	"stall",
    	"yield",
    	"mayor",
    	"opens",
    	"input",
    	"fleet",
    	"tooth",
    	"cubic",
    	"wives",
    	"burns",
    	"poets",
    	"apron",
    	"spear",
    	"organ",
    	"cliff",
    	"stamp",
    	"paste",
    	"rural",
    	"baked",
    	"chase",
    	"slice",
    	"slant",
    	"knock",
    	"noisy",
    	"sorts",
    	"stays",
    	"wiped",
    	"blown",
    	"piled",
    	"clubs",
    	"cheer",
    	"widow",
    	"twist",
    	"tenth",
    	"hides",
    	"comma",
    	"sweep",
    	"spoon",
    	"stern",
    	"crept",
    	"maple",
    	"deeds",
    	"rides",
    	"muddy",
    	"crime",
    	"jelly",
    	"ridge",
    	"drift",
    	"dusty",
    	"devil",
    	"tempo",
    	"humor",
    	"sends",
    	"steal",
    	"tents",
    	"waist",
    	"roses",
    	"reign",
    	"noble",
    	"cheap",
    	"dense",
    	"linen",
    	"geese",
    	"woven",
    	"posts",
    	"hired",
    	"wrath",
    	"salad",
    	"bowed",
    	"tires",
    	"shark",
    	"belts",
    	"grasp",
    	"blast",
    	"polar",
    	"fungi",
    	"tends",
    	"pearl",
    	"loads",
    	"jokes",
    	"veins",
    	"frost",
    	"hears",
    	"loses",
    	"hosts",
    	"diver",
    	"phase",
    	"toads",
    	"alert",
    	"tasks",
    	"seams",
    	"coral",
    	"focus",
    	"naked",
    	"puppy",
    	"jumps",
    	"spoil",
    	"quart",
    	"macro",
    	"fears",
    	"flung",
    	"spark",
    	"vivid",
    	"brook",
    	"steer",
    	"spray",
    	"decay",
    	"ports",
    	"socks",
    	"urban",
    	"goals",
    	"grant",
    	"minus",
    	"films",
    	"tunes",
    	"shaft",
    	"firms",
    	"skies",
    	"bride",
    	"wreck",
    	"flock",
    	"stare",
    	"hobby",
    	"bonds",
    	"dared",
    	"faded",
    	"thief",
    	"crude",
    	"pants",
    	"flute",
    	"votes",
    	"tonal",
    	"radar",
    	"wells",
    	"skull",
    	"hairs",
    	"argue",
    	"wears",
    	"dolls",
    	"voted",
    	"caves",
    	"cared",
    	"broom",
    	"scent",
    	"panel",
    	"fairy",
    	"olive",
    	"bends",
    	"prism",
    	"lamps",
    	"cable",
    	"peach",
    	"ruins",
    	"rally",
    	"schwa",
    	"lambs",
    	"sells",
    	"cools",
    	"draft",
    	"charm",
    	"limbs",
    	"brake",
    	"gazed",
    	"cubes",
    	"delay",
    	"beams",
    	"fetch",
    	"ranks",
    	"array",
    	"harsh",
    	"camel",
    	"vines",
    	"picks",
    	"naval",
    	"purse",
    	"rigid",
    	"crawl",
    	"toast",
    	"soils",
    	"sauce",
    	"basin",
    	"ponds",
    	"twins",
    	"wrist",
    	"fluid",
    	"pools",
    	"brand",
    	"stalk",
    	"robot",
    	"reeds",
    	"hoofs",
    	"buses",
    	"sheer",
    	"grief",
    	"bloom",
    	"dwelt",
    	"melts",
    	"risen",
    	"flags",
    	"knelt",
    	"fiber",
    	"roofs",
    	"freed",
    	"armor",
    	"piles",
    	"aimed",
    	"algae",
    	"twigs",
    	"lemon",
    	"ditch",
    	"drunk",
    	"rests",
    	"chill",
    	"slain",
    	"panic",
    	"cords",
    	"tuned",
    	"crisp",
    	"ledge",
    	"dived",
    	"swamp",
    	"clung",
    	"stole",
    	"molds",
    	"yarns",
    	"liver",
    	"gauge",
    	"breed",
    	"stool",
    	"gulls",
    	"awoke",
    	"gross",
    	"diary",
    	"rails",
    	"belly",
    	"trend",
    	"flask",
    	"stake",
    	"fried",
    	"draws",
    	"actor",
    	"handy",
    	"bowls",
    	"haste",
    	"scope",
    	"deals",
    	"knots",
    	"moons",
    	"essay",
    	"thump",
    	"hangs",
    	"bliss",
    	"dealt",
    	"gains",
    	"bombs",
    	"clown",
    	"palms",
    	"cones",
    	"roast",
    	"tidal",
    	"bored",
    	"chant",
    	"acids",
    	"dough",
    	"camps",
    	"swore",
    	"lover",
    	"hooks",
    	"males",
    	"cocoa",
    	"punch",
    	"award",
    	"reins",
    	"ninth",
    	"noses",
    	"links",
    	"drain",
    	"fills",
    	"nylon",
    	"lunar",
    	"pulse",
    	"flown",
    	"elbow",
    	"fatal",
    	"sites",
    	"moths",
    	"meats",
    	"foxes",
    	"mined",
    	"attic",
    	"fiery",
    	"mount",
    	"usage",
    	"swear",
    	"snowy",
    	"rusty",
    	"scare",
    	"traps",
    	"relax",
    	"react",
    	"valid",
    	"robin",
    	"cease",
    	"gills",
    	"prior",
    	"safer",
    	"polio",
    	"loyal",
    	"swell",
    	"salty",
    	"marsh",
    	"vague",
    	"weave",
    	"mound",
    	"seals",
    	"mules",
    	"virus",
    	"scout",
    	"acute",
    	"windy",
    	"stout",
    	"folds",
    	"seize",
    	"hilly",
    	"joins",
    	"pluck",
    	"stack",
    	"lords",
    	"dunes",
    	"burro",
    	"hawks",
    	"trout",
    	"feeds",
    	"scarf",
    	"halls",
    	"coals",
    	"towel",
    	"souls",
    	"elect",
    	"buggy",
    	"pumps",
    	"loans",
    	"spins",
    	"files",
    	"oxide",
    	"pains",
    	"photo",
    	"rival",
    	"flats",
    	"syrup",
    	"rodeo",
    	"sands",
    	"moose",
    	"pints",
    	"curly",
    	"comic",
    	"cloak",
    	"onion",
    	"clams",
    	"scrap",
    	"didst",
    	"couch",
    	"codes",
    	"fails",
    	"ounce",
    	"lodge",
    	"greet",
    	"gypsy",
    	"utter",
    	"paved",
    	"zones",
    	"fours",
    	"alley",
    	"tiles",
    	"bless",
    	"crest",
    	"elder",
    	"kills",
    	"yeast",
    	"erect",
    	"bugle",
    	"medal",
    	"roles",
    	"hound",
    	"snail",
    	"alter",
    	"ankle",
    	"relay",
    	"loops",
    	"zeros",
    	"bites",
    	"modes",
    	"debts",
    	"realm",
    	"glove",
    	"rayon",
    	"swims",
    	"poked",
    	"stray",
    	"lifts",
    	"maker",
    	"lumps",
    	"graze",
    	"dread",
    	"barns",
    	"docks",
    	"masts",
    	"pours",
    	"wharf",
    	"curse",
    	"plump",
    	"robes",
    	"seeks",
    	"cedar",
    	"curls",
    	"jolly",
    	"myths",
    	"cages",
    	"gloom",
    	"locks",
    	"pedal",
    	"beets",
    	"crows",
    	"anode",
    	"slash",
    	"creep",
    	"rowed",
    	"chips",
    	"fists",
    	"wines",
    	"cares",
    	"valve",
    	"newer",
    	"motel",
    	"ivory",
    	"necks",
    	"clamp",
    	"barge",
    	"blues",
    	"alien",
    	"frown",
    	"strap",
    	"crews",
    	"shack",
    	"gonna",
    	"saves",
    	"stump",
    	"ferry",
    	"idols",
    	"cooks",
    	"juicy",
    	"glare",
    	"carts",
    	"alloy",
    	"bulbs",
    	"lawns",
    	"lasts",
    	"fuels",
    	"oddly",
    	"crane",
    	"filed",
    	"weird",
    	"shawl",
    	"slips",
    	"troop",
    	"bolts",
    	"suite",
    	"sleek",
    	"quilt",
    	"tramp",
    	"blaze",
    	"atlas",
    	"odors",
    	"scrub",
    	"crabs",
    	"probe",
    	"logic",
    	"adobe",
    	"exile",
    	"rebel",
    	"grind",
    	"sting",
    	"spine",
    	"cling",
    	"desks",
    	"grove",
    	"leaps",
    	"prose",
    	"lofty",
    	"agony",
    	"snare",
    	"tusks",
    	"bulls",
    	"moods",
    	"humid",
    	"finer",
    	"dimly",
    	"plank",
    	"china",
    	"pines",
    	"guilt",
    	"sacks",
    	"brace",
    	"quote",
    	"lathe",
    	"gaily",
    	"fonts",
    	"scalp",
    	"adopt",
    	"foggy",
    	"ferns",
    	"grams",
    	"clump",
    	"perch",
    	"tumor",
    	"teens",
    	"crank",
    	"fable",
    	"hedge",
    	"genes",
    	"sober",
    	"boast",
    	"tract",
    	"cigar",
    	"unite",
    	"owing",
    	"thigh",
    	"haiku",
    	"swish",
    	"dikes",
    	"wedge",
    	"booth",
    	"eased",
    	"frail",
    	"cough",
    	"tombs",
    	"darts",
    	"forts",
    	"choir",
    	"pouch",
    	"pinch",
    	"hairy",
    	"buyer",
    	"torch",
    	"vigor",
    	"waltz",
    	"heats",
    	"herbs",
    	"users",
    	"flint",
    	"click",
    	"madam",
    	"bleak",
    	"blunt",
    	"aided",
    	"lacks",
    	"masks",
    	"waded",
    	"risks",
    	"nurse",
    	"chaos",
    	"sewed",
    	"cured",
    	"ample",
    	"lease",
    	"steak",
    	"sinks",
    	"merit",
    	"bluff",
    	"bathe",
    	"gleam",
    	"bonus",
    	"colts",
    	"shear",
    	"gland",
    	"silky",
    	"skate",
    	"birch",
    	"anvil",
    	"sleds",
    	"groan",
    	"maids",
    	"meets",
    	"speck",
    	"hymns",
    	"hints",
    	"drown",
    	"bosom",
    	"slick",
    	"quest",
    	"coils",
    	"spied",
    	"snows",
    	"stead",
    	"snack",
    	"plows",
    	"blond",
    	"tamed",
    	"thorn",
    	"waits",
    	"glued",
    	"banjo",
    	"tease",
    	"arena",
    	"bulky",
    	"carve",
    	"stunt",
    	"warms",
    	"shady",
    	"razor",
    	"folly",
    	"leafy",
    	"notch",
    	"fools",
    	"otter",
    	"pears",
    	"flush",
    	"genus",
    	"ached",
    	"fives",
    	"flaps",
    	"spout",
    	"smote",
    	"fumes",
    	"adapt",
    	"cuffs",
    	"tasty",
    	"stoop",
    	"clips",
    	"disks",
    	"sniff",
    	"lanes",
    	"brisk",
    	"imply",
    	"demon",
    	"super",
    	"furry",
    	"raged",
    	"growl",
    	"texts",
    	"hardy",
    	"stung",
    	"typed",
    	"hates",
    	"wiser",
    	"timid",
    	"serum",
    	"beaks",
    	"rotor",
    	"casts",
    	"baths",
    	"glide",
    	"plots",
    	"trait",
    	"resin",
    	"slums",
    	"lyric",
    	"puffs",
    	"decks",
    	"brood",
    	"mourn",
    	"aloft",
    	"abuse",
    	"whirl",
    	"edged",
    	"ovary",
    	"quack",
    	"heaps",
    	"slang",
    	"await",
    	"civic",
    	"saint",
    	"bevel",
    	"sonar",
    	"aunts",
    	"packs",
    	"froze",
    	"tonic",
    	"corps",
    	"swarm",
    	"frank",
    	"repay",
    	"gaunt",
    	"wired",
    	"niece",
    	"cello",
    	"needy",
    	"chuck",
    	"stony",
    	"media",
    	"surge",
    	"hurts",
    	"repel",
    	"husky",
    	"dated",
    	"hunts",
    	"mists",
    	"exert",
    	"dries",
    	"mates",
    	"sworn",
    	"baker",
    	"spice",
    	"oasis",
    	"boils",
    	"spurs",
    	"doves",
    	"sneak",
    	"paces",
    	"colon",
    	"siege",
    	"strum",
    	"drier",
    	"cacao",
    	"humus",
    	"bales",
    	"piped",
    	"nasty",
    	"rinse",
    	"boxer",
    	"shrub",
    	"amuse",
    	"tacks",
    	"cited",
    	"slung",
    	"delta",
    	"laden",
    	"larva",
    	"rents",
    	"yells",
    	"spool",
    	"spill",
    	"crush",
    	"jewel",
    	"snaps",
    	"stain",
    	"kicks",
    	"tying",
    	"slits",
    	"rated",
    	"eerie",
    	"smash",
    	"plums",
    	"zebra",
    	"earns",
    	"bushy",
    	"scary",
    	"squad",
    	"tutor",
    	"silks",
    	"slabs",
    	"bumps",
    	"evils",
    	"fangs",
    	"snout",
    	"peril",
    	"pivot",
    	"yacht",
    	"lobby",
    	"jeans",
    	"grins",
    	"viola",
    	"liner",
    	"comet",
    	"scars",
    	"chops",
    	"raids",
    	"eater",
    	"slate",
    	"skips",
    	"soles",
    	"misty",
    	"urine",
    	"knobs",
    	"sleet",
    	"holly",
    	"pests",
    	"forks",
    	"grill",
    	"trays",
    	"pails",
    	"borne",
    	"tenor",
    	"wares",
    	"carol",
    	"woody",
    	"canon",
    	"wakes",
    	"kitty",
    	"miner",
    	"polls",
    	"shaky",
    	"nasal",
    	"scorn",
    	"chess",
    	"taxis",
    	"crate",
    	"shyly",
    	"tulip",
    	"forge",
    	"nymph",
    	"budge",
    	"lowly",
    	"abide",
    	"depot",
    	"oases",
    	"asses",
    	"sheds",
    	"fudge",
    	"pills",
    	"rivet",
    	"thine",
    	"groom",
    	"lanky",
    	"boost",
    	"broth",
    	"heave",
    	"gravy",
    	"beech",
    	"timed",
    	"quail",
    	"inert",
    	"gears",
    	"chick",
    	"hinge",
    	"trash",
    	"clash",
    	"sighs",
    	"renew",
    	"bough",
    	"dwarf",
    	"slows",
    	"quill",
    	"shave",
    	"spore",
    	"sixes",
    	"chunk",
    	"madly",
    	"paced",
    	"braid",
    	"fuzzy",
    	"motto",
    	"spies",
    	"slack",
    	"mucus",
    	"magma",
    	"awful",
    	"discs",
    	"erase",
    	"posed",
    	"asset",
    	"cider",
    	"taper",
    	"theft",
    	"churn",
    	"satin",
    	"slots",
    	"taxed",
    	"bully",
    	"sloth",
    	"shale",
    	"tread",
    	"raked",
    	"curds",
    	"manor",
    	"aisle",
    	"bulge",
    	"loins",
    	"stair",
    	"tapes",
    	"leans",
    	"bunks",
    	"squat",
    	"towed",
    	"lance",
    	"panes",
    	"sakes",
    	"heirs",
    	"caste",
    	"dummy",
    	"pores",
    	"fauna",
    	"crook",
    	"poise",
    	"epoch",
    	"risky",
    	"warns",
    	"fling",
    	"berry",
    	"grape",
    	"flank",
    	"drags",
    	"squid",
    	"pelts",
    	"icing",
    	"irony",
    	"irons",
    	"barks",
    	"whoop",
    	"choke",
    	"diets",
    	"whips",
    	"tally",
    	"dozed",
    	"twine",
    	"kites",
    	"bikes",
    	"ticks",
    	"riots",
    	"roars",
    	"vault",
    	"looms",
    	"scold",
    	"blink",
    	"dandy",
    	"pupae",
    	"sieve",
    	"spike",
    	"ducts",
    	"lends",
    	"pizza",
    	"brink",
    	"widen",
    	"plumb",
    	"pagan",
    	"feats",
    	"bison",
    	"soggy",
    	"scoop",
    	"argon",
    	"nudge",
    	"skiff",
    	"amber",
    	"sexes",
    	"rouse",
    	"salts",
    	"hitch",
    	"exalt",
    	"leash",
    	"dined",
    	"chute",
    	"snort",
    	"gusts",
    	"melon",
    	"cheat",
    	"reefs",
    	"llama",
    	"lasso",
    	"debut",
    	"quota",
    	"oaths",
    	"prone",
    	"mixes",
    	"rafts",
    	"dives",
    	"stale",
    	"inlet",
    	"flick",
    	"pinto",
    	"brows",
    	"untie",
    	"batch",
    	"greed",
    	"chore",
    	"stirs",
    	"blush",
    	"onset",
    	"barbs",
    	"volts",
    	"beige",
    	"swoop",
    	"paddy",
    	"laced",
    	"shove",
    	"jerky",
    	"poppy",
    	"leaks",
    	"fares",
    	"dodge",
    	"godly",
    	"squaw",
    	"affix",
    	"brute",
    	"nicer",
    	"undue",
    	"snarl",
    	"merge",
    	"doses",
    	"showy",
    	"daddy",
    	"roost",
    	"vases",
    	"swirl",
    	"petty",
    	"colds",
    	"curry",
    	"cobra",
    	"genie",
    	"flare",
    	"messy",
    	"cores",
    	"soaks",
    	"ripen",
    	"whine",
    	"amino",
    	"plaid",
    	"spiny",
    	"mowed",
    	"baton",
    	"peers",
    	"vowed",
    	"pious",
    	"swans",
    	"exits",
    	"afoot",
    	"plugs",
    	"idiom",
    	"chili",
    	"rites",
    	"serfs",
    	"cleft",
    	"berth",
    	"grubs",
    	"annex",
    	"dizzy",
    	"hasty",
    	"latch",
    	"wasps",
    	"mirth",
    	"baron",
    	"plead",
    	"aloof",
    	"aging",
    	"pixel",
    	"bared",
    	"mummy",
    	"hotly",
    	"auger",
    	"buddy",
    	"chaps",
    	"badge",
    	"stark",
    	"fairs",
    	"gully",
    	"mumps",
    	"emery",
    	"filly",
    	"ovens",
    	"drone",
    	"gauze",
    	"idiot",
    	"fussy",
    	"annoy",
    	"shank",
    	"gouge",
    	"bleed",
    	"elves",
    	"roped",
    	"unfit",
    	"baggy",
    	"mower",
    	"scant",
    	"grabs",
    	"fleas",
    	"lousy",
    	"album",
    	"sawed",
    	"cooky",
    	"murky",
    	"infer",
    	"burly",
    	"waged",
    	"dingy",
    	"brine",
    	"kneel",
    	"creak",
    	"vanes",
    	"smoky",
    	"spurt",
    	"combs",
    	"easel",
    	"laces",
    	"humps",
    	"rumor",
    	"aroma",
    	"horde",
    	"swiss",
    	"leapt",
    	"opium",
    	"slime",
    	"afire",
    	"pansy",
    	"mares",
    	"soaps",
    	"husks",
    	"snips",
    	"hazel",
    	"lined",
    	"cafes",
    	"naive",
    	"wraps",
    	"sized",
    	"piers",
    	"beset",
    	"agile",
    	"tongs",
    	"steed",
    	"fraud",
    	"booty",
    	"valor",
    	"downy",
    	"witty",
    	"mossy",
    	"psalm",
    	"scuba",
    	"tours",
    	"polka",
    	"milky",
    	"gaudy",
    	"shrug",
    	"tufts",
    	"wilds",
    	"laser",
    	"truss",
    	"hares",
    	"creed",
    	"lilac",
    	"siren",
    	"tarry",
    	"bribe",
    	"swine",
    	"muted",
    	"flips",
    	"cures",
    	"sinew",
    	"boxed",
    	"hoops",
    	"gasps",
    	"hoods",
    	"niche",
    	"yucca",
    	"glows",
    	"sewer",
    	"whack",
    	"fuses",
    	"gowns",
    	"droop",
    	"bucks",
    	"pangs",
    	"mails",
    	"whisk",
    	"haven",
    	"clasp",
    	"sling",
    	"stint",
    	"urges",
    	"champ",
    	"piety",
    	"chirp",
    	"pleat",
    	"posse",
    	"sunup",
    	"menus",
    	"howls",
    	"quake",
    	"knack",
    	"plaza",
    	"fiend",
    	"caked",
    	"bangs",
    	"erupt",
    	"poker",
    	"olden",
    	"cramp",
    	"voter",
    	"poses",
    	"manly",
    	"slump",
    	"fined",
    	"grips",
    	"gaped",
    	"purge",
    	"hiked",
    	"maize",
    	"fluff",
    	"strut",
    	"sloop",
    	"prowl",
    	"roach",
    	"cocks",
    	"bland",
    	"dials",
    	"plume",
    	"slaps",
    	"soups",
    	"dully",
    	"wills",
    	"foams",
    	"solos",
    	"skier",
    	"eaves",
    	"totem",
    	"fused",
    	"latex",
    	"veils",
    	"mused",
    	"mains",
    	"myrrh",
    	"racks",
    	"galls",
    	"gnats",
    	"bouts",
    	"sisal",
    	"shuts",
    	"hoses",
    	"dryly",
    	"hover",
    	"gloss",
    	"seeps",
    	"denim",
    	"putty",
    	"guppy",
    	"leaky",
    	"dusky",
    	"filth",
    	"oboes",
    	"spans",
    	"fowls",
    	"adorn",
    	"glaze",
    	"haunt",
    	"dares",
    	"obeys",
    	"bakes",
    	"abyss",
    	"smelt",
    	"gangs",
    	"aches",
    	"trawl",
    	"claps",
    	"undid",
    	"spicy",
    	"hoist",
    	"fades",
    	"vicar",
    	"acorn",
    	"pussy",
    	"gruff",
    	"musty",
    	"tarts",
    	"snuff",
    	"hunch",
    	"truce",
    	"tweed",
    	"dryer",
    	"loser",
    	"sheaf",
    	"moles",
    	"lapse",
    	"tawny",
    	"vexed",
    	"autos",
    	"wager",
    	"domes",
    	"sheen",
    	"clang",
    	"spade",
    	"sowed",
    	"broil",
    	"slyly",
    	"studs",
    	"grunt",
    	"donor",
    	"slugs",
    	"aspen",
    	"homer",
    	"croak",
    	"tithe",
    	"halts",
    	"avert",
    	"havoc",
    	"hogan",
    	"glint",
    	"ruddy",
    	"jeeps",
    	"flaky",
    	"ladle",
    	"taunt",
    	"snore",
    	"fines",
    	"props",
    	"prune",
    	"pesos",
    	"radii",
    	"pokes",
    	"tiled",
    	"daisy",
    	"heron",
    	"villa",
    	"farce",
    	"binds",
    	"cites",
    	"fixes",
    	"jerks",
    	"livid",
    	"waked",
    	"inked",
    	"booms",
    	"chews",
    	"licks",
    	"hyena",
    	"scoff",
    	"lusty",
    	"sonic",
    	"smith",
    	"usher",
    	"tucks",
    	"vigil",
    	"molts",
    	"sects",
    	"spars",
    	"dumps",
    	"scaly",
    	"wisps",
    	"sores",
    	"mince",
    	"panda",
    	"flier",
    	"axles",
    	"plied",
    	"booby",
    	"patio",
    	"rabbi",
    	"petal",
    	"polyp",
    	"tints",
    	"grate",
    	"troll",
    	"tolls",
    	"relic",
    	"phony",
    	"bleat",
    	"flaws",
    	"flake",
    	"snags",
    	"aptly",
    	"drawl",
    	"ulcer",
    	"soapy",
    	"bossy",
    	"monks",
    	"crags",
    	"caged",
    	"twang",
    	"diner",
    	"taped",
    	"cadet",
    	"grids",
    	"spawn",
    	"guile",
    	"noose",
    	"mores",
    	"girth",
    	"slimy",
    	"aides",
    	"spasm",
    	"burrs",
    	"alibi",
    	"lymph",
    	"saucy",
    	"muggy",
    	"liter",
    	"joked",
    	"goofy",
    	"exams",
    	"enact",
    	"stork",
    	"lured",
    	"toxic",
    	"omens",
    	"nears",
    	"covet",
    	"wrung",
    	"forum",
    	"venom",
    	"moody",
    	"alder",
    	"sassy",
    	"flair",
    	"guild",
    	"prays",
    	"wrens",
    	"hauls",
    	"stave",
    	"tilts",
    	"pecks",
    	"stomp",
    	"gales",
    	"tempt",
    	"capes",
    	"mesas",
    	"omits",
    	"tepee",
    	"harry",
    	"wring",
    	"evoke",
    	"limes",
    	"cluck",
    	"lunge",
    	"highs",
    	"canes",
    	"giddy",
    	"lithe",
    	"verge",
    	"khaki",
    	"queue",
    	"loath",
    	"foyer",
    	"outdo",
    	"fared",
    	"deter",
    	"crumb",
    	"astir",
    	"spire",
    	"jumpy",
    	"extol",
    	"buoys",
    	"stubs",
    	"lucid",
    	"thong",
    	"afore",
    	"whiff",
    	"maxim",
    	"hulls",
    	"clogs",
    	"slats",
    	"jiffy",
    	"arbor",
    	"cinch",
    	"igloo",
    	"goody",
    	"gazes",
    	"dowel",
    	"calms",
    	"bitch",
    	"scowl",
    	"gulps",
    	"coded",
    	"waver",
    	"mason",
    	"lobes",
    	"ebony",
    	"flail",
    	"isles",
    	"clods",
    	"dazed",
    	"adept",
    	"oozed",
    	"sedan",
    	"clays",
    	"warts",
    	"ketch",
    	"skunk",
    	"manes",
    	"adore",
    	"sneer",
    	"mango",
    	"fiord",
    	"flora",
    	"roomy",
    	"minks",
    	"thaws",
    	"watts",
    	"freer",
    	"exult",
    	"plush",
    	"paled",
    	"twain",
    	"clink",
    	"scamp",
    	"pawed",
    	"grope",
    	"bravo",
    	"gable",
    	"stink",
    	"sever",
    	"waned",
    	"rarer",
    	"regal",
    	"wards",
    	"fawns",
    	"babes",
    	"unify",
    	"amend",
    	"oaken",
    	"glade",
    	"visor",
    	"hefty",
    	"nines",
    	"throb",
    	"pecan",
    	"butts",
    	"pence",
    	"sills",
    	"jails",
    	"flyer",
    	"saber",
    	"nomad",
    	"miter",
    	"beeps",
    	"domed",
    	"gulfs",
    	"curbs",
    	"heath",
    	"moors",
    	"aorta",
    	"larks",
    	"tangy",
    	"wryly",
    	"cheep",
    	"rages",
    	"evade",
    	"lures",
    	"freak",
    	"vogue",
    	"tunic",
    	"slams",
    	"knits",
    	"dumpy",
    	"mania",
    	"spits",
    	"firth",
    	"hikes",
    	"trots",
    	"nosed",
    	"clank",
    	"dogma",
    	"bloat",
    	"balsa",
    	"graft",
    	"middy",
    	"stile",
    	"keyed",
    	"finch",
    	"sperm",
    	"chaff",
    	"wiles",
    	"amigo",
    	"copra",
    	"amiss",
    	"eying",
    	"twirl",
    	"lurch",
    	"popes",
    	"chins",
    	"smock",
    	"tines",
    	"guise",
    	"grits",
    	"junks",
    	"shoal",
    	"cache",
    	"tapir",
    	"atoll",
    	"deity",
    	"toils",
    	"spree",
    	"mocks",
    	"scans",
    	"shorn",
    	"revel",
    	"raven",
    	"hoary",
    	"reels",
    	"scuff",
    	"mimic",
    	"weedy",
    	"corny",
    	"truer",
    	"rouge",
    	"ember",
    	"floes",
    	"torso",
    	"wipes",
    	"edict",
    	"sulky",
    	"recur",
    	"groin",
    	"baste",
    	"kinks",
    	"surer",
    	"piggy",
    	"moldy",
    	"franc",
    	"liars",
    	"inept",
    	"gusty",
    	"facet",
    	"jetty",
    	"equip",
    	"leper",
    	"slink",
    	"soars",
    	"cater",
    	"dowry",
    	"sided",
    	"yearn",
    	"decoy",
    	"taboo",
    	"ovals",
    	"heals",
    	"pleas",
    	"beret",
    	"spilt",
    	"gayly",
    	"rover",
    	"endow",
    	"pygmy",
    	"carat",
    	"abbey",
    	"vents",
    	"waken",
    	"chimp",
    	"fumed",
    	"sodas",
    	"vinyl",
    	"clout",
    	"wades",
    	"mites",
    	"smirk",
    	"bores",
    	"bunny",
    	"surly",
    	"frock",
    	"foray",
    	"purer",
    	"milks",
    	"query",
    	"mired",
    	"blare",
    	"froth",
    	"gruel",
    	"navel",
    	"paler",
    	"puffy",
    	"casks",
    	"grime",
    	"derby",
    	"mamma",
    	"gavel",
    	"teddy",
    	"vomit",
    	"moans",
    	"allot",
    	"defer",
    	"wield",
    	"viper",
    	"louse",
    	"erred",
    	"hewed",
    	"abhor",
    	"wrest",
    	"waxen",
    	"adage",
    	"ardor",
    	"stabs",
    	"pored",
    	"rondo",
    	"loped",
    	"fishy",
    	"bible",
    	"hires",
    	"foals",
    	"feuds",
    	"jambs",
    	"thuds",
    	"jeers",
    	"knead",
    	"quirk",
    	"rugby",
    	"expel",
    	"greys",
    	"rigor",
    	"ester",
    	"lyres",
    	"aback",
    	"glues",
    	"lotus",
    	"lurid",
    	"rungs",
    	"hutch",
    	"thyme",
    	"valet",
    	"tommy",
    	"yokes",
    	"epics",
    	"trill",
    	"pikes",
    	"ozone",
    	"caper",
    	"chime",
    	"frees",
    	"famed",
    	"leech",
    	"smite",
    	"neigh",
    	"erode",
    	"robed",
    	"hoard",
    	"salve",
    	"conic",
    	"gawky",
    	"craze",
    	"jacks",
    	"gloat",
    	"mushy",
    	"rumps",
    	"fetus",
    	"wince",
    	"pinks",
    	"shalt",
    	"toots",
    	"glens",
    	"cooed",
    	"rusts",
    	"stews",
    	"shred",
    	"parka",
    	"chugs",
    	"winks",
    	"clots",
    	"shrew",
    	"booed",
    	"filmy",
    	"juror",
    	"dents",
    	"gummy",
    	"grays",
    	"hooky",
    	"butte",
    	"dogie",
    	"poled",
    	"reams",
    	"fifes",
    	"spank",
    	"gayer",
    	"tepid",
    	"spook",
    	"taint",
    	"flirt",
    	"rogue",
    	"spiky",
    	"opals",
    	"miser",
    	"cocky",
    	"coyly",
    	"balmy",
    	"slosh",
    	"brawl",
    	"aphid",
    	"faked",
    	"hydra",
    	"brags",
    	"chide",
    	"yanks",
    	"allay",
    	"video",
    	"altos",
    	"eases",
    	"meted",
    	"chasm",
    	"longs",
    	"excel",
    	"taffy",
    	"impel",
    	"savor",
    	"koala",
    	"quays",
    	"dawns",
    	"proxy",
    	"clove",
    	"duets",
    	"dregs",
    	"tardy",
    	"briar",
    	"grimy",
    	"ultra",
    	"meaty",
    	"halve",
    	"wails",
    	"suede",
    	"mauve",
    	"envoy",
    	"arson",
    	"coves",
    	"gooey",
    	"brews",
    	"sofas",
    	"chums",
    	"amaze",
    	"zooms",
    	"abbot",
    	"halos",
    	"scour",
    	"suing",
    	"cribs",
    	"sagas",
    	"enema",
    	"wordy",
    	"harps",
    	"coupe",
    	"molar",
    	"flops",
    	"weeps",
    	"mints",
    	"ashen",
    	"felts",
    	"askew",
    	"munch",
    	"mewed",
    	"divan",
    	"vices",
    	"jumbo",
    	"blobs",
    	"blots",
    	"spunk",
    	"acrid",
    	"topaz",
    	"cubed",
    	"clans",
    	"flees",
    	"slurs",
    	"gnaws",
    	"welds",
    	"fords",
    	"emits",
    	"agate",
    	"pumas",
    	"mends",
    	"darks",
    	"dukes",
    	"plies",
    	"canny",
    	"hoots",
    	"oozes",
    	"lamed",
    	"fouls",
    	"clefs",
    	"nicks",
    	"mated",
    	"skims",
    	"brunt",
    	"tuber",
    	"tinge",
    	"fates",
    	"ditty",
    	"thins",
    	"frets",
    	"eider",
    	"bayou",
    	"mulch",
    	"fasts",
    	"amass",
    	"damps",
    	"morns",
    	"friar",
    	"palsy",
    	"vista",
    	"croon",
    	"conch",
    	"udder",
    	"tacos",
    	"skits",
    	"mikes",
    	"quits",
    	"preen",
    	"aster",
    	"adder",
    	"elegy",
    	"pulpy",
    	"scows",
    	"baled",
    	"hovel",
    	"lavas",
    	"crave",
    	"optic",
    	"welts",
    	"busts",
    	"knave",
    	"razed",
    	"shins",
    	"totes",
    	"scoot",
    	"dears",
    	"crock",
    	"mutes",
    	"trims",
    	"skein",
    	"doted",
    	"shuns",
    	"veers",
    	"fakes",
    	"yoked",
    	"wooed",
    	"hacks",
    	"sprig",
    	"wands",
    	"lulls",
    	"seers",
    	"snobs",
    	"nooks",
    	"pined",
    	"perky",
    	"mooed",
    	"frill",
    	"dines",
    	"booze",
    	"tripe",
    	"prong",
    	"drips",
    	"odder",
    	"levee",
    	"antic",
    	"sidle",
    	"pithy",
    	"corks",
    	"yelps",
    	"joker",
    	"fleck",
    	"buffs",
    	"scram",
    	"tiers",
    	"bogey",
    	"doled",
    	"irate",
    	"vales",
    	"coped",
    	"hails",
    	"elude",
    	"bulks",
    	"aired",
    	"vying",
    	"stags",
    	"strew",
    	"cocci",
    	"pacts",
    	"scabs",
    	"silos",
    	"dusts",
    	"yodel",
    	"terse",
    	"jaded",
    	"baser",
    	"jibes",
    	"foils",
    	"sways",
    	"forgo",
    	"slays",
    	"preys",
    	"treks",
    	"quell",
    	"peeks",
    	"assay",
    	"lurks",
    	"eject",
    	"boars",
    	"trite",
    	"belch",
    	"gnash",
    	"wanes",
    	"lutes",
    	"whims",
    	"dosed",
    	"chewy",
    	"snipe",
    	"umbra",
    	"teems",
    	"dozes",
    	"kelps",
    	"upped",
    	"brawn",
    	"doped",
    	"shush",
    	"rinds",
    	"slush",
    	"moron",
    	"voile",
    	"woken",
    	"fjord",
    	"sheik",
    	"jests",
    	"kayak",
    	"slews",
    	"toted",
    	"saner",
    	"drape",
    	"patty",
    	"raves",
    	"sulfa",
    	"grist",
    	"skied",
    	"vixen",
    	"civet",
    	"vouch",
    	"tiara",
    	"homey",
    	"moped",
    	"runts",
    	"serge",
    	"kinky",
    	"rills",
    	"corns",
    	"brats",
    	"pries",
    	"amble",
    	"fries",
    	"loons",
    	"tsars",
    	"datum",
    	"musky",
    	"pigmy",
    	"gnome",
    	"ravel",
    	"ovule",
    	"icily",
    	"liken",
    	"lemur",
    	"frays",
    	"silts",
    	"sifts",
    	"plods",
    	"ramps",
    	"tress",
    	"earls",
    	"dudes",
    	"waive",
    	"karat",
    	"jolts",
    	"peons",
    	"beers",
    	"horny",
    	"pales",
    	"wreak",
    	"lairs",
    	"lynch",
    	"stank",
    	"swoon",
    	"idler",
    	"abort",
    	"blitz",
    	"ensue",
    	"atone",
    	"bingo",
    	"roves",
    	"kilts",
    	"scald",
    	"adios",
    	"cynic",
    	"dulls",
    	"memos",
    	"elfin",
    	"dales",
    	"peels",
    	"peals",
    	"bares",
    	"sinus",
    	"crone",
    	"sable",
    	"hinds",
    	"shirk",
    	"enrol",
    	"wilts",
    	"roams",
    	"duped",
    	"cysts",
    	"mitts",
    	"safes",
    	"spats",
    	"coops",
    	"filet",
    	"knell",
    	"refit",
    	"covey",
    	"punks",
    	"kilns",
    	"fitly",
    	"abate",
    	"talcs",
    	"heeds",
    	"duels",
    	"wanly",
    	"ruffs",
    	"gauss",
    	"lapel",
    	"jaunt",
    	"whelp",
    	"cleat",
    	"gauzy",
    	"dirge",
    	"edits",
    	"wormy",
    	"moats",
    	"smear",
    	"prods",
    	"bowel",
    	"frisk",
    	"vests",
    	"bayed",
    	"rasps",
    	"tames",
    	"delve",
    	"embed",
    	"befit",
    	"wafer",
    	"ceded",
    	"novas",
    	"feign",
    	"spews",
    	"larch",
    	"huffs",
    	"doles",
    	"mamas",
    	"hulks",
    	"pried",
    	"brims",
    	"irked",
    	"aspic",
    	"swipe",
    	"mealy",
    	"skimp",
    	"bluer",
    	"slake",
    	"dowdy",
    	"penis",
    	"brays",
    	"pupas",
    	"egret",
    	"flunk",
    	"phlox",
    	"gripe",
    	"peony",
    	"douse",
    	"blurs",
    	"darns",
    	"slunk",
    	"lefts",
    	"chats",
    	"inane",
    	"vials",
    	"stilt",
    	"rinks",
    	"woofs",
    	"wowed",
    	"bongs",
    	"frond",
    	"ingot",
    	"evict",
    	"singe",
    	"shyer",
    	"flied",
    	"slops",
    	"dolts",
    	"drool",
    	"dells",
    	"whelk",
    	"hippy",
    	"feted",
    	"ether",
    	"cocos",
    	"hives",
    	"jibed",
    	"mazes",
    	"trios",
    	"sirup",
    	"squab",
    	"laths",
    	"leers",
    	"pasta",
    	"rifts",
    	"lopes",
    	"alias",
    	"whirs",
    	"diced",
    	"slags",
    	"lodes",
    	"foxed",
    	"idled",
    	"prows",
    	"plait",
    	"malts",
    	"chafe",
    	"cower",
    	"toyed",
    	"chefs",
    	"keels",
    	"sties",
    	"racer",
    	"etude",
    	"sucks",
    	"sulks",
    	"micas",
    	"czars",
    	"copse",
    	"ailed",
    	"abler",
    	"rabid",
    	"golds",
    	"croup",
    	"snaky",
    	"visas",
    	"palls",
    	"mopes",
    	"boned",
    	"wispy",
    	"raved",
    	"swaps",
    	"junky",
    	"doily",
    	"pawns",
    	"tamer",
    	"poach",
    	"baits",
    	"damns",
    	"gumbo",
    	"daunt",
    	"prank",
    	"hunks",
    	"buxom",
    	"heres",
    	"honks",
    	"stows",
    	"unbar",
    	"idles",
    	"routs",
    	"sages",
    	"goads",
    	"remit",
    	"copes",
    	"deign",
    	"culls",
    	"girds",
    	"haves",
    	"lucks",
    	"stunk",
    	"dodos",
    	"shams",
    	"snubs",
    	"icons",
    	"usurp",
    	"dooms",
    	"hells",
    	"soled",
    	"comas",
    	"paves",
    	"maths",
    	"perks",
    	"limps",
    	"wombs",
    	"blurb",
    	"daubs",
    	"cokes",
    	"sours",
    	"stuns",
    	"cased",
    	"musts",
    	"coeds",
    	"cowed",
    	"aping",
    	"zoned",
    	"rummy",
    	"fetes",
    	"skulk",
    	"quaff",
    	"rajah",
    	"deans",
    	"reaps",
    	"galas",
    	"tills",
    	"roved",
    	"kudos",
    	"toned",
    	"pared",
    	"scull",
    	"vexes",
    	"punts",
    	"snoop",
    	"bails",
    	"dames",
    	"hazes",
    	"lores",
    	"marts",
    	"voids",
    	"ameba",
    	"rakes",
    	"adzes",
    	"harms",
    	"rears",
    	"satyr",
    	"swill",
    	"hexes",
    	"colic",
    	"leeks",
    	"hurls",
    	"yowls",
    	"ivies",
    	"plops",
    	"musks",
    	"papaw",
    	"jells",
    	"bused",
    	"cruet",
    	"bided",
    	"filch",
    	"zests",
    	"rooks",
    	"laxly",
    	"rends",
    	"loams",
    	"basks",
    	"sires",
    	"carps",
    	"pokey",
    	"flits",
    	"muses",
    	"bawls",
    	"shuck",
    	"viler",
    	"lisps",
    	"peeps",
    	"sorer",
    	"lolls",
    	"prude",
    	"diked",
    	"floss",
    	"flogs",
    	"scums",
    	"dopes",
    	"bogie",
    	"pinky",
    	"leafs",
    	"tubas",
    	"scads",
    	"lowed",
    	"yeses",
    	"biked",
    	"qualm",
    	"evens",
    	"caned",
    	"gawks",
    	"whits",
    	"wooly",
    	"gluts",
    	"romps",
    	"bests",
    	"dunce",
    	"crony",
    	"joist",
    	"tunas",
    	"boner",
    	"malls",
    	"parch",
    	"avers",
    	"crams",
    	"pares",
    	"dally",
    	"bigot",
    	"kales",
    	"flays",
    	"leach",
    	"gushy",
    	"pooch",
    	"huger",
    	"slyer",
    	"golfs",
    	"mires",
    	"flues",
    	"loafs",
    	"arced",
    	"acnes",
    	"neons",
    	"fiefs",
    	"dints",
    	"dazes",
    	"pouts",
    	"cored",
    	"yules",
    	"lilts",
    	"beefs",
    	"mutts",
    	"fells",
    	"cowls",
    	"spuds",
    	"lames",
    	"jawed",
    	"dupes",
    	"deads",
    	"bylaw",
    	"noons",
    	"nifty",
    	"clued",
    	"vireo",
    	"gapes",
    	"metes",
    	"cuter",
    	"maims",
    	"droll",
    	"cupid",
    	"mauls",
    	"sedge",
    	"papas",
    	"wheys",
    	"eking",
    	"loots",
    	"hilts",
    	"meows",
    	"beaus",
    	"dices",
    	"peppy",
    	"riper",
    	"fogey",
    	"gists",
    	"yogas",
    	"gilts",
    	"skews",
    	"cedes",
    	"zeals",
    	"alums",
    	"okays",
    	"elope",
    	"grump",
    	"wafts",
    	"soots",
    	"blimp",
    	"hefts",
    	"mulls",
    	"hosed",
    	"cress",
    	"doffs",
    	"ruder",
    	"pixie",
    	"waifs",
    	"ousts",
    	"pucks",
    	"biers",
    	"gulch",
    	"suets",
    	"hobos",
    	"lints",
    	"brans",
    	"teals",
    	"garbs",
    	"pewee",
    	"helms",
    	"turfs",
    	"quips",
    	"wends",
    	"banes",
    	"napes",
    	"icier",
    	"swats",
    	"bagel",
    	"hexed",
    	"ogres",
    	"goner",
    	"gilds",
    	"pyres",
    	"lards",
    	"bides",
    	"paged",
    	"talon",
    	"flout",
    	"medic",
    	"veals",
    	"putts",
    	"dirks",
    	"dotes",
    	"tippy",
    	"blurt",
    	"piths",
    	"acing",
    	"barer",
    	"whets",
    	"gaits",
    	"wools",
    	"dunks",
    	"heros",
    	"swabs",
    	"dirts",
    	"jutes",
    	"hemps",
    	"surfs",
    	"okapi",
    	"chows",
    	"shoos",
    	"dusks",
    	"parry",
    	"decal",
    	"furls",
    	"cilia",
    	"sears",
    	"novae",
    	"murks",
    	"warps",
    	"slues",
    	"lamer",
    	"saris",
    	"weans",
    	"purrs",
    	"dills",
    	"togas",
    	"newts",
    	"meany",
    	"bunts",
    	"razes",
    	"goons",
    	"wicks",
    	"ruses",
    	"vends",
    	"geode",
    	"drake",
    	"judos",
    	"lofts",
    	"pulps",
    	"lauds",
    	"mucks",
    	"vises",
    	"mocha",
    	"oiled",
    	"roman",
    	"ethyl",
    	"gotta",
    	"fugue",
    	"smack",
    	"gourd",
    	"bumpy",
    	"radix",
    	"fatty",
    	"borax",
    	"cubit",
    	"cacti",
    	"gamma",
    	"focal",
    	"avail",
    	"papal",
    	"golly",
    	"elite",
    	"versa",
    	"billy",
    	"adieu",
    	"annum",
    	"howdy",
    	"rhino",
    	"norms",
    	"bobby",
    	"axiom",
    	"setup",
    	"yolks",
    	"terns",
    	"mixer",
    	"genre",
    	"knoll",
    	"abode",
    	"junta",
    	"gorge",
    	"combo",
    	"alpha",
    	"overt",
    	"kinda",
    	"spelt",
    	"prick",
    	"nobly",
    	"ephod",
    	"audio",
    	"modal",
    	"veldt",
    	"warty",
    	"fluke",
    	"bonny",
    	"bream",
    	"rosin",
    	"bolls",
    	"doers",
    	"downs",
    	"beady",
    	"motif",
    	"humph",
    	"fella",
    	"mould",
    	"crepe",
    	"kerns",
    	"aloha",
    	"glyph",
    	"azure",
    	"riser",
    	"blest",
    	"locus",
    	"lumpy",
    	"beryl",
    	"wanna",
    	"brier",
    	"tuner",
    	"rowdy",
    	"mural",
    	"timer",
    	"canst",
    	"krill",
    	"quoth",
    	"lemme",
    	"triad",
    	"tenon",
    	"amply",
    	"deeps",
    	"padre",
    	"leant",
    	"pacer",
    	"octal",
    	"dolly",
    	"trans",
    	"sumac",
    	"foamy",
    	"lolly",
    	"giver",
    	"quipu",
    	"codex",
    	"manna",
    	"unwed",
    	"vodka",
    	"ferny",
    	"salon",
    	"duple",
    	"boron",
    	"revue",
    	"crier",
    	"alack",
    	"inter",
    	"dilly",
    	"whist",
    	"cults",
    	"spake",
    	"reset",
    	"loess",
    	"decor",
    	"mover",
    	"verve",
    	"ethic",
    	"gamut",
    	"lingo",
    	"dunno",
    	"align",
    	"sissy",
    	"incur",
    	"reedy",
    	"avant",
    	"piper",
    	"waxer",
    	"calyx",
    	"basil",
    	"coons",
    	"seine",
    	"piney",
    	"lemma",
    	"trams",
    	"winch",
    	"whirr",
    	"saith",
    	"ionic",
    	"heady",
    	"harem",
    	"tummy",
    	"sally",
    	"shied",
    	"dross",
    	"farad",
    	"saver",
    	"tilde",
    	"jingo",
    	"bower",
    	"serif",
    	"facto",
    	"belle",
    	"inset",
    	"bogus",
    	"caved",
    	"forte",
    	"sooty",
    	"bongo",
    	"toves",
    	"credo",
    	"basal",
    	"yella",
    	"aglow",
    	"glean",
    	"gusto",
    	"hymen",
    	"ethos",
    	"terra",
    	"brash",
    	"scrip",
    	"swash",
    	"aleph",
    	"tinny",
    	"itchy",
    	"wanta",
    	"trice",
    	"jowls",
    	"gongs",
    	"garde",
    	"boric",
    	"twill",
    	"sower",
    	"henry",
    	"awash",
    	"libel",
    	"spurn",
    	"sabre",
    	"rebut",
    	"penal",
    	"obese",
    	"sonny",
    	"quirt",
    	"mebbe",
    	"tacit",
    	"greek",
    	"xenon",
    	"hullo",
    	"pique",
    	"roger",
    	"negro",
    	"hadst",
    	"gecko",
    	"beget",
    	"uncut",
    	"aloes",
    	"louis",
    	"quint",
    	"clunk",
    	"raped",
    	"salvo",
    	"diode",
    	"matey",
    	"hertz",
    	"xylem",
    	"kiosk",
    	"apace",
    	"cawed",
    	"peter",
    	"wench",
    	"cohos",
    	"sorta",
    	"gamba",
    	"bytes",
    	"tango",
    	"nutty",
    	"axial",
    	"aleck",
    	"natal",
    	"clomp",
    	"gored",
    	"siree",
    	"bandy",
    	"gunny",
    	"runic",
    	"whizz",
    	"rupee",
    	"fated",
    	"wiper",
    	"bards",
    	"briny",
    	"staid",
    	"hocks",
    	"ochre",
    	"yummy",
    	"gents",
    	"soupy",
    	"roper",
    	"swath",
    	"cameo",
    	"edger",
    	"spate",
    	"gimme",
    	"ebbed",
    	"breve",
    	"theta",
    	"deems",
    	"dykes",
    	"servo",
    	"telly",
    	"tabby",
    	"tares",
    	"blocs",
    	"welch",
    	"ghoul",
    	"vitae",
    	"cumin",
    	"dinky",
    	"bronc",
    	"tabor",
    	"teeny",
    	"comer",
    	"borer",
    	"sired",
    	"privy",
    	"mammy",
    	"deary",
    	"gyros",
    	"sprit",
    	"conga",
    	"quire",
    	"thugs",
    	"furor",
    	"bloke",
    	"runes",
    	"bawdy",
    	"cadre",
    	"toxin",
    	"annul",
    	"egged",
    	"anion",
    	"nodes",
    	"picky",
    	"stein",
    	"jello",
    	"audit",
    	"echos",
    	"fagot",
    	"letup",
    	"eyrie",
    	"fount",
    	"caped",
    	"axons",
    	"amuck",
    	"banal",
    	"riled",
    	"petit",
    	"umber",
    	"miler",
    	"fibre",
    	"agave",
    	"bated",
    	"bilge",
    	"vitro",
    	"feint",
    	"pudgy",
    	"mater",
    	"manic",
    	"umped",
    	"pesky",
    	"strep",
    	"slurp",
    	"pylon",
    	"puree",
    	"caret",
    	"temps",
    	"newel",
    	"yawns",
    	"seedy",
    	"treed",
    	"coups",
    	"rangy",
    	"brads",
    	"mangy",
    	"loner",
    	"circa",
    	"tibia",
    	"afoul",
    	"mommy",
    	"titer",
    	"carne",
    	"kooky",
    	"motes",
    	"amity",
    	"suave",
    	"hippo",
    	"curvy",
    	"samba",
    	"newsy",
    	"anise",
    	"imams",
    	"tulle",
    	"aways",
    	"liven",
    	"hallo",
    	"wales",
    	"opted",
    	"canto",
    	"idyll",
    	"bodes",
    	"curio",
    	"wrack",
    	"hiker",
    	"chive",
    	"yokel",
    	"dotty",
    	"demur",
    	"cusps",
    	"specs",
    	"quads",
    	"laity",
    	"toner",
    	"decry",
    	"writs",
    	"saute",
    	"clack",
    	"aught",
    	"logos",
    	"tipsy",
    	"natty",
    	"ducal",
    	"bidet",
    	"bulgy",
    	"metre",
    	"lusts",
    	"unary",
    	"goeth",
    	"baler",
    	"sited",
    	"shies",
    	"hasps",
    	"brung",
    	"holed",
    	"swank",
    	"looky",
    	"melee",
    	"huffy",
    	"loamy",
    	"pimps",
    	"titan",
    	"binge",
    	"shunt",
    	"femur",
    	"libra",
    	"seder",
    	"honed",
    	"annas",
    	"coypu",
    	"shims",
    	"zowie",
    	"jihad",
    	"savvy",
    	"nadir",
    	"basso",
    	"monic",
    	"maned",
    	"mousy",
    	"omega",
    	"laver",
    	"prima",
    	"picas",
    	"folio",
    	"mecca",
    	"reals",
    	"troth",
    	"testy",
    	"balky",
    	"crimp",
    	"chink",
    	"abets",
    	"splat",
    	"abaci",
    	"vaunt",
    	"cutie",
    	"pasty",
    	"moray",
    	"levis",
    	"ratty",
    	"islet",
    	"joust",
    	"motet",
    	"viral",
    	"nukes",
    	"grads",
    	"comfy",
    	"voila",
    	"woozy",
    	"blued",
    	"whomp",
    	"sward",
    	"metro",
    	"skeet",
    	"chine",
    	"aerie",
    	"bowie",
    	"tubby",
    	"emirs",
    	"coati",
    	"unzip",
    	"slobs",
    	"trike",
    	"funky",
    	"ducat",
    	"dewey",
    	"skoal",
    	"wadis",
    	"oomph",
    	"taker",
    	"minim",
    	"getup",
    	"stoic",
    	"synod",
    	"runty",
    	"flyby",
    	"braze",
    	"inlay",
    	"venue",
    	"louts",
    	"peaty",
    	"orlon",
    	"humpy",
    	"radon",
    	"beaut",
    	"raspy",
    	"unfed",
    	"crick",
    	"nappy",
    	"vizor",
    	"yipes",
    	"rebus",
    	"divot",
    	"kiwis",
    	"vetch",
    	"squib",
    	"sitar",
    	"kiddo",
    	"dyers",
    	"cotta",
    	"matzo",
    	"lager",
    	"zebus",
    	"crass",
    	"dacha",
    	"kneed",
    	"dicta",
    	"fakir",
    	"knurl",
    	"runny",
    	"unpin",
    	"julep",
    	"globs",
    	"nudes",
    	"sushi",
    	"tacky",
    	"stoke",
    	"kaput",
    	"butch",
    	"hulas",
    	"croft",
    	"achoo",
    	"genii",
    	"nodal",
    	"outgo",
    	"spiel",
    	"viols",
    	"fetid",
    	"cagey",
    	"fudgy",
    	"epoxy",
    	"leggy",
    	"hanky",
    	"lapis",
    	"felon",
    	"beefy",
    	"coots",
    	"melba",
    	"caddy",
    	"segue",
    	"betel",
    	"frizz",
    	"drear",
    	"kooks",
    	"turbo",
    	"hoagy",
    	"moult",
    	"helix",
    	"zonal",
    	"arias",
    	"nosey",
    	"paean",
    	"lacey",
    	"banns",
    	"swain",
    	"fryer",
    	"retch",
    	"tenet",
    	"gigas",
    	"whiny",
    	"ogled",
    	"rumen",
    	"begot",
    	"cruse",
    	"abuts",
    	"riven",
    	"balks",
    	"sines",
    	"sigma",
    	"abase",
    	"ennui",
    	"gores",
    	"unset",
    	"augur",
    	"sated",
    	"odium",
    	"latin",
    	"dings",
    	"moire",
    	"scion",
    	"henna",
    	"kraut",
    	"dicks",
    	"lifer",
    	"prigs",
    	"bebop",
    	"gages",
    	"gazer",
    	"fanny",
    	"gibes",
    	"aural",
    	"tempi",
    	"hooch",
    	"rapes",
    	"snuck",
    	"harts",
    	"techs",
    	"emend",
    	"ninny",
    	"guava",
    	"scarp",
    	"liege",
    	"tufty",
    	"sepia",
    	"tomes",
    	"carob",
    	"emcee",
    	"prams",
    	"poser",
    	"verso",
    	"hubba",
    	"joule",
    	"baize",
    	"blips",
    	"scrim",
    	"cubby",
    	"clave",
    	"winos",
    	"rearm",
    	"liens",
    	"lumen",
    	"chump",
    	"nanny",
    	"trump",
    	"fichu",
    	"chomp",
    	"homos",
    	"purty",
    	"maser",
    	"woosh",
    	"patsy",
    	"shill",
    	"rusks",
    	"avast",
    	"swami",
    	"boded",
    	"ahhhh",
    	"lobed",
    	"natch",
    	"shish",
    	"tansy",
    	"snoot",
    	"payer",
    	"altho",
    	"sappy",
    	"laxer",
    	"hubby",
    	"aegis",
    	"riles",
    	"ditto",
    	"jazzy",
    	"dingo",
    	"quasi",
    	"septa",
    	"peaky",
    	"lorry",
    	"heerd",
    	"bitty",
    	"payee",
    	"seamy",
    	"apses",
    	"imbue",
    	"belie",
    	"chary",
    	"spoof",
    	"phyla",
    	"clime",
    	"babel",
    	"wacky",
    	"sumps",
    	"skids",
    	"khans",
    	"crypt",
    	"inure",
    	"nonce",
    	"outen",
    	"faire",
    	"hooey",
    	"anole",
    	"kazoo",
    	"calve",
    	"limbo",
    	"argot",
    	"ducky",
    	"faker",
    	"vibes",
    	"gassy",
    	"unlit",
    	"nervy",
    	"femme",
    	"biter",
    	"fiche",
    	"boors",
    	"gaffe",
    	"saxes",
    	"recap",
    	"synch",
    	"facie",
    	"dicey",
    	"ouija",
    	"hewer",
    	"legit",
    	"gurus",
    	"edify",
    	"tweak",
    	"caron",
    	"typos",
    	"rerun",
    	"polly",
    	"surds",
    	"hamza",
    	"nulls",
    	"hater",
    	"lefty",
    	"mogul",
    	"mafia",
    	"debug",
    	"pates",
    	"blabs",
    	"splay",
    	"talus",
    	"porno",
    	"moola",
    	"nixed",
    	"kilos",
    	"snide",
    	"horsy",
    	"gesso",
    	"jaggy",
    	"trove",
    	"nixes",
    	"creel",
    	"pater",
    	"iotas",
    	"cadge",
    	"skyed",
    	"hokum",
    	"furze",
    	"ankhs",
    	"curie",
    	"nutsy",
    	"hilum",
    	"remix",
    	"angst",
    	"burls",
    	"jimmy",
    	"veiny",
    	"tryst",
    	"codon",
    	"befog",
    	"gamed",
    	"flume",
    	"axman",
    	"doozy",
    	"lubes",
    	"rheas",
    	"bozos",
    	"butyl",
    	"kelly",
    	"mynah",
    	"jocks",
    	"donut",
    	"avian",
    	"wurst",
    	"chock",
    	"quash",
    	"quals",
    	"hayed",
    	"bombe",
    	"cushy",
    	"spacy",
    	"puked",
    	"leery",
    	"thews",
    	"prink",
    	"amens",
    	"tesla",
    	"intro",
    	"fiver",
    	"frump",
    	"capos",
    	"opine",
    	"coder",
    	"namer",
    	"jowly",
    	"pukes",
    	"haled",
    	"chard",
    	"duffs",
    	"bruin",
    	"reuse",
    	"whang",
    	"toons",
    	"frats",
    	"silty",
    	"telex",
    	"cutup",
    	"nisei",
    	"neato",
    	"decaf",
    	"softy",
    	"bimbo",
    	"adlib",
    	"loony",
    	"shoed",
    	"agues",
    	"peeve",
    	"noway",
    	"gamey",
    	"sarge",
    	"reran",
    	"epact",
    	"potty",
    	"coned",
    	"upend",
    	"narco",
    	"ikats",
    	"whorl",
    	"jinks",
    	"tizzy",
    	"weepy",
    	"posit",
    	"marge",
    	"vegan",
    	"clops",
    	"numbs",
    	"reeks",
    	"rubes",
    	"rower",
    	"biped",
    	"tiffs",
    	"hocus",
    	"hammy",
    	"bunco",
    	"fixit",
    	"tykes",
    	"chaws",
    	"yucky",
    	"hokey",
    	"resew",
    	"maven",
    	"adman",
    	"scuzz",
    	"slogs",
    	"souse",
    	"nacho",
    	"mimed",
    	"melds",
    	"boffo",
    	"debit",
    	"pinup",
    	"vagus",
    	"gulag",
    	"randy",
    	"bosun",
    	"educe",
    	"faxes",
    	"auras",
    	"pesto",
    	"antsy",
    	"betas",
    	"fizzy",
    	"dorky",
    	"snits",
    	"moxie",
    	"thane",
    	"mylar",
    	"nobby",
    	"gamin",
    	"gouty",
    	"esses",
    	"goyim",
    	"paned",
    	"druid",
    	"jades",
    	"rehab",
    	"gofer",
    	"tzars",
    	"octet",
    	"homed",
    	"socko",
    	"dorks",
    	"eared",
    	"anted",
    	"elide",
    	"fazes",
    	"oxbow",
    	"dowse",
    	"situs",
    	"macaw",
    	"scone",
    	"drily",
    	"hyper",
    	"salsa",
    	"mooch",
    	"gated",
    	"unjam",
    	"lipid",
    	"mitre",
    	"venal",
    	"knish",
    	"ritzy",
    	"divas",
    	"torus",
    	"mange",
    	"dimer",
    	"recut",
    	"meson",
    	"wined",
    	"fends",
    	"phage",
    	"fiats",
    	"caulk",
    	"cavil",
    	"panty",
    	"roans",
    	"bilks",
    	"hones",
    	"botch",
    	"estop",
    	"sully",
    	"sooth",
    	"gelds",
    	"ahold",
    	"raper",
    	"pager",
    	"fixer",
    	"infix",
    	"hicks",
    	"tuxes",
    	"plebe",
    	"twits",
    	"abash",
    	"twixt",
    	"wacko",
    	"primp",
    	"nabla",
    	"girts",
    	"miffs",
    	"emote",
    	"xerox",
    	"rebid",
    	"shahs",
    	"rutty",
    	"grout",
    	"grift",
    	"deify",
    	"biddy",
    	"kopek",
    	"semis",
    	"bries",
    	"acmes",
    	"piton",
    	"hussy",
    	"torts",
    	"disco",
    	"whore",
    	"boozy",
    	"gibed",
    	"vamps",
    	"amour",
    	"soppy",
    	"gonzo",
    	"durst",
    	"wader",
    	"tutus",
    	"perms",
    	"catty",
    	"glitz",
    	"brigs",
    	"nerds",
    	"barmy",
    	"gizmo",
    	"owlet",
    	"sayer",
    	"molls",
    	"shard",
    	"whops",
    	"comps",
    	"corer",
    	"colas",
    	"matte",
    	"droid",
    	"ploys",
    	"vapid",
    	"cairn",
    	"deism",
    	"mixup",
    	"yikes",
    	"prosy",
    	"raker",
    	"flubs",
    	"whish",
    	"reify",
    	"craps",
    	"shags",
    	"clone",
    	"hazed",
    	"macho",
    	"recto",
    	"refix",
    	"drams",
    	"biker",
    	"aquas",
    	"porky",
    	"doyen",
    	"exude",
    	"goofs",
    	"divvy",
    	"noels",
    	"jived",
    	"hulky",
    	"cager",
    	"harpy",
    	"oldie",
    	"vivas",
    	"admix",
    	"codas",
    	"zilch",
    	"deist",
    	"orcas",
    	"retro",
    	"pilaf",
    	"parse",
    	"rants",
    	"zingy",
    	"toddy",
    	"chiff",
    	"micro",
    	"veeps",
    	"girly",
    	"nexus",
    	"demos",
    	"bibbs",
    	"antes",
    	"lulus",
    	"gnarl",
    	"zippy",
    	"ivied",
    	"epees",
    	"wimps",
    	"tromp",
    	"grail",
    	"yoyos",
    	"poufs",
    	"hales",
    	"roust",
    	"cabal",
    	"rawer",
    	"pampa",
    	"mosey",
    	"kefir",
    	"burgs",
    	"unmet",
    	"cuspy",
    	"boobs",
    	"boons",
    	"hypes",
    	"dynes",
    	"nards",
    	"lanai",
    	"yogis",
    	"sepal",
    	"quark",
    	"toked",
    	"prate",
    	"ayins",
    	"hawed",
    	"swigs",
    	"vitas",
    	"toker",
    	"doper",
    	"bossa",
    	"linty",
    	"foist",
    	"mondo",
    	"stash",
    	"kayos",
    	"twerp",
    	"zesty",
    	"capon",
    	"wimpy",
    	"rewed",
    	"fungo",
    	"tarot",
    	"frosh",
    	"kabob",
    	"pinko",
    	"redid",
    	"mimeo",
    	"heist",
    	"tarps",
    	"lamas",
    	"sutra",
    	"dinar",
    	"whams",
    	"busty",
    	"spays",
    	"mambo",
    	"nabob",
    	"preps",
    	"odour",
    	"cabby",
    	"conks",
    	"sluff",
    	"dados",
    	"houri",
    	"swart",
    	"balms",
    	"gutsy",
    	"faxed",
    	"egads",
    	"pushy",
    	"retry",
    	"agora",
    	"drubs",
    	"daffy",
    	"chits",
    	"mufti",
    	"karma",
    	"lotto",
    	"toffs",
    	"burps",
    	"deuce",
    	"zings",
    	"kappa",
    	"clads",
    	"doggy",
    	"duper",
    	"scams",
    	"ogler",
    	"mimes",
    	"throe",
    	"zetas",
    	"waled",
    	"promo",
    	"blats",
    	"muffs",
    	"oinks",
    	"viand",
    	"coset",
    	"finks",
    	"faddy",
    	"minis",
    	"snafu",
    	"sauna",
    	"usury",
    	"muxes",
    	"craws",
    	"stats",
    	"condo",
    	"coxes",
    	"loopy",
    	"dorms",
    	"ascot",
    	"dippy",
    	"execs",
    	"dopey",
    	"envoi",
    	"umpty",
    	"gismo",
    	"fazed",
    	"strop",
    	"jives",
    	"slims",
    	"batik",
    	"pings",
    	"sonly",
    	"leggo",
    	"pekoe",
    	"prawn",
    	"luaus",
    	"campy",
    	"oodle",
    	"prexy",
    	"proms",
    	"touts",
    	"ogles",
    	"tweet",
    	"toady",
    	"naiad",
    	"hider",
    	"nuked",
    	"fatso",
    	"sluts",
    	"obits",
    	"narcs",
    	"tyros",
    	"delis",
    	"wooer",
    	"hyped",
    	"poset",
    	"byway",
    	"texas",
    	"scrod",
    	"avows",
    	"futon",
    	"torte",
    	"tuple",
    	"carom",
    	"kebab",
    	"tamps",
    	"jilts",
    	"duals",
    	"artsy",
    	"repro",
    	"modem",
    	"toped",
    	"psych",
    	"sicko",
    	"klutz",
    	"tarns",
    	"coxed",
    	"drays",
    	"cloys",
    	"anded",
    	"piker",
    	"aimer",
    	"suras",
    	"limos",
    	"flack",
    	"hapax",
    	"dutch",
    	"mucky",
    	"shire",
    	"klieg",
    	"staph",
    	"layup",
    	"tokes",
    	"axing",
    	"toper",
    	"duvet",
    	"cowry",
    	"profs",
    	"blahs",
    	"addle",
    	"sudsy",
    	"batty",
    	"coifs",
    	"suety",
    	"gabby",
    	"hafta",
    	"pitas",
    	"gouda",
    	"deice",
    	"taupe",
    	"topes",
    	"duchy",
    	"nitro",
    	"carny",
    	"limey",
    	"orals",
    	"hirer",
    	"taxer",
    	"roils",
    	"ruble",
    	"elate",
    	"dolor",
    	"wryer",
    	"snots",
    	"quais",
    	"coked",
    	"gimel",
    	"gorse",
    	"minas",
    	"goest",
    	"agape",
    	"manta",
    	"jings",
    	"iliac",
    	"admen",
    	"offen",
    	"cills",
    	"offal",
    	"lotta",
    	"bolas",
    	"thwap",
    	"alway",
    	"boggy",
    	"donna",
    	"locos",
    	"belay",
    	"gluey",
    	"bitsy",
    	"mimsy",
    	"hilar",
    	"outta",
    	"vroom",
    	"fetal",
    	"raths",
    	"renal",
    	"dyads",
    	"crocs",
    	"vires",
    	"culpa",
    	"kivas",
    	"feist",
    	"teats",
    	"thats",
    	"yawls",
    	"whens",
    	"abaca",
    	"ohhhh",
    	"aphis",
    	"fusty",
    	"eclat",
    	"perdu",
    	"mayst",
    	"exeat",
    	"molly",
    	"supra",
    	"wetly",
    	"plasm",
    	"buffa",
    	"semen",
    	"pukka",
    	"tagua",
    	"paras",
    	"stoat",
    	"secco",
    	"carte",
    	"haute",
    	"molal",
    	"shads",
    	"forma",
    	"ovoid",
    	"pions",
    	"modus",
    	"bueno",
    	"rheum",
    	"scurf",
    	"parer",
    	"ephah",
    	"doest",
    	"sprue",
    	"flams",
    	"molto",
    	"dieth",
    	"choos",
    	"miked",
    	"bronx",
    	"goopy",
    	"bally",
    	"plumy",
    	"moony",
    	"morts",
    	"yourn",
    	"bipod",
    	"spume",
    	"algal",
    	"ambit",
    	"mucho",
    	"spued",
    	"dozer",
    	"harum",
    	"groat",
    	"skint",
    	"laude",
    	"thrum",
    	"pappy",
    	"oncet",
    	"rimed",
    	"gigue",
    	"limed",
    	"plein",
    	"redly",
    	"humpf",
    	"lites",
    	"seest",
    	"grebe",
    	"absit",
    	"thanx",
    	"pshaw",
    	"yawps",
    	"plats",
    	"payed",
    	"areal",
    	"tilth",
    	"youse",
    	"gwine",
    	"thees",
    	"watsa",
    	"lento",
    	"spitz",
    	"yawed",
    	"gipsy",
    	"sprat",
    	"cornu",
    	"amahs",
    	"blowy",
    	"wahoo",
    	"lubra",
    	"mecum",
    	"whooo",
    	"coqui",
    	"sabra",
    	"edema",
    	"mrads",
    	"dicot",
    	"astro",
    	"kited",
    	"ouzel",
    	"didos",
    	"grata",
    	"bonne",
    	"axmen",
    	"klunk",
    	"summa",
    	"laves",
    	"purls",
    	"yawny",
    	"teary",
    	"masse",
    	"largo",
    	"bazar",
    	"pssst",
    	"sylph",
    	"lulab",
    	"toque",
    	"fugit",
    	"plunk",
    	"ortho",
    	"lucre",
    	"cooch",
    	"whipt",
    	"folky",
    	"tyres",
    	"wheee",
    	"corky",
    	"injun",
    	"solon",
    	"didot",
    	"kerfs",
    	"rayed",
    	"wassa",
    	"chile",
    	"begat",
    	"nippy",
    	"litre",
    	"magna",
    	"rebox",
    	"hydro",
    	"milch",
    	"brent",
    	"gyves",
    	"lazed",
    	"feued",
    	"mavis",
    	"inapt",
    	"baulk",
    	"casus",
    	"scrum",
    	"wised",
    	"fossa",
    	"dower",
    	"kyrie",
    	"bhoys",
    	"scuse",
    	"feuar",
    	"ohmic",
    	"juste",
    	"ukase",
    	"beaux",
    	"tusky",
    	"orate",
    	"musta",
    	"lardy",
    	"intra",
    	"quiff",
    	"epsom",
    	"neath",
    	"ocher",
    	"tared",
    	"homme",
    	"mezzo",
    	"corms",
    	"psoas",
    	"beaky",
    	"terry",
    	"infra",
    	"spivs",
    	"tuans",
    	"belli",
    	"bergs",
    	"anima",
    	"weirs",
    	"mahua",
    	"scops",
    	"manse",
    	"titre",
    	"curia",
    	"kebob",
    	"cycad",
    	"talky",
    	"fucks",
    	"tapis",
    	"amide",
    	"dolce",
    	"sloes",
    	"jakes",
    	"russe",
    	"blash",
    	"tutti",
    	"pruta",
    	"panga",
    	"blebs",
    	"tench",
    	"swarf",
    	"herem",
    	"missy",
    	"merse",
    	"pawky",
    	"limen",
    	"vivre",
    	"chert",
    	"unsee",
    	"tiros",
    	"brack",
    	"foots",
    	"welsh",
    	"fosse",
    	"knops",
    	"ileum",
    	"noire",
    	"firma",
    	"podgy",
    	"laird",
    	"thunk",
    	"shute",
    	"rowan",
    	"shoji",
    	"poesy",
    	"uncap",
    	"fames",
    	"glees",
    	"costa",
    	"turps",
    	"fores",
    	"solum",
    	"imago",
    	"byres",
    	"fondu",
    	"coney",
    	"polis",
    	"dictu",
    	"kraal",
    	"sherd",
    	"mumbo",
    	"wroth",
    	"chars",
    	"unbox",
    	"slued",
    	"weest",
    	"hades",
    	"wiled",
    	"syncs",
    	"muser",
    	"excon",
    	"hoars",
    	"sibyl",
    	"passe",
    	"joeys",
    	"lotsa",
    	"lepta",
    	"shays",
    	"bocks",
    	"endue",
    	"darer",
    	"nones",
    	"ileus",
    	"plash",
    	"busby",
    	"wheal",
    	"buffo",
    	"yobbo",
    	"biles",
    	"poxes",
    	"rooty",
    	"licit",
    	"terce",
    	"bromo",
    	"hayey",
    	"dweeb",
    	"imbed",
    	"saran",
    	"bruit",
    	"punky",
    	"softs",
    	"biffs",
    	"loppy",
    	"agars",
    	"aquae",
    	"livre",
    	"biome",
    	"bunds",
    	"shews",
    	"diems",
    	"ginny",
    	"degum",
    	"polos",
    	"desex",
    	"unman",
    	"dungy",
    	"vitam",
    	"wedgy",
    	"glebe",
    	"apers",
    	"ridgy",
    	"roids",
    	"wifey",
    	"vapes",
    	"whoas",
    	"bunko",
    	"yolky",
    	"ulnas",
    	"reeky",
    	"bodge",
    	"brant",
    	"davit",
    	"deque",
    	"liker",
    	"jenny",
    	"tacts",
    	"fulls",
    	"treap",
    	"ligne",
    	"acked",
    	"refry",
    	"vower",
    	"aargh",
    	"churl",
    	"momma",
    	"gaols",
    	"whump",
    	"arras",
    	"marls",
    	"tiler",
    	"grogs",
    	"memes",
    	"midis",
    	"tided",
    	"haler",
    	"duces",
    	"twiny",
    	"poste",
    	"unrig",
    	"prise",
    	"drabs",
    	"quids",
    	"facer",
    	"spier",
    	"baric",
    	"geoid",
    	"remap",
    	"trier",
    	"gunks",
    	"steno",
    	"stoma",
    	"airer",
    	"ovate",
    	"torah",
    	"apian",
    	"smuts",
    	"pocks",
    	"yurts",
    	"exurb",
    	"defog",
    	"nuder",
    	"bosky",
    	"nimbi",
    	"mothy",
    	"joyed",
    	"labia",
    	"pards",
    	"jammy",
    	"bigly",
    	"faxer",
    	"hoppy",
    	"nurbs",
    	"cotes",
    	"dishy",
    	"vised",
    	"celeb",
    	"pismo",
    	"casas",
    	"withs",
    	"dodgy",
    	"scudi",
    	"mungs",
    	"muons",
    	"ureas",
    	"ioctl",
    	"unhip",
    	"krone",
    	"sager",
    	"verst",
    	"expat",
    	"gronk",
    	"uvula",
    	"shawm",
    	"bilgy",
    	"braes",
    	"cento",
    	"webby",
    	"lippy",
    	"gamic",
    	"lordy",
    	"mazed",
    	"tings",
    	"shoat",
    	"faery",
    	"wirer",
    	"diazo",
    	"carer",
    	"rater",
    	"greps",
    	"rente",
    	"zloty",
    	"viers",
    	"unapt",
    	"poops",
    	"fecal",
    	"kepis",
    	"taxon",
    	"eyers",
    	"wonts",
    	"spina",
    	"stoae",
    	"yenta",
    	"pooey",
    	"buret",
    	"japan",
    	"bedew",
    	"hafts",
    	"selfs",
    	"oared",
    	"herby",
    	"pryer",
    	"oakum",
    	"dinks",
    	"titty",
    	"sepoy",
    	"penes",
    	"fusee",
    	"winey",
    	"gimps",
    	"nihil",
    	"rille",
    	"giber",
    	"ousel",
    	"umiak",
    	"cuppy",
    	"hames",
    	"shits",
    	"azine",
    	"glads",
    	"tacet",
    	"bumph",
    	"coyer",
    	"honky",
    	"gamer",
    	"gooky",
    	"waspy",
    	"sedgy",
    	"bents",
    	"varia",
    	"djinn",
    	"junco",
    	"pubic",
    	"wilco",
    	"lazes",
    	"idyls",
    	"lupus",
    	"rives",
    	"snood",
    	"schmo",
    	"spazz",
    	"finis",
    	"noter",
    	"pavan",
    	"orbed",
    	"bates",
    	"pipet",
    	"baddy",
    	"goers",
    	"shako",
    	"stets",
    	"sebum",
    	"seeth",
    	"lobar",
    	"raver",
    	"ajuga",
    	"riced",
    	"velds",
    	"dribs",
    	"ville",
    	"dhows",
    	"unsew",
    	"halma",
    	"krona",
    	"limby",
    	"jiffs",
    	"treys",
    	"bauds",
    	"pffft",
    	"mimer",
    	"plebs",
    	"caner",
    	"jiber",
    	"cuppa",
    	"washy",
    	"chuff",
    	"unarm",
    	"yukky",
    	"styes",
    	"waker",
    	"flaks",
    	"maces",
    	"rimes",
    	"gimpy",
    	"guano",
    	"liras",
    	"kapok",
    	"scuds",
    	"bwana",
    	"oring",
    	"aider",
    	"prier",
    	"klugy",
    	"monte",
    	"golem",
    	"velar",
    	"firer",
    	"pieta",
    	"umbel",
    	"campo",
    	"unpeg",
    	"fovea",
    	"abeam",
    	"boson",
    	"asker",
    	"goths",
    	"vocab",
    	"vined",
    	"trows",
    	"tikis",
    	"loper",
    	"indie",
    	"boffs",
    	"spang",
    	"grapy",
    	"tater",
    	"ichor",
    	"kilty",
    	"lochs",
    	"supes",
    	"degas",
    	"flics",
    	"torsi",
    	"beths",
    	"weber",
    	"resaw",
    	"lawny",
    	"coven",
    	"mujik",
    	"relet",
    	"therm",
    	"heigh",
    	"shnor",
    	"trued",
    	"zayin",
    	"liest",
    	"barfs",
    	"bassi",
    	"qophs",
    	"roily",
    	"flabs",
    	"punny",
    	"okras",
    	"hanks",
    	"dipso",
    	"nerfs",
    	"fauns",
    	"calla",
    	"pseud",
    	"lurer",
    	"magus",
    	"obeah",
    	"atria",
    	"twink",
    	"palmy",
    	"pocky",
    	"pends",
    	"recta",
    	"plonk",
    	"slaws",
    	"keens",
    	"nicad",
    	"pones",
    	"inker",
    	"whews",
    	"groks",
    	"mosts",
    	"trews",
    	"ulnar",
    	"gyppy",
    	"cocas",
    	"expos",
    	"eruct",
    	"oiler",
    	"vacua",
    	"dreck",
    	"dater",
    	"arums",
    	"tubal",
    	"voxel",
    	"dixit",
    	"beery",
    	"assai",
    	"lades",
    	"actin",
    	"ghoti",
    	"buzzy",
    	"meads",
    	"grody",
    	"ribby",
    	"clews",
    	"creme",
    	"email",
    	"pyxie",
    	"kulak",
    	"bocci",
    	"rived",
    	"duddy",
    	"hoper",
    	"lapin",
    	"wonks",
    	"petri",
    	"phial",
    	"fugal",
    	"holon",
    	"boomy",
    	"duomo",
    	"musos",
    	"shier",
    	"hayer",
    	"porgy",
    	"hived",
    	"litho",
    	"fisty",
    	"stagy",
    	"luvya",
    	"maria",
    	"smogs",
    	"asana",
    	"yogic",
    	"slomo",
    	"fawny",
    	"amine",
    	"wefts",
    	"gonad",
    	"twirp",
    	"brava",
    	"plyer",
    	"fermi",
    	"loges",
    	"niter",
    	"revet",
    	"unate",
    	"gyved",
    	"totty",
    	"zappy",
    	"honer",
    	"giros",
    	"dicer",
    	"calks",
    	"luxes",
    	"monad",
    	"cruft",
    	"quoin",
    	"fumer",
    	"amped",
    	"shlep",
    	"vinca",
    	"yahoo",
    	"vulva",
    	"zooey",
    	"dryad",
    	"nixie",
    	"moper",
    	"iambs",
    	"lunes",
    	"nudie",
    	"limns",
    	"weals",
    	"nohow",
    	"miaow",
    	"gouts",
    	"mynas",
    	"mazer",
    	"kikes",
    	"oxeye",
    	"stoup",
    	"jujus",
    	"debar",
    	"pubes",
    	"taels",
    	"defun",
    	"rands",
    	"blear",
    	"paver",
    	"goosy",
    	"sprog",
    	"oleos",
    	"toffy",
    	"pawer",
    	"maced",
    	"crits",
    	"kluge",
    	"tubed",
    	"sahib",
    	"ganef",
    	"scats",
    	"sputa",
    	"vaned",
    	"acned",
    	"taxol",
    	"plink",
    	"oweth",
    	"tribs",
    	"resay",
    	"boule",
    	"thous",
    	"haply",
    	"glans",
    	"maxis",
    	"bezel",
    	"antis",
    	"porks",
    	"quoit",
    	"alkyd",
    	"glary",
    	"beamy",
    	"hexad",
    	"bonks",
    	"tecum",
    	"kerbs",
    	"filar",
    	"frier",
    	"redux",
    	"abuzz",
    	"fader",
    	"shoer",
    	"couth",
    	"trues",
    	"guyed",
    	"goony",
    	"booky",
    	"fuzes",
    	"hurly",
    	"genet",
    	"hodad",
    	"calix",
    	"filer",
    	"pawls",
    	"iodic",
    	"utero",
    	"henge",
    	"unsay",
    	"liers",
    	"piing",
    	"weald",
    	"sexed",
    	"folic",
    	"poxed",
    	"cunts",
    	"anile",
    	"kiths",
    	"becks",
    	"tatty",
    	"plena",
    	"rebar",
    	"abled",
    	"toyer",
    	"attar",
    	"teaks",
    	"aioli",
    	"awing",
    	"anent",
    	"feces",
    	"redip",
    	"wists",
    	"prats",
    	"mesne",
    	"muter",
    	"smurf",
    	"owest",
    	"bahts",
    	"lossy",
    	"ftped",
    	"hunky",
    	"hoers",
    	"slier",
    	"sicks",
    	"fatly",
    	"delft",
    	"hiver",
    	"himbo",
    	"pengo",
    	"busks",
    	"loxes",
    	"zonks",
    	"ilium",
    	"aport",
    	"ikons",
    	"mulct",
    	"reeve",
    	"civvy",
    	"canna",
    	"barfy",
    	"kaiak",
    	"scudo",
    	"knout",
    	"gaper",
    	"bhang",
    	"pease",
    	"uteri",
    	"lases",
    	"paten",
    	"rasae",
    	"axels",
    	"stoas",
    	"ombre",
    	"styli",
    	"gunky",
    	"hazer",
    	"kenaf",
    	"ahoys",
    	"ammos",
    	"weeny",
    	"urger",
    	"kudzu",
    	"paren",
    	"bolos",
    	"fetor",
    	"nitty",
    	"techy",
    	"lieth",
    	"somas",
    	"darky",
    	"villi",
    	"gluon",
    	"janes",
    	"cants",
    	"farts",
    	"socle",
    	"jinns",
    	"ruing",
    	"slily",
    	"ricer",
    	"hadda",
    	"wowee",
    	"rices",
    	"nerts",
    	"cauls",
    	"swive",
    	"lilty",
    	"micks",
    	"arity",
    	"pasha",
    	"finif",
    	"oinky",
    	"gutty",
    	"tetra",
    	"wises",
    	"wolds",
    	"balds",
    	"picot",
    	"whats",
    	"shiki",
    	"bungs",
    	"snarf",
    	"legos",
    	"dungs",
    	"stogy",
    	"berms",
    	"tangs",
    	"vails",
    	"roods",
    	"morel",
    	"sware",
    	"elans",
    	"latus",
    	"gules",
    	"razer",
    	"doxie",
    	"buena",
    	"overs",
    	"gutta",
    	"zincs",
    	"nates",
    	"kirks",
    	"tikes",
    	"donee",
    	"jerry",
    	"mohel",
    	"ceder",
    	"doges",
    	"unmap",
    	"folia",
    	"rawly",
    	"snark",
    	"topoi",
    	"ceils",
    	"immix",
    	"yores",
    	"diest",
    	"bubba",
    	"pomps",
    	"forky",
    	"turdy",
    	"lawzy",
    	"poohs",
    	"worts",
    	"gloms",
    	"beano",
    	"muley",
    	"barky",
    	"tunny",
    	"auric",
    	"funks",
    	"gaffs",
    	"cordy",
    	"curdy",
    	"lisle",
    	"toric",
    	"soyas",
    	"reman",
    	"mungy",
    	"carpy",
    	"apish",
    	"oaten",
    	"gappy",
    	"aurae",
    	"bract",
    	"rooky",
    	"axled",
    	"burry",
    	"sizer",
    	"proem",
    	"turfy",
    	"impro",
    	"mashy",
    	"miens",
    	"nonny",
    	"olios",
    	"grook",
    	"sates",
    	"agley",
    	"corgi",
    	"dashy",
    	"doser",
    	"dildo",
    	"apsos",
    	"xored",
    	"laker",
    	"playa",
    	"selah",
    	"malty",
    	"dulse",
    	"frigs",
    	"demit",
    	"whoso",
    	"rials",
    	"sawer",
    	"spics",
    	"bedim",
    	"snugs",
    	"fanin",
    	"azoic",
    	"icers",
    	"suers",
    	"wizen",
    	"koine",
    	"topos",
    	"shirr",
    	"rifer",
    	"feral",
    	"laded",
    	"lased",
    	"turds",
    	"swede",
    	"easts",
    	"cozen",
    	"unhit",
    	"pally",
    	"aitch",
    	"sedum",
    	"coper",
    	"ruche",
    	"geeks",
    	"swags",
    	"etext",
    	"algin",
    	"offed",
    	"ninja",
    	"holer",
    	"doter",
    	"toter",
    	"besot",
    	"dicut",
    	"macer",
    	"peens",
    	"pewit",
    	"redox",
    	"poler",
    	"yecch",
    	"fluky",
    	"doeth",
    	"twats",
    	"cruds",
    	"bebug",
    	"bider",
    	"stele",
    	"hexer",
    	"wests",
    	"gluer",
    	"pilau",
    	"abaft",
    	"whelm",
    	"lacer",
    	"inode",
    	"tabus",
    	"gator",
    	"cuing",
    	"refly",
    	"luted",
    	"cukes",
    	"bairn",
    	"bight",
    	"arses",
    	"crump",
    	"loggy",
    	"blini",
    	"spoor",
    	"toyon",
    	"harks",
    	"wazoo",
    	"fenny",
    	"naves",
    	"keyer",
    	"tufas",
    	"morph",
    	"rajas",
    	"typal",
    	"spiff",
    	"oxlip",
    	"unban",
    	"mussy",
    	"finny",
    	"rimer",
    	"login",
    	"molas",
    	"cirri",
    	"huzza",
    	"agone",
    	"unsex",
    	"unwon",
    	"peats",
    	"toile",
    	"zombi",
    	"dewed",
    	"nooky",
    	"alkyl",
    	"ixnay",
    	"dovey",
    	"holey",
    	"cuber",
    	"amyls",
    	"podia",
    	"chino",
    	"apnea",
    	"prims",
    	"lycra",
    	"johns",
    	"primo",
    	"fatwa",
    	"egger",
    	"hempy",
    	"snook",
    	"hying",
    	"fuzed",
    	"barms",
    	"crink",
    	"moots",
    	"yerba",
    	"rhumb",
    	"unarc",
    	"direr",
    	"munge",
    	"eland",
    	"nares",
    	"wrier",
    	"noddy",
    	"atilt",
    	"jukes",
    	"ender",
    	"thens",
    	"unfix",
    	"doggo",
    	"zooks",
    	"diddy",
    	"shmoo",
    	"brusk",
    	"prest",
    	"curer",
    	"pasts",
    	"kelpy",
    	"bocce",
    	"kicky",
    	"taros",
    	"lings",
    	"dicky",
    	"nerdy",
    	"abend",
    	"stela",
    	"biggy",
    	"laved",
    	"baldy",
    	"pubis",
    	"gooks",
    	"wonky",
    	"stied",
    	"hypos",
    	"assed",
    	"spumy",
    	"osier",
    	"roble",
    	"rumba",
    	"biffy",
    	"pupal"
    ];

    /* src/logic.svelte generated by Svelte v3.46.4 */

    let wordHistory = [];
    let stateHistory = [];
    let currentWord = ["", "", "", "", ""];
    let currentState = [0, 0, 0, 0, 0];
    let excluded = [];

    function isFinished() {
    	let l = stateHistory.length;
    	console.log(stateHistory[l - 1][0]);
    	return !stateHistory[l - 1][0].includes(".");
    }

    function excludeWord() {
    	excluded.push(currentWord.join(""));
    	console.log(excluded);
    }

    function setLetter(order, letter) {
    	currentWord[order] = letter;
    	console.log(currentWord);
    }

    function setState(order, state) {
    	currentState[order] = state;
    	console.log(currentState);
    }

    function organizeState(word, state) {
    	var hit = "";
    	var blow = {};

    	for (let i = 0; i < 5; i++) {
    		if (state[i] == 2) {
    			hit += word[i];
    		} else {
    			hit += ".";
    		}

    		if (state[i] != 0) {
    			blow[word[i]] = 1;
    		}
    	}

    	var b = "";

    	Object.keys(blow).sort().forEach(function (key) {
    		b += key;
    	});

    	console.log(hit, b);
    	return [hit, b];
    }

    function record() {
    	let word = currentWord.join("");
    	let state = organizeState(word, currentState);
    	wordHistory.push(word);
    	stateHistory.push(state);
    }

    function irand(n = 10) {
    	return Math.floor(Math.random() * n);
    }

    function randomChoice(arr) {
    	return arr[irand(arr.length)];
    }

    function trial(answer, word) {
    	var hit = "";
    	var blow = {};

    	for (let i = 0; i < 5; i++) {
    		if (answer[i] == word[i]) {
    			hit += word[i];
    		} else {
    			hit += ".";
    		}

    		if (answer.includes(word[i])) {
    			blow[word[i]] = 1;
    		}
    	}

    	var b = "";

    	Object.keys(blow).sort().forEach(function (key) {
    		b += key;
    	});

    	return [hit, b];
    }

    function findCandidate() {
    	for (let i = 0; i < words.length; i++) {
    		let w = words[i];

    		if (excluded.indexOf(w) >= 0) {
    			continue;
    		}

    		let fail = false;

    		for (let j = 0; j < wordHistory.length; j++) {
    			const hb = stateHistory[j];
    			const hb2 = trial(w, wordHistory[j]);

    			// 				console.log(w, hb2[0], hb2[1])
    			if (hb[0] === hb2[0] && hb[1] === hb2[1]) ; else {
    				fail = true;
    			}
    		}

    		if (!fail) {
    			return w;
    		}
    	}

    	console.log("GiveUp in finding candidates.");
    	return "";
    }

    /* src/letter.svelte generated by Svelte v3.46.4 */
    const file$5 = "src/letter.svelte";

    function create_fragment$5(ctx) {
    	let button;
    	let t_value = /*L*/ ctx[0].toUpperCase() + "";
    	let t;
    	let button_disabled_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text(t_value);
    			button.disabled = button_disabled_value = !/*active*/ ctx[1];
    			set_style(button, "--color", /*color*/ ctx[2]);
    			attr_dev(button, "class", "svelte-1rm4cac");
    			add_location(button, file$5, 29, 0, 521);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*rotateState*/ ctx[3], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*L*/ 1 && t_value !== (t_value = /*L*/ ctx[0].toUpperCase() + "")) set_data_dev(t, t_value);

    			if (dirty & /*active*/ 2 && button_disabled_value !== (button_disabled_value = !/*active*/ ctx[1])) {
    				prop_dev(button, "disabled", button_disabled_value);
    			}

    			if (dirty & /*color*/ 4) {
    				set_style(button, "--color", /*color*/ ctx[2]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Letter', slots, []);
    	let { L } = $$props;
    	let { active } = $$props;
    	let { order } = $$props;
    	let state = 0;
    	const colors = ["#3A3A3C", "#B1A04C", "#618B55"];
    	let color = colors[0];

    	function rotateState() {
    		$$invalidate(5, state = (state + 1) % 3);
    		$$invalidate(2, color = colors[state]);
    	} // setLetter(order, L);
    	// setState(order, state);

    	onMount(() => {
    		setLetter(order, L);
    		setState(order, state);
    	});

    	const writable_props = ['L', 'active', 'order'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Letter> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('L' in $$props) $$invalidate(0, L = $$props.L);
    		if ('active' in $$props) $$invalidate(1, active = $$props.active);
    		if ('order' in $$props) $$invalidate(4, order = $$props.order);
    	};

    	$$self.$capture_state = () => ({
    		setState,
    		setLetter,
    		onMount,
    		L,
    		active,
    		order,
    		state,
    		colors,
    		color,
    		rotateState
    	});

    	$$self.$inject_state = $$props => {
    		if ('L' in $$props) $$invalidate(0, L = $$props.L);
    		if ('active' in $$props) $$invalidate(1, active = $$props.active);
    		if ('order' in $$props) $$invalidate(4, order = $$props.order);
    		if ('state' in $$props) $$invalidate(5, state = $$props.state);
    		if ('color' in $$props) $$invalidate(2, color = $$props.color);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*order, L, state*/ 49) {
    			{
    				setLetter(order, L);
    				setState(order, state);
    			}
    		}
    	};

    	return [L, active, color, rotateState, order, state];
    }

    class Letter extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { L: 0, active: 1, order: 4 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Letter",
    			options,
    			id: create_fragment$5.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*L*/ ctx[0] === undefined && !('L' in props)) {
    			console.warn("<Letter> was created without expected prop 'L'");
    		}

    		if (/*active*/ ctx[1] === undefined && !('active' in props)) {
    			console.warn("<Letter> was created without expected prop 'active'");
    		}

    		if (/*order*/ ctx[4] === undefined && !('order' in props)) {
    			console.warn("<Letter> was created without expected prop 'order'");
    		}
    	}

    	get L() {
    		throw new Error("<Letter>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set L(value) {
    		throw new Error("<Letter>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get active() {
    		throw new Error("<Letter>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set active(value) {
    		throw new Error("<Letter>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get order() {
    		throw new Error("<Letter>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set order(value) {
    		throw new Error("<Letter>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/unavail.svelte generated by Svelte v3.46.4 */
    const file$4 = "src/unavail.svelte";

    function create_fragment$4(ctx) {
    	let button;
    	let t;
    	let button_disabled_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text("Unavailable");
    			button.disabled = button_disabled_value = !/*active*/ ctx[0];
    			attr_dev(button, "class", "svelte-11jjkjc");
    			add_location(button, file$4, 13, 0, 208);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*unavail*/ ctx[1], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*active*/ 1 && button_disabled_value !== (button_disabled_value = !/*active*/ ctx[0])) {
    				prop_dev(button, "disabled", button_disabled_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Unavail', slots, []);
    	const dispatch = createEventDispatcher();
    	let { active } = $$props;

    	function unavail() {
    		dispatch('message', { text: 'unavail' });
    	}

    	const writable_props = ['active'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Unavail> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('active' in $$props) $$invalidate(0, active = $$props.active);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		dispatch,
    		active,
    		unavail
    	});

    	$$self.$inject_state = $$props => {
    		if ('active' in $$props) $$invalidate(0, active = $$props.active);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [active, unavail];
    }

    class Unavail extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { active: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Unavail",
    			options,
    			id: create_fragment$4.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*active*/ ctx[0] === undefined && !('active' in props)) {
    			console.warn("<Unavail> was created without expected prop 'active'");
    		}
    	}

    	get active() {
    		throw new Error("<Unavail>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set active(value) {
    		throw new Error("<Unavail>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/confirm.svelte generated by Svelte v3.46.4 */
    const file$3 = "src/confirm.svelte";

    function create_fragment$3(ctx) {
    	let button;
    	let t;
    	let button_disabled_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text("Confitm");
    			button.disabled = button_disabled_value = !/*active*/ ctx[0];
    			attr_dev(button, "class", "svelte-11jjkjc");
    			add_location(button, file$3, 19, 0, 365);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*confirm*/ ctx[1], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*active*/ 1 && button_disabled_value !== (button_disabled_value = !/*active*/ ctx[0])) {
    				prop_dev(button, "disabled", button_disabled_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Confirm', slots, []);
    	const dispatch = createEventDispatcher();
    	let { active } = $$props;

    	function nextLine() {
    		const msg = isFinished() ? "finished" : "nextLine";
    		dispatch('message', { text: msg });
    	}

    	function confirm() {
    		record();
    		nextLine();
    	}

    	const writable_props = ['active'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Confirm> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('active' in $$props) $$invalidate(0, active = $$props.active);
    	};

    	$$self.$capture_state = () => ({
    		record,
    		isFinished,
    		createEventDispatcher,
    		dispatch,
    		active,
    		nextLine,
    		confirm
    	});

    	$$self.$inject_state = $$props => {
    		if ('active' in $$props) $$invalidate(0, active = $$props.active);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [active, confirm];
    }

    class Confirm extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { active: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Confirm",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*active*/ ctx[0] === undefined && !('active' in props)) {
    			console.warn("<Confirm> was created without expected prop 'active'");
    		}
    	}

    	get active() {
    		throw new Error("<Confirm>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set active(value) {
    		throw new Error("<Confirm>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/row.svelte generated by Svelte v3.46.4 */
    const file$2 = "src/row.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[4] = list[i];
    	child_ctx[6] = i;
    	return child_ctx;
    }

    // (11:0) {#each guess as L, i}
    function create_each_block$1(ctx) {
    	let letter;
    	let current;

    	letter = new Letter({
    			props: {
    				L: /*L*/ ctx[4],
    				active: /*active*/ ctx[1],
    				order: /*i*/ ctx[6]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(letter.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(letter, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const letter_changes = {};
    			if (dirty & /*guess*/ 1) letter_changes.L = /*L*/ ctx[4];
    			if (dirty & /*active*/ 2) letter_changes.active = /*active*/ ctx[1];
    			letter.$set(letter_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(letter.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(letter.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(letter, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(11:0) {#each guess as L, i}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let unavail;
    	let t0;
    	let t1;
    	let confirm;
    	let br;
    	let current;

    	unavail = new Unavail({
    			props: { active: /*active*/ ctx[1] },
    			$$inline: true
    		});

    	unavail.$on("message", /*message_handler*/ ctx[2]);
    	let each_value = /*guess*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	confirm = new Confirm({
    			props: { active: /*active*/ ctx[1] },
    			$$inline: true
    		});

    	confirm.$on("message", /*message_handler_1*/ ctx[3]);

    	const block = {
    		c: function create() {
    			create_component(unavail.$$.fragment);
    			t0 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t1 = space();
    			create_component(confirm.$$.fragment);
    			br = element("br");
    			add_location(br, file$2, 13, 39, 335);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(unavail, target, anchor);
    			insert_dev(target, t0, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, t1, anchor);
    			mount_component(confirm, target, anchor);
    			insert_dev(target, br, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const unavail_changes = {};
    			if (dirty & /*active*/ 2) unavail_changes.active = /*active*/ ctx[1];
    			unavail.$set(unavail_changes);

    			if (dirty & /*guess, active*/ 3) {
    				each_value = /*guess*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(t1.parentNode, t1);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			const confirm_changes = {};
    			if (dirty & /*active*/ 2) confirm_changes.active = /*active*/ ctx[1];
    			confirm.$set(confirm_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(unavail.$$.fragment, local);

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			transition_in(confirm.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(unavail.$$.fragment, local);
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			transition_out(confirm.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(unavail, detaching);
    			if (detaching) detach_dev(t0);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t1);
    			destroy_component(confirm, detaching);
    			if (detaching) detach_dev(br);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Row', slots, []);
    	let { guess } = $$props;
    	let { active } = $$props;
    	const writable_props = ['guess', 'active'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Row> was created with unknown prop '${key}'`);
    	});

    	function message_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	function message_handler_1(event) {
    		bubble.call(this, $$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ('guess' in $$props) $$invalidate(0, guess = $$props.guess);
    		if ('active' in $$props) $$invalidate(1, active = $$props.active);
    	};

    	$$self.$capture_state = () => ({ Letter, Unavail, Confirm, guess, active });

    	$$self.$inject_state = $$props => {
    		if ('guess' in $$props) $$invalidate(0, guess = $$props.guess);
    		if ('active' in $$props) $$invalidate(1, active = $$props.active);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [guess, active, message_handler, message_handler_1];
    }

    class Row extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { guess: 0, active: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Row",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*guess*/ ctx[0] === undefined && !('guess' in props)) {
    			console.warn("<Row> was created without expected prop 'guess'");
    		}

    		if (/*active*/ ctx[1] === undefined && !('active' in props)) {
    			console.warn("<Row> was created without expected prop 'active'");
    		}
    	}

    	get guess() {
    		throw new Error("<Row>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set guess(value) {
    		throw new Error("<Row>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get active() {
    		throw new Error("<Row>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set active(value) {
    		throw new Error("<Row>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/rows.svelte generated by Svelte v3.46.4 */

    const { console: console_1 } = globals;
    const file$1 = "src/rows.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[4] = list[i];
    	child_ctx[6] = i;
    	return child_ctx;
    }

    // (43:0) {#each guesses as guess, i}
    function create_each_block(ctx) {
    	let row;
    	let current;

    	row = new Row({
    			props: {
    				guess: /*guess*/ ctx[4],
    				active: /*i*/ ctx[6] == /*guesses*/ ctx[0].length - 1
    			},
    			$$inline: true
    		});

    	row.$on("message", /*callback*/ ctx[2]);

    	const block = {
    		c: function create() {
    			create_component(row.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(row, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const row_changes = {};
    			if (dirty & /*guesses*/ 1) row_changes.guess = /*guess*/ ctx[4];
    			if (dirty & /*guesses*/ 1) row_changes.active = /*i*/ ctx[6] == /*guesses*/ ctx[0].length - 1;
    			row.$set(row_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(row.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(row.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(row, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(43:0) {#each guesses as guess, i}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let t0;
    	let p;
    	let t1;
    	let current;
    	let each_value = /*guesses*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t0 = space();
    			p = element("p");
    			t1 = text(/*msg*/ ctx[1]);
    			add_location(p, file$1, 45, 0, 884);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, t0, anchor);
    			insert_dev(target, p, anchor);
    			append_dev(p, t1);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*guesses, callback*/ 5) {
    				each_value = /*guesses*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(t0.parentNode, t0);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (!current || dirty & /*msg*/ 2) set_data_dev(t1, /*msg*/ ctx[1]);
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Rows', slots, []);
    	let { guesses = [] } = $$props;
    	let msg = "";

    	onMount(() => {
    		addItem(randomChoice(words.slice(0, 1000)));
    	});

    	function addItem(word) {
    		let l = guesses.length;
    		$$invalidate(0, guesses[l] = word, guesses);
    	}

    	function callback(event) {
    		switch (event.detail.text) {
    			case "unavail":
    				excludeWord();
    				guesses.pop();
    				console.log("Delete");
    				break;
    			case "finished":
    				$$invalidate(1, msg = "Well.done. Reload to start again.");
    				return;
    		}

    		let word = findCandidate();

    		if (word == "") {
    			$$invalidate(1, msg = "Give up!");
    		} else {
    			addItem(word);
    			console.log("Add", word);
    		}
    	}

    	const writable_props = ['guesses'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<Rows> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('guesses' in $$props) $$invalidate(0, guesses = $$props.guesses);
    	};

    	$$self.$capture_state = () => ({
    		Row,
    		randomChoice,
    		findCandidate,
    		excludeWord,
    		words,
    		onMount,
    		guesses,
    		msg,
    		addItem,
    		callback
    	});

    	$$self.$inject_state = $$props => {
    		if ('guesses' in $$props) $$invalidate(0, guesses = $$props.guesses);
    		if ('msg' in $$props) $$invalidate(1, msg = $$props.msg);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [guesses, msg, callback, addItem];
    }

    class Rows extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { guesses: 0, addItem: 3 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Rows",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get guesses() {
    		throw new Error("<Rows>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set guesses(value) {
    		throw new Error("<Rows>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get addItem() {
    		return this.$$.ctx[3];
    	}

    	set addItem(value) {
    		throw new Error("<Rows>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.46.4 */
    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	let body;
    	let h1;
    	let t1;
    	let rows;
    	let current;
    	rows = new Rows({ $$inline: true });

    	const block = {
    		c: function create() {
    			body = element("body");
    			h1 = element("h1");
    			h1.textContent = "Wordle Guesser";
    			t1 = space();
    			create_component(rows.$$.fragment);
    			attr_dev(h1, "class", "svelte-tm5o94");
    			add_location(h1, file, 6, 1, 65);
    			attr_dev(body, "class", "svelte-tm5o94");
    			add_location(body, file, 5, 0, 57);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, body, anchor);
    			append_dev(body, h1);
    			append_dev(body, t1);
    			mount_component(rows, body, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(rows.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(rows.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(body);
    			destroy_component(rows);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Rows });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
