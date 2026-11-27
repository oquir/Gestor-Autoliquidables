import { TabButtonGroup } from '../../molecules/TabButtonGroup/TabButtonGroup'
import { ApiMappingPanel } from '../panels/ApiMappingPanel/ApiMappingPanel'
import { AttributesPanel } from '../panels/AttributesPanel/AttributesPanel'
import { LogicPanel } from '../panels/LogicPanel/LogicPanel'
import { StylesPanel } from '../panels/StylesPanel/StylesPanel'
import { ValidationsPanel } from '../panels/ValidationsPanel/ValidationsPanel'
import { FIELD_EDITOR_TABS } from './FieldEditorTabs.constants'
import type { FieldEditorTabsProps } from './FieldEditorTabs.types'

// Pestanas de edicion del campo compartidas entre el menu contextual (escritorio/tablet) y la hoja
// del celular (P3 de docs/Plan-Movil.md).
export function FieldEditorTabs({
  field,
  activeTab,
  onSelectTab,
  bodyClassName = 'pt-3',
}: FieldEditorTabsProps) {
  return (
    <>
      <TabButtonGroup tabs={FIELD_EDITOR_TABS} activeTab={activeTab} onSelect={onSelectTab} />

      <div className={bodyClassName}>
        {activeTab === 'attributes' && <AttributesPanel field={field} />}
        {activeTab === 'validations' && <ValidationsPanel field={field} />}
        {activeTab === 'styles' && <StylesPanel field={field} />}
        {activeTab === 'logic' && <LogicPanel field={field} />}
        {activeTab === 'apiMapping' && <ApiMappingPanel field={field} />}
      </div>
    </>
  )
}
