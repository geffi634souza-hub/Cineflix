export interface VipReferralItem {
  id: string;
  referrerId: string;
  referrerName: string;
  friendName: string;
  friendPhone?: string;
  date: string;
  status: 'pago' | 'pendente';
  bonusDaysGranted?: number;
}

export interface VipClientRecord {
  id: string;
  name: string;
  accessNumber?: string; // Ex: "Cliente 1", "001", "1"
  password?: string; // Senha para o cliente acessar
  email?: string;
  phone?: string;
  referralCode: string;
  activatedAt: string;
  expiresAt: string;
  referrals: { id?: string; name: string; date: string; status: 'pago' | 'pendente'; bonusDaysGranted?: number }[];
  notes?: string;
}

export function normalizeClientName(name: string): string {
  return (name || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function calcVipDaysRemaining(expiresAt: string): number {
  if (!expiresAt) return 0;
  const exp = new Date(expiresAt).getTime();
  const now = Date.now();
  if (exp <= now) return 0;
  return Math.max(0, Math.ceil((exp - now) / (1000 * 60 * 60 * 24)));
}

export function isVipRecordActive(expiresAt: string): boolean {
  if (!expiresAt) return false;
  const exp = new Date(expiresAt).getTime();
  return exp > Date.now();
}

export function findVipClient(clients: VipClientRecord[], queryName: string): VipClientRecord | undefined {
  if (!queryName) return undefined;
  const cleanQuery = normalizeClientName(queryName);
  if (!cleanQuery) return undefined;

  // Exact normalized match or match first + last name or accessNumber
  return clients.find((c) => {
    const cleanClient = normalizeClientName(c.name);
    const cleanAccessNumber = normalizeClientName(c.accessNumber || '');
    return (
      cleanClient === cleanQuery ||
      cleanAccessNumber === cleanQuery ||
      cleanClient.startsWith(cleanQuery) ||
      cleanQuery.startsWith(cleanClient)
    );
  });
}

export function findVipClientByCredentials(
  clients: VipClientRecord[],
  identifier: string,
  password?: string
): VipClientRecord | undefined {
  if (!identifier) return undefined;
  const cleanId = normalizeClientName(identifier);
  const cleanNumOnly = identifier.replace(/\D/g, '');

  const client = clients.find((c) => {
    const cleanName = normalizeClientName(c.name);
    const cleanAccess = normalizeClientName(c.accessNumber || '');
    const cleanAccessNum = (c.accessNumber || '').replace(/\D/g, '');
    const cleanEmail = normalizeClientName(c.email || '');

    const matchesIdentifier =
      cleanName === cleanId ||
      cleanAccess === cleanId ||
      (cleanNumOnly && cleanAccessNum === cleanNumOnly) ||
      cleanEmail === cleanId;

    return matchesIdentifier;
  });

  if (!client) return undefined;

  // If password provided, verify it (case-insensitive or exact)
  if (password !== undefined) {
    const clientPass = (client.password || '').trim();
    const inputPass = password.trim();
    if (clientPass && clientPass !== inputPass) {
      return undefined;
    }
  }

  return client;
}
