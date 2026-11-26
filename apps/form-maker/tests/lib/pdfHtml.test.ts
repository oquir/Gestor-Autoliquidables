import { describe, expect, it } from 'vitest'
import {
  escapePdfAttribute,
  escapePdfText,
  normalizePdfHtml,
  parsePdfHtml,
  pdfAttributes,
  pdfCssText,
  pdfHtmlText,
  sanitizePdfCanvasHtml,
  sanitizePdfHtml,
  sanitizeCss,
  serializePdfHtml,
  isSafePdfImageSrc,
} from '../../src/lib/pdfHtml/pdfHtml'

// El HTML libre del PDF es la barrera de seguridad: lista blanca sobre texto, sin DOM. Todo lo que
// ejecuta o trae algo de afuera tiene que salir, por cualquier camino que se escriba.

describe('sanitizePdfHtml: lo que ejecuta código', () => {
  it('script, iframe, object y compañía se borran con su contenido', () => {
    expect(sanitizePdfHtml('a<script>alert(1)</script>b')).toBe('ab')
    expect(sanitizePdfHtml('a<iframe src="https://x"></iframe>b')).toBe('ab')
    expect(sanitizePdfHtml('a<object data="x">texto</object>b')).toBe('ab')
    expect(sanitizePdfHtml('a<svg><script>alert(1)</script></svg>b')).toBe('ab')
    expect(sanitizePdfHtml('a<SCRIPT>alert(1)</SCRIPT>b')).toBe('ab')
  })

  it('un script sin cerrar se traga el resto, como el navegador', () => {
    expect(sanitizePdfHtml('a<script>alert(1)<td>b')).toBe('a')
  })

  it('anidados del mismo nombre no salen en el primer cierre', () => {
    expect(sanitizePdfHtml('a<svg><svg></svg>oculto</svg>b')).toBe('ab')
  })

  it('los eventos on… se quitan, también sin comillas o en mayúsculas', () => {
    expect(sanitizePdfHtml('<td onclick="alert(1)">x</td>')).toBe('<td>x</td>')
    expect(sanitizePdfHtml('<img src="https://a.co/x.png" OnError=alert(1)>')).toBe(
      '<img src="https://a.co/x.png">',
    )
  })

  it('javascript: en enlaces e imágenes no pasa, aunque venga codificado o con espacios', () => {
    expect(sanitizePdfHtml('<a href="javascript:alert(1)">x</a>')).toBe('<a>x</a>')
    expect(sanitizePdfHtml('<a href="java&#115;cript:alert(1)">x</a>')).toBe('<a>x</a>')
    expect(sanitizePdfHtml('<a href="&#x6A;avascript:alert(1)">x</a>')).toBe('<a>x</a>')
    expect(sanitizePdfHtml('<a href=" java\tscript:alert(1)">x</a>')).toBe('<a>x</a>')
    expect(sanitizePdfHtml('<img src="javascript:alert(1)">')).toBe('<img>')
    expect(sanitizePdfHtml('<img src="data:text/html,<script>">')).toBe('<img>')
  })

  it('el esquema se mira sin espacios ni saltos: una URL buena con espacios pasa', () => {
    expect(sanitizePdfHtml('<img src=" https://a.co/x.png">')).toBe(
      '<img src=" https://a.co/x.png">',
    )
    expect(sanitizePdfHtml('<a href="\nhttps://a.co">x</a>')).toBe('<a href="\nhttps://a.co">x</a>')
  })

  it('src solo en img y href solo en a', () => {
    expect(sanitizePdfHtml('<td src="https://a.co/x.png" href="https://a.co">x</td>')).toBe(
      '<td>x</td>',
    )
  })

  it('las imágenes seguras y las variables pasan', () => {
    expect(sanitizePdfHtml('<img src="https://a.co/escudo.png">')).toBe(
      '<img src="https://a.co/escudo.png">',
    )
    expect(sanitizePdfHtml('<img src="data:image/png;base64,iVBOR">')).toBe(
      '<img src="data:image/png;base64,iVBOR">',
    )
    expect(sanitizePdfHtml('<img src="{Code}">')).toBe('<img src="{Code}">')
    expect(sanitizePdfHtml('<a href="mailto:a@b.co">x</a>')).toBe('<a href="mailto:a@b.co">x</a>')
  })
})

describe('sanitizePdfHtml: estilos', () => {
  it('@import, expression(), behavior y url() que no es imagen segura salen del <style>', () => {
    const out: string = sanitizePdfHtml(
      '<style>@import url(https://x/a.css); td { width: expression(alert(1)); behavior: url(x.htc); background: url(javascript:alert(1)) }</style>',
    )

    expect(out).not.toContain('@import')
    expect(out).not.toContain('expression(')
    expect(out).not.toContain('behavior:')
    expect(out).not.toContain('javascript')
  })

  it('un comentario no sirve de escondite y un < no cierra el <style> antes', () => {
    expect(sanitizeCss('/* x */@im/**/port url(a.css);')).not.toContain('@import')
    // Un escape en el at-keyword tambien es @import para el navegador.
    expect(
      sanitizePdfHtml('<style>@\\69mport "https://evil.example/x.css"; td { color: red }</style>'),
    ).not.toContain('evil.example')
    expect(sanitizeCss('@i\\6dport url(a.css); td { color: red }')).toBe(' td { color: red }')
    expect(
      sanitizePdfHtml('<style>td::after { content: "</style><script>" }</style>'),
    ).not.toContain('<script')
  })

  it('dentro del <style> todo < queda escapado como CSS', () => {
    expect(sanitizePdfHtml('<style>td::before { content: "<b>" }</style>')).toBe(
      '<style>td::before { content: "\\3c b>" }</style>',
    )
  })

  it('el style en línea pasa por el mismo saneo', () => {
    expect(sanitizePdfHtml('<td style="color: red; width: expression(1)">x</td>')).toBe(
      '<td style="color: red; width: invalid(1)">x</td>',
    )
  })

  it('una url de imagen segura en el CSS se conserva; con escape de CSS no', () => {
    expect(sanitizeCss('background: url("https://a.co/f.png")')).toContain('https://a.co/f.png')
    expect(sanitizeCss('background: url("\\6a avascript:alert(1)")')).toBe('background: none')
  })

  // BUG (hallazgo 4.8 de docs/Hallazgos-Pruebas.md): el escape de CSS en el nombre de la funcion
  // (u\72l es url) no pasa por el filtro de url(). Pendiente de confirmar con el usuario; it.fails
  // avisa cuando se corrija.
  it.fails('un escape en el nombre de la función tampoco deja pasar javascript:', () => {
    expect(sanitizeCss('td { background: u\\72l(javascript:alert(1)) }')).not.toContain(
      'javascript',
    )
  })

  // BUG (hallazgo 4.8): una url() sin comillas se reemplaza hasta el primer ")" y deja el otro.
  // Pendiente de confirmar con el usuario; it.fails avisa cuando se corrija.
  it.fails('una url() peligrosa sin comillas no deja un ) suelto', () => {
    expect(sanitizeCss('td { background: url(javascript:alert(1)) }')).toBe(
      'td { background: none }',
    )
  })
})

describe('sanitizePdfHtml: lo que se conserva y se tolera', () => {
  it('las etiquetas de tabla y texto pasan; las desconocidas se desenvuelven', () => {
    expect(
      sanitizePdfHtml('<table border=1><tr><td colspan="2"><b>hola</b></td></tr></table>'),
    ).toBe('<table border="1"><tr><td colspan="2"><b>hola</b></td></tr></table>')
    expect(sanitizePdfHtml('<blink>parpadeo</blink><form>x</form>')).toBe('parpadeox')
  })

  it('los atributos data-fm-* pasan para poder reabrir', () => {
    expect(sanitizePdfHtml('<td data-fm-cell="html" data-otro="x">x</td>')).toBe(
      '<td data-fm-cell="html">x</td>',
    )
  })

  it('comentarios, doctype y CDATA salen; un < suelto es texto', () => {
    expect(sanitizePdfHtml('<!DOCTYPE html><!-- nota -->a < b <![CDATA[x]]>')).toBe('a &lt; b ')
  })

  it('las entidades que ya trae se respetan y el & suelto se escapa', () => {
    expect(sanitizePdfHtml('<p>A &amp; B &nbsp; C & D</p>')).toBe(
      '<p>A &amp; B &nbsp; C &amp; D</p>',
    )
  })

  it('nunca lanza, ni con basura', () => {
    expect(() => sanitizePdfHtml('<<<td <a href="x" <img src=')).not.toThrow()
  })

  it('sanear dos veces da lo mismo con HTML normal', () => {
    const once: string = sanitizePdfHtml(
      '<style>td { color: red }</style><table><tr><td style="width: 10px">a &amp; b</td></tr></table>',
    )

    expect(sanitizePdfHtml(once)).toBe(once)
  })
})

describe('sanitizePdfCanvasHtml', () => {
  it('en el lienzo una imagen con {variable} lleva una muestra local; el resto igual', () => {
    const out: string = sanitizePdfCanvasHtml(
      '<img src="{Code}" width="80"><img src="https://a.co/x.png">',
    )

    expect(out).toMatch(/^<img src="data:image\/svg\+xml,[^"]+" width="80">/)
    expect(out).toContain('<img src="https://a.co/x.png">')
    expect(sanitizePdfHtml('<img src="{Code}">')).toBe('<img src="{Code}">')
  })
})

describe('parsePdfHtml y normalizePdfHtml', () => {
  it('cierra lo abierto como el navegador, sin agregar lo que falta', () => {
    expect(normalizePdfHtml('<table><tr><td>a<td>b<tr><td>c</table>')).toBe(
      '<table><tr><td>a</td><td>b</td></tr><tr><td>c</td></tr></table>',
    )
  })

  it('un <table> abierto no se traga el resto del documento', () => {
    expect(normalizePdfHtml('<table><tr><td>a')).toBe('<table><tr><td>a</td></tr></table>')
  })

  it('un </span> dentro de una celda no cierra nada de afuera', () => {
    expect(normalizePdfHtml('<div><table><tr><td>a</span></td></tr></table></div>')).toBe(
      '<div><table><tr><td>a</td></tr></table></div>',
    )
  })

  it('un bloque cierra el <p> abierto; las vacías no llevan hijos', () => {
    expect(normalizePdfHtml('<p>uno<div>dos</div>')).toBe('<p>uno</p><div>dos</div>')
    expect(normalizePdfHtml('a<br>b<img src="https://a.co/x.png">c')).toBe(
      'a<br>b<img src="https://a.co/x.png">c',
    )
  })

  it('serializar lo leído devuelve lo mismo', () => {
    const html: string =
      '<table class="fm-t"><tbody><tr><td style="color: red">a &amp; b</td></tr></tbody></table>'

    expect(serializePdfHtml(parsePdfHtml(html))).toBe(html)
  })

  it('el contenido de un <style> es texto crudo y lo que sigue a su cierre se lee', () => {
    const nodes = parsePdfHtml('<style>td{color:red}<b>no</b></style ><p>después</p>')

    expect(nodes.map((node) => (node.type === 'element' ? node.name : '#text'))).toEqual([
      'style',
      'p',
    ])
    expect(serializePdfHtml(nodes)).toBe('<style>td{color:red}<b>no</b></style><p>después</p>')
  })

  it('un </style sin > al final no lanza ni pierde el estilo', () => {
    const nodes = parsePdfHtml('<style>td{}</style')

    expect(nodes).toHaveLength(1)
    expect(serializePdfHtml(nodes)).toBe('<style>td{}</style>')
  })

  it('pdfHtmlText da el texto que se ve, decodificado y con saltos', () => {
    expect(pdfHtmlText(parsePdfHtml('A &amp; B<br>C<style>td{}</style>'))).toBe('A & B\nC')
  })
})

describe('escapes y atributos', () => {
  it('el texto escapa todo &, también un &nbsp; escrito a mano', () => {
    expect(escapePdfText('a & b <c> &nbsp;')).toBe('a &amp; b &lt;c&gt; &amp;nbsp;')
    expect(escapePdfAttribute('say "hi" & <go>')).toBe('say &quot;hi&quot; &amp; &lt;go&gt;')
  })

  it('pdfAttributes omite los null y pdfCssText pasa a kebab-case', () => {
    expect(
      pdfAttributes([
        ['a', '1'],
        ['b', null],
        ['c', '"x"'],
      ]),
    ).toBe(' a="1" c="&quot;x&quot;"')
    expect(pdfCssText({ fontSize: '9px', WebkitTransform: 'none', '--x': '1' })).toBe(
      'font-size: 9px; -webkit-transform: none; --x: 1',
    )
  })

  it('isSafePdfImageSrc acepta http(s), data:image y una variable sola', () => {
    expect(isSafePdfImageSrc('https://a.co/x.png')).toBe(true)
    expect(isSafePdfImageSrc('data:image/jpeg;base64,xx')).toBe(true)
    expect(isSafePdfImageSrc('{Escudo}')).toBe(true)
    expect(isSafePdfImageSrc('/imagenes/escudo.png')).toBe(false)
    expect(isSafePdfImageSrc('{a} {b}')).toBe(false)
  })
})
