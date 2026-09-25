const BR_MOBILE_WITH_NINE = /^55(\d{2})9(\d{8})$/;
const BR_MOBILE_WITHOUT_NINE = /^55(\d{2})(\d{8})$/;

export function phoneVariants(phone: string): string[] {
  const digits = phone.replace(/\D/g, '');
  const variants = new Set<string>([digits]);

  const withNine = digits.match(BR_MOBILE_WITH_NINE);
  if (withNine) variants.add(`55${withNine[1]}${withNine[2]}`);

  const withoutNine = digits.match(BR_MOBILE_WITHOUT_NINE);
  if (withoutNine) variants.add(`55${withoutNine[1]}9${withoutNine[2]}`);

  return [...variants];
}

const BR_DDD_AND_NUMBER = /^([1-9]{2})(9?\d{8})$/;

export function normalizeBrPhone(input: string): string | null {
  const digits = input.replace(/\D/g, '');

  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) return digits;
  if (BR_DDD_AND_NUMBER.test(digits)) return `55${digits}`;
  if (digits.length >= 10 && digits.length <= 15 && !digits.startsWith('55')) return digits;

  return null;
}
