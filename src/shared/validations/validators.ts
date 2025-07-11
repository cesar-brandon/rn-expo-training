import { z } from 'zod';
import type { ValidationError, ValidationResult } from '../types/entities/database';

// ==========================================
// FUNCIONES DE VALIDACIÓN UTILITARIAS
// ==========================================

/**
 * Valida un objeto usando un schema de Zod y retorna resultado formateado
 */
export function validateWithSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult & { data?: T } {
  try {
    const validData = schema.parse(data);
    return {
      valid: true,
      errors: [],
      data: validData,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: ValidationError[] = error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      
      return {
        valid: false,
        errors,
      };
    }
    
    return {
      valid: false,
      errors: [{ field: 'general', message: 'Error de validación desconocido' }],
    };
  }
}

/**
 * Valida de forma segura sin lanzar errores
 */
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  return result;
}

/**
 * Validador para emails con verificación de formato más estricta
 */
export function validateEmail(email: string): ValidationResult {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  if (!email || email.trim() === '') {
    return {
      valid: false,
      errors: [{ field: 'email', message: 'Email es requerido' }],
    };
  }
  
  if (!emailRegex.test(email)) {
    return {
      valid: false,
      errors: [{ field: 'email', message: 'Formato de email inválido' }],
    };
  }
  
  return {
    valid: true,
    errors: [],
  };
}

/**
 * Validador para contraseñas con reglas de seguridad
 */
export function validatePassword(password: string): ValidationResult {
  const errors: ValidationError[] = [];
  
  if (!password || password.trim() === '') {
    errors.push({ field: 'password', message: 'Contraseña es requerida' });
  } else {
    if (password.length < 6) {
      errors.push({ field: 'password', message: 'Contraseña debe tener al menos 6 caracteres' });
    }
    
    if (password.length > 128) {
      errors.push({ field: 'password', message: 'Contraseña muy larga (máximo 128 caracteres)' });
    }
    
    // Verificar que contenga al menos una letra
    if (!/[a-zA-Z]/.test(password)) {
      errors.push({ field: 'password', message: 'Contraseña debe contener al menos una letra' });
    }
    
    // Verificar que contenga al menos un número
    if (!/[0-9]/.test(password)) {
      errors.push({ field: 'password', message: 'Contraseña debe contener al menos un número' });
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validador para confirmar contraseñas
 */
export function validatePasswordConfirmation(
  password: string,
  confirmPassword: string
): ValidationResult {
  const errors: ValidationError[] = [];
  
  if (password !== confirmPassword) {
    errors.push({ 
      field: 'confirmPassword', 
      message: 'Las contraseñas no coinciden' 
    });
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validador para fechas
 */
export function validateDate(date: unknown, fieldName = 'date'): ValidationResult {
  if (!date) {
    return {
      valid: false,
      errors: [{ field: fieldName, message: 'Fecha es requerida' }],
    };
  }
  
  let dateValue: Date;
  
  if (typeof date === 'number') {
    dateValue = new Date(date);
  } else if (typeof date === 'string') {
    dateValue = new Date(date);
  } else if (date instanceof Date) {
    dateValue = date;
  } else {
    return {
      valid: false,
      errors: [{ field: fieldName, message: 'Formato de fecha inválido' }],
    };
  }
  
  if (isNaN(dateValue.getTime())) {
    return {
      valid: false,
      errors: [{ field: fieldName, message: 'Fecha inválida' }],
    };
  }
  
  return {
    valid: true,
    errors: [],
  };
}

/**
 * Validador para rangos de fechas
 */
export function validateDateRange(
  startDate: unknown,
  endDate: unknown
): ValidationResult {
  const errors: ValidationError[] = [];
  
  const startValidation = validateDate(startDate, 'startDate');
  const endValidation = validateDate(endDate, 'endDate');
  
  if (!startValidation.valid) {
    errors.push(...startValidation.errors);
  }
  
  if (!endValidation.valid) {
    errors.push(...endValidation.errors);
  }
  
  if (errors.length === 0) {
    const start = new Date(startDate as string | number);
    const end = new Date(endDate as string | number);
    
    if (start >= end) {
      errors.push({
        field: 'dateRange',
        message: 'La fecha de inicio debe ser anterior a la fecha de fin',
      });
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validador para URLs
 */
export function validateUrl(url: string, fieldName = 'url'): ValidationResult {
  if (!url || url.trim() === '') {
    return {
      valid: false,
      errors: [{ field: fieldName, message: 'URL es requerida' }],
    };
  }
  
  try {
    new URL(url);
    return {
      valid: true,
      errors: [],
    };
  } catch {
    return {
      valid: false,
      errors: [{ field: fieldName, message: 'URL inválida' }],
    };
  }
}

/**
 * Validador para archivos de imagen
 */
export function validateImageFile(file: File): ValidationResult {
  const errors: ValidationError[] = [];
  
  // Verificar tipo de archivo
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    errors.push({
      field: 'file',
      message: 'Tipo de archivo no permitido. Solo se permiten: JPG, PNG, GIF, WebP',
    });
  }
  
  // Verificar tamaño (máximo 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    errors.push({
      field: 'file',
      message: 'Archivo muy grande. Tamaño máximo: 5MB',
    });
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitiza un string removiendo caracteres peligrosos
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remover < >
    .replace(/javascript:/gi, '') // Remover javascript:
    .replace(/on\w+=/gi, ''); // Remover atributos de eventos
}

/**
 * Valida múltiples campos a la vez
 */
export function validateMultipleFields(
  validators: Array<() => ValidationResult>
): ValidationResult {
  const allErrors: ValidationError[] = [];
  
  for (const validator of validators) {
    const result = validator();
    if (!result.valid) {
      allErrors.push(...result.errors);
    }
  }
  
  return {
    valid: allErrors.length === 0,
    errors: allErrors,
  };
}

/**
 * Crea un validador condicional
 */
export function createConditionalValidator(
  condition: () => boolean,
  validator: () => ValidationResult
): () => ValidationResult {
  return () => {
    if (condition()) {
      return validator();
    }
    return { valid: true, errors: [] };
  };
}