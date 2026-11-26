# Hallazgos de las pruebas unitarias

> **Para qué sirve**: tener a mano lo que encontraron las pruebas unitarias (Vitest, `tests/`) para probarlo después en el aplicativo y decidir qué se corrige. Cada hallazgo dice qué pasa, dónde está en el código, cómo reproducirlo a mano y qué prueba lo tiene fijado.
>
> **Cómo se usa**: al corregir uno, tacharlo con `~~…~~` y anotar la fecha y el commit, por ejemplo `## ~~1. Las reglas no ven el contexto~~ (2026-11-30, abc1234)`. No se borra nada.
>
> Escrito el 2026-11-24, al cerrar las seis tandas de pruebas. La sección 4 se agregó el 2026-11-26. Lo que dice del código es de la fecha de cada sección: antes de usarlo, verificar que siga igual.

## 1. Bug: el script de una regla no ve las tablas (UVT, SMMLV, fechas)

- **Estado**: sin corregir. Falta la decisión del usuario.
- **Qué pasa**: en la pestaña Lógica de un campo hay dos lugares para escribir script. Uno es el script del campo; el otro es el efecto "script" de una regla ("cuando X, el valor es…").
  - El script del campo recibe el contexto: las tablas de UVT y SMMLV, los vencimientos y la fecha de hoy.
  - **El script de una regla no lo recibe.** Ahí dentro, `uvt()` y `smmlv()` devuelven `null`, y `fechaLimite()`, `diasDeMora()` y `mesesDeMora()` responden como si no hubiera tablas cargadas.
- **Dónde**: `src/lib/runtimeDerived/runtimeDerived.ts`, en `computeDerivedValues`.
  - En el bucle de `rule.effects`, la llamada a `runFieldScript(effect.script.compiled, …)` termina en `index` y no pasa `context`.
  - La llamada del script del campo, unas líneas arriba, sí lo pasa.
- **Arreglo probable**: una línea, agregar `context` como último argumento de esa llamada.
- **Cómo reproducirlo en el aplicativo**:
  1. Crear un campo numérico `minimo` y un checkbox `aplica`.
  2. En `minimo`, pestaña Lógica, agregar una regla: cuando `aplica` está marcado, el efecto es el script `return uvt() * 10;`.
  3. Abrir el simulador con el banco de valores de fábrica (UVT 2026 = 52.374) y marcar `aplica`.
  4. **Esperado**: `minimo` = 523.740. **Hoy**: no da ese valor, porque `uvt()` vale `null` dentro de la regla.
  5. Control: el mismo script puesto como script del campo, y no como regla, sí da 523.740.
- **Por qué importa**: el ICA de fábrica no usa scripts en reglas, así que hoy no afecta la plantilla. Pero cualquier formulario que calcule una sanción mínima o unos intereses dentro de una regla los calcularía mal sin dar ningún aviso. El consumidor (`FrontAutoliquidable`) copió este runtime, así que probablemente tenga el mismo fallo.
- **Prueba que lo fija**: `tests/lib/runtimeDerived.test.ts`, el `it.fails` "una regla con script ve el contexto (uvt, fechas) como el script del campo".
  - Hoy pasa porque falla a propósito.
  - Al corregir el bug, Vitest lo marca en rojo. Entonces hay que cambiar `it.fails` por `it` y quitar el comentario `BUG:`.
- También está anotado en `CLAUDE.md` → Known gaps.

## 2. Riesgo: una UVT pegada como `"49.799"` se lee como 49,799 pesos

- **Estado**: comportamiento vigente, no se ha tocado. Falta la decisión del usuario sobre si cambiar la regla.
- **Qué pasa**: el banco de valores anuales del simulador acepta un JSON pegado. Cuando la UVT viene como texto con un solo punto de miles (`"valorUvt": "49.799"`):
  - se lee como el decimal 49,799, no como 49.799 pesos;
  - con eso, la sanción mínima de 10 UVT da unos 498 pesos en vez de 497.990.
  - No sale ningún aviso.
- **Dónde**: `src/lib/valoresBank/valoresBank.utils.ts`, `leerNumero`.
  - Primero intenta `Number(value)`, y `Number("49.799")` es un número válido, así que ahí se queda.
  - Solo quita los separadores si esa lectura directa falla.
- **Por qué está así** (`docs/Decisiones.md`, "`leerNumero` tries the direct read before stripping separators"): si se quitaran los separadores primero, `"52374.00"` se volvería 5.237.400. El orden protege los decimales, pero deja pasar este caso.
- **Arreglo posible** (sin decidir): tratar como miles un solo punto seguido de exactamente tres dígitos (`/^\d{1,3}\.\d{3}$/`). Lo que haya que cuidar:
  - los valores con decimales reales de tres cifras;
  - `"52374.00"`, que debe seguir dando 52.374.
- **Cómo reproducirlo en el aplicativo**:
  1. En el simulador, en el banco de valores anuales, pegar `[{"anio": 2025, "valorUvt": "49.799", "salario": 1423500}]`.
  2. Mirar la tabla cargada: la UVT de 2025 sale como 49,799.
  3. Con esa tabla en uso, todo lo que use `uvt()` de 2025 sale mal. Por ejemplo, la sanción mínima de 10 UVT da unos 498 en vez de 497.990.
  4. Control: con `"valorUvt": 49799` (número, sin comillas), sale bien.
- **Prueba que lo fija**: `tests/lib/simulatorBanks.test.ts`, "un solo punto de miles se lee como decimal: "49.799" da 49,799". Lleva un comentario `RIESGO`.
  - Esa prueba fija lo que pasa hoy. Si se cambia la regla, la prueba se cambia a propósito para esperar 49799.
  - Al lado está la prueba de `"52374.00"`, que tiene que seguir pasando.

## 3. Otras cosas que salieron (no son bugs)

- **Huecos de las pruebas, ya cerrados.** Al romper reglas a propósito, algunos cambios no hacían fallar ninguna prueba. Cada hueco tiene ya su prueba:
  - la rama `+1` de `mesesOFraccion` (todos los vencimientos caían el 31);
  - el redondeo de lo que tocó el usuario;
  - `formRequires` con `false`;
  - el redondeo del zoom del PDF;
  - `isSafeUrl` con caracteres de control;
  - el escape de `<` dentro de `<style>`;
  - que deshacer una mudanza también quite su aviso de cruce.
- **`savedComponents` vuelve como llave `undefined`** al migrar un borrador viejo. No hace daño: ni el JSON ni el esquema la guardan.
- **Trampa del reloj en las pruebas del store**: el historial toma `Date.now` cuando se carga el módulo. Por eso el reloj falso tiene que arrancar antes del `import`; si no, parece que deshacer no funciona. Es de las pruebas, no de la app. Está explicado en `tests/helpers/storeHarness.ts` y en `docs/Decisiones.md`.

## 4. Revisión de dos agentes que intentaron romper las pruebas (2026-11-26)

> **De dónde sale**: dos agentes sin contexto previo revisaron `tests/`. Uno buscó falsos positivos y fragilidad: corrió las pruebas en orden aleatorio y en tres zonas horarias, e hizo unas 70 mutaciones de operador en copias. El otro buscó casos límite con sondas propias. Ninguno tocó el repo; las sondas quedaron en el scratchpad de esa sesión.
>
> **Estado de la suite ese día**: 44 archivos, 740 pruebas aprobadas y 1 `it.fails` (el hallazgo 1). **Ninguna prueba actual falla por lo que sigue.** Son comportamientos que las pruebas no cubren o pruebas que no detectan un cambio.
>
> **Nada está verificado a mano todavía.** `[E]` = el agente lo ejecutó y vio el resultado; `[L]` = solo lo leyó en el código. Los pasos de reproducción son llamadas a funciones, no pasos en la UI: puede que la interfaz ya filtre algunas de esas entradas antes de que lleguen ahí. Eso es lo primero que hay que confirmar en cada uno.
>
> Estado de todos: **sin corregir. Falta la decisión del usuario.**

### 4.0 Qué aplica y qué no, con el contexto del aplicativo (2026-11-26)

Los agentes no conocían el aplicativo, así que muchos casos no los puede producir nadie. El criterio fue: ¿el valor puede llegar ahí desde el editor, el simulador o el JSON exportado? Las pruebas se agregaron en `tests/` sin tocar `src/`.

- `it.fails` + `BUG:` = bug real, sin corregir.
- `RIESGO:` = la prueba fija lo que pasa hoy; cambiarlo es decisión tuya.

| #    | Veredicto                            | Por qué                                                                                                                                                                                                                                                                                                                                             | Prueba                                                                                                                                       |
| ---- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 4.1  | **Aplica en parte**                  | Un texto obligatorio con solo espacios pasa: el usuario sí los puede teclear. El número con espacios, `"0x10"` o `"1e3"` no llega: `sanitizeNumericInput` solo deja dígitos, separadores y signo. El checkbox obligatorio que no obliga es una decisión (`isRequiredBySchema` lo excluye a propósito).                                              | `runtimeValidation.test.ts`: `it.fails` del texto con espacios; `RIESGO` del checkbox                                                        |
| 4.2  | **Aplica poco**                      | "Lo ilegible vale 0" y `equals(undefined, '')` ya estaban fijados a propósito. `isTruthy("False")` es texto lleno, no un bug. `constructor` y `__proto__` ya no pueden ser nombres de campo (commit `1157220f`). Quedan el operador desconocido (solo en un JSON tocado a mano) y `in` con una lista.                                               | `runtimeCondition.test.ts`: `RIESGO`                                                                                                         |
| 4.3  | **Aplica como contrato**             | `hoy` no lo escribe el usuario, lo arma el runtime en `AAAA/MM/DD`. Pero el consumidor arma el suyo, y si se equivoca de formato la mora da 0 sin aviso. `anioDeTexto(" 2026…")` y los años de dos cifras no llegan desde las tablas.                                                                                                               | `scriptDates.test.ts`: `RIESGO` de `hoy` en otro formato                                                                                     |
| 4.4  | **No aplica**                        | El patrón lo escribe el autor, que ya ejecuta JavaScript propio con `new Function` (la frontera de confianza de Known gaps). Una expresión lenta no le da al autor nada que no tenga ya.                                                                                                                                                            | —                                                                                                                                            |
| 4.5  | **Aplica solo el `throw` vacío**     | BigInt, `Promise`, el modo no estricto y la caché son código del autor, por la misma frontera de 4.4. Un `throw new Error()` sin mensaje sí deja al autor sin aviso en el editor.                                                                                                                                                                   | `runtimeDerived.test.ts`: `it.fails`                                                                                                         |
| 4.6  | **No aplica, salvo la ida y vuelta** | La máscara del input de fecha (`maskDateText`) quita letras y pone el separador del formato, y el valor ISO interno sale de `parseDateText`, que ya revisa el calendario. Sí era un hueco real que la ida y vuelta usara solo el día 31.                                                                                                            | `dateFormat.test.ts`: ida y vuelta también con el 2026-05-07                                                                                 |
| 4.7  | **Aplica en parte**                  | El `"-0"` sí llega: un calculado sin decimales que da `-2.7e-17` (por ejemplo `0.3 - 0.1 - 0.2`) se muestra como `-0`. `rounding` es un booleano (siempre al millar), así que un múltiplo NaN no llega. `"1..2"`, `round(1.005)` y `num("1,5")` quedan fijados.                                                                                     | `numberFormat.test.ts`: `it.fails` de `-0` y `RIESGO` de los puntos; `fieldRounding.test.ts` y `scriptRuntime.test.ts`: `RIESGO`             |
| 4.8  | **Aplica en parte**                  | El escape en el nombre de una función sigue la misma línea que el commit `a650dcbb` (escapes en `@import`). Hay un `)` suelto en `url()` sin comillas, `parseCssText` corta en el `;` de un `data:`, y un correo sin `mailto:` se vuelve enlace https. La `İ` es del turco y `localhost:3000` no es enlace de un formulario tributario: no aplican. | `pdfHtml.test.ts`: 2 `it.fails` y una prueba de idempotencia con HTML normal; `cssAndJson.test.ts`: `it.fails`; `richText.test.ts`: `RIESGO` |
| 4.9  | **Ya conocido**                      | El editor no produce esos valores; es el "Zod valida la forma, no la coherencia" de Known gaps. Queda fijado para que se note si se agrega esa revisión.                                                                                                                                                                                            | `persistence.test.ts`: `RIESGO`                                                                                                              |
| 4.10 | **No aplica**                        | Todos los que llaman a `uniqueFieldName` filtran antes los reservados (`slugifyFieldName` o `migrateFieldNames`).                                                                                                                                                                                                                                   | `fieldName.test.ts`: fija ese contrato                                                                                                       |
| 4.11 | **No aplica**                        | Un formulario no tiene 12 000 campos encadenados.                                                                                                                                                                                                                                                                                                   | —                                                                                                                                            |
| 4.12 | **Aplicado**                         | El mismo problema estaba en `formStore.test.ts` y salió al arreglar `banksSlice`. Los tres archivos del store hacen `vi.resetModules()` antes del `import` y `vi.unstubAllGlobals()` al final. Pasan con `--no-isolate` y en orden aleatorio.                                                                                                       | `tests/store/*`                                                                                                                              |
| 4.13 | **Aplicado**                         | Con la mutación del agente, la prueba nueva falla.                                                                                                                                                                                                                                                                                                  | `pdfFile.test.ts`                                                                                                                            |
| 4.14 | **Aplicado**                         | Con la mutación del agente, la prueba nueva falla.                                                                                                                                                                                                                                                                                                  | `pdfTable.test.ts`                                                                                                                           |
| 4.15 | **Aplicado**                         | Con la mutación del agente, `pdfHtml.test.ts` ya no pasa: el worker se cae por un bucle infinito.                                                                                                                                                                                                                                                   | `pdfHtml.test.ts`                                                                                                                            |
| 4.16 | **Aplicado**                         | Cada caso inválido comprueba su mensaje y el vacío comprueba que sea el de "falta el valor". Se agregó "oculto con un valor bueno tampoco viaja" para los 13 tipos.                                                                                                                                                                                 | `fieldTypes.test.ts`                                                                                                                         |
| 4.17 | **Aplicado en parte**                | `dateFormat.test.ts:110` usa ahora un reloj falso y comprueba exactamente +1 día, −3 días, −1 mes y +2 años. Los `toBeGreaterThan(0)` y el acoplamiento al golden del ICA se dejaron: el golden es a propósito.                                                                                                                                     | `dateFormat.test.ts`                                                                                                                         |

Quedan 7 `it.fails`: el hallazgo 1 y seis de esta sección. Al corregir cada bug, Vitest lo marca en rojo: entonces se cambia `it.fails` por `it` y se quita el comentario `BUG:`.

### 4.A Posibles bugs del aplicativo

#### 4.1 Un campo obligatorio se cumple con espacios, `false` o `[]` [E]

- **Qué pasa**:
  - Un `number` obligatorio no da error con `"   "`, `"0x10"`, `"1e3"`, `true`, `[]` ni `[5]`. `Number("   ")` y `Number([])` dan 0.
  - Un `text` obligatorio no da error con `"   "` ni `"\t"`. Solo falla con `""`.
  - Un `checkbox` obligatorio nunca da error, ni con `false`, `"false"` o `0`.
- **Dónde**: `src/lib/runtimeValidation`, en `coerceValue` y la comprobación de obligatorio.
- **Hueco de prueba**: `coerceValue` solo se prueba con `'12'`, `''`, `'abc'`, `null` y `undefined`. No hay prueba de un checkbox obligatorio.
- **Choca con otra prueba**: `fieldRounding.test.ts`, "un campo vacío sigue vacío: un 0 pasaría el required", asegura que `applyRounding(field, '  ')` devuelve `'  '`. Pero ese `'  '` sí pasa el obligatorio numérico, así que la razón que da la prueba no se cumple de punta a punta.
- **En la UI**: confirmar si el input numérico deja llegar solo espacios, y si un checkbox obligatorio sin marcar deja avanzar de paso.

#### 4.2 Un operador de condición desconocido da `true` [E]

- **Qué pasa** (`src/lib/runtimeCondition`):
  - Un operador mal escrito o ausente devuelve `true`: el campo queda siempre visible o la regla siempre aplicada.
  - `lessThan` con el campo vacío o `undefined` contra 5 da `true`, porque el vacío vale 0.
  - `greaterThan("1.234,5", 1000)` da `false`, porque se lee 1.234.
  - `isTruthy("False")` da `true`. `isTruthy("  ")` da `true` y `isEmpty("  ")` también.
  - `in` con un valor de tipo array depende de `String(array)`: `['a']` da `true` contra `'a,b'`, pero `['a','b']` da `false`.
  - `equals(0, "")` da `false` y `equals(undefined, "")` da `true`.
  - Con `field: "constructor"`, `isNotEmpty` da `true`; con `"__proto__"`, `isEmpty` da `false`. Se lee el prototipo del objeto.
- **Hueco de prueba**: ninguno de estos casos está en `runtimeCondition.test.ts`. Los nombres reservados solo se prueban en `fieldName`.

#### 4.3 La mora da 0 en silencio si `hoy` viene mal formado [E]

- **Qué pasa** (`src/lib/scriptDates`, `maxDates`, `valoresAnuales`):
  - Con `hoy` en `"2026/06/10 12:00"`, `"10/06/2026"`, `""` o `"hoy"`, `diasDeMora` y `mesesDeMora` dan `[0, 0]` sin aviso. Con `"2026/06/10"` dan 71 y 3.
  - `anioDeTexto(" 2026/01/01")` da 202, `"20x6/01/01"` da 20 y `"12345/01/01"` da 1234. Con eso, `uvt()` y `smmlv()` dan `null` sin aviso.
  - `aUtc("0025/03/31")` da 1925-03-31 y `aUtc("0000/01/01")` da 1900, porque `Date.UTC` lee los años 0 a 99 como 1900 en adelante. También acepta `"2025/03/31\n"` y separadores mezclados (`"2025/1-5"`).
  - `fechaLimite("2025abc")` devuelve una fecha válida.
- **Por qué importa**: la sanción y los intereses de mora (renglones 31 y 37) se pierden sin error si el contexto trae la fecha en otro formato.
- **Hueco de prueba**: "sin tabla la mora es 0" solo cubre la tabla ausente. "Rechaza fechas que no existen o con otra forma" no cubre ninguno de estos casos.

#### 4.4 `matches` y `pattern` sin protección contra expresiones lentas (ReDoS) [E]

- **Qué pasa**: el operador `matches` con el patrón `^(a+)+$` y el valor `"a"` × 26 seguido de `"!"` bloqueó el hilo 11,5 s. La ejecución es síncrona. Un `pattern` inválido en las validaciones tampoco le muestra error al usuario, solo deja un `issue` interno.
- **Por qué importa**: el patrón lo escribe el autor, pero el valor lo teclea quien llena. Con un patrón mal hecho, la pantalla del contribuyente se congela.
- **Hueco de prueba**: `runtimeCondition.test.ts` solo cubre un patrón inválido (`'['` da `false`) y uno vacío.
- Relacionado: en Known gaps de `CLAUDE.md` ya está que `validations.pattern` no se valida al escribir y que la revisión de exportación bloquea una expresión inválida. Una expresión lenta pero válida no la bloquea nada.

#### 4.5 El resultado de un script no se limpia [E, en parte sin confirmar]

- **Qué pasa** (`src/lib/scriptRuntime`, `runtimeDerived`):
  - `normalizeScriptResult` solo arregla los `number` no finitos. Un script que devuelve `10n` (BigInt), una función, una `Promise`, un `Date` o `[1, NaN]` guarda ese objeto como valor del campo. Un BigInt haría lanzar `JSON.stringify`. **El efecto sobre el payload no se confirmó.**
  - `throw new Error()` y `throw ""` dejan `error: ""`. Como `runtimeDerived` revisa `if (run.error)`, la calculada queda en `undefined` sin ningún aviso. La prueba de error solo usa `noExiste()`.
  - `{{campo}}` desconocido, `{{a.b}}`, `{{__proto__}}` y `{{añ}}` quedan como texto literal y el error es `"Unexpected token '{'"`, poco claro.
  - Los scripts no corren en modo estricto. `leaked_x = 42` en un script se lee desde otro, y `Array.prototype.sum2 = 1` contamina todos los arreglos. El código ya avisa que no hay aislamiento, pero ninguna prueba lo fija.
  - `compileCached` y `ERRORS` son `Map` del módulo que nunca se vacían [L]: cada versión del texto del script, al editarlo, deja una entrada.

#### 4.6 Fechas: se acepta basura y no se valida el calendario [E]

- **Qué pasa** (`src/lib/dateFormat`, `valoresAnuales`):
  - `parseDateText` devuelve `"2026-03-31"` para `"31/03/2026x"`, `"31/03/2026 "`, `" 31/03/2026"`, `"31/03/2026\n"` y `"31-03-2026"` con formato `DD/MM/YYYY`. Ignora lo que sobra al final y acepta otro separador.
  - `parseDateText("01/01/0000")` da `"0000-01-01"`.
  - `formatIsoValue("2026-02-30", "DD/MM/YYYY", false)` da `"30/02/2026"` sin revisar el calendario. Con hora, acepta `24:00`, que `parseDateText` sí rechaza.
  - `maskDateText` con un formato desconocido devuelve el texto tal cual.
  - `generarReglasAnuales` con `mesDia = "02/29"` genera fechas que no existen (`2025/02/29`). Con `"xx"` genera `"2026/xx"`, y con `cantidad = 1.5` genera el año 2024,5.
  - `conFechaAnual` acepta `"no-es-fecha"`. Con un `kind` que no existe lanza `TypeError`. `fechasEsperadas` con una periodicidad desconocida da `NaN`.
- **Hueco de prueba**: la ida y vuelta "en los siete formatos" usa solo el 2026-03-31. Un día 31 no detecta si se intercambian el día y el mes, porque no hay mes 31.

#### 4.7 Números: bordes de formato y redondeo [E]

- **Qué pasa** (`src/lib/numberFormat`, helpers de script, `fieldRounding`):
  - `formatNumber(-1e-9)` da `"-0"` y `formatNumber(-0.0001, 2)` da `"-0,00"`. La prueba "el cero negativo sale '0'" solo usa `-0`.
  - `formatNumber(1, 101)` y `formatNumber(1, -1)` lanzan `RangeError` (por `toFixed`). `formatForDisplay` con `decimals` en 150 o -2 también.
  - `formatNumber(1e21)` da `"1e+21"`, y `parseFormattedNumber` no lo puede leer de vuelta (da `null`).
  - `parseFormattedNumber` acepta puntos en cualquier posición: `"1."` da 1, `".5"` da 5, `"1..2"` da 12 y `"1.23.4"` da 1234. Solo hay una prueba (`"1.5"` da 15).
  - `capIntegerDigits("00012", 3)` da `"000"`. `sanitizeNumericInput(",,")` da `","`.
  - **El helper de script `num` sigue otra convención**: `num("1.234,56")` da 1,234 y `num("1,5")` da 1, mientras `numberFormat` lee `"1.5"` como 15. Se parece al hallazgo 2.
  - `round(1.005, 2)` da 1, `roundToDecimals(1.255, 2)` da 1,25 y `roundToDecimals(10.075, 2)` da 10,07. El código ya avisa lo de 1,005, pero no hay prueba.
  - `round(1, 400)` da `null`. `roundToDecimals(x, NaN)` da `NaN`. `roundToMultiple(x, NaN)` y `roundToMultiple(x, Infinity)` dan `NaN`, aunque la prueba dice "deja intacto un múltiplo inválido" (solo usa 0 y un negativo).
  - `min()` y `max()` sin argumentos o con la columna vacía dan `null`, así que `max({{c}}) + 1` da `null`. `count(undefined)` y `count(null)` dan 1.
  - `applyRounding` con `true` o `[]` da 0. `applyDecimals` con `"0x10"` da 16.
  - `dvNit("900123456.9")` da 5: quita el punto y calcula con 9001234569. `dvNit("1234567890123456")` ignora el dígito 16, y `dvNit("NIT 900123456")` da 0.

#### 4.8 Sanitizador y CSS del PDF: no se pudo ejecutar nada, pero se pierde contenido [E]

- Con unas 90 cargas maliciosas, `sanitizePdfHtml` no dejó pasar nada ejecutable: scripts, `on*`, `javascript:` codificado, comentarios, `<![CDATA[`, atributos repetidos. Lo que sigue es de integridad y de cobertura.
- **La letra `İ` (U+0130) desalinea los índices** (`src/lib/pdfHtml`, `RAW_TEXT_TAGS`): el código busca en `html.toLowerCase()` y usa ese índice en el HTML original, y `İ` cambia de largo al pasar a minúscula. Con `<style>` + `İ` × 20 + `</style><img …>` se pierde el cierre y el contenido que sigue. El resultado sigue siendo seguro, pero sanear dos veces da otra cosa. No hay prueba de idempotencia ni de caracteres no ASCII.
- **Pasan intactos por `sanitizeCss`**: los escapes en el nombre de una función o propiedad (`u\72l(javascript:1)`, `b\65havior:x`), `image-set("http://evil/x.png" 1x)` y `@font-face{src:url(http://…)}`. Las pruebas solo cubren el escape dentro de `url("\6a avascript:")` y `@\69mport`.
- **Permitido a propósito, para revisar**: `data:image/svg+xml;base64,…` en `<img src>`, e imágenes desde `http://169.254.169.254/…`.
- **`url(javascript:alert(1))` sin comillas** deja un `)` suelto (`background:none)`), porque la expresión regular es perezosa.
- **`safeHref`** (`src/lib/richText`):
  - `"a@b.co"` se vuelve `https://a@b.co/`, un enlace al host `b.co`.
  - `"mailto:"` vacío se acepta.
  - `"localhost:3000"` y `"dian.gov.co:8080/x"` se rechazan, porque se confunden con un esquema.
- **`parseCssText`** corta en el `;` de adentro de `url()` y de las cadenas: `background: url(data:image/png;base64,AAAA)` queda en `url(data:image/png`, y `content:"a;b"` queda en `"a`. La prueba usa `url(http://x.png)`, que no tiene `;`. Además `color:red!important` deja `!important` en el valor, y `COLOR` no se pasa a minúsculas.

#### 4.9 `parseDraft` acepta borradores incoherentes [E]

- **Qué pasa**: da `ok` con:
  - `colSpan` en 0, 17, -1 o 1,5;
  - `colStart` en 100, y `colStart: 14` con `colSpan: 8` (se sale de las 16 columnas);
  - campos que se solapan;
  - un tipo de campo que no existe (`'hacker'`);
  - `stepId` e `id` de campo repetidos;
  - un `formScript` de 5 MB y un nombre de 5000 caracteres.
- `schemaVersion` en `0`, `-1`, `1.5` o `NaN` da `invalid`, pero en `null` o `undefined` lo toma como v1.
- **Ya conocido en parte**: Known gaps de `CLAUDE.md` dice que Zod valida la forma y no la coherencia. Lo nuevo es la lista concreta y lo de `schemaVersion`.
- **Se comporta bien**: `builderDraft` en `null`, `[]` o `5`, un BOM al inicio, 100 000 niveles de anidamiento y llaves `__proto__` en el JSON.
- **Hueco de prueba**: "con la forma rota" solo usa `colSpan: 'ancho'`, un texto.

#### 4.10 `uniqueFieldName` deja pasar los nombres reservados [E]

- **Qué pasa** (`src/lib/fieldName`): `uniqueFieldName('__proto__', new Set())` y `uniqueFieldName('constructor', new Set())` devuelven el nombre sin cambio. Solo `slugifyFieldName` filtra los reservados. `uniqueFieldName('', new Set())` devuelve `""`.
- `slugifyFieldName` deja pasar palabras reservadas de JavaScript (`class`, `return`, `this`) y no limita el largo (pasan 5000 caracteres).
- Relacionado con el commit `1157220f` ("Evita nombres de campo que choquen con el prototipo de Object"). Falta confirmar si `uniqueFieldName` se llama alguna vez sin pasar antes por `slugifyFieldName`.

#### 4.11 Menor: `findCycle` desborda la pila con cadenas muy largas [E]

- `findCycle` es recursiva: con una cadena de 12 000 nodos lanza `RangeError: Maximum call stack size exceeded`. Con 5000 funciona. El comentario de `topologicalOrder` dice "Nunca lanza". Es poco realista en uso normal.

### 4.B Huecos y fragilidad de las pruebas

#### 4.12 `banksSlice.test.ts` depende de que cada archivo corra aislado [E]

- **Qué pasa**: el caso "al crear el store se leen de localStorage" falla con `AssertionError: expected {} to deeply equal { tipos: { source: 'custom', … } }` al correr:
  `npx vitest run tests/store tests/lib/persistence.test.ts tests/lib/simulatorBanks.test.ts tests/lib/formDiagnostics.test.ts tests/lib/pdfDesign.test.ts tests/lib/dateFormat.test.ts --no-isolate --fileParallelism=false`
- **Causa** [L]: los archivos del store hacen `installMemoryStorage()`, `startClock()` y `await import(store)` a nivel de módulo. El store lee `localStorage` una sola vez, al cargarse. Si el módulo ya está en caché, la prueba ve otro estado.
- **Por qué importa**: la salida de Vitest sugiere `isolate: false` para ganar unos 6 s. Quien lo active rompe esta prueba sin que el código esté mal.
- Además [L], `formStore.test.ts` y `pdfDesignStore.test.ts` no desinstalan el `localStorage` global; solo paran el reloj en `afterAll`. `storeHarness.ts` guarda `now` como variable del módulo: es seguro mientras haya aislamiento.
- Con orden aleatorio (`--sequence.shuffle`, tres semillas) y aislamiento normal, `tests/store` y `persistence` pasaron todas (89/89).

#### 4.13 El aviso "Atributos con variable" no tiene ninguna prueba [E]

- Cambiar `name === 'src'` por `name !== 'src'` en `src/lib/pdfFile/pdfFile.utils.ts:110` dejó en verde `pdfFile`, `pdfDesign`, `pdfHtml` y `pdfDesignStore` (89/89). Ninguna prueba menciona `Atributos con variable`.
- **Qué no se valida**: que se avise de una variable `{X}` en un atributo, ni que `src`, `href` y `data-fm-*` queden exentos.

#### 4.14 `insertColumn` sobre una celda combinada no se prueba [E]

- Cambiar `colSpan + 1` por `colSpan - 1` en `src/lib/pdfTable/pdfTable.ts:260` no hizo fallar `pdfTable.test.ts`.
- **Qué no se valida**: que insertar una columna que cruza una celda combinada la agrande, ni que no se dupliquen celdas en esa posición.

#### 4.15 `parsePdfHtml` con `<style>` o `<script>` no tiene prueba directa [E]

- Invertir `closeEnd === -1` en `src/lib/pdfHtml/pdfHtml.ts:159` hace que se descarte todo el HTML que sigue a un `</style>`. `pdfHtml.test.ts` no lo detecta; solo lo atrapan, de forma indirecta, 14 pruebas de `pdfFile.test.ts`.
- **Falta**: una prueba de "contenido después de `</style>`" y otra de `</style` sin `>`.

#### 4.16 `fieldTypes.test.ts` solo comprueba que haya un error, no cuál [E/L]

- En las líneas 111, 146, 197, 279 y 542, los casos "lleno pero inválido" y "obligatorio y vacío" solo aseguran `toBeDefined()`. Una prueba podría pasar por fallar con otra regla. Hoy los mensajes sí son los correctos (`Invalid string: must match pattern`, `Too small: …>=0`, `Ingrese un correo válido`).
- `select`, `search_select`, `toggle_group`, `radio_group` y `checkbox_group` no tienen caso de valor inválido.
- Para esos cinco tipos, "oculto, ni se valida ni viaja" corre con valor `undefined`: no se prueba que un campo oculto **con valor** quede fuera del payload. Hoy sí queda fuera (payload `{}`).
- Sin confirmar: un `select` con un valor que no está entre las opciones no dio error, pero en la sonda el campo no tenía opciones.

#### 4.17 Aserciones débiles y reloj real [L]

- `dateFormat.test.ts:110`, "un límite relativo corre contra el reloj de quien llena":
  - usa `new Date()` real, así que cerca de medianoche podría fallar sin razón (pasó en UTC, Pacific/Kiritimati y America/Los_Angeles);
  - el caso de +1 día solo asegura `.not.toBe(local)`, no que sea exactamente el día siguiente.
- `pdfHtml.test.ts:145`, "nunca lanza", solo comprueba `not.toThrow()` y nada sobre la salida.
- `formRuntime.test.ts:93` y `:207` usan `toBeFalsy()` sobre `computed.*`.
- Hay 47 usos de `toBeGreaterThan(0)` o de contar `.length` (`exportForm.test.ts`, `formDiagnostics.test.ts` y otros) donde se podría asegurar la cantidad exacta.
- `formRuntime.test.ts` y `runtimeHarness.ts` dependen de los números de la plantilla ICA de fábrica (`550_000_000`, `3_132_000`…). Eso es el golden del ICA y está hecho a propósito; solo hay que tener presente que un cambio legítimo en la plantilla o en los valores anuales lo rompe.

### 4.C Lo que no revisaron

- La UI y los componentes (fuera del alcance de las pruebas, por decisión del usuario).
- Sin sondas de casos límite: `exportForm`, `formDiagnostics`, `zodSchema`, `pdfDesign*`, `pdfTable`, `rowLayout`, `repeatableGroup`, `simulatorBanks` y `store/*`.
- Sin mutación a fondo (solo 2 a 4 mutantes por módulo): `store`, `scriptRuntime`, `zodSchema` y `fieldTypes`.
- No se corrió en Linux ni en CI.
- Dos mutantes sobrevivieron porque no cambian el comportamiento, y no son hallazgos: `maxDates.ts:60` (`b <= a` / `b < a`) y `runtimeValidation.ts:100` (`> 0` / `>= 0`).
