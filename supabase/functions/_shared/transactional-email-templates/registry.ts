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

export const TEMPLATES: Record<string, TemplateEntry> = {
  'portal-invite': portalInvite,
  'assessment-invite': assessmentInvite,
  'assessment-verify-email': assessmentVerifyEmail,
  'assessment-report': assessmentReport,
}