import { Int, lohi_from_one } from "/LapseHack/module/int64.mjs";
import { Addr } from "/LapseHack/module/mem.mjs";
import { BufferView } from "/LapseHack/module/rw.mjs";
import * as config from "/LapseHack/config.mjs";
import * as mt from "/LapseHack/module/memtools.mjs";
function ViewMixin(superclass) {
    const res = class extends superclass {
        constructor(...args) {
            super(...args);
            this.buffer;
        }

        get addr() {
            let res = this._addr_cache;
            if (res !== undefined) {
                return res;
            }
            res = mt.get_view_vector(this);
            this._addr_cache = res;
            return res;
        }

        get size() {
            return this.byteLength;
        }

        addr_at(index) {
            const size = this.BYTES_PER_ELEMENT;
            return this.addr.add(index * size);
        }

        sget(index) {
            return this[index] | 0;
        }
    };

    if (0x600 <= config.target && config.target < 0x1000) {
        res.from = function from(...args) {
            const base = this.__proto__;
            return new this(base.from(...args).buffer);
        };

        res.of = function of(...args) {
            const base = this.__proto__;
            return new this(base.of(...args).buffer);
        };
    }

    return res;
}
export class View1 extends ViewMixin(Uint8Array) { }
export class View2 extends ViewMixin(Uint16Array) { }
export class View4 extends ViewMixin(Uint32Array) { }
export class Buffer extends BufferView {
    get addr() {
        let res = this._addr_cache;
        if (res !== undefined) {
            return res;
        }
        res = mt.get_view_vector(this);
        this._addr_cache = res;
        return res;
    }
    get size() {
        return this.byteLength;
    }

    addr_at(index) {
        return this.addr.add(index);
    }
}

if (0x600 <= config.target && config.target < 0x1000) {
    Buffer.from = function from(...args) {
        const base = this.__proto__;
        return new this(base.from(...args).buffer);
    };
    Buffer.of = function of(...args) {
        const base = this.__proto__;
        return new this(base.of(...args).buffer);
    };
}

const VariableMixin = (superclass) =>
    class extends superclass {
        constructor(value = 0) {
            if (typeof value !== "number") {
                throw TypeError("value not a number");
            }
            super([value]);
        }

        addr_at(...args) {
            throw TypeError("unimplemented method");
        }

        [Symbol.toPrimitive](hint) {
            return this[0];
        }

        toString(...args) {
            return this[0].toString(...args);
        }
    };

export class Byte extends VariableMixin(View1) { }
export class Short extends VariableMixin(View2) { }
export class Word extends VariableMixin(View4) { }
export class LongArray {
    constructor(length) {
        this.buffer = new DataView(new ArrayBuffer(length * 8));
    }
    get addr() {
        return mt.get_view_vector(this.buffer);
    }

    addr_at(index) {
        return this.addr.add(index * 8);
    }
    get length() {
        return this.buffer.length / 8;
    }
    get size() {
        return this.buffer.byteLength;
    }
    get byteLength() {
        return this.size;
    }

    get(index) {
        const buffer = this.buffer;
        const base = index * 8;
        return new Int(buffer.getUint32(base, true), buffer.getUint32(base + 4, true));
    }

    set(index, value) {
        const buffer = this.buffer;
        const base = index * 8;
        const values = lohi_from_one(value);

        buffer.setUint32(base, values[0], true);
        buffer.setUint32(base + 4, values[1], true);
    }
}

const Word64Mixin = (superclass) =>
    class extends superclass {
        constructor(...args) {
            if (!args.length) {
                return super(0);
            }
            super(...args);
        }
        get addr() {
            return mt.get_view_vector(this._u32);
        }
        get length() {
            return 1;
        }
        get size() {
            return 8;
        }
        get byteLength() {
            return 8;
        }
        get lo() {
            return super.lo;
        }
        set lo(value) {
            this._u32[0] = value;
        }
        get hi() {
            return super.hi;
        }
        set hi(value) {
            this._u32[1] = value;
        }

        set(value) {
            const buffer = this._u32;
            const values = lohi_from_one(value);

            buffer[0] = values[0];
            buffer[1] = values[1];
        }
    };
export class Long extends Word64Mixin(Int) {
    as_addr() {
        return new Addr(this);
    }
}
export class Pointer extends Word64Mixin(Addr) { }