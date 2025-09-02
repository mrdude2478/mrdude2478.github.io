function check_bcd(value) {
    for (let i = 0; i <= 12; i += 4) {
        const nibble = (value >>> i) & 0xf;

        if (nibble > 9) {
            return false;
        }
    }
    return true;
}
export function set_target(value) {
    if (!Number.isInteger(value)) {
        throw TypeError(`value not an integer: ${value}`);
    }
    if (value >= 0x20000 || value < 0) {
        throw RangeError(`value >= 0x20000 or value < 0: ${value}`);
    }
    const version = value & 0xffff;
    if (!check_bcd(version)) {
        throw RangeError(`value & 0xffff not in BCD format ${version}`);
    }
    target = value;
}

export let target = null;
set_target(0x900);