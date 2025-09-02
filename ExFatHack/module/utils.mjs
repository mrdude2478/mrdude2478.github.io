import { Int } from '/ExFatHack/module/int64.mjs';

export class DieError extends Error {
    constructor(...args) {
        super(...args);
        this.name = this.constructor.name;
    }
}

export function die(msg = '') {
    throw new DieError(msg);
}

const console = document.getElementById('console');

export function clear_log() {
    console.innerHTML = null;
}

export function str2array(str, length, offset) {
    if (offset === undefined) {
        offset = 0;
    }
    let a = new Array(length);
    for (let i = 0; i < length; i++) {
        a[i] = str.charCodeAt(i + offset);
    }
    return a;
}

export function align(a, alignment) {
    if (!(a instanceof Int)) {
        a = new Int(a);
    }
    const mask = -alignment & 0xffffffff;
    let type = a.constructor;
    let low = a.low & mask;
    return new type(low, a.high);
}

export async function send(url, buffer, file_name, onload = () => { }) {
    const file = new File(
        [buffer],
        file_name,
        { type: 'application/octet-stream' }
    );
    const form = new FormData();
    form.append('upload', file);

    debug_log('send');
    const response = await fetch(url, { method: 'POST', body: form });

    if (!response.ok) {
        throw Error(`Network response was not OK, status: ${response.status}`);
    }
    onload();
}

export function sleep(ms = 0) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function hex(number) {
    return '0x' + number.toString(16);
}

export function hex_np(number) {
    return number.toString(16);
}