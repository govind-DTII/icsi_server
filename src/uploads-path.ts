import { join } from 'path';

/** Absolute uploads dir — shared by static serve + Multer destinations. */
export const UPLOADS_DIR = join(process.cwd(), 'uploads');
