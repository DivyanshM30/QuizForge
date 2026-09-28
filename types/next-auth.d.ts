import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface User {
    /** Internal sign-in snapshot; never included in Session.user. */
    credentialStamp?: string;
  }
  /**
   * The user id is stashed onto the session in the JWT `session` callback
   * (see lib/auth.ts). Augment the built-in types so consumers get it without
   * casts or @ts-ignore.
   */
  interface Session {
    user: {
      id: string;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    credentialStamp?: string;
  }
}
