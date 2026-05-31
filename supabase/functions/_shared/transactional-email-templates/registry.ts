/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as portalInvite } from './portal-invite.tsx'
import { template as assessmentInvite } from './assessment-invite.tsx'
import { template as assessmentVerifyEmail } from './assessment-verify-email.tsx'
import { template as assessmentReport } from './assessment-report.tsx'
import { template as appointmentApproved } from './appointment-approved.tsx'
import { template as appointmentDeclined } from './appointment-declined.tsx'
import { template as appointmentReschedProposed } from './appointment-reschedule-proposed.tsx'
import { template as appointmentHostNotification } from './appointment-host-notification.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'portal-invite': portalInvite,
  'assessment-invite': assessmentInvite,
  'assessment-verify-email': assessmentVerifyEmail,
  'assessment-report': assessmentReport,
  'appointment-approved': appointmentApproved,
  'appointment-declined': appointmentDeclined,
  'appointment-reschedule-proposed': appointmentReschedProposed,
  'appointment-host-notification': appointmentHostNotification,
}