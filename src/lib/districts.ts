/** The 64 districts of Bangladesh, used for the checkout address form. */
export const BD_DISTRICTS = [
  "Bagerhat", "Bandarban", "Barguna", "Barishal", "Bhola", "Bogura",
  "Brahmanbaria", "Chandpur", "Chapainawabganj", "Chattogram", "Chuadanga",
  "Cox's Bazar", "Cumilla", "Dhaka", "Dinajpur", "Faridpur", "Feni",
  "Gaibandha", "Gazipur", "Gopalganj", "Habiganj", "Jamalpur", "Jashore",
  "Jhalokathi", "Jhenaidah", "Joypurhat", "Khagrachhari", "Khulna",
  "Kishoreganj", "Kurigram", "Kushtia", "Lakshmipur", "Lalmonirhat",
  "Madaripur", "Magura", "Manikganj", "Meherpur", "Moulvibazar",
  "Munshiganj", "Mymensingh", "Naogaon", "Narail", "Narayanganj",
  "Narsingdi", "Natore", "Netrokona", "Nilphamari", "Noakhali", "Pabna",
  "Panchagarh", "Patuakhali", "Pirojpur", "Rajbari", "Rajshahi", "Rangamati",
  "Rangpur", "Satkhira", "Shariatpur", "Sherpur", "Sirajganj", "Sunamganj",
  "Sylhet", "Tangail", "Thakurgaon",
] as const;

export type District = (typeof BD_DISTRICTS)[number];

export function isDistrict(value: string): value is District {
  return (BD_DISTRICTS as readonly string[]).includes(value);
}

export type ShippingZone = "DHAKA" | "OUTSIDE_DHAKA";

/** Delivery zone is decided by the district, never by the customer. */
export function zoneForDistrict(district: string): ShippingZone {
  return district === "Dhaka" ? "DHAKA" : "OUTSIDE_DHAKA";
}

/** Normalises Bangladeshi mobile numbers to 01XXXXXXXXX, or null if invalid. */
export function normalizeBdPhone(input: string): string | null {
  const digits = input.replace(/[^\d]/g, "");
  const local = digits.startsWith("880") ? `0${digits.slice(3)}` : digits;
  return /^01[3-9]\d{8}$/.test(local) ? local : null;
}
