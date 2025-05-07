import { db } from './server/db';
import { users } from './shared/schema';

async function listUsers() {
  try {
    console.log('Consultando usuarios en la base de datos...');
    
    const allUsers = await db.select().from(users);
    
    console.log('Usuarios encontrados:', allUsers.length);
    console.log('=================================');
    
    allUsers.forEach((user, index) => {
      console.log(`Usuario ${index + 1}:`);
      console.log(`ID: ${user.id}`);
      console.log(`Username: ${user.username}`);
      console.log(`Nombre: ${user.name}`);
      console.log(`Email: ${user.email}`);
      console.log(`Rol: ${user.role}`);
      console.log(`Departamento: ${user.department || 'No especificado'}`);
      console.log('=================================');
    });
  } catch (error) {
    console.error('Error al consultar usuarios:', error);
  }
}

// Ejecutar la función
listUsers();