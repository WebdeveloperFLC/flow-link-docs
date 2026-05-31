/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Future Link Consultants'

interface Props {
  hostName?: string
  requesterName?: string
  requesterEmail?: string
  meetingTitle?: string
  whenLabel?: string
  action?: 'confirmed' | 'declined' | 'reschedule_requested' | 'submitted'
  reason?: string
  dashboardUrl?: string
}

const headlines: Record<string, string> = {
  confirmed: 'Requester confirmed attendance',
  declined: 'Requester declined the meeting',
  reschedule_requested: 'Requester asked to reschedule',
  submitted: 'New booking request received',
}

const HostNotification = ({ hostName, requesterName, requesterEmail, meetingTitle, whenLabel, action, reason, dashboardUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{headlines[action ?? 'submitted']}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{headlines[action ?? 'submitted']}</Heading>
        <Text style={text}>
          {hostName ? `Hi ${hostName},` : 'Hi,'} {requesterName ?? 'the requester'}
          {requesterEmail ? ` (${requesterEmail})` : ''} has just taken action on
          {meetingTitle ? ` "${meetingTitle}"` : ' a meeting'}{whenLabel ? ` scheduled for ${whenLabel}` : ''}.
        </Text>
        {reason ? (
          <Section style={card}>
            <Text style={label}>Note from requester</Text>
            <Text style={value}>{reason}</Text>
          </Section>
        ) : null}
        {dashboardUrl ? (
          <Section style={{ textAlign: 'center', margin: '24px 0' }}>
            <Button href={dashboardUrl} style={btn}>Open dashboard</Button>
          </Section>
        ) : null}
        <Text style={footer}>— The {SITE_NAME} team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: HostNotification,
  subject: (d: Record<string, any>) => headlines[d?.action ?? 'submitted'],
  displayName: 'Host notification — requester action',
  previewData: { hostName: 'Alex', requesterName: 'Jane', requesterEmail: 'jane@example.com', meetingTitle: 'Discovery call', whenLabel: 'Mon, 10 Jun · 14:30', action: 'confirmed', dashboardUrl: '#' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '24px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: 'hsl(222, 47%, 8%)', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#444', lineHeight: '1.6', margin: '0 0 16px' }
const card = { backgroundColor: '#f7f8fa', borderRadius: '10px', padding: '16px 18px', margin: '16px 0' }
const label = { fontSize: '11px', color: '#888', textTransform: 'uppercase' as const, letterSpacing: '0.04em', margin: '0 0 2px' }
const value = { fontSize: '14px', color: '#111', margin: '0' }
const btn = { backgroundColor: 'hsl(220, 85%, 32%)', color: '#fff', padding: '12px 28px', borderRadius: '10px', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px', display: 'inline-block' }
const footer = { fontSize: '12px', color: '#999', margin: '30px 0 0' }