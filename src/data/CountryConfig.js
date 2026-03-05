/**
 * Country configurations for sled and athlete colors.
 *
 * Each country defines:
 *   - id:       unique key string
 *   - name:     display name
 *   - flag:     emoji flag for the selection UI
 *   - sled:     { primary, secondary, accent } hex colors
 *                primary  → body + cowl
 *                secondary → cockpit interior
 *                accent    → windshield tint
 *   - athlete:  { suit, helmet } hex colors
 *                suit   → torso, arms, legs
 *                helmet → helmet shell
 */
export const COUNTRIES = [
    {
        id: 'jamaica',
        name: 'Jamaica',
        flag: '🇯🇲',
        sled: { primary: 0x111111, secondary: 0x009b3a, accent: 0xfed100 },
        athlete: { suit: 0x111111, helmet: 0x009b3a }
    },
    {
        id: 'usa',
        name: 'USA',
        flag: '🇺🇸',
        sled: { primary: 0x1a5cad, secondary: 0xcc1533, accent: 0xffffff },
        athlete: { suit: 0x1a5cad, helmet: 0xcc1533 }
    },
    {
        id: 'germany',
        name: 'Germany',
        flag: '🇩🇪',
        sled: { primary: 0x111111, secondary: 0xdd0000, accent: 0x111111 },
        athlete: { suit: 0xffcc00, helmet: 0xdd0000 }
    },
    {
        id: 'canada',
        name: 'Canada',
        flag: '🇨🇦',
        sled: { primary: 0xdd0000, secondary: 0xffffff, accent: 0x111111 },
        athlete: { suit: 0xdd0000, helmet: 0xffffff }
    },
    {
        id: 'italy',
        name: 'Italy',
        flag: '🇮🇹',
        sled: { primary: 0x009246, secondary: 0xdd0000, accent: 0xffffff },
        athlete: { suit: 0xdd0000, helmet: 0x009246 }
    },
    {
        id: 'south_korea',
        name: 'South Korea',
        flag: '🇰🇷',
        sled: { primary: 0xffffff, secondary: 0xdd0000, accent: 0x1a5cad },
        athlete: { suit: 0xdd0000, helmet: 0xffffff }
    },
    {
        id: 'france',
        name: 'France',
        flag: '🇫🇷',
        sled: { primary: 0xc0c0c0, secondary: 0xdd0000, accent: 0x1a5cad },
        athlete: { suit: 0x1a5cad, helmet: 0xffffff }
    },
    {
        id: 'netherlands',
        name: 'Netherlands',
        flag: '🇳🇱',
        sled: { primary: 0xff6600, secondary: 0xffffff, accent: 0x1a5cad },
        athlete: { suit: 0x1a5cad, helmet: 0xff6600 }
    }
];

/** Find a country config by id. */
export function getCountryById(id) {
    return COUNTRIES.find(c => c.id === id) || COUNTRIES[0];
}
