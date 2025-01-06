import { createPlugin, PluginDef } from '@fullcalendar/core'
import { eventSourceDef } from './event-source-def.js'

export default createPlugin({
  name: 'icalendar',
  eventSourceDefs: [eventSourceDef],
}) as PluginDef
