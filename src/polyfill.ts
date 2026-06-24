// Node 18 doesn't expose crypto as a global; @nestjs/typeorm v11 requires it
import { webcrypto } from 'node:crypto';
if (typeof global.crypto === 'undefined') {
  (global as any).crypto = webcrypto;
}
