import { EMAIL_PATTERN } from '../../constants'
import { EMAIL_INVALID, EMAIL_REQUIRED } from './RecoverPassword.constants'

/* Formato válido: `usuario@dominio.com` */
export const isValidEmail = (value: string) => EMAIL_PATTERN.test(value.trim())

/* Error que se muestra */
export const emailError = (value: string, submitted: boolean) => {
  if (value.trim() === '') return submitted ? EMAIL_REQUIRED : ''
  if (!isValidEmail(value)) return EMAIL_INVALID
  return ''
}
