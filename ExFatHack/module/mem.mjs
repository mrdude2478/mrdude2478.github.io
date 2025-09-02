import { Int, lohi_from_one } from '/ExFatHack/module/int64.mjs';
import { view_m_vector, view_m_length } from '/ExFatHack/module/offset.mjs';
export let mem = null;
const off_vector = view_m_vector / 4;
const off_vector2 = (view_m_vector + 4) / 4;
const isInteger = Number.isInteger;
function init_module(memory) {
    mem = memory;
}

function add_and_set_addr(mem, offset, base_lo, base_hi) {
    const values = lohi_from_one(offset);
    const main = mem._main;
    const low = base_lo + values[0];
    main[off_vector] = low;
    main[off_vector2] = base_hi + values[1] + (low > 0xffffffff);
}

export class Addr extends Int {
    read8(offset) {
        const m = mem;
        if (isInteger(offset) && 0 <= offset && offset <= 0xffffffff) {
            m._set_addr_direct(this);
        } else {
            add_and_set_addr(m, offset, this.low, this.high);
            offset = 0;
        }
        return m.read8_at(offset);
    }

    read16(offset) {
        const m = mem;
        if (isInteger(offset) && 0 <= offset && offset <= 0xffffffff) {
            m._set_addr_direct(this);
        } else {
            add_and_set_addr(m, offset, this.low, this.high);
            offset = 0;
        }
        return m.read16_at(offset);
    }

    read32(offset) {
        const m = mem;
        if (isInteger(offset) && 0 <= offset && offset <= 0xffffffff) {
            m._set_addr_direct(this);
        } else {
            add_and_set_addr(m, offset, this.low, this.high);
            offset = 0;
        }
        return m.read32_at(offset);
    }

    read64(offset) {
        const m = mem;
        if (isInteger(offset) && 0 <= offset && offset <= 0xffffffff) {
            m._set_addr_direct(this);
        } else {
            add_and_set_addr(m, offset, this.low, this.high);
            offset = 0;
        }
        return m.read64_at(offset);
    }

    readp(offset) {
        const m = mem;
        if (isInteger(offset) && 0 <= offset && offset <= 0xffffffff) {
            m._set_addr_direct(this);
        } else {
            add_and_set_addr(m, offset, this.low, this.high);
            offset = 0;
        }
        return m.readp_at(offset);
    }

    write8(offset, value) {
        const m = mem;
        if (isInteger(offset) && 0 <= offset && offset <= 0xffffffff) {
            m._set_addr_direct(this);
        } else {
            add_and_set_addr(m, offset, this.low, this.high);
            offset = 0;
        }
        m.write8_at(offset, value);
    }

    write16(offset, value) {
        const m = mem;
        if (isInteger(offset) && 0 <= offset && offset <= 0xffffffff) {
            m._set_addr_direct(this);
        } else {
            add_and_set_addr(m, offset, this.low, this.high);
            offset = 0;
        }
        m.write16_at(offset, value);
    }

    write32(offset, value) {
        const m = mem;
        if (isInteger(offset) && 0 <= offset && offset <= 0xffffffff) {
            m._set_addr_direct(this);
        } else {
            add_and_set_addr(m, offset, this.low, this.high);
            offset = 0;
        }
        m.write32_at(offset, value);
    }

    write64(offset, value) {
        const m = mem;
        if (isInteger(offset) && 0 <= offset && offset <= 0xffffffff) {
            m._set_addr_direct(this);
        } else {
            add_and_set_addr(m, offset, this.low, this.high);
            offset = 0;
        }

        m.write64_at(offset, value);
    }
}
export class Memory {
    constructor(main, worker, obj, addr_addr) {
        this._main = main;
        this._worker = worker;
        this._obj = obj;
        this._addr_low = addr_addr.low;
        this._addr_high = addr_addr.high;
        main[view_m_length / 4] = 0xffffffff;
        init_module(this);
    }

    addrof(object) {
        if ((typeof object !== 'object' || object === null)
            && typeof object !== 'function'
        ) {
            throw TypeError('argument not a JS object');
        }

        const obj = this._obj;
        const worker = this._worker;
        const main = this._main;
        obj.addr = object;
        main[off_vector] = this._addr_low;
        main[off_vector2] = this._addr_high;
        const res = new Addr(
            worker.getUint32(0, true),
            worker.getUint32(4, true),
        );
        obj.addr = null;
        return res;
    }

    _set_addr_direct(addr) {
        const main = this._main;
        main[off_vector] = addr.low;
        main[off_vector2] = addr.high;
    }

    set_addr(addr) {
        const values = lohi_from_one(addr);
        const main = this._main;
        main[off_vector] = values[0];
        main[off_vector2] = values[1];
    }

    get_addr() {
        return new Addr(main[off_vector], main[off_vector2]);
    }

    read8(addr) {
        this.set_addr(addr);
        return this._worker.getUint8(0);
    }

    read16(addr) {
        this.set_addr(addr);
        return this._worker.getUint16(0, true);
    }

    read32(addr) {
        this.set_addr(addr);
        return this._worker.getUint32(0, true);
    }

    read64(addr) {
        this.set_addr(addr);
        const worker = this._worker;
        return new Int(worker.getUint32(0, true), worker.getUint32(4, true));
    }

    readp(addr) {
        this.set_addr(addr);
        const worker = this._worker;
        return new Addr(worker.getUint32(0, true), worker.getUint32(4, true));
    }

    read8_at(offset) {
        if (!isInteger(offset)) {
            throw TypeError('offset not a integer');
        }
        return this._worker.getUint8(offset);
    }

    read16_at(offset) {
        if (!isInteger(offset)) {
            throw TypeError('offset not a integer');
        }
        return this._worker.getUint16(offset, true);
    }

    read32_at(offset) {
        if (!isInteger(offset)) {
            throw TypeError('offset not a integer');
        }
        return this._worker.getUint32(offset, true);
    }

    read64_at(offset) {
        if (!isInteger(offset)) {
            throw TypeError('offset not a integer');
        }
        const worker = this._worker;
        return new Int(
            worker.getUint32(offset, true),
            worker.getUint32(offset + 4, true),
        );
    }

    readp_at(offset) {
        if (!isInteger(offset)) {
            throw TypeError('offset not a integer');
        }
        const worker = this._worker;
        return new Addr(
            worker.getUint32(offset, true),
            worker.getUint32(offset + 4, true),
        );
    }

    write8(addr, value) {
        this.set_addr(addr);
        this._worker.setUint8(0, value);
    }

    write16(addr, value) {
        this.set_addr(addr);
        this._worker.setUint16(0, value, true);
    }

    write32(addr, value) {
        this.set_addr(addr);
        this._worker.setUint32(0, value, true);
    }

    write64(addr, value) {
        const values = lohi_from_one(value);
        this.set_addr(addr);
        const worker = this._worker;
        worker.setUint32(0, values[0], true);
        worker.setUint32(4, values[1], true);
    }

    write8_at(offset, value) {
        if (!isInteger(offset)) {
            throw TypeError('offset not a integer');
        }
        this._worker.setUint8(offset, value);
    }

    write16_at(offset, value) {
        if (!isInteger(offset)) {
            throw TypeError('offset not a integer');
        }
        this._worker.setUint16(offset, value, true);
    }

    write32_at(offset, value) {
        if (!isInteger(offset)) {
            throw TypeError('offset not a integer');
        }
        this._worker.setUint32(offset, value, true);
    }

    write64_at(offset, value) {
        if (!isInteger(offset)) {
            throw TypeError('offset not a integer');
        }
        const values = lohi_from_one(value);
        const worker = this._worker;
        worker.setUint32(offset, values[0], true);
        worker.setUint32(offset + 4, values[1], true);
    }
}