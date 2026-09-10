/** Telefonu tek biçime çevirir: 05xx... / 5xx... / 905xx... -> 905xxxxxxxxx */
export function normalizePhone(input: string): string | null {
    let d = String(input || '').replace(/\D/g, '');
    if (d.startsWith('0')) d = '90' + d.slice(1);
    else if (d.length === 10) d = '90' + d;
    else if (d.length === 11 && d.startsWith('5')) d = '90' + d;
    if (d.length !== 12 || !d.startsWith('90')) return null;
    return d;
}

/** Okunaklı gösterim: 90 535 027 88 55 */
export function prettyPhone(p: string): string {
    const d = String(p || '');
    if (d.length === 12 && d.startsWith('90'))
        return d.slice(0, 2) + ' ' + d.slice(2, 5) + ' ' + d.slice(5, 8) + ' ' + d.slice(8);
    return d;
}
