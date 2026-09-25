const BR_MOBILE_WITH_NINE = /^55(\d{2})9(\d{8})$/;
const BR_MOBILE_WITHOUT_NINE = /^55(\d{2})(\d{8})$/;
const BR_DDD_AND_NUMBER = /^([1-9]\d)(9?\d{8})$/;

export function phoneVariants(phone: string): string[] {
  const digits = phone.replace(/\D/g, '');
  const variants = new Set<string>([digits]);

  const withNine = digits.match(BR_MOBILE_WITH_NINE);
  if (withNine) variants.add(`55${withNine[1]}${withNine[2]}`);

  const withoutNine = digits.match(BR_MOBILE_WITHOUT_NINE);
  if (withoutNine) variants.add(`55${withoutNine[1]}9${withoutNine[2]}`);

  return [...variants];
}

export function normalizeBrPhone(input: string): string | null {
  const digits = input.replace(/\D/g, '').replace(/^0+/, '');

  const semPais = digits.startsWith('55') ? digits.slice(2) : digits;
  if (!BR_DDD_AND_NUMBER.test(semPais)) return null;

  return `55${semPais}`;
}

export function formatBrPhone(phone: string): string {
  const match = phone.match(/^55(\d{2})(\d{4,5})(\d{4})$/);
  if (!match) return phone;
  return `+55 ${match[1]} ${match[2]}-${match[3]}`;
}
