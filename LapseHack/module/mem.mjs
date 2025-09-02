import { Int, lohi_from_one } from "/LapseHack/module/int64.mjs";
import { view_m_vector, view_m_length } from "/LapseHack/module/offset.mjs";
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
            add_and_set_addr(m, offset, this.lo, this.hi);
            offset = 0;
        }
        return m.read8_at(offset);
    }

    read16(offset) {
        const m = mem;
        if (isInteger(offset) && 0 <= offset && offset <= 0xffffffff) {
            m._set_addr_direct(this);
        } else {
            add_and_set_addr(m, offset, this.lo, this.hi);
            offset = 0;
        }
        return m.read16_at(offset);
    }

    read32(offset) {
        const m = mem;
        if (isInteger(offset) && 0 <= offset && offset <= 0xffffffff) {
            m._set_addr_direct(this);
        } else {
            add_and_set_addr(m, offset, this.lo, this.hi);
            offset = 0;
        }
        return m.read32_at(offset);
    }

    read64(offset) {
        const m = mem;
        if (isInteger(offset) && 0 <= offset && offset <= 0xffffffff) {
            m._set_addr_direct(this);
        } else {
            add_and_set_addr(m, offset, this.lo, this.hi);
            offset = 0;
        }
        return m.read64_at(offset);
    }

    readp(offset) {
        const m = mem;
        if (isInteger(offset) && 0 <= offset && offset <= 0xffffffff) {
            m._set_addr_direct(this);
        } else {
            add_and_set_addr(m, offset, this.lo, this.hi);
            offset = 0;
        }
        return m.readp_at(offset);
    }

    write8(offset, value) {
        const m = mem;
        if (isInteger(offset) && 0 <= offset && offset <= 0xffffffff) {
            m._set_addr_direct(this);
        } else {
            add_and_set_addr(m, offset, this.lo, this.hi);
            offset = 0;
        }
        m.write8_at(offset, value);
    }

    write16(offset, value) {
        const m = mem;
        if (isInteger(offset) && 0 <= offset && offset <= 0xffffffff) {
            m._set_addr_direct(this);
        } else {
            add_and_set_addr(m, offset, this.lo, this.hi);
            offset = 0;
        }
        m.write16_at(offset, value);
    }

    write32(offset, value) {
        const m = mem;
        if (isInteger(offset) && 0 <= offset && offset <= 0xffffffff) {
            m._set_addr_direct(this);
        } else {
            add_and_set_addr(m, offset, this.lo, this.hi);
            offset = 0;
        }
        m.write32_at(offset, value);
    }

    write64(offset, value) {
        const m = mem;
        if (isInteger(offset) && 0 <= offset && offset <= 0xffffffff) {
            m._set_addr_direct(this);
        } else {
            add_and_set_addr(m, offset, this.lo, this.hi);
            offset = 0;
        }
        m.write64_at(offset, value);
    }
}
export class Memory {
    constructor(main, worker, obj, addr_addr, fake_addr) {
        this._main = main;
        this._worker = worker;
        this._obj = obj;
        this._addr_low = addr_addr.lo;
        this._addr_high = addr_addr.hi;
        this._fake_low = fake_addr.lo;
        this._fake_high = fake_addr.hi;
        main[view_m_length / 4] = 0xffffffff;
        init_module(this);
        const off_mvec = view_m_vector;
        const buf = new ArrayBuffer(0);
        const src = new Uint8Array(buf);
        const sset = new Uint32Array(buf);
        const sset_p = this.addrof(sset);
        sset_p.write64(off_mvec, this.addrof(src).add(off_mvec));
        sset_p.write32(view_m_length, 3);
        this._cpysrc = src;
        this._src_setter = sset;
        const dst = new Uint8Array(buf);
        const dset = new Uint32Array(buf);
        const dset_p = this.addrof(dset);
        dset_p.write64(off_mvec, this.addrof(dst).add(off_mvec));
        dset_p.write32(view_m_length, 3);
        dset[2] = 0xffffffff;
        this._cpydst = dst;
        this._dst_setter = dset;
    }

    cpy(dst, src, len) {
        if (!(isInteger(len) && 0 <= len && len <= 0xffffffff)) {
            throw TypeError("len not a unsigned 32-bit integer");
        }

        const dvals = lohi_from_one(dst);
        const svals = lohi_from_one(src);
        const dset = this._dst_setter;
        const sset = this._src_setter;
        dset[0] = dvals[0];
        dset[1] = dvals[1];
        sset[0] = svals[0];
        sset[1] = svals[1];
        sset[2] = len;
        this._cpydst.set(this._cpysrc);
    }

    gc_alloc(size) {
        if (!isInteger(size)) {
            throw TypeError("size not a integer");
        }
        if (size < 0) {
            throw RangeError("size is negative");
        }

        const fastLimit = 1000;
        size = ((size + 7) & ~7) >> 3;
        if (size > fastLimit) {
            throw RangeError("size is too large");
        }

        const backer = new Float64Array(size);
        return [mem.addrof(backer).readp(view_m_vector), backer];
    }

    fakeobj(addr) {
        const values = lohi_from_one(addr);
        const worker = this._worker;
        const main = this._main;
        main[off_vector] = this._fake_low;
        main[off_vector2] = this._fake_high;
        worker.setUint32(0, values[0], true);
        worker.setUint32(4, values[1], true);
        return this._obj[0];
    }

    addrof(object) {
        if (object === null || (typeof object !== "object" && typeof object !== "function")) {
            throw TypeError("argument not a JS object");
        }

        const obj = this._obj;
        const worker = this._worker;
        const main = this._main;
        obj.addr = object;
        main[off_vector] = this._addr_low;
        main[off_vector2] = this._addr_high;
        const res = new Addr(worker.getUint32(0, true), worker.getUint32(4, true));
        obj.addr = null;
        return res;
    }

    _set_addr_direct(addr) {
        const main = this._main;
        main[off_vector] = addr.lo;
        main[off_vector2] = addr.hi;
    }

    set_addr(addr) {
        const values = lohi_from_one(addr);
        const main = this._main;
        main[off_vector] = values[0];
        main[off_vector2] = values[1];
    }

    get_addr() {
        const main = this._main;
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
            throw TypeError("offset not a integer");
        }
        return this._worker.getUint8(offset);
    }

    read16_at(offset) {
        if (!isInteger(offset)) {
            throw TypeError("offset not a integer");
        }
        return this._worker.getUint16(offset, true);
    }

    read32_at(offset) {
        if (!isInteger(offset)) {
            throw TypeError("offset not a integer");
        }
        return this._worker.getUint32(offset, true);
    }

    read64_at(offset) {
        if (!isInteger(offset)) {
            throw TypeError("offset not a integer");
        }
        const worker = this._worker;
        return new Int(worker.getUint32(offset, true), worker.getUint32(offset + 4, true));
    }

    readp_at(offset) {
        if (!isInteger(offset)) {
            throw TypeError("offset not a integer");
        }
        const worker = this._worker;
        return new Addr(worker.getUint32(offset, true), worker.getUint32(offset + 4, true));
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
            throw TypeError("offset not a integer");
        }
        this._worker.setUint8(offset, value);
    }

    write16_at(offset, value) {
        if (!isInteger(offset)) {
            throw TypeError("offset not a integer");
        }
        this._worker.setUint16(offset, value, true);
    }

    write32_at(offset, value) {
        if (!isInteger(offset)) {
            throw TypeError("offset not a integer");
        }
        this._worker.setUint32(offset, value, true);
    }

    write64_at(offset, value) {
        if (!isInteger(offset)) {
            throw TypeError("offset not a integer");
        }
        const values = lohi_from_one(value);
        const worker = this._worker;
        worker.setUint32(offset, values[0], true);
        worker.setUint32(offset + 4, values[1], true);
    }
}