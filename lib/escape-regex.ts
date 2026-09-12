/**
 * Kullanıcıdan gelen serbest metni MongoDB `$regex` aramasında güvenle
 * kullanabilmek için regex'te özel anlamı olan karakterleri kaçışlar.
 * Kaçışlanmazsa arama kutusuna girilen `.*`, `(a+)+` gibi ifadeler hem
 * istenmeyen eşleşmelere hem de "ReDoS" (aşırı geri izleme) riskine yol açar.
 */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
