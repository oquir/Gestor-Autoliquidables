// Prefijo del nombre viejo (Form Orchestrator) a proposito: cambiarlo perderia lo ya guardado.
export const DRAFT_KEY: string = 'form-orchestrator-draft'

// Version de la forma del borrador; cada subida lleva su paso en persistence.migrations. 2
// formScript, 3 formula a script, 4 efectos a script, 5 sin almacen, 6 Tailwind a CSS, 7 {campo} a
// {{campo}}.
export const DRAFT_SCHEMA_VERSION: number = 7

// La cuota es una sola por origen y la comparten los disenos de PDF, que con base64 son lo que la
// llena. Exportar es la salida que no pierde nada.
export const DRAFT_QUOTA_MESSAGE: string =
  'No cupo en el almacenamiento del navegador (unos 5 MB, compartidos con los diseños de PDF). Exporta el formulario para no perder los cambios.'

export const DRAFT_SAVE_FAILED_MESSAGE: string =
  'El navegador no dejó guardar el borrador. Exporta el formulario para no perder los cambios.'
