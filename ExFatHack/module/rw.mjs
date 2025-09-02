import { Int, lohi_from_one } from '/ExFatHack/module/int64.mjs';

export class BufferView extends Uint8Array {
    constructor(...args) {
        super(...args);
        this._dview = new DataView(this.buffer);
    }

    read16(offset) {
        return this._dview.getUint16(offset, true);
    }

    read32(offset) {
        return this._dview.getUint32(offset, true);
    }

    read64(offset) {
        return new Int(
            this._dview.getUint32(offset, true),
            this._dview.getUint32(offset + 4, true),
        );
    }

    write16(offset, value) {
        this._dview.setUint16(offset, value, true);
    }

    write32(offset, value) {
        this._dview.setUint32(offset, value, true);
    }

    write64(offset, value) {
        const values = lohi_from_one(value)
        this._dview.setUint32(offset, values[0], true);
        this._dview.setUint32(offset + 4, values[1], true);
    }
}
function read(u8_view, offset, size) {
    let res = 0;
    for (let i = 0; i < size; i++) {
        res += u8_view[offset + i] << i * 8;
    }
    return res >>> 0;
}

export function read16(u8_view, offset) {
    return read(u8_view, offset, 2);
}

export function read32(u8_view, offset) {
    return read(u8_view, offset, 4);
}

export function read64(u8_view, offset) {
    return new Int(read32(u8_view, offset), read32(u8_view, offset + 4));
}

function write(u8_view, offset, value, size) {
    for (let i = 0; i < size; i++) {
        u8_view[offset + i] = (value >>> i * 8) & 0xff;
    }
}

export function write16(u8_view, offset, value) {
    write(u8_view, offset, value, 2);
}

export function write32(u8_view, offset, value) {
    write(u8_view, offset, value, 4);
}

export function write64(u8_view, offset, value) {
    if (!(value instanceof Int)) {
        throw TypeError('write64 value must be an Int');
    }

    let low = value.low;
    let high = value.high;

    for (let i = 0; i < 4; i++) {
        u8_view[offset + i] = (low >>> i * 8) & 0xff;
    }
    for (let i = 0; i < 4; i++) {
        u8_view[offset + 4 + i] = (high >>> i * 8) & 0xff;
    }
}