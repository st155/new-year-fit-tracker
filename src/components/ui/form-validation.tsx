import { useState, useEffect, useMemo } from "react";
import { Check, X, AlertCircle } from "lucide-react";
import i18n from '@/i18n';

interface ValidationRule {
  test: (value: any) => boolean;
  message: string;
  type: 'error' | 'warning';
}

interface FormValidationProps {
  value: any;
  rules: ValidationRule[];
  showValidation?: boolean;
  className?: string;
}

export function FormValidation({ value, rules, showValidation = true, className }: FormValidationProps) {
  const [validationResults, setValidationResults] = useState<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }>({ isValid: true, errors: [], warnings: [] });

  useEffect(() => {
    const errors: string[] = [];
    const warnings: string[] = [];

    rules.forEach(rule => {
      if (!rule.test(value)) {
        if (rule.type === 'error') {
          errors.push(rule.message);
        } else {
          warnings.push(rule.message);
        }
      }
    });

    setValidationResults({
      isValid: errors.length === 0,
      errors,
      warnings
    });
  }, [value, rules]);

  if (!showValidation || (validationResults.errors.length === 0 && validationResults.warnings.length === 0)) {
    return null;
  }

  return (
    <div className={`space-y-1 ${className}`}>
      {validationResults.errors.map((error, index) => (
        <div key={`error-${index}`} className="flex items-center gap-2 text-sm text-destructive">
          <X className="h-3 w-3" />
          <span>{error}</span>
        </div>
      ))}
      {validationResults.warnings.map((warning, index) => (
        <div key={`warning-${index}`} className="flex items-center gap-2 text-sm text-warning">
          <AlertCircle className="h-3 w-3" />
          <span>{warning}</span>
        </div>
      ))}
    </div>
  );
}

// Готовые правила валидации
export const validationRules = {
  required: (message?: string): ValidationRule => ({
    test: (value) => value !== null && value !== undefined && value !== '',
    message: message || i18n.t('common:validation.required'),
    type: 'error'
  }),

  minLength: (min: number, message?: string): ValidationRule => ({
    test: (value) => !value || value.length >= min,
    message: message || i18n.t('common:validation.minLength', { min }),
    type: 'error'
  }),

  maxLength: (max: number, message?: string): ValidationRule => ({
    test: (value) => !value || value.length <= max,
    message: message || i18n.t('common:validation.maxLength', { max }),
    type: 'error'
  }),

  minValue: (min: number, message?: string): ValidationRule => ({
    test: (value) => !value || Number(value) >= min,
    message: message || i18n.t('common:validation.minValue', { min }),
    type: 'error'
  }),

  maxValue: (max: number, message?: string): ValidationRule => ({
    test: (value) => !value || Number(value) <= max,
    message: message || i18n.t('common:validation.maxValue', { max }),
    type: 'error'
  }),

  email: (message?: string): ValidationRule => ({
    test: (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    message: message || i18n.t('common:validation.invalidEmail'),
    type: 'error'
  }),

  positiveNumber: (message?: string): ValidationRule => ({
    test: (value) => !value || Number(value) > 0,
    message: message || i18n.t('common:validation.positiveNumber'),
    type: 'error'
  }),

  futureDate: (message?: string): ValidationRule => ({
    test: (value) => !value || new Date(value) > new Date(),
    message: message || i18n.t('common:validation.futureDate'),
    type: 'warning'
  }),

  pastDate: (message?: string): ValidationRule => ({
    test: (value) => !value || new Date(value) <= new Date(),
    message: message || i18n.t('common:validation.pastDate'),
    type: 'warning'
  })
};

// Хук для управления валидацией формы
export function useFormValidation<T extends Record<string, any>>(
  initialValues: T,
  validationSchema: Record<keyof T, ValidationRule[]>
) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<keyof T, string[]>>({} as Record<keyof T, string[]>);
  const [touched, setTouched] = useState<Record<keyof T, boolean>>({} as Record<keyof T, boolean>);

  const validateField = (field: keyof T, value: any) => {
    const rules = validationSchema[field] || [];
    const fieldErrors: string[] = [];

    rules.forEach(rule => {
      if (rule.type === 'error' && !rule.test(value)) {
        fieldErrors.push(rule.message);
      }
    });

    setErrors(prev => ({ ...prev, [field]: fieldErrors }));
    return fieldErrors.length === 0;
  };

  const validateAll = () => {
    let isValid = true;
    const newErrors: Record<keyof T, string[]> = {} as Record<keyof T, string[]>;

    Object.keys(validationSchema).forEach(field => {
      const fieldErrors: string[] = [];
      const rules = validationSchema[field as keyof T] || [];
      const value = values[field as keyof T];

      rules.forEach(rule => {
        if (rule.type === 'error' && !rule.test(value)) {
          fieldErrors.push(rule.message);
          isValid = false;
        }
      });

      newErrors[field as keyof T] = fieldErrors;
    });

    setErrors(newErrors);
    return isValid;
  };

  const setValue = (field: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [field]: value }));
    if (touched[field]) {
      validateField(field, value);
    }
  };

  const setFieldTouched = (field: keyof T) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    validateField(field, values[field]);
  };

  const reset = () => {
    setValues(initialValues);
    setErrors({} as Record<keyof T, string[]>);
    setTouched({} as Record<keyof T, boolean>);
  };

  const isFormValid = useMemo(() => {
    // Проверяем значения напрямую по схеме валидации
    return Object.keys(validationSchema).every(field => {
      const value = values[field as keyof T];
      const rules = validationSchema[field as keyof T] || [];
      
      // Проверяем что все error-правила проходят
      return rules
        .filter(r => r.type === 'error')
        .every(rule => rule.test(value));
    });
  }, [values, validationSchema]);

  return {
    values,
    errors,
    touched,
    setValue,
    setFieldTouched,
    validateAll,
    reset,
    isFormValid
  };
}