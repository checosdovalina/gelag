import { db } from "../server/db";
import { users, UserRole } from "../shared/schema";
import { hashPassword } from "../server/auth";

async function createSuperAdmin() {
  try {
    console.log("Verificando si existe un usuario SuperAdmin...");
    
    // Comprobar si ya existe un usuario con rol SuperAdmin
    const existingSuperAdmin = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.role, UserRole.SUPERADMIN)
    });
    
    if (existingSuperAdmin) {
      console.log("Ya existe un usuario SuperAdmin:", existingSuperAdmin.username);
      return;
    }
    
    // Crear el usuario SuperAdmin
    const hashedPassword = await hashPassword("admin123");
    
    const [superAdmin] = await db.insert(users).values({
      username: "superadmin",
      password: hashedPassword,
      name: "Super Administrador",
      email: "superadmin@example.com",
      role: UserRole.SUPERADMIN,
      department: "Administración"
    }).returning();
    
    console.log("Usuario SuperAdmin creado exitosamente:");
    console.log("- Username:", superAdmin.username);
    console.log("- Password: admin123");
    console.log("- Rol:", superAdmin.role);
    console.log("¡Importante! Cambia la contraseña después del primer inicio de sesión.");
    
  } catch (error) {
    console.error("Error al crear el usuario SuperAdmin:", error);
  } finally {
    // Cerrar la conexión a la base de datos
    process.exit(0);
  }
}

// Ejecutar la función
createSuperAdmin();