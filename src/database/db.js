import { openDatabaseSync } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';

// Inicializa a conexão nativa com o banco do Expo
const expoDb = openDatabaseSync('zenocash.db');

// Envelopa a conexão com o Drizzle ORM
export const db = drizzle(expoDb);
