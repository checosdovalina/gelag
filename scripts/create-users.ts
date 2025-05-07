import { db } from '../server/db';
import { users, UserRole } from '../shared/schema';
import { hashPassword } from '../server/auth';
import { eq } from 'drizzle-orm';

interface UserData {
  username: string;
  password: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
}

async function createUsers() {
  try {
    console.log('Creando usuarios de prueba...');
    
    const usersToCreate: UserData[] = [
      {
        username: 'admin',
        password: 'admin123',
        name: 'Administrador',
        email: 'admin@gelag.com',
        role: UserRole.ADMIN,
      },
      {
        username: 'produccion',
        password: 'produccion123',
        name: 'Usuario de Producción',
        email: 'produccion@gelag.com',
        role: UserRole.PRODUCTION,
        department: 'Producción'
      },
      {
        username: 'calidad',
        password: 'calidad123',
        name: 'Usuario de Calidad',
        email: 'calidad@gelag.com',
        role: UserRole.QUALITY,
        department: 'Calidad'
      },
      {
        username: 'visor',
        password: 'visor123',
        name: 'Usuario Visor',
        email: 'visor@gelag.com',
        role: UserRole.VIEWER,
      }
    ];
    
    for (const userData of usersToCreate) {
      // Verificar si el usuario ya existe
      const existingUser = await db.select()
        .from(users)
        .where(eq(users.username, userData.username));
      
      if (existingUser.length > 0) {
        console.log(`El usuario '${userData.username}' ya existe. Actualizando contraseña...`);
        
        const hashedPassword = await hashPassword(userData.password);
        
        await db.update(users)
          .set({ 
            password: hashedPassword,
            name: userData.name,
            email: userData.email,
            role: userData.role,
            department: userData.department
          })
          .where(eq(users.username, userData.username));
          
        console.log(`Usuario '${userData.username}' actualizado correctamente.`);
      } else {
        console.log(`Creando usuario '${userData.username}'...`);
        
        const hashedPassword = await hashPassword(userData.password);
        
        await db.insert(users).values({
          username: userData.username,
          password: hashedPassword,
          name: userData.name,
          email: userData.email,
          role: userData.role,
          department: userData.department
        });
        
        console.log(`Usuario '${userData.username}' creado correctamente.`);
      }
    }
    
    console.log('Proceso completado.');
  } catch (error) {
    console.error('Error al crear usuarios:', error);
  }
}

// Ejecutar la función
createUsers();