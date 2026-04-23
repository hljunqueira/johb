import crypto from 'crypto';

function generateSecret(length = 64) {
    return crypto.randomBytes(length).toString('base64');
}

// Para o Supabase, as chaves ANON e SERVICE_ROLE são JWTs assinados com o JWT_SECRET
// Mas aqui vamos gerar apenas strings aleatórias fortes se o usuário desejar apenas "chaves"
// Se for para o Supabase Real, precisaríamos de uma lib de JWT para assinar os payloads específicos.

const jwtSecret = generateSecret();
const anonKey = generateSecret(40);
const serviceRoleKey = generateSecret(40);

console.log('--- NOVAS CHAVES GERADAS ---');
console.log(`JWT_SECRET=${jwtSecret}`);
console.log(`SUPABASE_ANON_KEY=${anonKey}`);
console.log(`SUPABASE_SERVICE_ROLE_KEY=${serviceRoleKey}`);
console.log('---------------------------');
