// Lista blanca del HTML libre: tablas, texto, imagenes y <style>. Lo demas se desenvuelve o se
// borra.
export const ALLOWED_TAGS: ReadonlySet<string> = new Set([
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'td',
  'th',
  'colgroup',
  'col',
  'caption',
  'div',
  'span',
  'p',
  'br',
  'hr',
  'img',
  'a',
  'style',
  'b',
  'strong',
  'i',
  'em',
  'u',
  's',
  'strike',
  'sub',
  'sup',
  'small',
  'big',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'li',
  // Las plantillas viejas los usan, y SelectPdf todavia los entiende.
  'font',
  'center',
])

// Se borran con todo lo que tienen adentro: su contenido no es texto para mostrar.
export const DROP_WITH_CONTENT: ReadonlySet<string> = new Set([
  'script',
  'iframe',
  'object',
  'embed',
  'noscript',
  'template',
  'frameset',
  'frame',
  'applet',
  'xml',
  'svg',
  'math',
  'title',
  'textarea',
  'select',
  'button',
])

// Su contenido es texto crudo hasta la etiqueta de cierre (no se leen etiquetas adentro).
export const RAW_TEXT_TAGS: ReadonlySet<string> = new Set([
  'script',
  'style',
  'iframe',
  'noscript',
  'template',
  'xmp',
  'title',
  'textarea',
  'noembed',
  'noframes',
])

export const VOID_TAGS: ReadonlySet<string> = new Set(['br', 'hr', 'img', 'col'])

// Para el lector tolerante (parsePdfHtml): que cierra sola cada apertura.
export const CELL_TAGS: ReadonlySet<string> = new Set(['td', 'th'])

export const SECTION_TAGS: ReadonlySet<string> = new Set(['thead', 'tbody', 'tfoot'])

// Sus cierres solo se detienen en la tabla: "</tr>" cierra tambien la celda que quedo abierta.
export const TABLE_PARTS: ReadonlySet<string> = new Set([
  'td',
  'th',
  'tr',
  'thead',
  'tbody',
  'tfoot',
  'caption',
  'colgroup',
])

// Un cierre comun no cruza estos: "</span>" dentro de una celda no cierra nada de afuera.
export const TABLE_SCOPE: ReadonlySet<string> = new Set(['td', 'th', 'table', 'caption'])

export const BLOCK_CLOSES_P: ReadonlySet<string> = new Set([
  'p',
  'div',
  'table',
  'ul',
  'ol',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'center',
])

export const ALLOWED_ATTRIBUTES: ReadonlySet<string> = new Set([
  'class',
  'style',
  'id',
  'title',
  'dir',
  'align',
  'valign',
  'width',
  'height',
  'bgcolor',
  'border',
  'cellpadding',
  'cellspacing',
  'colspan',
  'rowspan',
  'nowrap',
  'color',
  'face',
  'size',
  'alt',
  'src',
  'href',
])

// Atributos de los componentes: SelectPdf los ignora y el lector los usa para reabrir.
export const DATA_FM_ATTRIBUTE: RegExp = /^data-fm-[a-z0-9-]+$/

// Una variable sola, como src="{Code}": la imagen la pone el back al reemplazar.
export const VARIABLE_ONLY: RegExp = /^\{[^{}\s]+\}$/

// En el HTML ya saneado (atributos con comillas dobles): el src de un <img> que es solo una variable.
export const CANVAS_VARIABLE_SRC: RegExp = /(<img\b[^>]*?\ssrc=")\s*\{[^{}\s"]+\}\s*"/g

// La muestra del lienzo: 80 × 40 si el autor no le dio tamano (como el componente imagen), y
// preserveAspectRatio none para llenar el que le dio.
export const CANVAS_VARIABLE_IMAGE: string = `data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='80' height='40' viewBox='0 0 80 40' preserveAspectRatio='none'><rect x='.5' y='.5' width='79' height='39' fill='#f1f5f9' stroke='#94a3b8' stroke-dasharray='3 2' vector-effect='non-scaling-stroke'/></svg>",
)}`

export const SAFE_IMAGE_URL: RegExp =
  /^(https?:\/\/|data:image\/(png|jpe?g|gif|webp|bmp|svg\+xml)[;,])/i

export const SAFE_LINK_URL: RegExp = /^(https?:\/\/|mailto:)/i

export const NAMED_ENTITIES: Readonly<Record<string, string>> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
}
