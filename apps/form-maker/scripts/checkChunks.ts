// Revisa las fronteras perezosas del bundle (pnpm check:chunks). Construye con vite.config.ts en
// memoria (write: false: no toca dist/ ni la cache de un pnpm dev abierto) y falla si algo que
// vive detras de un React.lazy quedo en la carga inicial, o si una de las cuatro partes perezosas
// dejo de ser un chunk aparte. No hace typecheck: eso es de tsc -b en pnpm build.
// La lista sale de "Lazy boundaries" en CLAUDE.md y de docs/Decisiones.md ("lib/ and store/ follow
// the same rule"). Una frontera nueva se agrega aca. banksSlice y Zod van en la carga inicial a
// proposito: no estan en la lista.
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'
import { build } from 'vite'
import type { Plugin, Rollup } from 'vite'

type Rule = { label: string; pattern: RegExp }
type Boundary = { label: string; file: string }
type Violation = { module: string; rule: string; chunk: string; doors: string[] }
type ChunkSize = { file: string; raw: number; gzip: number }
type Report = {
  violations: Violation[]
  missingBoundaries: string[]
  initial: ChunkSize[]
  lazy: ChunkSize[]
}

const APP_ROOT: string = fileURLToPath(new URL('..', import.meta.url))

const FORBIDDEN: Rule[] = [
  {
    label: 'componente del simulador o del PDF',
    pattern: /\/src\/components\/organisms\/(FormSimulator|PdfDesigner|preview|pdf)\//,
  },
  { label: 'editor de script', pattern: /\/src\/components\/molecules\/ScriptEditor\// },
  {
    label: 'lib perezosa',
    pattern:
      /\/src\/lib\/(catalogFill|formRuntime|mockCatalog|pdf[A-Za-z]*|runtime(Condition|Derived|Payload|Validation)|scriptDates|scriptRuntime|scriptValores|zodHydrate)\//,
  },
  {
    label: 'hook perezoso',
    pattern:
      /\/src\/hooks\/(useFormPreview|usePreviewNavigation|usePreviewSearchSelect|usePdf[A-Za-z]*)\//,
  },
  { label: 'store del PDF', pattern: /\/src\/store\/pdfDesignStore/ },
  { label: 'CodeMirror', pattern: /\/node_modules\/.*\/@(codemirror|lezer)\// },
]

const BOUNDARIES: Boundary[] = [
  { label: 'FormSimulator', file: '/src/components/organisms/FormSimulator/FormSimulator.tsx' },
  { label: 'PdfDesigner', file: '/src/components/organisms/PdfDesigner/PdfDesigner.tsx' },
  { label: 'ScriptEditor', file: '/src/components/molecules/ScriptEditor/ScriptEditor.tsx' },
  { label: 'PdfThumbnail', file: '/src/components/organisms/pdf/PdfThumbnail/PdfThumbnail.tsx' },
]

// Rolldown da rutas absolutas; en Windows pueden venir con \ y con el prefijo \0 de los virtuales
function normalizeId(id: string): string {
  return id.replace(/\\/g, '/')
}

function relativeId(id: string): string {
  const normalized: string = normalizeId(id)
  const root: string = normalizeId(APP_ROOT)
  return normalized.startsWith(root) ? normalized.slice(root.length) : normalized
}

function forbiddenRule(id: string): Rule | undefined {
  const normalized: string = normalizeId(id)
  return FORBIDDEN.find((rule: Rule) => rule.pattern.test(normalized))
}

function sizeOf(chunk: Rollup.OutputChunk): ChunkSize {
  return {
    file: chunk.fileName,
    raw: Buffer.byteLength(chunk.code),
    gzip: gzipSync(chunk.code).length,
  }
}

// La carga inicial es la entrada mas todo lo que importa de forma estatica, sin los import()
function initialChunks(chunks: Rollup.OutputChunk[]): Set<string> {
  const byFile: Map<string, Rollup.OutputChunk> = new Map(
    chunks.map((chunk: Rollup.OutputChunk) => [chunk.fileName, chunk]),
  )
  const pending: string[] = chunks
    .filter((chunk: Rollup.OutputChunk) => chunk.isEntry)
    .map((chunk: Rollup.OutputChunk) => chunk.fileName)
  const seen: Set<string> = new Set()
  while (pending.length > 0) {
    const file: string = pending.pop() as string
    if (seen.has(file)) continue
    seen.add(file)
    for (const imported of byFile.get(file)?.imports ?? []) pending.push(imported)
  }
  return seen
}

function checkerPlugin(report: Report): Plugin {
  return {
    name: 'form-maker:check-chunks',
    apply: 'build',
    generateBundle(_options, bundle) {
      const chunks: Rollup.OutputChunk[] = Object.values(bundle).filter(
        (item): item is Rollup.OutputChunk => item.type === 'chunk',
      )
      const initial: Set<string> = initialChunks(chunks)
      const initialModules: Set<string> = new Set(
        chunks
          .filter((chunk: Rollup.OutputChunk) => initial.has(chunk.fileName))
          .flatMap((chunk: Rollup.OutputChunk) => chunk.moduleIds),
      )

      for (const chunk of chunks) {
        if (initial.has(chunk.fileName)) report.initial.push(sizeOf(chunk))
        else report.lazy.push(sizeOf(chunk))
        if (!initial.has(chunk.fileName)) continue
        for (const id of chunk.moduleIds) {
          const rule: Rule | undefined = forbiddenRule(id)
          if (!rule) continue
          // La puerta es quien lo importa desde el lado permitido: si lo importa otro modulo
          // prohibido, ese ya sale en el informe con su propia puerta
          const importers: string[] = this.getModuleInfo(id)?.importers ?? []
          const doors: string[] = importers
            .filter((importer: string) => initialModules.has(importer) && !forbiddenRule(importer))
            .map(relativeId)
          report.violations.push({
            module: relativeId(id),
            rule: rule.label,
            chunk: chunk.fileName,
            doors,
          })
        }
      }

      for (const boundary of BOUNDARIES) {
        const owner: Rollup.OutputChunk | undefined = chunks.find((chunk: Rollup.OutputChunk) =>
          chunk.moduleIds.some((id: string) => normalizeId(id).endsWith(boundary.file)),
        )
        if (!owner || !owner.isDynamicEntry || initial.has(owner.fileName)) {
          report.missingBoundaries.push(boundary.label)
        }
      }
    },
  }
}

function kb(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} kB`
}

function printSizes(title: string, sizes: ChunkSize[]): void {
  const raw: number = sizes.reduce((total: number, size: ChunkSize) => total + size.raw, 0)
  const gzip: number = sizes.reduce((total: number, size: ChunkSize) => total + size.gzip, 0)
  console.log(`\n${title}: ${kb(raw)} (gzip ${kb(gzip)})`)
  for (const size of [...sizes].sort((a: ChunkSize, b: ChunkSize) => b.raw - a.raw)) {
    console.log(`  ${size.file.padEnd(48)} ${kb(size.raw).padStart(10)}  gzip ${kb(size.gzip)}`)
  }
}

// De una dependencia basta el paquete: la ruta de pnpm (.pnpm/<pkg>@<version>/...) es ruido
function folderOf(module: string): string {
  const marker: string = '/node_modules/'
  const at: number = module.lastIndexOf(marker)
  if (at === -1) return module.slice(0, module.lastIndexOf('/') + 1)
  const parts: string[] = module.slice(at + marker.length).split('/')
  return parts[0].startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0]
}

// Un solo import mal puesto arrastra todo lo que el modulo importa: se agrupa por puerta (el
// archivo permitido que hace el import) y por carpeta, para no listar cada archivo arrastrado
function printViolations(violations: Violation[]): void {
  if (violations.length === 0) return
  const byDoor: Map<string, string[]> = new Map()
  for (const violation of violations) {
    for (const door of violation.doors) {
      byDoor.set(door, [...(byDoor.get(door) ?? []), `${violation.module} (${violation.rule})`])
    }
  }
  for (const [door, modules] of byDoor) {
    console.error(`\n✗ ${door} mete en la carga inicial:`)
    for (const module of modules) console.error(`    ${module}`)
  }
  const folders: string[] = [...new Set(violations.map((v: Violation) => folderOf(v.module)))]
  const chunks: string[] = [...new Set(violations.map((v: Violation) => v.chunk))]
  console.error(
    `\n✗ ${violations.length} módulos prohibidos en la carga inicial (${chunks.join(', ')}):`,
  )
  for (const folder of folders) console.error(`    ${folder}`)
}

async function main(): Promise<void> {
  const report: Report = { violations: [], missingBoundaries: [], initial: [], lazy: [] }
  await build({
    root: APP_ROOT,
    configFile: fileURLToPath(new URL('../vite.config.ts', import.meta.url)),
    logLevel: 'warn',
    plugins: [checkerPlugin(report)],
    build: { write: false, reportCompressedSize: false },
  })

  printSizes('Carga inicial', report.initial)
  printSizes('Partes perezosas', report.lazy)

  if (report.violations.length === 0 && report.missingBoundaries.length === 0) {
    console.log('\n✓ Las fronteras perezosas se mantienen.')
    return
  }
  printViolations(report.violations)
  for (const label of report.missingBoundaries) {
    console.error(`\n✗ ${label} ya no es un chunk perezoso aparte (revisa su React.lazy)`)
  }
  process.exitCode = 1
}

await main()
