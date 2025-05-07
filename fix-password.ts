import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';
import { db } from './server/db';
import { users } from './shared/schema';
import { eq } from 'drizzle-orm';

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function fixSuperAdminPassword() {
  try {
    console.log('Generando hash para contraseña...');
    const hashedPassword = await hashPassword("admin123");
    console.log('Hash generado:', hashedPassword);
    
    console.log('Actualizando contraseña para superadmin...');
    await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.username, 'superadmin'));
    
    // Si no existe, lo creamos
    const [user] = await db.select().from(users).where(eq(users.username, 'superadmin'));
    if (!user) {
      console.log('Usuario superadmin no encontrado, creándolo...');
      await db.insert(users).values({
        username: 'superadmin',
        password: hashedPassword,
        name: 'Super Admin',
        email: 'admin@gelag.com',
        role: 'superadmin'
      });
    }
    
    console.log('Contraseña actualizada correctamente');
  } catch (error) {
    console.error('Error al actualizar la contraseña:', error);
  }
}

fixSuperAdminPassword();