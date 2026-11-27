import {
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
  useMergeRefs,
  useRole,
  useTransitionStyles,
} from '@floating-ui/react'
import {
  cloneElement,
  memo,
  type NamedExoticComponent,
  type Ref,
  useLayoutEffect,
  useState,
} from 'react'
import {
  TOOLTIP_FADE_DURATION,
  TOOLTIP_OFFSET,
  TOOLTIP_OPEN_DELAY,
  TOOLTIP_VIEWPORT_PADDING,
} from './Tooltip.constants'
import type { TooltipFloatingProps, TooltipProps, TooltipReferenceProps } from './Tooltip.types'
import { isActionReference } from './Tooltip.utils'

// Globo de ayuda del builder (no es field.tooltip, que se exporta). Va en un portal con position
// fixed: asi no lo recortan los paneles ni lo mueve el scale() del lienzo.
export function Tooltip({
  content,
  children,
  placement = 'top',
  className = '',
  disabled = false,
  tapToOpen = false,
}: TooltipProps) {
  // En estado y no en refs: la regla react-hooks/refs no deja leer refs al pintar.
  const [reference, setReference] = useState<Element | null>(null)
  const [referenceProps, setReferenceProps] = useState<TooltipReferenceProps | null>(null)
  const isEnabled: boolean =
    !disabled && content !== undefined && content !== null && content !== ''

  // Conserva el ref propio del hijo (dnd-kit): sin el merge uno pisaria al otro.
  const childRef: Ref<Element> | undefined = (children.props as { ref?: Ref<Element> }).ref
  const mergedRef = useMergeRefs([setReference, childRef])
  const ownProps: Record<string, unknown> = { ...children.props, ref: mergedRef }

  return (
    <>
      {cloneElement(children, referenceProps ? referenceProps.get(ownProps) : ownProps)}
      <TooltipFloating
        reference={reference}
        content={content}
        placement={placement}
        className={className}
        isEnabled={isEnabled}
        tapToOpen={tapToOpen}
        onReferenceProps={setReferenceProps}
      />
    </>
  )
}

function TooltipFloatingBase({
  reference,
  content,
  placement,
  className,
  isEnabled,
  tapToOpen,
  onReferenceProps,
}: TooltipFloatingProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const isTapEnabled: boolean =
    isEnabled && (tapToOpen || (reference !== null && !isActionReference(reference)))
  const [floating, setFloating] = useState<HTMLElement | null>(null)
  const { floatingStyles, context } = useFloating({
    elements: { reference, floating },
    open: isOpen && isEnabled,
    onOpenChange: setIsOpen,
    placement,
    strategy: 'fixed',
    whileElementsMounted: autoUpdate,
    middleware: [offset(TOOLTIP_OFFSET), flip(), shift({ padding: TOOLTIP_VIEWPORT_PADDING })],
  })
  const { getReferenceProps, getFloatingProps } = useInteractions([
    useHover(context, { enabled: isEnabled, mouseOnly: true, delay: { open: TOOLTIP_OPEN_DELAY } }),
    useFocus(context, { enabled: isEnabled }),
    // Sin hover en pantallas tactiles: el toque lo abre y lo cierra, salvo que el toque sea para una
    // accion (B6 de docs/Plan-Movil.md). ignoreMouse: con mouse nada cambia.
    useClick(context, { enabled: isTapEnabled, ignoreMouse: true }),
    useDismiss(context, { enabled: isEnabled }),
    useRole(context, { enabled: isEnabled, role: 'tooltip' }),
  ])
  const { isMounted, styles } = useTransitionStyles(context, { duration: TOOLTIP_FADE_DURATION })

  // Antes de pintar: el hijo no queda ni un cuadro sin sus manejadores.
  useLayoutEffect(() => {
    onReferenceProps((current) =>
      current?.get === getReferenceProps ? current : { get: getReferenceProps },
    )
  }, [getReferenceProps, onReferenceProps])

  if (!isMounted) return null

  return (
    <FloatingPortal>
      <div
        ref={setFloating}
        style={{ ...floatingStyles, ...styles }}
        // z-[60]: encima de ModalShell (z-50), porque el portal cuelga del body.
        className={`z-[60] max-w-xs rounded-lg bg-inverse px-3 py-2 text-xs text-on-inverse shadow-lg ${className}`}
        {...getFloatingProps()}
      >
        {content}
      </div>
    </FloatingPortal>
  )
}

// Cada tecla vuelve a pintar a los padres, y antes cada globo corria entero floating-ui (unos cien
// hooks) aunque estuviera cerrado. Con memo y props de texto, un globo cerrado no se recalcula: el
// hijo lo sigue pintando Tooltip, con los manejadores que este le pasa (sin volver a montarlo).
const TooltipFloating: NamedExoticComponent<TooltipFloatingProps> = memo(TooltipFloatingBase)
