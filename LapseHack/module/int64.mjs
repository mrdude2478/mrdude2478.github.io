const isInteger = Number.isInteger;
function check_not_in_range(x) {
    return !(isInteger(x) && -0x80000000 <= x && x <= 0xffffffff);
}
export function lohi_from_one(low) {
    if (low instanceof Int) {
        return low._u32.slice();
    }

    if (check_not_in_range(low)) {
        throw TypeError(`low not a 32-bit integer: ${low}`);
    }

    return [low >>> 0, low < 0 ? -1 >>> 0 : 0];
}
export class Int {
    constructor(low, high) {
        if (high === undefined) {
            this._u32 = new Uint32Array(lohi_from_one(low));
            return;
        }

        if (check_not_in_range(low)) {
            throw TypeError(`low not a 32-bit integer: ${low}`);
        }

        if (check_not_in_range(high)) {
            throw TypeError(`high not a 32-bit integer: ${high}`);
        }

        this._u32 = new Uint32Array([low, high]);
    }
    get lo() {
        return this._u32[0];
    }
    get hi() {
        return this._u32[1];
    }
    get bot() {
        return this._u32[0] | 0;
    }
    get top() {
        return this._u32[1] | 0;
    }

    neg() {
        const u32 = this._u32;
        const low = (~u32[0] >>> 0) + 1;
        return new this.constructor(low >>> 0, ((~u32[1] >>> 0) + (low > 0xffffffff)) >>> 0);
    }

    eq(b) {
        const values = lohi_from_one(b);
        const u32 = this._u32;
        return u32[0] === values[0] && u32[1] === values[1];
    }

    ne(b) {
        return !this.eq(b);
    }

    add(b) {
        const values = lohi_from_one(b);
        const u32 = this._u32;
        const low = u32[0] + values[0];
        return new this.constructor(low >>> 0, (u32[1] + values[1] + (low > 0xffffffff)) >>> 0);
    }

    sub(b) {
        const values = lohi_from_one(b);
        const u32 = this._u32;
        const low = u32[0] + (~values[0] >>> 0) + 1;
        return new this.constructor(low >>> 0, (u32[1] + (~values[1] >>> 0) + (low > 0xffffffff)) >>> 0);
    }

    toString(is_pretty = false) {
        if (!is_pretty) {
            const low = this.lo.toString(16).padStart(8, "0");
            const high = this.hi.toString(16).padStart(8, "0");
            return `0x${high}${low}`;
        }
        let high = this.hi.toString(16).padStart(8, "0");
        high = `${high.substring(0, 4)}_${high.substring(4)}`;

        let low = this.lo.toString(16).padStart(8, "0");
        low = `${low.substring(0, 4)}_${low.substring(4)}`;

        return `0x${high}_${low}`;
    }
}