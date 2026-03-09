import { useState, useCallback } from 'react';
import { z, ZodSchema } from 'zod';

export interface ValidationErrors {
  [key: string]: string;
}

export function useFormValidation<T extends ZodSchema>(schema: T) {
  const [errors, setErrors] = useState<ValidationErrors>({});

  const validate = useCallback(
    (data: unknown): data is z.infer<T> => {
      const result = schema.safeParse(data);
      if (result.success) {
        setErrors({});
        return true;
      }
      const newErrors: ValidationErrors = {};
      result.error.issues.forEach((issue) => {
        const path = issue.path.join('.');
        newErrors[path] = issue.message;
      });
      setErrors(newErrors);
      return false;
    },
    [schema],
  );

  const validateField = useCallback(
    (fieldName: string, value: unknown): boolean => {
      const fieldSchema = (schema as any).shape?.[fieldName];
      if (!fieldSchema) return true;

      const result = fieldSchema.safeParse(value);
      if (result.success) {
        setErrors((prev) => {
          const { [fieldName]: _, ...rest } = prev;
          return rest;
        });
        return true;
      }
      setErrors((prev) => ({ ...prev, [fieldName]: result.error.issues[0]?.message || 'Invalid' }));
      return false;
    },
    [schema],
  );

  const clearError = useCallback((fieldName: string) => {
    setErrors((prev) => {
      const { [fieldName]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors({});
  }, []);

  return { errors, validate, validateField, clearError, clearAllErrors };
}
