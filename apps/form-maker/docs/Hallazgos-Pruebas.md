# Hallazgos de las pruebas unitarias

> **Para qué sirve**: tener a mano lo que encontraron las pruebas unitarias (Vitest, `tests/`) para probarlo después en el aplicativo y decidir qué se corrige. Cada hallazgo dice qué pasa, dónde está en el código, cómo reproducirlo a mano y qué prueba lo tiene fijado.
>
> **Cómo se usa**: al corregir uno, tacharlo con `~~…~~` y anotar la fecha y el commit, por ejemplo `## ~~1. Las reglas no ven el contexto~~ (2026-11-30, abc1234)`. No se borra nada.
>
> Escrito el 2026-11-24, al cerrar las seis tandas de pruebas. Lo que dice del código es de esa fecha: antes de usarlo, verificar que siga igual.

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
