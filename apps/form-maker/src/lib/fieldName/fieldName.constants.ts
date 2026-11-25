export const FALLBACK_NAME = 'campo'

// Los valores del formulario son objetos normales: un campo "constructor" leeria la funcion Object
// de su prototipo y el formulario no se podria enviar.
export const RESERVED_FIELD_NAMES: ReadonlySet<string> = new Set([
  ...Object.getOwnPropertyNames(Object.prototype),
  'prototype',
])
