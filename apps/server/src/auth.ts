import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';
export function createAuth(password?: string) {
  const sessions = new Map<string, number>();
  const digest=(s:string)=>createHash('sha256').update(s).digest();
  return {
    required: !!password,
    login(input: unknown): string | undefined {
      if (typeof input !== 'string' || !password || !timingSafeEqual(digest(input),digest(password))) return;
      const now=Date.now();
      for(const [token,expiry] of sessions) if(expiry<=now) sessions.delete(token);
      if(sessions.size>=100) sessions.delete(sessions.keys().next().value!);
      const token=randomBytes(32).toString('hex');sessions.set(token,now+7*86400000);return token;
    },
    valid(token?: string): boolean {return !password || !!token && (sessions.get(token)||0)>Date.now();},
    logout(token?: string) {if(token)sessions.delete(token);},
  };
}
