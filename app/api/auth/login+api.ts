import * as Crypto from 'expo-crypto';
import { z } from 'zod';

// Validación de entrada
const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

// Mock de base de datos (en una app real, usarías tu database service)
const mockUsers = [
  {
    id: '1',
    email: 'admin@example.com',
    password_hash: 'hashed_password_admin', // En realidad sería un hash
    name: 'Administrador',
    role: 'admin' as const,
    is_verified: true,
  },
  {
    id: '2',
    email: 'user@example.com',
    password_hash: 'hashed_password_user',
    name: 'Usuario Demo',
    role: 'user' as const,
    is_verified: true,
  },
];

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    
    // Validar entrada
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Datos inválidos',
          details: validation.error.issues,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const { email, password } = validation.data;

    // Buscar usuario
    const user = mockUsers.find(u => u.email === email);
    if (!user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Credenciales inválidas',
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Verificar contraseña (en una app real, usarías bcrypt)
    const isPasswordValid = password === 'password123'; // Mock validation
    if (!isPasswordValid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Credenciales inválidas',
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Generar token JWT (simplificado para el ejemplo)
    const token = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${user.id}-${Date.now()}-${Math.random()}`
    );

    const sessionData = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        is_verified: user.is_verified,
      },
      token,
      expires_at: Date.now() + (24 * 60 * 60 * 1000), // 24 horas
    };

    return new Response(
      JSON.stringify({
        success: true,
        data: sessionData,
        message: 'Login exitoso',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error en login:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Error interno del servidor',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

export async function GET(): Promise<Response> {
  return new Response(
    JSON.stringify({
      success: false,
      error: 'Método no permitido. Use POST para login.',
    }),
    {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    }
  );
} 