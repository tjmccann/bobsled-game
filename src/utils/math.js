export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

export function lerp(a, b, t) {
    return a + (b - a) * t;
}

export function inverseLerp(a, b, value) {
    if (a === b) return 0;
    return (value - a) / (b - a);
}

export function remap(inMin, inMax, outMin, outMax, value) {
    const t = inverseLerp(inMin, inMax, value);
    return lerp(outMin, outMax, t);
}

export function smoothstep(edge0, edge1, x) {
    const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
}

export function degToRad(deg) {
    return deg * (Math.PI / 180);
}

export function radToDeg(rad) {
    return rad * (180 / Math.PI);
}
