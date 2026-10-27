'use client';

import { createContext, useContext } from 'react';
import type { Facility, User } from './types';

export type Session = {
  user: User;
  /** The hospital/clinic a facility admin, receptionist or clinic doctor works for */
  facility: Facility | null;
  /** Hospital admin, or the clinic's own doctor */
  canManage: boolean;
  reload: () => Promise<void>;
};

export const SessionContext = createContext<Session | null>(null);

export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) throw new Error('useSession must be used inside <Shell>');
  return session;
}
